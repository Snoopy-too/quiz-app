import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { BarChart3, TrendingUp, Users, Award, Target, AlertCircle, ChevronDown, ChevronUp, MoreVertical, Download, Trash2, Eye } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import { useTranslation } from "react-i18next";

export default function Reports({ setView, appState }) {
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
  const [reportTab, setReportTab] = useState('all'); // 'all' | 'course' | 'non-course'

  useEffect(() => {
    fetchTeacherQuizzes();
    fetchStudentPerformance();
  }, []);

  const fetchStudentPerformance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get teacher's students
      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('id, name')
        .eq('teacher_id', user.id)
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

      // Filter out cancelled sessions - only include completed quizzes
      const completedParticipations = participations.filter(
        p => p.quiz_sessions?.status === 'completed'
      );

      // 3. Process the data with course/non-course separation
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

        // Process Session Participations
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

        // Process Assignments
        studentAssignments.forEach(a => {
          const isCourseMaterial = a.quizzes?.is_course_material !== false;
          // We use assignment_answers to calculate accuracy
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

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchTeacherQuizzes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      // Fetch teacher's quizzes with session and assignment count
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          created_at,
          is_course_material,
          quiz_sessions(id, status, created_at),
          quiz_assignments(id, status, completed_at)
        `)
        .eq("created_by", user.user.id);

      if (quizzesError) throw quizzesError;

      // Transform data to include session/assignment info for each quiz
      const transformedData = quizzesData?.map(quiz => {
        const sessions = quiz.quiz_sessions || [];
        const assignments = quiz.quiz_assignments || [];

        const completedSessions = sessions.filter(s => s.status === "completed");
        const completedAssignments = assignments.filter(a => a.status === "completed");

        // Find latest activity
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
          latestSession: latestActivityDate ? { created_at: latestActivityDate } : null, // Mock object for sorting
          mode: "Individual", // Default mode
          isCourseMaterial: quiz.is_course_material !== false
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

      // 1. Get all completed sessions for this quiz
      const { data: sessions, error: sessError } = await supabase
        .from("quiz_sessions")
        .select("id, created_at, status")
        .eq("quiz_id", quizId)
        .eq("status", "completed");

      if (sessError) throw sessError;

      // 2. Get all participants from these sessions
      const sessionIds = sessions.map(s => s.id);
      const { data: participants, error: partError } = await supabase
        .from("session_participants")
        .select(`
          id,
          user_id,
          score,
          session_id,
          users(name, email)
        `)
        .in("session_id", sessionIds);

      if (partError) throw partError;

      // 3. Get all answers from these participants
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

      // 4. Get completed assignments for this quiz
      const { data: assignments, error: assError } = await supabase
        .from("quiz_assignments")
        .select(`
          id,
          completed_at,
          score,
          status,
          student_id,
          users:student_id(name, email)
        `)
        .eq("quiz_id", quizId)
        .eq("status", "completed");

      if (assError) throw assError;

      // 5. Get assignment answers
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

      // Get questions
      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (qErr) throw qErr;

      // --- Combine Data ---

      // Unified Participants
      // Add 'type' or similar to distinguish if needed, but for stats we treat them same
      const unifiedParticipants = [
        ...(participants || []).map(p => ({
          id: p.id, // Session Participant ID
          userId: p.user_id,
          name: p.users?.name || "Unknown",
          email: p.users?.email || "",
          score: p.score || 0,
          type: 'session',
          sourceId: p.session_id
        })),
        ...(assignments || []).map(a => ({
          id: a.id, // Assignment ID (acts as Participant ID)
          userId: a.student_id,
          name: a.users?.name || "Unknown",
          email: a.users?.email || "",
          score: a.score || 0,
          type: 'assignment',
          sourceId: a.id
        }))
      ];

      // Unified Answers
      // We need to map assignment_id to 'participant_id' logic for aggregation
      const unifiedAnswers = [
        ...(sessionAnswers || []),
        ...(assignmentAnswers || []).map(a => ({
          ...a,
          participant_id: a.assignment_id // Map assignment_id to participant_id for consistent grouping
        }))
      ];

      // --- Calculate Statistics ---

      const totalSessions = (sessions?.length || 0);
      const totalAssignments = (assignments?.length || 0);
      const totalParticipants = unifiedParticipants.length;
      const totalAnswersCount = unifiedAnswers.length;
      const correctAnswersCount = unifiedAnswers.filter(a => a.is_correct).length;

      const averageScore = totalParticipants > 0
        ? (unifiedParticipants.reduce((sum, p) => sum + (p.score || 0), 0) / totalParticipants).toFixed(0)
        : 0;

      const overallAccuracy = totalAnswersCount > 0
        ? ((correctAnswersCount / totalAnswersCount) * 100).toFixed(1)
        : 0;

      // Question-level analytics
      const questionAnalytics = questions?.map(q => {
        const questionAnswers = unifiedAnswers.filter(a => a.question_id === q.id);
        const correct = questionAnswers.filter(a => a.is_correct).length;
        const total = questionAnswers.length;
        const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;

        // Get option distribution
        const optionCounts = {};
        q.options?.forEach((_, idx) => {
          optionCounts[idx] = questionAnswers.filter(a => a.selected_option_index === idx).length;
        });

        // Find most common wrong answer
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

      // Student performance breakdown
      const studentPerformance = unifiedParticipants.map(p => {
        const studentAnswers = unifiedAnswers.filter(a => a.participant_id === p.id);
        const correct = studentAnswers.filter(a => a.is_correct).length;
        const total = studentAnswers.length;

        return {
          id: p.id,
          studentId: p.userId,
          name: p.name,
          email: p.email,
          score: p.score,
          questionsAnswered: total,
          correctAnswers: correct,
          accuracy: total > 0 ? ((correct / total) * 100).toFixed(1) : 0,
          type: p.type // Optional: show if it was assignment or session?
        };
      }).sort((a, b) => b.score - a.score);

      setQuizStats({
        totalSessions,
        totalAssignments,
        totalParticipants,
        averageScore,
        overallAccuracy,
        questionAnalytics,
        studentPerformance,
        sessions: totalSessions // Legacy prop if used elsewhere
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

  const handleCheckboxChange = (quizId) => {
    setSelectedReports(prev =>
      prev.includes(quizId)
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReports(filteredQuizzes.map(q => q.id));
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
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const { error } = await supabase
            .from("quizzes")
            .delete()
            .eq("id", quiz.id);

          if (error) throw error;
          await fetchTeacherQuizzes();
          setOpenMenuId(null);
        } catch (err) {
          setAlertModal({ isOpen: true, title: t("reports.errorTitle"), message: t("reports.errorDeletingQuiz") + err.message, type: "error" });
        }
      }
    });
  };

  const getPlayerCount = async (quiz) => {
    const sessionIds = quiz.quiz_sessions?.map(s => s.id) || [];
    if (sessionIds.length === 0) return 0;

    const { data, error } = await supabase
      .from("session_participants")
      .select("id")
      .in("session_id", sessionIds);

    return data?.length || 0;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedQuizzes = [...quizzes].sort((a, b) => {
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

  // Filter quizzes based on selected tab
  const filteredQuizzes = sortedQuizzes.filter(quiz => {
    if (reportTab === 'all') return true;
    if (reportTab === 'course') return quiz.isCourseMaterial;
    if (reportTab === 'non-course') return !quiz.isCourseMaterial;
    return true;
  });

  const handleStudentSort = (key) => {
    let direction = 'asc';
    if (studentSortConfig.key === key && studentSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setStudentSortConfig({ key, direction });
  };

  const sortedStudentPerformance = [...studentPerformance].sort((a, b) => {
    if (!studentSortConfig.key) return 0;

    let aValue, bValue;

    switch (studentSortConfig.key) {
      case 'student':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
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

  if (loading && !selectedQuiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">{t("reports.loadingReports")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{t("reports.errorTitle")}: {error}</p>
          <button
            onClick={() => setView("teacher-dashboard")}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            {t("reports.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="reports" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-600">{t("reports.title")}</h1>
        </nav>

        <div className="container mx-auto p-6">
          {/* Student Performance Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">{t("reports.studentPerformanceGlobal")}</h2>
            {studentPerformanceLoading ? (
              <div className="bg-white rounded-xl shadow-md text-center py-12">
                <p className="text-gray-600">{t("reports.loadingStudentPerformance")}</p>
              </div>
            ) : studentPerformance.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md text-center py-12">
                <p className="text-gray-600">{t("reports.noStudentDataAvailable")}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleStudentSort('student')}
                      >
                        <div className="flex items-center gap-1">
                          {t("reports.student")}
                          <span className="text-gray-400">
                            {studentSortConfig.key === 'student' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleStudentSort('quizzesParticipated')}
                      >
                        <div className="flex items-center gap-1">
                          {t("reports.quizzesParticipated")}
                          <span className="text-gray-400">
                            {studentSortConfig.key === 'quizzesParticipated' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleStudentSort('averageAccuracy')}
                      >
                        <div className="flex items-center gap-1">
                          {t("reports.overallAccuracy")}
                          <span className="text-gray-400">
                            {studentSortConfig.key === 'averageAccuracy' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleStudentSort('courseAccuracy')}
                      >
                        <div className="flex items-center gap-1">
                          {t("reports.courseAccuracy")}
                          <span className="text-gray-400">
                            {studentSortConfig.key === 'courseAccuracy' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleStudentSort('nonCourseAccuracy')}
                      >
                        <div className="flex items-center gap-1">
                          {t("reports.nonCourseAccuracy")}
                          <span className="text-gray-400">
                            {studentSortConfig.key === 'nonCourseAccuracy' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudentPerformance.map((student) => (
                      <tr key={student.student_id} className="border-b hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setView('student-report', { studentId: student.student_id })}
                            className="font-bold text-gray-900 hover:text-blue-600 text-left"
                          >
                            {student.name}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{student.quizzesParticipated}</td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${student.averageAccuracy > 80 ? 'text-green-600' :
                            student.averageAccuracy > 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {student.averageAccuracy}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${student.courseAccuracy > 80 ? 'text-green-600' :
                            student.courseAccuracy > 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {student.courseAccuracy}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${student.nonCourseAccuracy > 80 ? 'text-green-600' :
                            student.nonCourseAccuracy > 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {student.nonCourseAccuracy}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quiz Selection */}
          {!selectedQuiz ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">{t("reports.quizReports")}</h2>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setReportTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t("reports.allQuizzes")}
                </button>
                <button
                  onClick={() => setReportTab('course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportTab === 'course'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t("reports.courseQuizzes")}
                </button>
                <button
                  onClick={() => setReportTab('non-course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportTab === 'non-course'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t("reports.nonCourseQuizzes")}
                </button>
              </div>

              {filteredQuizzes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md text-center py-12">
                  <p className="text-gray-600 mb-4">{t("reports.noQuizzesFound")}</p>
                  <button
                    onClick={() => setView("create-quiz")}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    {t("reports.createQuiz")}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            checked={selectedReports.length === filteredQuizzes.length && filteredQuizzes.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center gap-1">
                            {t("reports.tableHeaderQuizTitle")}
                            <span className="text-gray-400">
                              {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </span>
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-1">
                            {t("reports.tableHeaderDateTime")}
                            <span className="text-gray-400">
                              {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </span>
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                          onClick={() => handleSort('mode')}
                        >
                          <div className="flex items-center gap-1">
                            {t("reports.tableHeaderMode")}
                            <span className="text-gray-400">
                              {sortConfig.key === 'mode' && (sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </span>
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                          onClick={() => handleSort('players')}
                        >
                          <div className="flex items-center gap-1">
                            {t("reports.tableHeaderPlayers")}
                            <span className="text-gray-400">
                              {sortConfig.key === 'players' && (sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </span>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuizzes.map((quiz) => (
                        <tr
                          key={quiz.id}
                          className="border-b hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedReports.includes(quiz.id)}
                              onChange={() => handleCheckboxChange(quiz.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleQuizSelect(quiz)}
                              className="font-bold text-gray-900 hover:text-blue-600 text-left"
                            >
                              {quiz.title}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            {quiz.latestSession
                              ? new Date(quiz.latestSession.created_at).toLocaleString()
                              : new Date(quiz.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${quiz.mode === "Team" || quiz.mode === "team"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-green-100 text-green-800"
                              }`}>
                              {quiz.mode === "Team" || quiz.mode === "team" ? t("reports.teamMode") : t("reports.individual")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {quiz.completedCount} {quiz.completedCount !== 1 ? t("reports.sessions") : t("reports.session")}
                          </td>
                          <td className="px-6 py-4 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === quiz.id ? null : quiz.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <MoreVertical size={20} className="text-gray-600" />
                            </button>

                            {openMenuId === quiz.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuizSelect(quiz);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Eye size={16} />
                                  {t("reports.actionView")}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExport(quiz);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Download size={16} />
                                  {t("reports.actionExport")}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(quiz);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 size={16} />
                                  {t("reports.actionDelete")}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Back to Quiz List */}
              <button
                onClick={() => {
                  setSelectedQuiz(null);
                  setQuizStats(null);
                }}
                className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("reports.backToQuizList")}
              </button>

              <h2 className="text-3xl font-bold mb-6">{selectedQuiz.title} - {t("reports.analytics")}</h2>

              {/* Overview Stats */}
              {quizStats && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t("reports.totalSessions")}</p>
                          <p className="text-3xl font-bold text-blue-600">{quizStats.sessions + (quizStats.totalAssignments || 0)}</p>
                        </div>
                        <BarChart3 className="text-blue-600" size={40} />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t("reports.totalParticipants")}</p>
                          <p className="text-3xl font-bold text-green-600">{quizStats.totalParticipants}</p>
                        </div>
                        <Users className="text-green-600" size={40} />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t("reports.averageScore")}</p>
                          <p className="text-3xl font-bold text-blue-700">{quizStats.averageScore}</p>
                        </div>
                        <Award className="text-blue-700" size={40} />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t("reports.overallAccuracy")}</p>
                          <p className="text-3xl font-bold text-orange-600">{quizStats.overallAccuracy}%</p>
                        </div>
                        <Target className="text-orange-600" size={40} />
                      </div>
                    </div>
                  </div>

                  {/* Question Analytics */}
                  <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h3 className="text-2xl font-bold mb-4">{t("reports.questionPerformance")}</h3>
                    <div className="space-y-4">
                      {quizStats.questionAnalytics.map((q, idx) => (
                        <div key={q.id} className="border rounded-lg p-4">
                          <div
                            className="flex justify-between items-start cursor-pointer"
                            onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg font-semibold">{t("reports.questionLabel")}{idx + 1}:</span>
                                <span className="text-gray-800">{q.question_text}</span>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-gray-600">
                                  {t("reports.answeredTimes", { count: q.totalAnswers })}
                                </span>
                                <span className={`font-semibold ${q.accuracy > 80 ? 'text-green-600' :
                                  q.accuracy > 50 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                  {t("reports.accuracy", { percent: q.accuracy })}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${q.difficultyKey === 'difficultyEasy' ? 'bg-green-100 text-green-800' :
                                  q.difficultyKey === 'difficultyMedium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                  {t(`reports.${q.difficultyKey}`)}
                                </span>
                              </div>
                            </div>
                            {expandedQuestion === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>

                          {expandedQuestion === idx && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold mb-3">{t("reports.answerDistribution")}</h4>
                              <div className="space-y-2">
                                {q.options?.map((opt, optIdx) => {
                                  const count = q.optionCounts[optIdx] || 0;
                                  const percentage = q.totalAnswers > 0
                                    ? ((count / q.totalAnswers) * 100).toFixed(1)
                                    : 0;
                                  const isCorrect = opt.is_correct;

                                  return (
                                    <div key={optIdx} className="flex items-center gap-3">
                                      <div className={`w-24 px-2 py-1 rounded text-sm font-medium text-center ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {isCorrect ? t("reports.correct") : t("reports.option", { number: optIdx + 1 })}
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm mb-1">{opt.text}</div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                                            <div
                                              className={`h-4 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-blue-500'
                                                }`}
                                              style={{ width: `${percentage}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-sm font-medium w-16 text-right">
                                            {count} ({percentage}%)
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {q.mostCommonWrongAnswer && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="text-red-600 mt-0.5" size={20} />
                                    <div>
                                      <p className="text-sm font-semibold text-red-800">{t("reports.mostCommonMistake")}</p>
                                      <p className="text-sm text-red-700">
                                        {t("reports.studentsSelected", { count: q.mostCommonWrongAnswer.count, text: q.mostCommonWrongAnswer.text })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Performance Leaderboard */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-2xl font-bold mb-4">{t("reports.studentPerformance")}</h3>
                    {quizStats.studentPerformance.length === 0 ? (
                      <p className="text-gray-600 text-center py-8">{t("reports.noStudentData")}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.rank")}</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.student")}</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.email")}</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.score")}</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.questions")}</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.accuracyHeader")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quizStats.studentPerformance.map((student, idx) => (
                              <tr key={student.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-600' :
                                    idx === 1 ? 'text-gray-400' :
                                      idx === 2 ? 'text-orange-600' : 'text-gray-600'
                                    }`}>
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium">
                                  <button
                                    onClick={() => setView('student-report', { studentId: student.studentId })}
                                    className="font-bold text-gray-900 hover:text-blue-600 text-left"
                                  >
                                    {student.name}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{student.email}</td>
                                <td className="px-6 py-4">
                                  <span className="text-lg font-bold text-green-600">{student.score}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  {student.correctAnswers}/{student.questionsAnswered}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`font-semibold ${student.accuracy > 80 ? 'text-green-600' :
                                    student.accuracy > 50 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {student.accuracy}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
