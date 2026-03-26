import React from "react";
import { Award, TrendingUp, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? t("manageStudents.editStudentTitle") : t("manageStudents.studentDetails")}
          </h2>
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
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">{t("manageStudents.personalInformation")}</h3>
              {!isEditing && selectedStudent.teacher_id === currentUserId && (
                <button
                  onClick={() => {
                    setEditForm({
                      name: selectedStudent.name,
                      studentId: selectedStudent.student_id || "",
                      password: ""
                    });
                    setIsEditing(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                >
                  {t("common.edit")}
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.name")}
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("manageStudents.studentNumber")}
                    </label>
                    <input
                      type="text"
                      value={editForm.studentId}
                      onChange={(e) => setEditForm(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("auth.password")}
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={t("manageStudents.passwordHint")}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStudent}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
                  >
                    {updatingStudent ? t("common.saving") : t("manageStudents.saveChanges")}
                  </button>
                </div>
              </form>
            ) : (
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
            )}
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
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 text-blue-700" size={32} />
                  <p className="text-sm text-gray-600">{t("manageStudents.accuracy")}</p>
                  <p className="text-2xl font-bold text-blue-700">
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
  );
}
