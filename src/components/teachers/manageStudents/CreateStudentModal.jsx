import React from "react";
import { CheckCircle, Clock, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  );
}
