import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X, Trash2, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmModal from "../common/ConfirmModal";
import AlertModal from "../common/AlertModal";

export default function QuizAssignmentsModal({
    isOpen,
    onClose,
    quizId,
    quizTitle
}) {
    const { t } = useTranslation();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });

    useEffect(() => {
        if (isOpen && quizId) {
            fetchAssignments();
        }
    }, [isOpen, quizId]);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from("quiz_assignments")
                .select(`
          id,
          status,
          score,
          deadline,
          completed_at,
          student_id,
          users!quiz_assignments_student_id_fkey (
            name,
            email,
            student_id
          )
        `)
                .eq("quiz_id", quizId)
                .order("id", { ascending: false });

            if (fetchError) throw fetchError;
            setAssignments(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUnassign = (assignmentId, studentName) => {
        setConfirmModal({
            isOpen: true,
            title: t("assignQuiz.unassignTitle", "Unassign Quiz"),
            message: t("assignQuiz.unassignConfirm", { name: studentName, defaultValue: "Are you sure you want to unassign this quiz from {{name}}? This will delete their progress." }),
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, isOpen: false });
                try {
                    // First delete answers if any
                    const { error: ansError } = await supabase
                        .from("assignment_answers")
                        .delete()
                        .eq("assignment_id", assignmentId);

                    if (ansError) throw ansError;

                    // Then delete assignment
                    const { error: deleteError } = await supabase
                        .from("quiz_assignments")
                        .delete()
                        .eq("id", assignmentId);

                    if (deleteError) throw deleteError;

                    // Refresh list
                    fetchAssignments();
                    setAlertModal({
                        isOpen: true,
                        title: t("common.success"),
                        message: t("assignQuiz.unassignSuccess", "Quiz unassigned successfully"),
                        type: "success"
                    });
                } catch (err) {
                    setAlertModal({
                        isOpen: true,
                        title: t("common.error"),
                        message: t("errors.errorUnassigning") + ": " + err.message,
                        type: "error"
                    });
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {t("assignQuiz.manageAssignments", "Manage Assignments")}
                        </h2>
                        <p className="text-gray-600 mt-1">{quizTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                            {t("assignQuiz.assignedStudents", "Assigned Students")} ({assignments.length})
                        </h3>
                        <button
                            onClick={fetchAssignments}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t("common.refresh")}
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg">
                            {error}
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            <Clock size={48} className="mx-auto mb-3 text-gray-300" />
                            <p>{t("assignQuiz.noAssignments", "No active assignments for this quiz")}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                                    <tr>
                                        <th className="px-6 py-4">{t("common.student")}</th>
                                        <th className="px-6 py-4">{t("common.status")}</th>
                                        <th className="px-6 py-4">{t("common.score")}</th>
                                        <th className="px-6 py-4">{t("assignQuiz.deadline")}</th>
                                        <th className="px-6 py-4 text-right">{t("common.actions")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {assignments.map((assignment) => (
                                        <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{assignment.users?.name || "Unknown"}</p>
                                                    <p className="text-sm text-gray-500">{assignment.users?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {assignment.status === "completed" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle size={12} className="mr-1" />
                                                        {t("status.completed", "Completed")}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        <Clock size={12} className="mr-1" />
                                                        {t("status.pending", "Pending")}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium text-gray-700">
                                                {assignment.score !== null ? assignment.score : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(assignment.deadline).toLocaleDateString()}
                                                <span className="text-gray-400 ml-1">
                                                    {new Date(assignment.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleUnassign(assignment.id, assignment.users?.name)}
                                                    className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title={t("assignQuiz.unassign", "Unassign")}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                    >
                        {t("common.close", "Close")}
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                confirmStyle="danger"
            />

            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
            />
        </div>
    );
}
