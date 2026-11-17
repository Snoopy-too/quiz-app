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
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  EmptyState,
  Skeleton,
  IconButton,
} from "../ui";
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
      <div className="min-h-screen bg-canvas">
        <PageHeader
          title={t("reports.title")}
          description={t("teacher.reportsDescription")}
        />
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <Card>
            <CardBody className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-48 w-full" />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas">
        <PageHeader
          title={t("reports.title")}
          description={t("teacher.reportsDescription")}
        />
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <Card className="border-danger-600/40">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-danger-600">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">
                  {t("reports.errorTitle")}: {error}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setView("teacher-dashboard")}>
                {t("reports.backToDashboard")}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const renderSortIcon = (config, key) => {
    if (config.key !== key) return null;
    return config.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 text-brand-600" aria-hidden="true" />
    );
  };

  const tabs = [
    { key: "all", label: t("reports.allQuizzes") },
    { key: "course", label: t("reports.courseQuizzes") },
    { key: "non-course", label: t("reports.nonCourseQuizzes") },
    { key: "survey", label: t("reports.surveyQuizzes", "Survey Quizzes") },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        breadcrumbs={
          selectedQuiz ? (
            <button
              type="button"
              onClick={() => {
                setSelectedQuiz(null);
                setQuizStats(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t("reports.backToQuizList")}
            </button>
          ) : undefined
        }
        title={
          selectedQuiz
            ? `${selectedQuiz.title} — ${t("reports.analytics")}`
            : `${t("reports.title")}${teacherName ? ` — ${teacherName}` : ""}`
        }
        description={!selectedQuiz ? t("teacher.reportsDescription") : undefined}
        actions={
          selectedQuiz ? (
            <Button variant="secondary" size="sm" onClick={() => handleExport(selectedQuiz)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("reports.actionExport", "Export")}
            </Button>
          ) : teacherId ? (
            <Button variant="secondary" size="sm" onClick={() => setView("superadmin-dashboard")}>
              &larr; Back to Dashboard
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* Global Student Performance Section */}
        {!selectedQuiz && (
          <section className="space-y-4">
            <button
              id="toggle-student-performance"
              type="button"
              onClick={() => setShowStudentPerformance((prev) => !prev)}
              className="group flex w-full items-center gap-3 text-left"
            >
              <h2 className="text-lg font-semibold text-ink">
                {t("reports.studentPerformanceGlobal")}
              </h2>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                {showStudentPerformance ? (
                  <ChevronUp size={18} aria-hidden="true" />
                ) : (
                  <ChevronDown size={18} aria-hidden="true" />
                )}
              </span>
              <span className="text-sm font-medium text-ink-muted">
                {showStudentPerformance
                  ? t("reports.hideStudentPerformance")
                  : t("reports.showStudentPerformance")}
              </span>
            </button>

            {showStudentPerformance && (
              <>
                {studentPerformanceLoading ? (
                  <Card>
                    <CardBody className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </CardBody>
                  </Card>
                ) : studentPerformance.length === 0 ? (
                  <EmptyState
                    icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
                    title={t("reports.noStudentDataAvailable")}
                  />
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
          </section>
        )}

        {/* Quiz Selection or Selected Quiz Detail */}
        {!selectedQuiz ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-ink">{t("reports.quizReports")}</h2>

              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2">
                {tabs.map(({ key, label }) => {
                  const active = reportTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReportTab(key)}
                      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-brand-600 text-white shadow-sm"
                          : "border border-line bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredQuizzes.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
                title={t("reports.noQuizzesFound")}
                primaryAction={
                  !teacherId
                    ? {
                        label: t("reports.createQuiz"),
                        onClick: () => setView("create-quiz"),
                      }
                    : undefined
                }
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="w-12 px-4 py-3.5 text-left">
                          <input
                            type="checkbox"
                            aria-label={t("manager.selectAll")}
                            checked={
                              selectedReports.length === filteredQuizzes.length &&
                              filteredQuizzes.length > 0
                            }
                            onChange={(e) => handleSelectAll(e, filteredQuizzes)}
                            className="h-4 w-4 rounded border-line text-brand-600 focus:ring-2 focus:ring-accent-500"
                          />
                        </th>
                        <th className="px-5 py-3.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort("title")}
                            className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                          >
                            {reportTab === "survey"
                              ? t("reports.tableHeaderSurveyTitle", "Survey Title")
                              : t("reports.tableHeaderQuizTitle")}
                            {renderSortIcon(sortConfig, "title")}
                          </button>
                        </th>
                        <th className="px-5 py-3.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort("date")}
                            className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                          >
                            {reportTab === "survey"
                              ? t("reports.tableHeaderLastAdministered", "Last Administered")
                              : t("reports.tableHeaderDateTime")}
                            {renderSortIcon(sortConfig, "date")}
                          </button>
                        </th>
                        {reportTab !== "survey" && (
                          <th className="px-5 py-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => handleSort("mode")}
                              className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                            >
                              {t("reports.tableHeaderMode")}
                              {renderSortIcon(sortConfig, "mode")}
                            </button>
                          </th>
                        )}
                        <th className="px-5 py-3.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort("players")}
                            className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                          >
                            {reportTab === "survey"
                              ? t("reports.tableHeaderTimesAdministered", "Times Administered")
                              : t("reports.tableHeaderPlayers")}
                            {renderSortIcon(sortConfig, "players")}
                          </button>
                        </th>
                        <th className="w-12 px-5 py-3.5 text-right">
                          <span className="sr-only">{t("common.actions")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredQuizzes.map((quiz) => (
                        <tr key={quiz.id} className="transition-colors hover:bg-surface-muted/40">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              aria-label={quiz.title}
                              checked={selectedReports.includes(quiz.id)}
                              onChange={() => handleCheckboxChange(quiz.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-2 focus:ring-accent-500"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleQuizSelect(quiz)}
                              className="text-left font-semibold text-ink transition-colors hover:text-brand-600"
                            >
                              {quiz.title}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-ink-muted">
                            {quiz.latestSession
                              ? new Date(quiz.latestSession.created_at).toLocaleString()
                              : t("reports.neverAdministered", "Never")}
                          </td>
                          {reportTab !== "survey" && (
                            <td className="px-5 py-4">
                              <Badge
                                variant={
                                  quiz.mode === "Team" || quiz.mode === "team" ? "brand" : "success"
                                }
                              >
                                {quiz.mode === "Team" || quiz.mode === "team"
                                  ? t("reports.teamMode")
                                  : t("reports.individual")}
                              </Badge>
                            </td>
                          )}
                          <td className="px-5 py-4 text-ink-muted">
                            {reportTab === "survey"
                              ? `${quiz.completedCount} ${
                                  quiz.completedCount === 1
                                    ? t("reports.time", "time")
                                    : t("reports.times", "times")
                                }`
                              : `${quiz.completedCount} ${
                                  quiz.completedCount !== 1
                                    ? t("reports.sessions")
                                    : t("reports.session")
                                }`}
                          </td>
                          <td className="relative px-5 py-4 text-right">
                            <IconButton
                              aria-label={t("common.actions")}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === quiz.id ? null : quiz.id);
                              }}
                            >
                              <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            </IconButton>

                            {openMenuId === quiz.id && (
                              <div className="absolute right-5 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 text-left shadow-pop">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuizSelect(quiz);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
                                >
                                  <Eye size={15} aria-hidden="true" />
                                  {t("reports.actionView")}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExport(quiz);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
                                >
                                  <Download size={15} aria-hidden="true" />
                                  {t("reports.actionExport", "Export")}
                                </button>
                                {!teacherId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(quiz);
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 transition-colors hover:bg-red-50"
                                  >
                                    <Trash2 size={15} aria-hidden="true" />
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
              </Card>
            )}
          </section>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats Cards */}
            <QuizStatsCards quizStats={quizStats} isSurvey={selectedQuiz.is_survey} />

            {/* Student Performance Leaderboard (Selected Quiz) */}
            {!selectedQuiz.is_survey && quizStats && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <h3 className="text-base font-semibold text-ink">
                    {t("reports.studentPerformance")}
                  </h3>
                </CardHeader>
                {quizStats.studentPerformance.length === 0 ? (
                  <CardBody>
                    <p className="py-6 text-center text-sm text-ink-muted">
                      {t("reports.noStudentData")}
                    </p>
                  </CardBody>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        <tr>
                          <th className="px-5 py-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => handleQuizStudentSort("rank")}
                              className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                            >
                              {t("reports.rank")}
                              {renderSortIcon(quizStudentSortConfig, "rank")}
                            </button>
                          </th>
                          <th className="px-5 py-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => handleQuizStudentSort("student")}
                              className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                            >
                              {t("reports.student")}
                              {renderSortIcon(quizStudentSortConfig, "student")}
                            </button>
                          </th>
                          <th className="px-5 py-3.5 text-left">{t("reports.studentId")}</th>
                          <th className="px-5 py-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => handleQuizStudentSort("score")}
                              className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                            >
                              {t("reports.score")}
                              {renderSortIcon(quizStudentSortConfig, "score")}
                            </button>
                          </th>
                          <th className="px-5 py-3.5 text-left">{t("reports.questions")}</th>
                          <th className="px-5 py-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => handleQuizStudentSort("accuracy")}
                              className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                            >
                              {t("reports.accuracyHeader")}
                              {renderSortIcon(quizStudentSortConfig, "accuracy")}
                            </button>
                          </th>
                          <th className="px-5 py-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => handleQuizStudentSort("date")}
                              className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                            >
                              {t("reports.tableHeaderDateTime")}
                              {renderSortIcon(quizStudentSortConfig, "date")}
                            </button>
                          </th>
                          <th className="px-5 py-3.5 text-right">{t("reports.tableHeaderActions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {sortedQuizPerformance.map((student) => (
                          <tr key={student.id} className="transition-colors hover:bg-surface-muted/40">
                            <td className="px-5 py-4 font-semibold text-ink">#{student.rank}</td>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => handleStudentSelect(student)}
                                className="text-left font-semibold text-ink transition-colors hover:text-brand-600"
                              >
                                {student.name}
                              </button>
                            </td>
                            <td className="px-5 py-4 font-mono text-ink-muted">
                              {student.studentIdNo || t("manageStudents.notApplicable")}
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-base font-bold text-success-600">{student.score}</span>
                            </td>
                            <td className="px-5 py-4 text-ink-muted">
                              {student.correctAnswers}/{student.questionsAnswered}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`font-semibold ${
                                  student.accuracy > 80
                                    ? "text-success-600"
                                    : student.accuracy > 50
                                      ? "text-amber-700"
                                      : "text-danger-600"
                                }`}
                              >
                                {student.accuracy}%
                              </span>
                            </td>
                            <td className="px-5 py-4 text-ink-muted">
                              {student.takenAt
                                ? new Date(student.takenAt).toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <IconButton
                                aria-label={t("reports.actionViewReport", "View Session Performance")}
                                size="sm"
                                onClick={() => handleViewAttemptDetail(student)}
                                title={t("reports.actionViewReport", "View Session Performance")}
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              </IconButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
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
