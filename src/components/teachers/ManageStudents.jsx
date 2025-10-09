import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Search, UserCheck, UserX, TrendingUp, Award, Clock, CheckCircle, XCircle } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import { useTranslation } from "react-i18next";

export default function ManageStudents({ setView, appState }) {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, approved, pending, rejected
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Fetch students associated with the current teacher
      const { data: studentsData, error: studentsError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "student")
        .eq("teacher_id", appState.currentUser.id)
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
      setPendingStudents(studentsData?.filter(s => !s.approved) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", studentId);

          if (error) throw error;
          await fetchStudents();
          setShowDetails(false);
        } catch (err) {
          setAlertModal({ isOpen: true, title: t("manageStudents.errorTitle"), message: t("manageStudents.errorDeletingStudent") + err.message, type: "error" });
        }
      }
    });
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
    const performance = await fetchStudentPerformance(student.id);
    setSelectedStudent({ ...student, performance });
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "approved" && student.approved && student.verified) ||
      (filterStatus === "pending" && !student.approved) ||
      (filterStatus === "unverified" && !student.verified);

    return matchesSearch && matchesFilter;
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
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
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
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-green-600">{t("manageStudents.title")}</h1>
        </nav>

        <div className="container mx-auto p-6">
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t("manageStudents.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "all"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("manageStudents.filterAll")}
              </button>
              <button
                onClick={() => setFilterStatus("approved")}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "approved"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("manageStudents.filterApproved")}
              </button>
              <button
                onClick={() => setFilterStatus("pending")}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "pending"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("manageStudents.filterPending")}
              </button>
              <button
                onClick={() => setFilterStatus("unverified")}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "unverified"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("manageStudents.filterUnverified")}
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderName")}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderEmail")}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderStatus")}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderJoined")}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
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
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          {t("manageStudents.actionDelete")}
                        </button>
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

      {/* Student Details Modal */}
      {showDetails && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">{t("manageStudents.studentDetails")}</h2>
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
                <h3 className="text-lg font-semibold mb-3">{t("manageStudents.personalInformation")}</h3>
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
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <CheckCircle className="mx-auto mb-2 text-purple-600" size={32} />
                      <p className="text-sm text-gray-600">{t("manageStudents.accuracy")}</p>
                      <p className="text-2xl font-bold text-purple-600">
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
