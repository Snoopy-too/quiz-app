import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { ClipboardList, Clock, AlertTriangle, CheckCircle, XCircle, Play, ArrowLeft, Loader2, Calendar } from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import { useTranslation } from "react-i18next";

export default function AssignedQuizzes({ setView, appState, onStartAssignment }) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending"); // pending, completed, expired

  useEffect(() => {
    if (appState.currentUser?.id) {
      fetchAssignments();
    }
  }, [appState.currentUser]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Try to update expired assignments (ignore error if function doesn't exist yet)
      try {
        await supabase.rpc("check_expired_assignments");
      } catch (rpcErr) {
        console.log("RPC check_expired_assignments not available, skipping");
      }

      // Fetch all assignments for this student
      const { data, error: fetchError } = await supabase
        .from("quiz_assignments")
        .select(`
          *,
          quizzes (
            id,
            title,
            category_id,
            categories (
              name
            )
          ),
          users!quiz_assignments_teacher_id_fkey (
            name
          )
        `)
        .eq("student_id", appState.currentUser.id)
        .order("deadline", { ascending: true });

      if (fetchError) throw fetchError;
      setAssignments(data || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isUrgent = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    return diff > 0 && diff < 24 * 60 * 60 * 1000; // Less than 24 hours
  };

  const formatDeadline = (deadline) => {
    const date = new Date(deadline);
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredAssignments = assignments.filter(a => {
    if (activeTab === "pending") {
      return a.status === "pending" || a.status === "in_progress";
    }
    return a.status === activeTab;
  });

  const pendingCount = assignments.filter(a => a.status === "pending" || a.status === "in_progress").length;
  const completedCount = assignments.filter(a => a.status === "completed").length;
  const expiredCount = assignments.filter(a => a.status === "expired").length;

  const handleStartQuiz = (assignment) => {
    onStartAssignment(assignment.id);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <VerticalNav setView={setView} appState={appState} />

      <div className="flex-1 md:ml-64">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setView("student-dashboard")}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              {t("common.backToDashboard", "Back to Dashboard")}
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <ClipboardList size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {t("assignedQuizzes.title", "Assigned Quizzes")}
                </h1>
                <p className="text-white/80 mt-1">
                  {t("assignedQuizzes.subtitle", "Complete your assigned quizzes before the deadline")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "pending"
                  ? "bg-orange-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Clock size={18} />
              {t("assignedQuizzes.pending", "Pending")}
              {pendingCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "pending" ? "bg-white/20" : "bg-orange-100 text-orange-600"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "completed"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <CheckCircle size={18} />
              {t("assignedQuizzes.completed", "Completed")}
              {completedCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "completed" ? "bg-white/20" : "bg-green-100 text-green-600"
                }`}>
                  {completedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "expired"
                  ? "bg-gray-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <XCircle size={18} />
              {t("assignedQuizzes.expired", "Expired")}
              {expiredCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "expired" ? "bg-white/20" : "bg-gray-200 text-gray-600"
                }`}>
                  {expiredCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={40} className="animate-spin text-orange-500" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              {activeTab === "pending" ? (
                <>
                  <ClipboardList size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {t("assignedQuizzes.noPending", "No Pending Quizzes")}
                  </h3>
                  <p className="text-gray-500">
                    {t("assignedQuizzes.noPendingHint", "You're all caught up! Check back later for new assignments.")}
                  </p>
                </>
              ) : activeTab === "completed" ? (
                <>
                  <CheckCircle size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {t("assignedQuizzes.noCompleted", "No Completed Quizzes")}
                  </h3>
                  <p className="text-gray-500">
                    {t("assignedQuizzes.noCompletedHint", "Complete your pending quizzes to see them here.")}
                  </p>
                </>
              ) : (
                <>
                  <XCircle size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {t("assignedQuizzes.noExpired", "No Expired Quizzes")}
                  </h3>
                  <p className="text-gray-500">
                    {t("assignedQuizzes.noExpiredHint", "Great job completing your quizzes on time!")}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 ${
                    assignment.status === "completed"
                      ? "border-green-500"
                      : assignment.status === "expired"
                      ? "border-gray-400"
                      : isUrgent(assignment.deadline)
                      ? "border-red-500"
                      : "border-orange-500"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">
                          {assignment.quizzes?.title || "Quiz"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                          <span>
                            {t("assignedQuizzes.assignedBy", "Assigned by")}: {assignment.users?.name || "Teacher"}
                          </span>
                          {assignment.quizzes?.categories?.name && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                              {assignment.quizzes.categories.name}
                            </span>
                          )}
                        </div>

                        {/* Deadline Info */}
                        <div className="mt-3">
                          {assignment.status === "completed" ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle size={18} />
                              <span className="font-medium">
                                {t("assignedQuizzes.completedOn", "Completed")} - {t("assignedQuizzes.score", "Score")}: {assignment.score}/{assignment.total_questions * 100}
                              </span>
                            </div>
                          ) : assignment.status === "expired" ? (
                            <div className="flex items-center gap-2 text-gray-500">
                              <XCircle size={18} />
                              <span>{t("assignedQuizzes.deadlinePassed", "Deadline passed")}: {formatDeadline(assignment.deadline)}</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-2 ${isUrgent(assignment.deadline) ? "text-red-600" : "text-orange-600"}`}>
                              {isUrgent(assignment.deadline) ? (
                                <AlertTriangle size={18} />
                              ) : (
                                <Calendar size={18} />
                              )}
                              <span>
                                <span className="font-medium">{t("assignedQuizzes.deadline", "Deadline")}:</span> {formatDeadline(assignment.deadline)}
                              </span>
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                                isUrgent(assignment.deadline) ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                              }`}>
                                {getTimeRemaining(assignment.deadline)} {t("assignedQuizzes.left", "left")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {(assignment.status === "pending" || assignment.status === "in_progress") && (
                        <button
                          onClick={() => handleStartQuiz(assignment)}
                          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
                        >
                          <Play size={20} />
                          {assignment.status === "in_progress"
                            ? t("assignedQuizzes.continueQuiz", "Continue")
                            : t("assignedQuizzes.startQuiz", "Start Quiz")}
                        </button>
                      )}

                      {assignment.status === "completed" && (
                        <button
                          onClick={() => onStartAssignment(assignment.id, true)} // true = view results only
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          {t("assignedQuizzes.viewResults", "View Results")}
                        </button>
                      )}
                    </div>

                    {/* Progress indicator for in_progress */}
                    {assignment.status === "in_progress" && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>{t("assignedQuizzes.progress", "Progress")}</span>
                          <span>{assignment.current_question_index}/{assignment.total_questions}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${(assignment.current_question_index / assignment.total_questions) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
