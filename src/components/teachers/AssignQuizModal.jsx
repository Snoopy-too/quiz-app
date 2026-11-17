import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X, Search, CheckSquare, Square, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Field, Input, IconButton, Spinner } from "../ui";

export default function AssignQuizModal({
  isOpen,
  onClose,
  quizId,
  quizTitle,
  teacherId,
  onAssignmentCreated
}) {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Calculate minimum deadline (1 hour from now)
  const getMinDeadline = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  // Calculate default deadline (1 week from now)
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(23, 59, 0, 0);
    return date.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchStudents();
      setDeadline(getDefaultDeadline());
      setSelectedStudents(new Set());
      setSearchTerm("");
      setError(null);
    }
  }, [isOpen, teacherId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Fetch only approved students linked to this teacher
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, name, email, student_id")
        .eq("role", "student")
        .eq("teacher_id", teacherId)
        .eq("approved", true)
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setStudents(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const filteredStudents = students.filter(student => {
    const term = searchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.student_id?.toLowerCase().includes(term)
    );
  });

  const handleAssign = async () => {
    if (selectedStudents.size === 0) {
      setError(t("assignQuiz.selectAtLeastOneStudent", "Please select at least one student"));
      return;
    }
    if (!deadline) {
      setError(t("assignQuiz.setDeadline", "Please set a deadline"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get quiz questions to store total count
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id")
        .eq("quiz_id", quizId);

      if (questionsError) throw questionsError;

      const totalQuestions = questions?.length || 0;
      const questionOrder = questions?.map(q => q.id) || [];

      // Shuffle question order for each assignment
      const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Create assignment records for each selected student
      const assignments = Array.from(selectedStudents).map(studentId => ({
        quiz_id: quizId,
        teacher_id: teacherId,
        student_id: studentId,
        deadline: new Date(deadline).toISOString(),
        status: "pending",
        total_questions: totalQuestions,
        question_order: shuffleArray(questionOrder)
      }));

      const { data: createdAssignments, error: insertError } = await supabase
        .from("quiz_assignments")
        .insert(assignments)
        .select(`
          id,
          student_id,
          deadline,
          users!quiz_assignments_student_id_fkey (
            name,
            email
          )
        `);

      if (insertError) throw insertError;

      // Trigger email notifications (Edge Function will be called here)
      // For now, we'll just mark it for later implementation
      // await sendEmailNotifications(createdAssignments);

      onAssignmentCreated?.(createdAssignments);
      onClose();
    } catch (err) {
      console.error("Assignment error:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-surface shadow-pop overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t("assignQuiz.title", "Assign Quiz")}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">{quizTitle}</p>
          </div>
          <IconButton aria-label={t("common.close")} size="sm" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Deadline Picker */}
          <Field
            label={t("assignQuiz.deadline", "Deadline")}
            hint={t("assignQuiz.deadlineHint", "Students must complete the quiz before this date and time")}
          >
            <Input
              type="datetime-local"
              value={deadline}
              min={getMinDeadline()}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>

          {/* Student Selection */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <Users className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                {t("assignQuiz.selectStudents", "Select Students")}
              </p>
              <Badge variant="brand">
                {selectedStudents.size} {t("assignQuiz.selected", "selected")}
              </Badge>
            </div>

            {/* Search and Select All */}
            <div className="mb-3 flex gap-2.5">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder={t("assignQuiz.searchStudents", "Search students...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={toggleSelectAll}
                className="whitespace-nowrap"
              >
                {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                  ? t("assignQuiz.deselectAll", "Deselect All")
                  : t("assignQuiz.selectAll", "Select All")}
              </Button>
            </div>

            {/* Student List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : students.length === 0 ? (
              <div className="py-10 text-center text-ink-muted">
                <Users size={40} className="mx-auto mb-3 text-ink-subtle" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">{t("assignQuiz.noStudents", "No approved students found")}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t("assignQuiz.noStudentsHint", "Make sure you have approved students linked to your account")}
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                <p>{t("assignQuiz.noMatchingStudents", "No students match your search")}</p>
              </div>
            ) : (
              <div className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface">
                {filteredStudents.map((student) => {
                  const selected = selectedStudents.has(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                        selected ? "bg-brand-50/70" : "hover:bg-surface-muted/60"
                      }`}
                    >
                      {selected ? (
                        <CheckSquare size={18} className="shrink-0 text-brand-600" aria-hidden="true" />
                      ) : (
                        <Square size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{student.name}</p>
                        <p className="truncate text-xs text-ink-muted">{student.email}</p>
                      </div>
                      {student.student_id && (
                        <Badge variant="neutral" className="shrink-0 font-mono">
                          {student.student_id}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-line bg-surface-muted/60 px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            loading={submitting}
            disabled={selectedStudents.size === 0}
          >
            {submitting
              ? t("assignQuiz.assigning", "Assigning...")
              : t("assignQuiz.assignToStudents", {
                  count: selectedStudents.size,
                  defaultValue: "Assign to {{count}} Students",
                })}
          </Button>
        </div>
      </div>
    </div>
  );
}
