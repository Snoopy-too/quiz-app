import React from "react";
import { CheckCircle, Clock, Copy, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Field, Input, IconButton } from "../../ui";

export default function CreateStudentModal({
  showCreateModal,
  closeCreateStudentModal,
  handleCreateStudent,
  newStudentForm,
  setNewStudentForm,
  creatingStudent,
  createStudentError,
  createStudentSuccess,
  resetCreateStudentState,
}) {
  const { t } = useTranslation();

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-pop overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">{t("manageStudents.createStudentTitle")}</h2>
          <IconButton
            aria-label={t("common.close")}
            size="sm"
            onClick={closeCreateStudentModal}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        <form onSubmit={handleCreateStudent} className="space-y-4 p-6">
          {createStudentSuccess ? (
            <div className="py-2 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-success-600">
                <CheckCircle className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-ink">
                {t("manageStudents.studentCreatedTitle", "Student Created!")}
              </h3>
              <p className="mb-6 text-sm text-ink-muted">
                {t("manageStudents.studentCreatedMessage", "The student account has been successfully created.")}
              </p>

              <div className="mb-6 rounded-xl border border-line bg-surface-muted/60 p-4 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Login Credentials
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
                    <div>
                      <p className="text-xs text-ink-muted">{t("manageStudents.email")}</p>
                      <p className="font-mono text-sm font-medium text-ink">{createStudentSuccess.email}</p>
                    </div>
                    <IconButton
                      aria-label="Copy Email"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(createStudentSuccess.email)}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
                    <div>
                      <p className="text-xs text-ink-muted">{t("manageStudents.password")}</p>
                      <p className="font-mono text-sm font-medium text-ink">{createStudentSuccess.password}</p>
                    </div>
                    <IconButton
                      aria-label="Copy Password"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(createStudentSuccess.password)}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t("manageStudents.copyCredentialsWarning", "Please copy these credentials now. They won't be shown again.")}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={closeCreateStudentModal}
                >
                  {t("common.close")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  onClick={() => resetCreateStudentState()}
                >
                  {t("manageStudents.createAnother", "Create Another")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                {t("manageStudents.createStudentDescription")}
              </p>

              {createStudentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger-600">
                  {createStudentError}
                </div>
              )}

              <Field label={t("manageStudents.createStudentNameLabel")}>
                <Input
                  type="text"
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t("manageStudents.createStudentNamePlaceholder")}
                />
              </Field>

              <Field label={t("manageStudents.createStudentEmailLabel")}>
                <Input
                  type="email"
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t("manageStudents.createStudentEmailPlaceholder")}
                />
              </Field>

              <Field label={t("manageStudents.createStudentIdLabel")}>
                <Input
                  type="text"
                  value={newStudentForm.studentId}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  placeholder={t("manageStudents.createStudentIdPlaceholder")}
                />
              </Field>

              <Field label={t("manageStudents.createStudentPasswordLabel")}>
                <Input
                  type="password"
                  value={newStudentForm.password}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t("manageStudents.createStudentPasswordPlaceholder")}
                />
              </Field>

              <Field
                label={t("manageStudents.createStudentConfirmPasswordLabel")}
                hint={t("manageStudents.createStudentPasswordHint")}
              >
                <Input
                  type="password"
                  value={newStudentForm.confirmPassword}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder={t("manageStudents.createStudentConfirmPasswordPlaceholder")}
                />
              </Field>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button type="button" variant="secondary" onClick={closeCreateStudentModal}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" loading={creatingStudent}>
                  {creatingStudent ? t("manageStudents.creatingStudent") : t("manageStudents.createStudentSubmit")}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
