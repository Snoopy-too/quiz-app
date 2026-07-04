import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useTranslation } from "react-i18next";

export function useReports({ setView, initialQuizId, onClearInitialQuizId, teacherId }) {
  const { t } = useTranslation();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizStats, setQuizStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [selectedReports, setSelectedReports] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [studentPerformance, setStudentPerformance] = useState([]);
  const [studentPerformanceLoading, setStudentPerformanceLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [studentSortConfig, setStudentSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [quizStudentSortConfig, setQuizStudentSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [reportTab, setReportTab] = useState('all'); // 'all' | 'course' | 'non-course' | 'survey'
  const [showStudentPerformance, setShowStudentPerformance] = useState(false);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    if (teacherId) {
      supabase
        .from("users")
        .select("name")
        .eq("id", teacherId)
        .single()
        .then(({ data }) => {
          if (data) setTeacherName(data.name);
        });
    } else {
      setTeacherName("");
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTeacherQuizzes();
    fetchStudentPerformance();
  }, [teacherId]);

  useEffect(() => {
    if (initialQuizId && quizzes.length > 0) {
      const quiz = quizzes.find(q => q.id === initialQuizId);
      if (quiz) {
        handleQuizSelect(quiz);
        if (onClearInitialQuizId) {
          onClearInitialQuizId();
        }
      }
    }
  }, [initialQuizId, quizzes]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchStudentPerformance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const effectiveTeacherId = teacherId || user.id;

      // 1. Get teacher's students
      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('id, name, student_id')
        .eq('teacher_id', effectiveTeacherId)
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      const studentIds = students.map(s => s.id);

      // 2. Get all session participations for these students with quiz info
      const { data: participations, error: participationsError } = await supabase
        .from('session_participants')
        .select(`
          user_id,
          quiz_answers ( is_correct ),
          session_id,
          quiz_sessions (
            quiz_id,
            status,
            quizzes ( is_course_material )
          )
        `)
        .in('user_id', studentIds);

      if (participationsError) throw participationsError;

      // 2b. Get all completed assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('quiz_assignments')
        .select(`
           id,
           student_id,
           assignment_answers ( is_correct ),
           quizzes ( is_course_material )
        `)
        .in('student_id', studentIds)
        .eq('status', 'completed');

      if (assignmentsError) throw assignmentsError;

      const completedParticipations = participations.filter(
        p => p.quiz_sessions?.status === 'completed'
      );

      // 3. Process the data
      const performanceData = students.map(student => {
        const studentParticipations = completedParticipations.filter(p => p.user_id === student.id);
        const studentAssignments = assignments.filter(a => a.student_id === student.id);

        const quizzesParticipated = new Set(studentParticipations.map(p => p.session_id)).size + studentAssignments.length;

        let totalCorrect = 0;
        let totalAnswered = 0;
        let courseCorrect = 0;
        let courseAnswered = 0;
        let nonCourseCorrect = 0;
        let nonCourseAnswered = 0;

        studentParticipations.forEach(p => {
          const isCourseMaterial = p.quiz_sessions?.quizzes?.is_course_material !== false;
          const correct = p.quiz_answers.filter(a => a.is_correct).length;
          const answered = p.quiz_answers.length;

          totalCorrect += correct;
          totalAnswered += answered;

          if (isCourseMaterial) {
            courseCorrect += correct;
            courseAnswered += answered;
          } else {
            nonCourseCorrect += correct;
            nonCourseAnswered += answered;
          }
        });

        studentAssignments.forEach(a => {
          const isCourseMaterial = a.quizzes?.is_course_material !== false;
          const correct = a.assignment_answers.filter(ans => ans.is_correct).length;
          const answered = a.assignment_answers.length;

          totalCorrect += correct;
          totalAnswered += answered;

          if (isCourseMaterial) {
            courseCorrect += correct;
            courseAnswered += answered;
          } else {
            nonCourseCorrect += correct;
            nonCourseAnswered += answered;
          }
        });

        const averageAccuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
        const courseAccuracy = courseAnswered > 0 ? (courseCorrect / courseAnswered) * 100 : 0;
        const nonCourseAccuracy = nonCourseAnswered > 0 ? (nonCourseCorrect / nonCourseAnswered) * 100 : 0;

        return {
          student_id: student.id,
          name: student.name,
          studentIdNo: student.student_id,
          quizzesParticipated,
          averageAccuracy: averageAccuracy.toFixed(1),
          courseAccuracy: courseAccuracy.toFixed(1),
          nonCourseAccuracy: nonCourseAccuracy.toFixed(1),
        };
      });

      setStudentPerformance(performanceData);
    } catch (err) {
      setError(err.message);
    } finally {
      setStudentPerformanceLoading(false);
    }
  };

  const fetchTeacherQuizzes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const effectiveTeacherId = teacherId || user.user.id;

      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          created_at,
          is_course_material,
          is_survey,
          quiz_sessions(id, status, created_at),
          quiz_assignments(id, status, completed_at)
        `)
        .eq("created_by", effectiveTeacherId);

      if (quizzesError) throw quizzesError;

      const transformedData = quizzesData?.map(quiz => {
        const sessions = quiz.quiz_sessions || [];
        const assignments = quiz.quiz_assignments || [];

        const completedSessions = sessions.filter(s => s.status === "completed");
        const completedAssignments = assignments.filter(a => a.status === "completed");

        const latestSession = completedSessions.length > 0
          ? completedSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
          : null;

        const latestAssignment = completedAssignments.length > 0
          ? completedAssignments.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]
          : null;

        const latestActivityDate = latestSession && latestAssignment
          ? (new Date(latestSession.created_at) > new Date(latestAssignment.completed_at) ? latestSession.created_at : latestAssignment.completed_at)
          : (latestSession ? latestSession.created_at : (latestAssignment ? latestAssignment.completed_at : null));

        return {
          ...quiz,
          sessionCount: sessions.length,
          assignmentCount: assignments.length,
          completedCount: completedSessions.length + completedAssignments.length,
          latestSession: latestActivityDate ? { created_at: latestActivityDate } : null,
          mode: "Individual",
          isCourseMaterial: quiz.is_course_material !== false,
          is_survey: Boolean(quiz.is_survey)
        };
      })
        .filter(quiz => (quiz.sessionCount > 0 || quiz.assignmentCount > 0))
        .sort((a, b) => {
          const dateA = a.latestSession ? new Date(a.latestSession.created_at) : new Date(a.created_at);
          const dateB = b.latestSession ? new Date(b.latestSession.created_at) : new Date(b.created_at);
          return dateB - dateA;
        }) || [];

      setQuizzes(transformedData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchQuizStatistics = async (quizId) => {
    try {
      setLoading(true);

      const { data: sessions, error: sessError } = await supabase
        .from("quiz_sessions")
        .select("id, created_at, status")
        .eq("quiz_id", quizId)
        .eq("status", "completed");

      if (sessError) throw sessError;

      const sessionIds = sessions.map(s => s.id);
      const { data: participants, error: partError } = await supabase
        .from("session_participants")
        .select(`
          id,
          user_id,
          score,
          joined_at,
          users(name, email, student_id)
        `)
        .in("session_id", sessionIds);

      if (partError) throw partError;

      const participantIds = participants?.map(p => p.id) || [];
      const { data: sessionAnswers, error: ansError } = await supabase
        .from("quiz_answers")
        .select(`
          question_id,
          selected_option_index,
          is_correct,
          points_earned,
          participant_id
        `)
        .in("participant_id", participantIds);

      if (ansError) throw ansError;

      const { data: assignments, error: assError } = await supabase
        .from("quiz_assignments")
        .select(`
          id,
          completed_at,
          score,
          status,
          student_id,
          users:student_id(name, email, student_id)
        `)
        .eq("quiz_id", quizId)
        .eq("status", "completed");

      if (assError) throw assError;

      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: assignmentAnswers, error: aaError } = await supabase
        .from("assignment_answers")
        .select(`
          question_id,
          selected_option_index,
          is_correct,
          points_earned,
          assignment_id
        `)
        .in("assignment_id", assignmentIds);

      if (aaError) throw aaError;

      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (qErr) throw qErr;

      const unifiedParticipants = [
        ...(participants || []).map(p => ({
          id: p.id,
          userId: p.user_id,
          name: p.users?.name || "Unknown",
          email: p.users?.email || "",
          studentIdNo: p.users?.student_id || "",
          score: p.score || 0,
          type: 'session',
          sourceId: p.session_id,
          takenAt: p.joined_at
        })),
        ...(assignments || []).map(a => ({
          id: a.id,
          userId: a.student_id,
          name: a.users?.name || "Unknown",
          email: a.users?.email || "",
          studentIdNo: a.users?.student_id || "",
          score: a.score || 0,
          type: 'assignment',
          sourceId: a.id,
          takenAt: a.completed_at
        }))
      ];

      const unifiedAnswers = [
        ...(sessionAnswers || []),
        ...(assignmentAnswers || []).map(a => ({
          ...a,
          participant_id: a.assignment_id
        }))
      ];

      const totalSessions = sessions?.length || 0;
      const totalAssignments = assignments?.length || 0;
      const totalParticipants = unifiedParticipants.length;
      const totalAnswersCount = unifiedAnswers.length;
      const correctAnswersCount = unifiedAnswers.filter(a => a.is_correct).length;

      const averageScore = totalParticipants > 0
        ? (unifiedParticipants.reduce((sum, p) => sum + (p.score || 0), 0) / totalParticipants).toFixed(0)
        : 0;

      const overallAccuracy = totalAnswersCount > 0
        ? ((correctAnswersCount / totalAnswersCount) * 100).toFixed(1)
        : 0;

      const questionAnalytics = questions?.map(q => {
        const questionAnswers = unifiedAnswers.filter(a => a.question_id === q.id);
        const correct = questionAnswers.filter(a => a.is_correct).length;
        const total = questionAnswers.length;
        const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;

        const optionCounts = {};
        q.options?.forEach((_, idx) => {
          optionCounts[idx] = questionAnswers.filter(a => a.selected_option_index === idx).length;
        });

        const wrongAnswers = questionAnswers.filter(a => !a.is_correct);
        const wrongOptionCounts = {};
        wrongAnswers.forEach(a => {
          if (a.selected_option_index !== null && a.selected_option_index !== undefined) {
            wrongOptionCounts[a.selected_option_index] = (wrongOptionCounts[a.selected_option_index] || 0) + 1;
          }
        });
        const mostCommonWrong = Object.entries(wrongOptionCounts).sort((a, b) => b[1] - a[1])[0];

        return {
          ...q,
          totalAnswers: total,
          correctAnswers: correct,
          accuracy: parseFloat(accuracy),
          optionCounts,
          mostCommonWrongAnswer: mostCommonWrong ? {
            index: parseInt(mostCommonWrong[0]),
            count: mostCommonWrong[1],
            text: q.options[mostCommonWrong[0]]?.text
          } : null,
          difficultyKey: accuracy > 80 ? "difficultyEasy" : accuracy > 50 ? "difficultyMedium" : "difficultyHard"
        };
      }) || [];

      const studentPerformanceData = unifiedParticipants.map(p => {
        const studentAnswers = unifiedAnswers.filter(a => a.participant_id === p.id);
        const correct = studentAnswers.filter(a => a.is_correct).length;
        const total = studentAnswers.length;

        return {
          id: p.id,
          studentId: p.userId,
          name: p.name,
          studentIdNo: p.studentIdNo,
          score: p.score,
          questionsAnswered: total,
          correctAnswers: correct,
          accuracy: total > 0 ? ((correct / total) * 100).toFixed(1) : 0,
          type: p.type,
          takenAt: p.takenAt
        };
      }).sort((a, b) => b.score - a.score)
        .map((player, idx) => ({ ...player, rank: idx + 1 }));

      setQuizStats({
        totalSessions,
        totalAssignments,
        totalParticipants,
        averageScore,
        overallAccuracy,
        questionAnalytics,
        studentPerformance: studentPerformanceData,
        sessions: totalSessions
      });

      setLoading(false);
    } catch (err) {
      console.error("Error fetching quiz statistics:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    fetchQuizStatistics(quiz.id);
  };

  const handleStudentSelect = (student) => {
    setView('student-report', { studentId: student.studentId });
  };

  const handleViewAttemptDetail = (student) => {
    setView('student-report', {
      studentId: student.studentId,
      attemptId: student.id,
      attemptType: student.type
    });
  };

  const handleCheckboxChange = (quizId) => {
    setSelectedReports(prev =>
      prev.includes(quizId)
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId]
    );
  };

  const handleSelectAll = (e, filteredQuizzesList) => {
    if (e.target.checked) {
      setSelectedReports(filteredQuizzesList.map(q => q.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleExport = (quiz) => {
    setAlertModal({ isOpen: true, title: t("reports.exportTitle"), message: t("reports.exportMessage", { title: quiz.title }), type: "info" });
  };

  const handleDelete = async (quiz) => {
    setConfirmModal({
      isOpen: true,
      title: t("reports.deleteQuizTitle"),
      message: t("reports.deleteQuizMessage", { title: quiz.title }),
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("quizzes")
            .delete()
            .eq("id", quiz.id);

          if (error) throw error;
          setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null });
          await fetchTeacherQuizzes();
          setOpenMenuId(null);
        } catch (err) {
          setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null });
          setAlertModal({ isOpen: true, title: t("reports.errorTitle"), message: t("reports.errorDeletingQuiz") + err.message, type: "error" });
        }
      }
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleStudentSort = (key) => {
    let direction = 'asc';
    if (studentSortConfig.key === key && studentSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setStudentSortConfig({ key, direction });
  };

  const handleQuizStudentSort = (key) => {
    let direction = 'asc';
    if (quizStudentSortConfig.key === key && quizStudentSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setQuizStudentSortConfig({ key, direction });
  };

  const filteredQuizzes = useMemo(() => {
    const sorted = [...quizzes].sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aValue, bValue;

      switch (sortConfig.key) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'date':
          aValue = a.latestSession ? new Date(a.latestSession.created_at).getTime() : new Date(a.created_at).getTime();
          bValue = b.latestSession ? new Date(b.latestSession.created_at).getTime() : new Date(b.created_at).getTime();
          break;
        case 'mode':
          aValue = (a.mode || '').toLowerCase();
          bValue = (b.mode || '').toLowerCase();
          break;
        case 'players':
          aValue = a.completedCount;
          bValue = b.completedCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted.filter(quiz => {
      if (reportTab === 'all') return !quiz.is_survey;
      if (reportTab === 'course') return quiz.isCourseMaterial && !quiz.is_survey;
      if (reportTab === 'non-course') return !quiz.isCourseMaterial && !quiz.is_survey;
      if (reportTab === 'survey') return quiz.is_survey;
      return true;
    });
  }, [quizzes, sortConfig, reportTab]);

  const sortedStudentPerformance = useMemo(() => {
    return [...studentPerformance].sort((a, b) => {
      if (!studentSortConfig.key) return 0;

      let aValue, bValue;

      switch (studentSortConfig.key) {
        case 'student':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'studentId':
          aValue = (a.studentIdNo || '').toLowerCase();
          bValue = (b.studentIdNo || '').toLowerCase();
          break;
        case 'quizzesParticipated':
          aValue = a.quizzesParticipated;
          bValue = b.quizzesParticipated;
          break;
        case 'averageAccuracy':
          aValue = parseFloat(a.averageAccuracy);
          bValue = parseFloat(b.averageAccuracy);
          break;
        case 'courseAccuracy':
          aValue = parseFloat(a.courseAccuracy);
          bValue = parseFloat(b.courseAccuracy);
          break;
        case 'nonCourseAccuracy':
          aValue = parseFloat(a.nonCourseAccuracy);
          bValue = parseFloat(b.nonCourseAccuracy);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return studentSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return studentSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studentPerformance, studentSortConfig]);

  const sortedQuizPerformance = useMemo(() => {
    if (!quizStats?.studentPerformance) return [];
    return [...quizStats.studentPerformance].sort((a, b) => {
      const { key, direction } = quizStudentSortConfig;
      if (!key) return 0;

      let aValue, bValue;
      switch (key) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'student':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'studentId':
          aValue = (a.studentIdNo || '').toLowerCase();
          bValue = (b.studentIdNo || '').toLowerCase();
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'questions':
          aValue = a.correctAnswers;
          bValue = b.correctAnswers;
          break;
        case 'accuracy':
          aValue = parseFloat(a.accuracy);
          bValue = parseFloat(b.accuracy);
          break;
        case 'takenAt':
          aValue = a.takenAt ? new Date(a.takenAt).getTime() : 0;
          bValue = b.takenAt ? new Date(b.takenAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [quizStats, quizStudentSortConfig]);

  return {
    quizzes,
    selectedQuiz,
    setSelectedQuiz,
    quizStats,
    loading,
    error,
    expandedQuestion,
    setExpandedQuestion,
    selectedReports,
    setSelectedReports,
    openMenuId,
    setOpenMenuId,
    alertModal,
    setAlertModal,
    confirmModal,
    setConfirmModal,
    studentPerformance,
    studentPerformanceLoading,
    sortConfig,
    studentSortConfig,
    quizStudentSortConfig,
    reportTab,
    setReportTab,
    showStudentPerformance,
    setShowStudentPerformance,
    teacherName,
    filteredQuizzes,
    sortedStudentPerformance,
    sortedQuizPerformance,
    handleQuizSelect,
    handleStudentSelect,
    handleViewAttemptDetail,
    handleCheckboxChange,
    handleSelectAll,
    handleExport,
    handleDelete,
    handleSort,
    handleStudentSort,
    handleQuizStudentSort,
    fetchTeacherQuizzes,
    fetchStudentPerformance,
  };
}
