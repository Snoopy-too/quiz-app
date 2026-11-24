import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import {
  getLinkableStudentIds,
  getSelectableStudentIds,
  getSelectionState,
  getUnlinkableStudentIds,
  pruneSelectedIds,
  toggleSelectAllVisible as toggleSelectAllVisibleDomain,
  toggleStudentRangeSelection,
  toggleStudentSelection,
} from "../domain/studentSelection";
import { linkStudentsBatch, unlinkStudentsBatch } from "../infrastructure/studentRepository";

const VALID_STUDENT_FILTERS = new Set(["my_students", "approved", "pending", "unverified", "unlinked"]);

function readInitialStudentFilter() {
  try {
    const param = new URLSearchParams(window.location.search).get("filter");
    if (param && VALID_STUDENT_FILTERS.has(param)) {
      return param;
    }
  } catch {
    // Ignore URL parsing errors in non-browser contexts
  }
  return "my_students";
}

export default function useManageStudents(appState) {
  const { t } = useTranslation();

  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatusState] = useState(readInitialStudentFilter); // my_students, approved, pending, rejected, unlinked
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    confirmStyle: "danger",
    onConfirm: null,
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const lastSelectedIdRef = useRef(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    email: "",
    studentId: "",
    password: "",
    confirmPassword: "",
  });
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createStudentError, setCreateStudentError] = useState("");
  const [createStudentSuccess, setCreateStudentSuccess] = useState(null);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    studentId: "",
    password: "",
  });
  const [updatingStudent, setUpdatingStudent] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [quizCounts, setQuizCounts] = useState({});
  const knownStudentIdsRef = useRef(new Set());

  // Helper: highlight new students with a glow, then fade after 3s.
  // Uses setTimeout to ensure the row is in the DOM after React re-renders.
  const highlightNewStudents = (newIds) => {
    if (newIds.length === 0) return;
    // Delay slightly to let React commit the new row to the DOM first
    setTimeout(() => {
      setHighlightedIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });
      setTimeout(() => {
        setHighlightedIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.delete(id));
          return next;
        });
      }, 3500);
    }, 100);
  };

  useEffect(() => {
    if (appState.currentUser?.id) {
      fetchStudents();
    }
  }, [appState.currentUser]);

  const setFilterStatus = (nextStatus) => {
    setFilterStatusState(nextStatus);
    setSelectedStudentIds(new Set());
    lastSelectedIdRef.current = null;
  };

  // Realtime subscription + lightweight fallback poll
  useEffect(() => {
    const teacherId = appState.currentUser?.id;
    if (!teacherId) return;

    let realtimeWorking = false;

    // --- Realtime: instant updates when the users table has replication enabled ---
    const channel = supabase
      .channel('manage-students-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
          filter: `teacher_id=eq.${teacherId}`,
        },
        (payload) => {
          const newStudent = payload.new;
          if (newStudent.role !== 'student') return;
          realtimeWorking = true;

          console.log('[ManageStudents] Realtime INSERT:', newStudent.name);

          setStudents(prev => {
            if (prev.some(s => s.id === newStudent.id)) return prev;
            return [newStudent, ...prev];
          });

          if (!newStudent.approved) {
            setPendingStudents(prev => {
              if (prev.some(s => s.id === newStudent.id)) return prev;
              return [newStudent, ...prev];
            });
          }

          knownStudentIdsRef.current.add(newStudent.id);
          highlightNewStudents([newStudent.id]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          const updated = payload.new;
          if (updated.role !== 'student') return;
          // Only care about students linked to this teacher
          if (updated.teacher_id !== teacherId) return;
          realtimeWorking = true;

          setStudents(prev => {
            // If student already in list, update them
            if (prev.some(s => s.id === updated.id)) {
              return prev.map(s => s.id === updated.id ? updated : s);
            }
            // New student just linked to this teacher (e.g. Google OAuth CompleteProfile)
            return [updated, ...prev];
          });

          setPendingStudents(prev => {
            const withoutThis = prev.filter(s => s.id !== updated.id);
            if (!updated.approved) return [...withoutThis, updated];
            return withoutThis;
          });

          // Highlight if this is a newly appearing student
          if (!knownStudentIdsRef.current.has(updated.id)) {
            knownStudentIdsRef.current.add(updated.id);
            highlightNewStudents([updated.id]);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ManageStudents] Realtime subscription active');
        }
      });

    // --- Fallback poll: lightweight count check every 10s ---
    // Only does a full fetch if the student count changed.
    // Skips entirely if realtime has already delivered an event.
    const pollTimer = setInterval(async () => {
      if (realtimeWorking) return; // realtime is delivering — no need to poll

      try {
        const schoolId = appState.currentUser?.school_id;
        const orFilter = schoolId
          ? `teacher_id.eq.${teacherId},and(teacher_id.is.null,school_id.eq.${schoolId})`
          : `teacher_id.eq.${teacherId}`;

        const { count, error: countError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .or(orFilter);

        if (countError) return;

        const currentCount = knownStudentIdsRef.current.size;
        if (count !== currentCount) {
          console.log('[ManageStudents] Poll detected change:', currentCount, '->', count);
          // Full fetch to get the new data
          const { data, error: fetchErr } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'student')
            .or(orFilter)
            .order('created_at', { ascending: false });

          if (!fetchErr && data) {
            // Find newly appeared student IDs
            const newIds = data
              .filter(s => !knownStudentIdsRef.current.has(s.id))
              .map(s => s.id);

            setStudents(data);
            setPendingStudents(data.filter(s => s.teacher_id === teacherId && !s.approved));
            knownStudentIdsRef.current = new Set(data.map(s => s.id));

            highlightNewStudents(newIds);
          }
        }
      } catch {
        // Silent — poll failures are non-critical
      }
    }, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollTimer);
    };
  }, [appState.currentUser?.id]);

  const fetchStudents = async () => {
    if (!appState.currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch students associated with the current teacher.
      // If teacher has a school_id, also include unlinked students from the same school.
      const teacherId = appState.currentUser.id;
      const teacherSchoolId = appState.currentUser.school_id;
      const orFilter = teacherSchoolId
        ? `teacher_id.eq.${teacherId},and(teacher_id.is.null,school_id.eq.${teacherSchoolId})`
        : `teacher_id.eq.${teacherId}`;

      const { data: studentsData, error: studentsError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "student")
        .or(orFilter)
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
      knownStudentIdsRef.current = new Set((studentsData || []).map(s => s.id));
      // Pending count is based on MY students only to avoid noise
      setPendingStudents(studentsData?.filter(s => s.teacher_id === appState.currentUser.id && !s.approved) || []);

      // Fetch quiz participation counts for all loaded students in one query
      const studentIds = (studentsData || []).map(s => s.id);
      if (studentIds.length > 0) {
        const { data: participations } = await supabase
          .from("session_participants")
          .select("user_id")
          .in("user_id", studentIds);

        if (participations) {
          const counts = {};
          participations.forEach(p => {
            counts[p.user_id] = (counts[p.user_id] || 0) + 1;
          });
          setQuizCounts(counts);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = (student) => {
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.confirmLinkTitle"),
      message: t("manageStudents.confirmLinkMessage", { name: student.name }),
      confirmText: t("manageStudents.actionLink"),
      confirmStyle: "primary",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("users")
            .update({ teacher_id: appState.currentUser.id })
            .eq("id", student.id);

          if (error) throw error;
          setSelectedStudentIds((prev) => {
            if (!prev.has(student.id)) return prev;
            const next = new Set(prev);
            next.delete(student.id);
            return next;
          });
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({ isOpen: true, title: t("manageStudents.successTitle"), message: t("manageStudents.linkStudentSuccess"), type: "success" });
          await fetchStudents();
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: err.message, type: "error" });
        }
      }
    });
  };

  const handleBulkLink = () => {
    const teacherId = appState.currentUser?.id;
    const schoolId = appState.currentUser?.school_id ?? null;
    if (!teacherId) return;

    const validUnlinkedIds = new Set(getLinkableStudentIds(students, schoolId));
    const idsToLink = Array.from(selectedStudentIds).filter((id) => validUnlinkedIds.has(id));
    if (idsToLink.length === 0) return;

    const count = idsToLink.length;
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.confirmBulkLinkTitle"),
      message:
        count === 1
          ? t("manageStudents.confirmBulkLinkMessageOne")
          : t("manageStudents.confirmBulkLinkMessage", { count }),
      confirmText: t("manageStudents.actionLink"),
      confirmStyle: "primary",
      onConfirm: async () => {
        setIsBulkProcessing(true);
        try {
          const { linkedCount } = await linkStudentsBatch({
            teacherId,
            schoolId,
            studentIds: idsToLink,
          });
          setSelectedStudentIds(new Set());
          lastSelectedIdRef.current = null;
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: t("manageStudents.successTitle"),
            message:
              linkedCount === 1
                ? t("manageStudents.bulkLinkSuccessOne")
                : t("manageStudents.bulkLinkSuccess", { count: linkedCount }),
            type: "success",
          });
        } catch (err) {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          const isPermissionError =
            err?.code === "42501" || err?.message?.includes("policy");
          setAlertModal({
            isOpen: true,
            title: t("manageStudents.errorTitle"),
            message: isPermissionError
              ? t("manageStudents.permissionDenied")
              : t("manageStudents.errorBulkLinkingStudents") + (err?.message || ""),
            type: "error",
          });
        } finally {
          setIsBulkProcessing(false);
          await fetchStudents();
        }
      },
    });
  };

  const handleUnlink = async (student) => {
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.confirmUnlinkTitle"),
      message: t("manageStudents.confirmUnlinkMessage", { name: student.name }),
      confirmText: t("manageStudents.actionUnlink"),
      confirmStyle: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("users")
            .update({ teacher_id: null })
            .eq("id", student.id);

          if (error) throw error;
          setSelectedStudentIds((prev) => {
            if (!prev.has(student.id)) return prev;
            const next = new Set(prev);
            next.delete(student.id);
            return next;
          });
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({ isOpen: true, title: t("manageStudents.successTitle"), message: t("manageStudents.unlinkStudentSuccess"), type: "success" });
          await fetchStudents();
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: err.message, type: "error" });
        }
      }
    });
  };

  const handleBulkUnlink = () => {
    const teacherId = appState.currentUser?.id;
    if (!teacherId) return;

    const validLinkedIds = new Set(getUnlinkableStudentIds(students, teacherId));
    const idsToUnlink = Array.from(selectedStudentIds).filter((id) => validLinkedIds.has(id));
    if (idsToUnlink.length === 0) return;

    const count = idsToUnlink.length;
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.confirmBulkUnlinkTitle"),
      message:
        count === 1
          ? t("manageStudents.confirmBulkUnlinkMessageOne")
          : t("manageStudents.confirmBulkUnlinkMessage", { count }),
      confirmText: t("manageStudents.actionUnlink"),
      confirmStyle: "danger",
      onConfirm: async () => {
        setIsBulkProcessing(true);
        try {
          const { unlinkedCount } = await unlinkStudentsBatch({
            teacherId,
            studentIds: idsToUnlink,
          });
          setSelectedStudentIds(new Set());
          lastSelectedIdRef.current = null;
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: t("manageStudents.successTitle"),
            message:
              unlinkedCount === 1
                ? t("manageStudents.bulkUnlinkSuccessOne")
                : t("manageStudents.bulkUnlinkSuccess", { count: unlinkedCount }),
            type: "success",
          });
        } catch (err) {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          const isPermissionError =
            err?.code === "42501" || err?.message?.includes("policy");
          setAlertModal({
            isOpen: true,
            title: t("manageStudents.errorTitle"),
            message: isPermissionError
              ? t("manageStudents.permissionDenied")
              : t("manageStudents.errorBulkUnlinkingStudents") + (err?.message || ""),
            type: "error",
          });
        } finally {
          setIsBulkProcessing(false);
          await fetchStudents();
        }
      },
    });
  };

  const handleApprove = async (studentId) => {
    try {
      console.log("Approving student:", studentId);
      console.log("Current user (teacher):", appState.currentUser?.id);

      const { data, error } = await supabase
        .from("users")
        .update({ approved: true })
        .eq("id", studentId)
        .select();

      if (error) {
        console.error("Approval error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });

        // Check if it's an RLS policy error
        if (error.code === '42501' || error.message?.includes('policy')) {
          throw new Error(t("manageStudents.permissionDenied"));
        }

        throw error;
      }

      // RLS silently blocks updates — if data is empty, the policy rejected it
      if (!data || data.length === 0) {
        throw new Error(t("manageStudents.permissionDenied") + " (RLS policy blocked the update. Run the fix-teacher-approval-policy.sql script in Supabase.)");
      }

      console.log("Student approved successfully. Updated data:", data);
      setAlertModal({ isOpen: true, title: t("manageStudents.successTitle"), message: t("manageStudents.studentApprovedSuccess"), type: "success" });
      await fetchStudents();
    } catch (err) {
      console.error("handleApprove error:", err);
      setAlertModal({
        isOpen: true,
        title: t("manageStudents.errorTitle"),
        message: err.message || t("manageStudents.errorApprovingStudent"),
        type: "error"
      });
    }
  };

  const handleReject = async (studentId) => {
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.rejectStudentTitle"),
      message: t("manageStudents.rejectStudentMessage"),
      onConfirm: async () => {
        try {
          const { data, error } = await supabase
            .from("users")
            .update({ approved: false })
            .eq("id", studentId)
            .select();

          if (error) throw error;
          if (!data || data.length === 0) {
            throw new Error(t("manageStudents.permissionDenied"));
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await fetchStudents();
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: t("manageStudents.errorRejectingStudent") + err.message, type: "error" });
        }
      }
    });
  };

  const handleDelete = async (studentId) => {
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.deleteStudentTitle"),
      message: t("manageStudents.deleteStudentMessage"),
      onConfirm: async () => {
        try {
          // Use RPC to delete from both public and auth tables
          // We removed the fallback because using standard delete() creates orphaned auth users.
          // If this fails, we want to know about it (alert modal), so we can fix the RPC/Permissions.
          const { error } = await supabase.rpc('delete_student_account', {
            target_user_id: studentId
          });

          if (error) {
            console.error("RPC Delete Error:", error);
            throw error;
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await fetchStudents();
          setShowDetails(false);
        } catch (err) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: t("manageStudents.errorDeletingStudent") + err.message, type: "error" });
        }
      }
    });
  };

  const resetCreateStudentState = () => {
    setNewStudentForm({
      name: "",
      email: "",
      studentId: "",
      password: "",
      confirmPassword: "",
    });
    setCreateStudentError("");
    setCreateStudentSuccess(null);
  };

  const closeCreateStudentModal = () => {
    setShowCreateModal(false);
    resetCreateStudentState();
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    setCreateStudentError("");
    setCreateStudentSuccess(null);

    const name = newStudentForm.name.trim();
    const email = newStudentForm.email.trim().toLowerCase();
    const studentId = newStudentForm.studentId.trim();
    const password = newStudentForm.password;
    const confirmPassword = newStudentForm.confirmPassword;

    if (!name) {
      setCreateStudentError(t("manageStudents.createStudentNameRequired"));
      return;
    }

    if (!email) {
      setCreateStudentError(t("manageStudents.createStudentEmailRequired"));
      return;
    }

    if (!password || password.length < 6) {
      setCreateStudentError(t("manageStudents.createStudentPasswordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setCreateStudentError(t("manageStudents.createStudentPasswordMismatch"));
      return;
    }

    setCreatingStudent(true);

    try {
      // Check if user exists using main client (read-only check usually fine)
      const { data: existingUser, error: existingUserError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingUserError && existingUserError.code !== "PGRST116") {
        throw existingUserError;
      }

      if (existingUser) {
        setCreateStudentError(t("manageStudents.createStudentEmailExists"));
        setCreatingStudent(false);
        return;
      }

      // CRITICAL FIX: Use a temporary Supabase client to create the student.
      // This prevents the main client (Teacher) from being signed out/switched to the new Student session.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // Don't overwrite localStorage
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // Sign up the student using the temp client
      const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "student",
            teacher_id: appState.currentUser.id,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const newUser = signUpData?.user;

      if (!newUser) {
        throw new Error(t("manageStudents.createStudentNoUser"));
      }

      const profilePayload = {
        id: newUser.id,
        name,
        email,
        role: "student",
        student_id: studentId || null,
        teacher_id: appState.currentUser.id,
        school_id: appState.currentUser.school_id || null, // Inherit school from teacher
        approved: true,
        verified: true,
      };

      // Use the temp client to insert the profile (as the new Student user)
      // This works because the temp client is currently partially logged in as the new user
      const { error: profileError } = await tempSupabase.from("users").upsert([profilePayload]);

      if (profileError) {
        throw profileError;
      }

      // Success! Update UI
      setCreateStudentSuccess({
        name,
        email,
        password,
      });

      // Don't clear form yet - waiting for user to close or create another
      await fetchStudents(); // Refresh the list - should work now as Teacher session is intact

    } catch (err) {
      console.error("Error creating student:", err);
      setCreateStudentError(err.message || t("manageStudents.createStudentGenericError"));
    } finally {
      setCreatingStudent(false);
    }
  };

  const fetchStudentPerformance = async (studentId) => {
    try {
      // Get student's quiz participation
      const { data: participations, error: partError } = await supabase
        .from("session_participants")
        .select(`
          id,
          score,
          joined_at,
          quiz_sessions!inner(
            id,
            quiz_id,
            created_at,
            quizzes(title)
          )
        `)
        .eq("user_id", studentId)
        .order("joined_at", { ascending: false });

      if (partError) throw partError;

      // Get student's answers
      const { data: answers, error: ansError } = await supabase
        .from("quiz_answers")
        .select("is_correct, points_earned")
        .in(
          "participant_id",
          participations?.map((p) => p.id) || []
        );

      if (ansError) throw ansError;

      const totalQuizzes = participations?.length || 0;
      const totalScore = participations?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
      const correctAnswers = answers?.filter((a) => a.is_correct).length || 0;
      const totalAnswers = answers?.length || 0;
      const accuracy = totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(1) : 0;

      return {
        totalQuizzes,
        totalScore,
        accuracy,
        recentQuizzes: participations?.slice(0, 5) || [],
      };
    } catch (err) {
      console.error("Error fetching student performance:", err);
      return {
        totalQuizzes: 0,
        totalScore: 0,
        accuracy: 0,
        recentQuizzes: [],
      };
    }
  };

  const viewStudentDetails = async (student) => {
    setSelectedStudent(student);
    setShowDetails(true);
    setIsEditing(false); // Reset editing state
    const performance = await fetchStudentPerformance(student.id);
    setSelectedStudent((prev) => (prev && prev.id === student.id ? { ...prev, performance } : prev));
  };

  const handleUpdateStudent = async (event) => {
    event.preventDefault();
    setUpdatingStudent(true);

    try {
      const { error } = await supabase.rpc('update_student_account', {
        target_user_id: selectedStudent.id,
        new_name: editForm.name,
        new_student_id: editForm.studentId,
        new_password: editForm.password || null
      });

      if (error) throw error;

      setAlertModal({
        isOpen: true,
        title: t("manageStudents.successTitle"),
        message: t("manageStudents.updateStudentSuccess"),
        type: "success"
      });

      setIsEditing(false);
      await fetchStudents();

      // Update selected student with new details
      setSelectedStudent(prev => ({
        ...prev,
        name: editForm.name,
        student_id: editForm.studentId
      }));
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t("manageStudents.errorTitle"),
        message: t("manageStudents.errorUpdatingStudent") + err.message,
        type: "error"
      });
    } finally {
      setUpdatingStudent(false);
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and reset to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredStudents = students
    .filter((student) => {
      // Filter logic
      // 1. If filter is 'unlinked', explicitly show only unlinked students
      //    that share the same school_id as the current teacher
      if (filterStatus === "unlinked") {
        const isUnlinked = student.teacher_id === null;
        if (!isUnlinked) return false;

        // Only show unlinked students from the same school
        const teacherSchoolId = appState.currentUser?.school_id;
        if (teacherSchoolId && student.school_id !== teacherSchoolId) return false;

        // Apply search if needed
        return (
          student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // 2. For all other filters, show ONLY my students
      if (student.teacher_id !== appState.currentUser.id) {
        return false;
      }

      const matchesSearch =
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterStatus === "my_students" ||
        (filterStatus === "approved" && student.approved && student.verified) ||
        (filterStatus === "pending" && !student.approved) ||
        (filterStatus === "unverified" && !student.verified);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let valueA, valueB;

      switch (sortColumn) {
        case "name":
          valueA = (a.name || "").toLowerCase();
          valueB = (b.name || "").toLowerCase();
          break;
        case "studentId":
          valueA = (a.student_id || "").toLowerCase();
          valueB = (b.student_id || "").toLowerCase();
          break;
        case "joined":
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
          break;
        case "quizzesTaken":
          valueA = quizCounts[a.id] || 0;
          valueB = quizCounts[b.id] || 0;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const myStudents = students.filter(s => s.teacher_id === appState.currentUser?.id);
  const unlinkedStudents = students.filter(s =>
    s.teacher_id === null &&
    s.school_id === appState.currentUser?.school_id
  );

  const validSelectableIds = new Set(
    getSelectableStudentIds(
      students,
      filterStatus,
      appState.currentUser?.id,
      appState.currentUser?.school_id,
    ),
  );
  const effectiveSelectedStudentIds = pruneSelectedIds(selectedStudentIds, validSelectableIds);

  const visibleSelectableIds = getSelectableStudentIds(
    filteredStudents,
    filterStatus,
    appState.currentUser?.id,
    appState.currentUser?.school_id,
  );
  const selectionState = getSelectionState(effectiveSelectedStudentIds, visibleSelectableIds);

  const toggleSelectStudent = (studentId, options = {}) => {
    setSelectedStudentIds((prev) => {
      const pruned = pruneSelectedIds(prev, validSelectableIds);
      return options.shiftKey
        ? toggleStudentRangeSelection(pruned, visibleSelectableIds, lastSelectedIdRef.current, studentId)
        : toggleStudentSelection(pruned, studentId);
    });
    lastSelectedIdRef.current = studentId;
  };

  const toggleSelectAllVisible = () => {
    setSelectedStudentIds((prev) =>
      toggleSelectAllVisibleDomain(pruneSelectedIds(prev, validSelectableIds), visibleSelectableIds)
    );
    lastSelectedIdRef.current = null;
  };

  const clearStudentSelection = () => {
    setSelectedStudentIds(new Set());
    lastSelectedIdRef.current = null;
  };

  return {
    students, myStudents, unlinkedStudents, pendingStudents, quizCounts, searchTerm, setSearchTerm,
    filterStatus, setFilterStatus, loading, error,
    selectedStudent, setSelectedStudent, showDetails, setShowDetails,
    alertModal, setAlertModal, confirmModal, setConfirmModal,
    showCreateModal, setShowCreateModal,
    newStudentForm, setNewStudentForm,
    creatingStudent, createStudentError, createStudentSuccess,
    sortColumn, sortDirection, isEditing, setIsEditing,
    editForm, setEditForm, updatingStudent, highlightedIds,
    filteredStudents,
    selectedStudentIds: effectiveSelectedStudentIds, selectionState, isBulkProcessing,
    toggleSelectStudent, toggleSelectAllVisible, clearStudentSelection,
    fetchStudents, handleLink, handleBulkLink, handleUnlink, handleBulkUnlink, handleApprove, handleReject,
    handleDelete, resetCreateStudentState, closeCreateStudentModal,
    handleCreateStudent, fetchStudentPerformance, viewStudentDetails,
    handleUpdateStudent, handleSort,
  };
}
