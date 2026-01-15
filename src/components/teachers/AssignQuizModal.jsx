import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X, Search, CheckSquare, Square, Users, Calendar, Clock, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t("assignQuiz.title", "Assign Quiz")}
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
          {/* Deadline Picker */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              {t("assignQuiz.deadline", "Deadline")}
            </label>
            <input
              type="datetime-local"
              value={deadline}
              min={getMinDeadline()}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              <Clock size={14} className="inline mr-1" />
              {t("assignQuiz.deadlineHint", "Students must complete the quiz before this date and time")}
            </p>
          </div>

          {/* Student Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                <Users size={16} className="inline mr-2" />
                {t("assignQuiz.selectStudents", "Select Students")}
              </label>
              <span className="text-sm text-orange-600 font-medium">
                {selectedStudents.size} {t("assignQuiz.selected", "selected")}
              </span>
            </div>

            {/* Search and Select All */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("assignQuiz.searchStudents", "Search students...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors whitespace-nowrap"
              >
                {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                  ? t("assignQuiz.deselectAll", "Deselect All")
                  : t("assignQuiz.selectAll", "Select All")}
              </button>
            </div>

            {/* Student List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-orange-500" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-3 text-gray-300" />
                <p>{t("assignQuiz.noStudents", "No approved students found")}</p>
                <p className="text-sm mt-1">{t("assignQuiz.noStudentsHint", "Make sure you have approved students linked to your account")}</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>{t("assignQuiz.noMatchingStudents", "No students match your search")}</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 transition-colors ${selectedStudents.has(student.id) ? "bg-orange-50" : ""
                      }`}
                  >
                    {selectedStudents.has(student.id) ? (
                      <CheckSquare size={20} className="text-orange-600 flex-shrink-0" />
                    ) : (
                      <Square size={20} className="text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{student.name}</p>
                      <p className="text-sm text-gray-500 truncate">{student.email}</p>
                    </div>
                    {student.student_id && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0">
                        {student.student_id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            {t("actions.cancel", "Cancel")}
          </button>
          <button
            onClick={handleAssign}
            disabled={submitting || selectedStudents.size === 0}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t("assignQuiz.assigning", "Assigning...")}
              </>
            ) : (
              <>
                {t("assignQuiz.assignToStudents", { count: selectedStudents.size, defaultValue: "Assign to {{count}} Students" })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
