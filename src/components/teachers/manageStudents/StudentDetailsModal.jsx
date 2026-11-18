import React from "react";
import { Award, TrendingUp, CheckCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Field, Input, IconButton } from "../../ui";

export default function StudentDetailsModal({
  showDetails,
  setShowDetails,
  selectedStudent,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  handleUpdateStudent,
  updatingStudent,
  handleApprove,
  handleReject,
  handleDelete,
  currentUserId,
}) {
  const { t } = useTranslation();

  if (!showDetails || !selectedStudent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">
            {isEditing ? t("manageStudents.editStudentTitle") : t("manageStudents.studentDetails")}
          </h2>
          <IconButton aria-label={t("common.close")} size="sm" onClick={() => setShowDetails(false)}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="space-y-6 p-6">
          {/* Student Info */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">{t("manageStudents.personalInformation")}</h3>
              {!isEditing && selectedStudent.teacher_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditForm({
                      name: selectedStudent.name,
                      studentId: selectedStudent.student_id || "",
                      password: "",
                    });
                    setIsEditing(true);
                  }}
                >
                  {t("common.edit")}
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={t("manageStudents.name")} required>
                    <Input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label={t("manageStudents.studentNumber")}>
                    <Input
                      type="text"
                      value={editForm.studentId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))}
                    />
                  </Field>
                  <Field label={t("auth.password")} className="sm:col-span-2">
                    <Input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder={t("manageStudents.passwordHint")}
                    />
                  </Field>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    loading={updatingStudent}
                  >
                    {updatingStudent ? t("common.saving") : t("manageStudents.saveChanges")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface-muted/40 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.name")}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{selectedStudent.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.email")}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.studentNumber")}</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-ink">
                    {selectedStudent.student_id || t("manageStudents.notApplicable")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.status")}</p>
                  <div className="mt-1">
                    <Badge variant={selectedStudent.approved ? "success" : "warning"}>
                      {selectedStudent.approved
                        ? t("manageStudents.statusApprovedDetail")
                        : t("manageStudents.statusPendingDetail")}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.emailVerified")}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">
                    {selectedStudent.verified ? t("manageStudents.yes") : t("manageStudents.no")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.joined")}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">
                    {new Date(selectedStudent.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Stats */}
          {selectedStudent.performance && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-ink">{t("manageStudents.performanceOverview")}</h3>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-surface-muted/40 p-4 text-center">
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Award className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.quizzesTaken")}</p>
                  <p className="mt-1 text-2xl font-bold text-ink">
                    {selectedStudent.performance.totalQuizzes}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-muted/40 p-4 text-center">
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-success-600">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.totalScore")}</p>
                  <p className="mt-1 text-2xl font-bold text-ink">
                    {selectedStudent.performance.totalScore}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-muted/40 p-4 text-center">
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-medium text-ink-muted">{t("manageStudents.accuracy")}</p>
                  <p className="mt-1 text-2xl font-bold text-ink">
                    {selectedStudent.performance.accuracy}%
                  </p>
                </div>
              </div>

              {/* Recent Quizzes */}
              {selectedStudent.performance.recentQuizzes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-ink">{t("manageStudents.recentQuizActivity")}</h4>
                  <div className="space-y-2">
                    {selectedStudent.performance.recentQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {quiz.quiz_sessions?.quizzes?.title || t("manageStudents.unknownQuiz")}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {new Date(quiz.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-success-600">{quiz.score}</p>
                          <p className="text-xs text-ink-muted">{t("manageStudents.points")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {selectedStudent.teacher_id === currentUserId && (
            <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
              {!selectedStudent.approved ? (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    handleApprove(selectedStudent.id);
                    setShowDetails(false);
                  }}
                >
                  {t("manageStudents.approveStudent")}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    handleReject(selectedStudent.id);
                    setShowDetails(false);
                  }}
                >
                  {t("manageStudents.revokeApproval")}
                </Button>
              )}
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDelete(selectedStudent.id)}
              >
                {t("manageStudents.deleteStudent")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
