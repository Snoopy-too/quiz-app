import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X, Trash2, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, IconButton, Spinner } from "../ui";
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

    useEffect(() => {
        if (isOpen && quizId) {
            fetchAssignments();
        }
    }, [isOpen, quizId]);

    const handleUnassign = (assignmentId, studentName) => {
        setConfirmModal({
            isOpen: true,
            title: t("assignQuiz.unassignTitle", "Unassign Quiz"),
            message: t("assignQuiz.unassignConfirm", { name: studentName, defaultValue: "Are you sure you want to unassign this quiz from {{name}}? This will delete their progress." }),
            onConfirm: async () => {
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

                    setConfirmModal({ ...confirmModal, isOpen: false });
                    // Refresh list
                    fetchAssignments();
                    setAlertModal({
                        isOpen: true,
                        title: t("common.success"),
                        message: t("assignQuiz.unassignSuccess", "Quiz unassigned successfully"),
                        type: "success"
                    });
                } catch (err) {
                    setConfirmModal({ ...confirmModal, isOpen: false });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-surface shadow-pop overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-line px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-ink">
                            {t("assignQuiz.manageAssignments", "Manage Assignments")}
                        </h2>
                        <p className="mt-0.5 text-sm text-ink-muted">{quizTitle}</p>
                    </div>
                    <IconButton aria-label={t("common.close")} size="sm" onClick={onClose}>
                        <X className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-ink">
                            {t("assignQuiz.assignedStudents", "Assigned Students")} ({assignments.length})
                        </h3>
                        <IconButton
                            aria-label={t("common.refresh", "Refresh")}
                            variant="secondary"
                            size="sm"
                            onClick={fetchAssignments}
                            title={t("common.refresh", "Refresh")}
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Spinner />
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 py-6 text-center text-sm text-danger-600">
                            {error}
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="rounded-xl border border-line bg-surface-muted/40 py-12 text-center text-ink-muted">
                            <Clock size={40} className="mx-auto mb-3 text-ink-subtle" aria-hidden="true" />
                            <p className="text-sm">{t("assignQuiz.noAssignments", "No active assignments for this quiz")}</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-line bg-surface">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                        <tr>
                                            <th className="px-5 py-3.5">{t("common.student")}</th>
                                            <th className="px-5 py-3.5">{t("common.status")}</th>
                                            <th className="px-5 py-3.5">{t("common.score")}</th>
                                            <th className="px-5 py-3.5">{t("assignQuiz.deadline")}</th>
                                            <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {assignments.map((assignment) => (
                                            <tr key={assignment.id} className="transition-colors hover:bg-surface-muted/40">
                                                <td className="px-5 py-3.5">
                                                    <div>
                                                        <p className="font-semibold text-ink">{assignment.users?.name || "Unknown"}</p>
                                                        <p className="text-xs text-ink-muted">{assignment.users?.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {assignment.status === "completed" ? (
                                                        <Badge variant="success">
                                                            <CheckCircle className="h-3 w-3" aria-hidden="true" />
                                                            {t("status.completed", "Completed")}
                                                        </Badge>
                                                    ) : assignment.status === "expired" ? (
                                                        <Badge variant="neutral">
                                                            <Clock className="h-3 w-3" aria-hidden="true" />
                                                            {t("assignedQuizzes.expired", "Expired")}
                                                        </Badge>
                                                    ) : assignment.status === "in_progress" ? (
                                                        <Badge variant="brand">
                                                            <Clock className="h-3 w-3" aria-hidden="true" />
                                                            {t("status.inProgress", "In Progress")}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="warning">
                                                            <Clock className="h-3 w-3" aria-hidden="true" />
                                                            {t("status.pending", "Pending")}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 font-mono font-medium text-ink">
                                                    {assignment.score !== null ? assignment.score : "-"}
                                                </td>
                                                <td className="px-5 py-3.5 text-ink-muted">
                                                    {new Date(assignment.deadline).toLocaleDateString()}
                                                    <span className="ml-1.5 text-ink-subtle">
                                                        {new Date(assignment.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {assignment.status !== "completed" && (
                                                        <IconButton
                                                            aria-label={t("assignQuiz.unassign", "Unassign")}
                                                            size="sm"
                                                            onClick={() => handleUnassign(assignment.id, assignment.users?.name)}
                                                            className="text-danger-600 hover:bg-red-50 hover:text-danger-600"
                                                            title={t("assignQuiz.unassign", "Unassign")}
                                                        >
                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                        </IconButton>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-line bg-surface-muted/60 px-6 py-4">
                    <Button variant="secondary" onClick={onClose}>
                        {t("common.close", "Close")}
                    </Button>
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
