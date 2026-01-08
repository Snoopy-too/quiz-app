import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { Trophy, TrendingUp, Target, Calendar, Award, ArrowLeft, BarChart3 } from "lucide-react";

export default function StudentResults({ appState, onBack }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [quizHistory, setQuizHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'course' | 'non-course'
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    averageAccuracy: 0,
    totalPoints: 0,
  });
  const [courseStats, setCourseStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    averageAccuracy: 0,
    totalPoints: 0,
  });
  const [nonCourseStats, setNonCourseStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    averageAccuracy: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    fetchResults();
  }, [appState.currentUser]);

  const fetchResults = async () => {
    try {
      setLoading(true);

      // Fetch all quiz sessions the student participated in
      const { data: participantData, error: participantError } = await supabase
        .from("session_participants")
        .select(`
          id,
          score,
          joined_at,
          session_id,
          quiz_sessions (
            id,
            pin,
            status,
            created_at,
            quiz_id,
            quizzes (
              id,
              title,
              is_course_material
            )
          )
        `)
        .eq("user_id", appState.currentUser.id)
        .order("joined_at", { ascending: false });

      if (participantError) throw participantError;

      // Filter out cancelled sessions - only show completed quizzes
      const completedParticipantData = participantData.filter(
        p => p.quiz_sessions?.status === 'completed'
      );

      // For each session, fetch the answers
      const historyWithDetails = await Promise.all(
        completedParticipantData.map(async (participant) => {
          const { data: answers, error: answersError } = await supabase
            .from("quiz_answers")
            .select("*")
            .eq("participant_id", participant.id);

          if (answersError) {
            console.error("Error fetching answers:", answersError);
            return null;
          }

          const totalQuestions = answers.length;
          const correctAnswers = answers.filter((a) => a.is_correct).length;
          const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
          const isCourseMaterial = participant.quiz_sessions?.quizzes?.is_course_material !== false;

          return {
            sessionId: participant.session_id,
            participantId: participant.id,
            quizTitle: participant.quiz_sessions?.quizzes?.title || "Unknown Quiz",
            score: participant.score,
            dateTaken: participant.joined_at,
            totalQuestions,
            correctAnswers,
            accuracy,
            answers,
            isCourseMaterial,
          };
        })
      );

      const validHistory = historyWithDetails.filter((h) => h !== null);
      setQuizHistory(validHistory);

      // Separate course and non-course quizzes
      const courseHistory = validHistory.filter(h => h.isCourseMaterial);
      const nonCourseHistory = validHistory.filter(h => !h.isCourseMaterial);

      // Calculate overall statistics
      if (validHistory.length > 0) {
        const totalPoints = validHistory.reduce((sum, h) => sum + h.score, 0);
        const averageScore = totalPoints / validHistory.length;
        const totalAccuracy =
          validHistory.reduce((sum, h) => sum + h.accuracy, 0) / validHistory.length;

        setStats({
          totalQuizzes: validHistory.length,
          averageScore: Math.round(averageScore),
          averageAccuracy: Math.round(totalAccuracy),
          totalPoints,
        });
      }

      // Calculate course statistics
      if (courseHistory.length > 0) {
        const totalPoints = courseHistory.reduce((sum, h) => sum + h.score, 0);
        const averageScore = totalPoints / courseHistory.length;
        const totalAccuracy =
          courseHistory.reduce((sum, h) => sum + h.accuracy, 0) / courseHistory.length;

        setCourseStats({
          totalQuizzes: courseHistory.length,
          averageScore: Math.round(averageScore),
          averageAccuracy: Math.round(totalAccuracy),
          totalPoints,
        });
      }

      // Calculate non-course statistics
      if (nonCourseHistory.length > 0) {
        const totalPoints = nonCourseHistory.reduce((sum, h) => sum + h.score, 0);
        const averageScore = totalPoints / nonCourseHistory.length;
        const totalAccuracy =
          nonCourseHistory.reduce((sum, h) => sum + h.accuracy, 0) / nonCourseHistory.length;

        setNonCourseStats({
          totalQuizzes: nonCourseHistory.length,
          averageScore: Math.round(averageScore),
          averageAccuracy: Math.round(totalAccuracy),
          totalPoints,
        });
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching results:", err);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p className="text-xl text-gray-800">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 md:p-6 mb-4 md:mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-700 hover:text-blue-800 font-semibold mb-3 md:mb-4 transition-colors text-sm md:text-base"
          >
            <ArrowLeft size={20} />
            {t("student.backToDashboard")}
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <Trophy className="text-yellow-500" size={32} />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t("student.viewMyResults")}</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4 md:mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t("reports.allQuizzes")}
            </button>
            <button
              onClick={() => setActiveTab('course')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'course'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t("reports.courseQuizzes")}
            </button>
            <button
              onClick={() => setActiveTab('non-course')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'non-course'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t("reports.nonCourseQuizzes")}
            </button>
          </div>
        </div>

        {/* Stats Cards - display based on active tab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Total Quizzes */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-blue-100 rounded-full p-2 md:p-3">
                <BarChart3 className="text-blue-700" size={20} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">{t("studentReport.totalQuizzes")}</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-700">
                  {activeTab === 'all' ? stats.totalQuizzes :
                   activeTab === 'course' ? courseStats.totalQuizzes :
                   nonCourseStats.totalQuizzes}
                </p>
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-green-100 rounded-full p-2 md:p-3">
                <TrendingUp className="text-green-700" size={20} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">{t("studentReport.averageScore")}</p>
                <p className="text-2xl md:text-3xl font-bold text-green-700">
                  {activeTab === 'all' ? stats.averageScore :
                   activeTab === 'course' ? courseStats.averageScore :
                   nonCourseStats.averageScore}
                </p>
              </div>
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-purple-100 rounded-full p-2 md:p-3">
                <Target className="text-purple-700" size={20} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">{t("studentReport.averageAccuracy")}</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-700">
                  {activeTab === 'all' ? stats.averageAccuracy :
                   activeTab === 'course' ? courseStats.averageAccuracy :
                   nonCourseStats.averageAccuracy}%
                </p>
              </div>
            </div>
          </div>

          {/* Total Points */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-yellow-100 rounded-full p-2 md:p-3">
                <Award className="text-yellow-700" size={20} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">{t("quiz.totalPoints")}</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-700">
                  {activeTab === 'all' ? stats.totalPoints :
                   activeTab === 'course' ? courseStats.totalPoints :
                   nonCourseStats.totalPoints}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz History */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
            <Calendar size={24} className="text-blue-700" />
            {t("studentReport.quizHistory")}
          </h2>

          {(() => {
            const filteredHistory = activeTab === 'all' ? quizHistory :
              activeTab === 'course' ? quizHistory.filter(q => q.isCourseMaterial) :
              quizHistory.filter(q => !q.isCourseMaterial);

            if (filteredHistory.length === 0) {
              return (
                <div className="text-center py-12">
                  <Trophy className="mx-auto mb-4 text-gray-400" size={64} />
                  <p className="text-xl text-gray-600 mb-2">{t("common.noDataAvailable")}</p>
                  <p className="text-gray-500">{t("student.enterPinToJoinIndividually")}</p>
                </div>
              );
            }

            return (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        {t("studentReport.quizTitle")}
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        {t("studentReport.dateTaken")}
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        {t("quiz.questions")}
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        {t("studentReport.score")}
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        {t("studentReport.accuracy")}
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        {t("reports.type")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((quiz, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-800">{quiz.quizTitle}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {formatDate(quiz.dateTaken)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {quiz.correctAnswers}/{quiz.totalQuestions}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                            {quiz.score}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                              quiz.accuracy >= 80
                                ? "bg-green-100 text-green-800"
                                : quiz.accuracy >= 60
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {Math.round(quiz.accuracy)}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            quiz.isCourseMaterial
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {quiz.isCourseMaterial ? t('reports.courseQuizzes') : t('reports.nonCourseQuizzes')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredHistory.map((quiz, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-l-4 border-blue-500 shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-lg text-gray-800">
                        {quiz.quizTitle}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        quiz.isCourseMaterial
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.isCourseMaterial ? t('reports.courseQuizzes') : t('reports.nonCourseQuizzes')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs mb-1">{t("studentReport.dateTaken")}</p>
                        <p className="font-medium text-gray-800">{formatDate(quiz.dateTaken)}</p>
                      </div>

                      <div>
                        <p className="text-gray-600 text-xs mb-1">{t("quiz.questions")}</p>
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {quiz.correctAnswers}/{quiz.totalQuestions}
                        </span>
                      </div>

                      <div>
                        <p className="text-gray-600 text-xs mb-1">{t("studentReport.score")}</p>
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          {quiz.score}
                        </span>
                      </div>

                      <div>
                        <p className="text-gray-600 text-xs mb-1">{t("studentReport.accuracy")}</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            quiz.accuracy >= 80
                              ? "bg-green-100 text-green-800"
                              : quiz.accuracy >= 60
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {Math.round(quiz.accuracy)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
            );
          })()}
        </div>

        {/* Motivational Section */}
        {quizHistory.length > 0 && (
          <div className="mt-4 md:mt-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 md:p-8 text-white text-center">
            <h3 className="text-xl md:text-2xl font-bold mb-2">{t("student.greatJob")}</h3>
            <p className="text-base md:text-lg opacity-90">
              {stats.averageAccuracy >= 80
                ? "You're doing excellent! Keep up the great work!"
                : stats.averageAccuracy >= 60
                ? "You're making good progress! Keep practicing!"
                : "Keep learning and improving! You're on the right track!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
