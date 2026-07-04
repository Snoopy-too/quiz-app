import React from "react";
import { useTranslation } from "react-i18next";
import { useReports } from "../../hooks/useReports";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  ChevronLeft,
} from "lucide-react";
import VerticalNav from "../layout/VerticalNav";
import AlertModal from "../common/AlertModal";
import ConfirmModal from "../common/ConfirmModal";
import StudentPerformanceTable from "./reports/StudentPerformanceTable";
import QuizStatsCards from "./reports/QuizStatsCards";
import QuestionAnalysis from "./reports/QuestionAnalysis";

export default function Reports({ setView, appState, initialQuizId, onClearInitialQuizId, teacherId }) {
  const { t } = useTranslation();
  const {
    selectedQuiz,
    setSelectedQuiz,
    quizStats,
    setQuizStats,
    loading,
    error,
    expandedQuestion,
    setExpandedQuestion,
    selectedReports,
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
  } = useReports({ setView, initialQuizId, onClearInitialQuizId, teacherId });

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
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {teacherId && (
              <button
                onClick={() => setView("superadmin-dashboard")}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition text-sm font-medium"
              >
                &larr; Back to Dashboard
              </button>
            )}
            <h1 className="text-2xl font-bold text-blue-600">
              {t("reports.title")}{teacherName ? ` - ${teacherName}` : ""}
            </h1>
          </div>
        </nav>

        <div className="container mx-auto p-6">
          {/* Student Performance Section */}
          {!selectedQuiz && (
            <div className="mb-8">
              <button
                id="toggle-student-performance"
                onClick={() => setShowStudentPerformance((prev) => !prev)}
                className="flex items-center gap-3 w-full text-left group mb-4"
              >
                <h2 className="text-2xl font-bold">{t("reports.studentPerformanceGlobal")}</h2>
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  {showStudentPerformance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
                <span className="text-sm text-gray-500 font-medium">
                  {showStudentPerformance ? t("reports.hideStudentPerformance") : t("reports.showStudentPerformance")}
                </span>
              </button>

              {showStudentPerformance && (
                <>
                  {studentPerformanceLoading ? (
                    <div className="bg-white rounded-xl shadow-md text-center py-12">
                      <p className="text-gray-600">{t("reports.loadingStudentPerformance")}</p>
                    </div>
                  ) : studentPerformance.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md text-center py-12">
                      <p className="text-gray-600">{t("reports.noStudentDataAvailable")}</p>
                    </div>
                  ) : (
                    <StudentPerformanceTable
                      sortedStudentPerformance={sortedStudentPerformance}
                      studentSortConfig={studentSortConfig}
                      handleStudentSort={handleStudentSort}
                      setView={setView}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Quiz Selection */}
          {!selectedQuiz ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">{t("reports.quizReports")}</h2>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setReportTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    reportTab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t("reports.allQuizzes")}
                </button>
                <button
                  onClick={() => setReportTab('course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    reportTab === 'course'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t("reports.courseQuizzes")}
                </button>
                <button
                  onClick={() => setReportTab('non-course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    reportTab === 'non-course'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t("reports.nonCourseQuizzes")}
                </button>
                <button
                  onClick={() => setReportTab('survey')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    reportTab === 'survey'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t("reports.surveyQuizzes", "Survey Quizzes")}
                </button>
              </div>

              {filteredQuizzes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md text-center py-12">
                  <p className="text-gray-600 mb-4">{t("reports.noQuizzesFound")}</p>
                  {!teacherId && (
                    <button
                      onClick={() => setView("create-quiz")}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                    >
                      {t("reports.createQuiz")}
                    </button>
                  )}
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
                            onChange={(e) => handleSelectAll(e, filteredQuizzes)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center gap-1">
                            {reportTab === 'survey' ? t("reports.tableHeaderSurveyTitle", "Survey Title") : t("reports.tableHeaderQuizTitle")}
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
                            {reportTab === 'survey' ? t("reports.tableHeaderLastAdministered", "Last Administered") : t("reports.tableHeaderDateTime")}
                            <span className="text-gray-400">
                              {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </span>
                          </div>
                        </th>
                        {reportTab !== 'survey' && (
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
                        )}
                        <th
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                          onClick={() => handleSort('players')}
                        >
                          <div className="flex items-center gap-1">
                            {reportTab === 'survey' ? t("reports.tableHeaderTimesAdministered", "Times Administered") : t("reports.tableHeaderPlayers")}
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
                        <tr key={quiz.id} className="border-b hover:bg-blue-50 transition-colors">
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
                              : t("reports.neverAdministered", "Never")}
                          </td>
                          {reportTab !== 'survey' && (
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                quiz.mode === "Team" || quiz.mode === "team"
                                  ? "bg-blue-50 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}>
                                {quiz.mode === "Team" || quiz.mode === "team" ? t("reports.teamMode") : t("reports.individual")}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 text-gray-600">
                            {reportTab === 'survey'
                              ? `${quiz.completedCount} ${quiz.completedCount === 1 ? t("reports.time", "time") : t("reports.times", "times")}`
                              : `${quiz.completedCount} ${quiz.completedCount !== 1 ? t("reports.sessions") : t("reports.session")}`
                            }
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
                                  {t("reports.actionView")}
                                </button>
                                {!teacherId && (
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
                                )}
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
                className="mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                {t("reports.backToQuizList")}
              </button>

              <h2 className="text-3xl font-bold mb-6">{selectedQuiz.title} - {t("reports.analytics")}</h2>

              {/* Overview Stats Cards */}
              <QuizStatsCards quizStats={quizStats} isSurvey={selectedQuiz.is_survey} />

              {/* Student Performance Leaderboard (Selected Quiz) */}
              {!selectedQuiz.is_survey && quizStats && (
                <div className="bg-white rounded-xl shadow-md p-6 mb-6 overflow-hidden">
                  <h3 className="text-2xl font-bold mb-4">{t("reports.studentPerformance")}</h3>
                  {quizStats.studentPerformance.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">{t("reports.noStudentData")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th
                              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                              onClick={() => handleQuizStudentSort('rank')}
                            >
                              <div className="flex items-center gap-1">
                                {t("reports.rank")}
                                <span className="text-gray-400">
                                  {quizStudentSortConfig.key === 'rank' && (quizStudentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                </span>
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                              onClick={() => handleQuizStudentSort('student')}
                            >
                              <div className="flex items-center gap-1">
                                {t("reports.student")}
                                <span className="text-gray-400">
                                  {quizStudentSortConfig.key === 'student' && (quizStudentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.studentId")}</th>
                            <th
                              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                              onClick={() => handleQuizStudentSort('score')}
                            >
                              <div className="flex items-center gap-1">
                                {t("reports.score")}
                                <span className="text-gray-400">
                                  {quizStudentSortConfig.key === 'score' && (quizStudentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("reports.questions")}</th>
                            <th
                              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                              onClick={() => handleQuizStudentSort('accuracy')}
                            >
                              <div className="flex items-center gap-1">
                                {t("reports.accuracyHeader")}
                                <span className="text-gray-400">
                                  {quizStudentSortConfig.key === 'accuracy' && (quizStudentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                </span>
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
                              onClick={() => handleQuizStudentSort('date')}
                            >
                              <div className="flex items-center gap-1">
                                {t("reports.tableHeaderDateTime")}
                                <span className="text-gray-400">
                                  {quizStudentSortConfig.key === 'date' && (quizStudentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                              {t("reports.tableHeaderActions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedQuizPerformance.map((student) => (
                            <tr key={student.id} className="border-b hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-800">#{student.rank}</td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => handleStudentSelect(student)}
                                  className="font-bold text-gray-900 hover:text-blue-600 text-left"
                                >
                                  {student.name}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{student.studentIdNo || t("manageStudents.notApplicable")}</td>
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
                              <td className="px-6 py-4 text-gray-600 text-sm">
                                {student.takenAt ? new Date(student.takenAt).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() => handleViewAttemptDetail(student)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors flex items-center justify-center"
                                  title={t("reports.actionViewReport", "View Session Performance")}
                                >
                                  <Eye size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Question Analytics Breakdown */}
              {quizStats && (
                <QuestionAnalysis
                  questionAnalytics={quizStats.questionAnalytics}
                  isSurvey={selectedQuiz.is_survey}
                  expandedQuestion={expandedQuestion}
                  setExpandedQuestion={setExpandedQuestion}
                />
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
