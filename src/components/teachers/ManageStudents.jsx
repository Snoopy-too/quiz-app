import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { Search, UserCheck, TrendingUp, Award, Clock, CheckCircle, XCircle, UserPlus, ChevronUp, ChevronDown, Copy } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import { useTranslation } from "react-i18next";

export default function ManageStudents({ setView, appState }) {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("my_students"); // my_students, approved, pending, rejected, unlinked
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
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

  useEffect(() => {
    if (appState.currentUser?.id) {
      fetchStudents();
    }
  }, [appState.currentUser]);

  const fetchStudents = async () => {
    if (!appState.currentUser?.id) return;

    try {
      // Fetch students associated with the current teacher OR unlinked students
      // We use .or() syntax properly
      const { data: studentsData, error: studentsError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "student")
        .or(`teacher_id.eq.${appState.currentUser.id},teacher_id.is.null`)
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
      // Pending count is based on MY students only to avoid noise
      setPendingStudents(studentsData?.filter(s => s.teacher_id === appState.currentUser.id && !s.approved) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (studentId) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ teacher_id: appState.currentUser.id })
        .eq("id", studentId);

      if (error) throw error;
      setAlertModal({ isOpen: true, title: t("manageStudents.successTitle"), message: t("manageStudents.linkStudentSuccess"), type: "success" });
      await fetchStudents();
    } catch (err) {
      setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: err.message, type: "error" });
    }
  };

  const handleUnlink = async (studentId) => {
    setConfirmModal({
      isOpen: true,
      title: t("manageStudents.confirmUnlinkTitle"),
      message: t("manageStudents.confirmUnlinkMessage"),
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error } = await supabase
            .from("users")
            .update({ teacher_id: null })
            .eq("id", studentId);

          if (error) throw error;
          setAlertModal({ isOpen: true, title: t("manageStudents.successTitle"), message: t("manageStudents.unlinkStudentSuccess"), type: "success" });
          await fetchStudents();
        } catch (err) {
          setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: err.message, type: "error" });
        }
      }
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
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error } = await supabase
            .from("users")
            .update({ approved: false })
            .eq("id", studentId);

          if (error) throw error;
          await fetchStudents();
        } catch (err) {
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
        setConfirmModal({ ...confirmModal, isOpen: false });
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
          await fetchStudents();
          setShowDetails(false);
        } catch (err) {
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
    setSelectedStudent({ ...student, performance });
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
      if (filterStatus === "unlinked") {
        const isUnlinked = student.teacher_id === null;
        if (!isUnlinked) return false;

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
        default:
          return 0;
      }

      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <VerticalNav currentView="manage-students" setView={setView} appState={appState} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-xl text-gray-600">{t("manageStudents.loadingStudents")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <VerticalNav currentView="manage-students" setView={setView} appState={appState} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">{t("manageStudents.errorTitle")}: {error}</p>
            <button
              onClick={() => setView("teacher-dashboard")}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
            >
              {t("manageStudents.backToDashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="manage-students" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-green-600">{t("manageStudents.title")}</h1>
            <button
              onClick={() => {
                resetCreateStudentState();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition self-start md:self-auto"
            >
              <UserPlus size={18} />
              {t("manageStudents.createStudentButton")}
            </button>
          </div>
        </nav>

        <div className="container mx-auto p-6 relative z-0">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>{t("common.note")}:</strong> {t("manageStudents.teacherCodeNote")}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("manageStudents.totalStudents")}</p>
                  <p className="text-3xl font-bold text-gray-800">{students.length}</p>
                </div>
                <UserCheck className="text-blue-600" size={40} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("manageStudents.approved")}</p>
                  <p className="text-3xl font-bold text-green-600">
                    {students.filter((s) => s.approved).length}
                  </p>
                </div>
                <CheckCircle className="text-green-600" size={40} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("manageStudents.pendingApproval")}</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {pendingStudents.length}
                  </p>
                </div>
                <Clock className="text-orange-600" size={40} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("manageStudents.unverifiedEmail")}</p>
                  <p className="text-3xl font-bold text-red-600">
                    {students.filter((s) => !s.verified).length}
                  </p>
                </div>
                <XCircle className="text-red-600" size={40} />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={t("manageStudents.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus("my_students")}
                  className={`px-4 py-2 rounded-lg ${filterStatus === "my_students"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {t("manageStudents.filterMyStudents")}
                </button>
                <button
                  onClick={() => setFilterStatus("approved")}
                  className={`px-4 py-2 rounded-lg ${filterStatus === "approved"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {t("manageStudents.filterApproved")}
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-4 py-2 rounded-lg ${filterStatus === "pending"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {t("manageStudents.filterPending")}
                </button>
                <button
                  onClick={() => setFilterStatus("unverified")}
                  className={`px-4 py-2 rounded-lg ${filterStatus === "unverified"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {t("manageStudents.filterUnverified")}
                </button>
                <button
                  onClick={() => setFilterStatus("unlinked")}
                  className={`px-4 py-2 rounded-lg ${filterStatus === "unlinked"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {t("manageStudents.filterUnlinked")}
                </button>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th
                    onClick={() => handleSort("name")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      {t("manageStudents.tableHeaderName")}
                      {sortColumn === "name" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderEmail")}</th>
                  <th
                    onClick={() => handleSort("studentId")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      {t("manageStudents.tableHeaderStudentId")}
                      {sortColumn === "studentId" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderStatus")}</th>
                  <th
                    onClick={() => handleSort("joined")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      {t("manageStudents.tableHeaderJoined")}
                      {sortColumn === "joined" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      {t("manageStudents.noStudentsFound")}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{student.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{student.email}</td>
                      <td className="px-6 py-4 text-gray-600">{student.student_id || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {student.approved ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                              {t("manageStudents.statusApproved")}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                              {t("manageStudents.statusPending")}
                            </span>
                          )}
                          {!student.verified && (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              {t("manageStudents.statusUnverified")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewStudentDetails(student)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {t("manageStudents.actionView")}
                          </button>

                          {student.teacher_id === appState.currentUser.id && (
                            <>
                              {!student.approved && (
                                <button
                                  onClick={() => handleApprove(student.id)}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  {t("manageStudents.actionApprove")}
                                </button>
                              )}
                              {student.approved && (
                                <button
                                  onClick={() => handleReject(student.id)}
                                  className="text-orange-600 hover:text-orange-700 font-medium"
                                >
                                  {t("manageStudents.actionRevoke")}
                                </button>
                              )}
                              <button
                                onClick={() => handleUnlink(student.id)}
                                className="text-gray-600 hover:text-gray-700 font-medium"
                              >
                                {t("manageStudents.actionUnlink")}
                              </button>
                              <button
                                onClick={() => handleDelete(student.id)}
                                className="text-red-600 hover:text-red-700 font-medium"
                              >
                                {t("manageStudents.actionDelete")}
                              </button>
                            </>
                          )}

                          {student.teacher_id === null && (
                            <button
                              onClick={() => handleLink(student.id)}
                              className="text-green-600 hover:text-green-700 font-medium"
                            >
                              {t("manageStudents.actionLink")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Student Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">{t("manageStudents.createStudentTitle")}</h2>
              <button
                type="button"
                onClick={closeCreateStudentModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              {createStudentSuccess ? (
                <div className="text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-green-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{t("manageStudents.studentCreatedTitle", "Student Created!")}</h3>
                  <p className="text-gray-600 mb-6">{t("manageStudents.studentCreatedMessage", "The student account has been successfully created.")}</p>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm text-gray-500 mb-2 font-medium uppercase tracking-wide">Login Credentials</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">{t("manageStudents.email")}</p>
                          <p className="font-mono font-medium text-gray-800">{createStudentSuccess.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(createStudentSuccess.email)}
                          className="text-gray-400 hover:text-green-600 transition"
                          title="Copy Email"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">{t("manageStudents.password")}</p>
                          <p className="font-mono font-medium text-gray-800">{createStudentSuccess.password}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(createStudentSuccess.password)}
                          className="text-gray-400 hover:text-green-600 transition"
                          title="Copy Password"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                      <Clock size={12} />
                      {t("manageStudents.copyCredentialsWarning", "Please copy these credentials now. They won't be shown again.")}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeCreateStudentModal}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition"
                    >
                      {t("common.close")}
                    </button>
                    <button
                      type="button" // Use type button to avoid re-submitting form
                      onClick={() => {
                        resetCreateStudentState(); // This clears form and success state, showing the form again
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
                    >
                      {t("manageStudents.createAnother", "Create Another")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    {t("manageStudents.createStudentDescription")}
                  </p>

                  {createStudentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {createStudentError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.createStudentNameLabel")}
                    </label>
                    <input
                      type="text"
                      value={newStudentForm.name}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                      placeholder={t("manageStudents.createStudentNamePlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.createStudentEmailLabel")}
                    </label>
                    <input
                      type="email"
                      value={newStudentForm.email}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                      placeholder={t("manageStudents.createStudentEmailPlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.createStudentIdLabel")}
                    </label>
                    <input
                      type="text"
                      value={newStudentForm.studentId}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, studentId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                      placeholder={t("manageStudents.createStudentIdPlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.createStudentPasswordLabel")}
                    </label>
                    <input
                      type="password"
                      value={newStudentForm.password}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                      placeholder={t("manageStudents.createStudentPasswordPlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.createStudentConfirmPasswordLabel")}
                    </label>
                    <input
                      type="password"
                      value={newStudentForm.confirmPassword}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                      placeholder={t("manageStudents.createStudentConfirmPasswordPlaceholder")}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("manageStudents.createStudentPasswordHint")}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeCreateStudentModal}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={creatingStudent}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {creatingStudent ? t("manageStudents.creatingStudent") : t("manageStudents.createStudentSubmit")}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {showDetails && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? t("manageStudents.editStudentTitle") : t("manageStudents.studentDetails")}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Student Info */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">{t("manageStudents.personalInformation")}</h3>
                  {!isEditing && selectedStudent.teacher_id === appState.currentUser.id && (
                    <button
                      onClick={() => {
                        setEditForm({
                          name: selectedStudent.name,
                          studentId: selectedStudent.student_id || "",
                          password: ""
                        });
                        setIsEditing(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleUpdateStudent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("manageStudents.name")}
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("manageStudents.studentNumber")}
                        </label>
                        <input
                          type="text"
                          value={editForm.studentId}
                          onChange={(e) => setEditForm(prev => ({ ...prev, studentId: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("auth.password")}
                        </label>
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder={t("manageStudents.passwordHint")}
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={updatingStudent}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
                      >
                        {updatingStudent ? t("common.saving") : t("manageStudents.saveChanges")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{t("manageStudents.name")}</p>
                      <p className="font-medium">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("manageStudents.email")}</p>
                      <p className="font-medium">{selectedStudent.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("manageStudents.studentNumber")}</p>
                      <p className="font-medium">{selectedStudent.student_id || t("manageStudents.notApplicable")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("manageStudents.status")}</p>
                      <p className="font-medium">
                        {selectedStudent.approved ? t("manageStudents.statusApprovedDetail") : t("manageStudents.statusPendingDetail")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("manageStudents.emailVerified")}</p>
                      <p className="font-medium">{selectedStudent.verified ? t("manageStudents.yes") : t("manageStudents.no")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("manageStudents.joined")}</p>
                      <p className="font-medium">
                        {new Date(selectedStudent.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Stats */}
              {selectedStudent.performance && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">{t("manageStudents.performanceOverview")}</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <Award className="mx-auto mb-2 text-blue-600" size={32} />
                      <p className="text-sm text-gray-600">{t("manageStudents.quizzesTaken")}</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedStudent.performance.totalQuizzes}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <TrendingUp className="mx-auto mb-2 text-green-600" size={32} />
                      <p className="text-sm text-gray-600">{t("manageStudents.totalScore")}</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedStudent.performance.totalScore}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <CheckCircle className="mx-auto mb-2 text-blue-700" size={32} />
                      <p className="text-sm text-gray-600">{t("manageStudents.accuracy")}</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {selectedStudent.performance.accuracy}%
                      </p>
                    </div>
                  </div>

                  {/* Recent Quizzes */}
                  {selectedStudent.performance.recentQuizzes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">{t("manageStudents.recentQuizActivity")}</h4>
                      <div className="space-y-2">
                        {selectedStudent.performance.recentQuizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
                          >
                            <div>
                              <p className="font-medium">
                                {quiz.quiz_sessions?.quizzes?.title || t("manageStudents.unknownQuiz")}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(quiz.joined_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">{quiz.score}</p>
                              <p className="text-xs text-gray-600">{t("manageStudents.points")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {!selectedStudent.approved ? (
                  <button
                    onClick={() => {
                      handleApprove(selectedStudent.id);
                      setShowDetails(false);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    {t("manageStudents.approveStudent")}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleReject(selectedStudent.id);
                      setShowDetails(false);
                    }}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    {t("manageStudents.revokeApproval")}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedStudent.id)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  {t("manageStudents.deleteStudent")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmStyle="danger"
      />
    </div>
  );
}
