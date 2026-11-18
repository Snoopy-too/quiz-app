import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ChevronLeft,
  BookOpen,
  Award,
  Target,
  AlertCircle,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Skeleton,
  IconButton,
  Spinner,
} from "../ui";
import ConfirmModal from "../common/ConfirmModal";
import AlertModal from "../common/AlertModal";

export default function StudentReport({
  setView,
  studentId,
  appState,
  initialAttemptId,
  initialAttemptType,
  onClearInitialAttempt
}) {
  const { t } = useTranslation();
  const [student, setStudent] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'course' | 'non-course'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  // Detailed view state
  const [selectedResult, setSelectedResult] = useState(null); // { quiz, details: [] }
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchStudentData = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Fetch session participations
      const { data: participations, error: participationsError } = await supabase
        .from('session_participants')
        .select(`
            id,
            score,
            session_id,
            quiz_sessions (
              created_at,
              status,
              quiz_id,
              quizzes (
                id,
                title,
                is_course_material,
                is_survey,
                questions (id)
              )
            ),
            quiz_answers (
              is_correct
            )
          `)
        .eq('user_id', studentId);

      if (participationsError) throw participationsError;

      // Fetch completed assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('quiz_assignments')
        .select(`
            id,
            score,
            completed_at,
            status,
            quiz_id,
            quizzes (
              id,
              title,
              is_course_material,
              is_survey,
              questions (id)
            ),
            assignment_answers (
              is_correct
            )
          `)
        .eq('student_id', studentId)
        .eq('status', 'completed');

      if (assignmentsError) throw assignmentsError;

      // Process sessions
      const sessionQuizzes = participations
        .filter(p => p.quiz_sessions?.status === 'completed' && !p.quiz_sessions?.quizzes?.is_survey)
        .map(p => {
          const correctAnswers = p.quiz_answers.filter(a => a.is_correct).length;
          const totalQuestions = p.quiz_sessions?.quizzes?.questions?.length || p.quiz_answers.length;
          const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
          const isCourseMaterial = p.quiz_sessions.quizzes.is_course_material !== false;
          return {
            type: 'session',
            participantId: p.id,
            sessionId: p.session_id,
            quizId: p.quiz_sessions.quizzes.id,
            title: p.quiz_sessions.quizzes.title,
            date: new Date(p.quiz_sessions.created_at).toLocaleDateString(),
            rawDate: p.quiz_sessions.created_at,
            score: p.score,
            correctAnswers,
            totalQuestions,
            accuracy: accuracy.toFixed(1),
            isCourseMaterial,
          };
        });

      // Process assignments
      const assignmentQuizzes = assignmentsData
        .filter(a => !a.quizzes?.is_survey)
        .map(a => {
        const correctAnswers = a.assignment_answers.filter(ans => ans.is_correct).length;
        const totalQuestions = a.quizzes?.questions?.length || a.assignment_answers.length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const isCourseMaterial = a.quizzes?.is_course_material !== false;

        return {
          type: 'assignment',
          participantId: a.id, // Using assignment ID as participant ID analog
          sessionId: null,
          quizId: a.quizzes?.id,
          title: a.quizzes?.title || 'Unknown Quiz',
          date: new Date(a.completed_at).toLocaleDateString(),
          rawDate: a.completed_at,
          score: a.score,
          correctAnswers,
          totalQuestions,
          accuracy: accuracy.toFixed(1),
          isCourseMaterial
        };
      });

      const quizzesTaken = [...sessionQuizzes, ...assignmentQuizzes].sort((a, b) =>
        new Date(b.rawDate || 0) - new Date(a.rawDate || 0)
      );

      // Separate course and non-course quizzes
      const courseQuizzes = quizzesTaken.filter(q => q.isCourseMaterial);
      const nonCourseQuizzes = quizzesTaken.filter(q => !q.isCourseMaterial);

      // Calculate overall stats
      const totalQuizzes = quizzesTaken.length;
      const averageScore = totalQuizzes > 0 ? (quizzesTaken.reduce((acc, q) => acc + q.score, 0) / totalQuizzes).toFixed(0) : 0;
      const averageAccuracy = totalQuizzes > 0 ? (quizzesTaken.reduce((acc, q) => acc + parseFloat(q.accuracy), 0) / totalQuizzes).toFixed(1) : 0;

      // Calculate course stats
      const courseTotalQuizzes = courseQuizzes.length;
      const courseAverageScore = courseTotalQuizzes > 0 ? (courseQuizzes.reduce((acc, q) => acc + q.score, 0) / courseTotalQuizzes).toFixed(0) : 0;
      const courseAverageAccuracy = courseTotalQuizzes > 0 ? (courseQuizzes.reduce((acc, q) => acc + parseFloat(q.accuracy), 0) / courseTotalQuizzes).toFixed(1) : 0;

      // Calculate non-course stats
      const nonCourseTotalQuizzes = nonCourseQuizzes.length;
      const nonCourseAverageScore = nonCourseTotalQuizzes > 0 ? (nonCourseQuizzes.reduce((acc, q) => acc + q.score, 0) / nonCourseTotalQuizzes).toFixed(0) : 0;
      const nonCourseAverageAccuracy = nonCourseTotalQuizzes > 0 ? (nonCourseQuizzes.reduce((acc, q) => acc + parseFloat(q.accuracy), 0) / nonCourseTotalQuizzes).toFixed(1) : 0;

      setPerformanceData({
        quizzesTaken,
        courseQuizzes,
        nonCourseQuizzes,
        totalQuizzes,
        averageScore,
        averageAccuracy,
        courseTotalQuizzes,
        courseAverageScore,
        courseAverageAccuracy,
        nonCourseTotalQuizzes,
        nonCourseAverageScore,
        nonCourseAverageAccuracy,
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    } else {
      // No studentId provided (e.g., page refresh) - redirect to reports
      setView('reports');
    }
  }, [studentId]);

  // Delete a student's quiz result
  const handleDeleteResult = (quiz) => {
    setConfirmModal({
      isOpen: true,
      title: t('studentReport.deleteResultTitle'),
      message: t('studentReport.deleteResultMessage', { title: quiz.title, date: quiz.date }),
      onConfirm: async () => {
        try {
          console.log('[StudentReport] Deleting/Resetting result:', quiz);

          if (quiz.type === 'assignment') {
            // For assignments, we "reset" it by deleting answers and setting status back to pending
            // This removes the "result" but keeps the assignment for the student
            const { error: ansError } = await supabase
              .from('assignment_answers')
              .delete()
              .eq('assignment_id', quiz.participantId); // participantId holds assignment id for this type

            if (ansError) throw ansError;

            const { error: updateError } = await supabase
              .from('quiz_assignments')
              .update({
                status: 'pending',
                score: null,
                time_taken: null,
                completed_at: null,
                started_at: null,
                correct_answers: null,
                current_question_index: 0
              })
              .eq('id', quiz.participantId);

            if (updateError) throw updateError;

          } else {
            // For sessions (type === 'session')
            console.log('[StudentReport] Deleting quiz result for participant:', quiz.participantId);

            // Delete quiz answers for this participant
            const { error: answersError } = await supabase
              .from('quiz_answers')
              .delete()
              .eq('participant_id', quiz.participantId)
              .select();

            if (answersError) throw answersError;

            // Delete the session participant record
            const { data: deletedParticipant, error: participantError } = await supabase
              .from('session_participants')
              .delete()
              .eq('id', quiz.participantId)
              .select();

            if (participantError) throw participantError;

            // Check if deletion actually happened
            if (!deletedParticipant || deletedParticipant.length === 0) {
              throw new Error('Record not deleted - you may not have permission to delete this result');
            }
          }

          setConfirmModal({ ...confirmModal, isOpen: false });
          setAlertModal({
            isOpen: true,
            title: t('common.success'),
            message: t('studentReport.resultDeleted'),
            type: 'success'
          });

          // Refresh the data
          fetchStudentData();
        } catch (err) {
          setConfirmModal({ ...confirmModal, isOpen: false });
          console.error('[StudentReport] Delete error:', err);
          setAlertModal({
            isOpen: true,
            title: t('common.error'),
            message: t('studentReport.deleteError') + ': ' + err.message,
            type: 'error'
          });
        }
      }
    });
  };

  // Toggle quiz type between Course Material and Non-Course
  const handleToggleType = async (quiz) => {
    try {
      const newIsCourseMaterial = !quiz.isCourseMaterial;

      const { error } = await supabase
        .from('quizzes')
        .update({ is_course_material: newIsCourseMaterial })
        .eq('id', quiz.quizId);

      if (error) throw error;

      setAlertModal({
        isOpen: true,
        title: t('common.success'),
        message: t('studentReport.typeUpdated', {
          type: newIsCourseMaterial ? t('reports.courseQuizzes') : t('reports.nonCourseQuizzes')
        }),
        type: 'success'
      });

      // Refresh the data
      fetchStudentData();
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('studentReport.typeUpdateError') + ': ' + err.message,
        type: 'error'
      });
    }
  };

  // Fetch detailed results for a specific quiz attempt
  const fetchResultDetails = async (quiz) => {
    try {
      setLoadingDetails(true);

      // 1. Fetch questions for this quiz
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.quizId)
        .order('order_index', { ascending: true }); // Assuming order_index exists, fallback to created_at if not?

      if (questionsError) throw questionsError;

      // 2. Fetch answers based on type
      let answers = [];
      if (quiz.type === 'assignment') {
        const { data: assignmentAnswers, error: ansError } = await supabase
          .from('assignment_answers')
          .select('*')
          .eq('assignment_id', quiz.participantId);

        if (ansError) throw ansError;
        answers = assignmentAnswers;
      } else {
        const { data: sessionAnswers, error: ansError } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('participant_id', quiz.participantId);

        if (ansError) throw ansError;
        answers = sessionAnswers;
      }

      // 3. Merge data
      // For each question, find the answer
      const details = questions.map((question, index) => {
        const answer = answers.find(a => a.question_id === question.id);
        const options = question.options || []; // JSON array

        // Determine student's answer text
        let studentAnswerText = t('common.noAnswer', '-');
        let isCorrect = false;

        if (answer) {
          isCorrect = answer.is_correct;

          if (answer.response_text) {
            // If there's a direct text response (e.g. typed answer)
            studentAnswerText = answer.response_text;
          } else if (answer.selected_option_index !== null && answer.selected_option_index !== undefined) {
            // If it's an option selection
            const selectedOpt = options[answer.selected_option_index];
            studentAnswerText = selectedOpt ? selectedOpt.text : t('common.unknownOption', 'Unknown Option');
          } else if (answer.answer_text) {
            // Legacy/Alternative field check
            studentAnswerText = answer.answer_text;
          }
        }

        // Determine correct answer text
        let correctAnswerText = '';
        if (options.length > 0) {
          // Multiple choice
          const correctOpts = options.filter(o => o.is_correct);
          correctAnswerText = correctOpts.map(o => o.text).join(', ');
        } else {
          // Text input (check correct_answer field if exists, or simple text check)
          correctAnswerText = question.correct_answer || '';
        }

        return {
          id: question.id,
          number: index + 1,
          questionText: question.question_text,
          studentAnswer: studentAnswerText,
          correctAnswer: correctAnswerText,
          isCorrect: isCorrect,
          points: answer?.points_earned || 0,
          timeTaken: answer?.time_taken || 0,
          type: question.question_type || question.type
        };
      });

      setSelectedResult({
        quiz: quiz,
        details: details
      });

    } catch (err) {
      console.error("Error fetching details:", err);
      setAlertModal({
        isOpen: true,
        title: t('common.error'),
        message: t('studentReport.fetchDetailsError', 'Could not load quiz details') + ': ' + err.message,
        type: 'error'
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (quiz) => {
    fetchResultDetails(quiz);
  };

  useEffect(() => {
    if (performanceData && initialAttemptId && initialAttemptType) {
      const matchingAttempt = performanceData.quizzesTaken.find(
        q => String(q.participantId) === String(initialAttemptId) && q.type === initialAttemptType
      );
      if (matchingAttempt) {
        handleViewDetails(matchingAttempt);
      }
      if (onClearInitialAttempt) {
        onClearInitialAttempt();
      }
    }
  }, [performanceData, initialAttemptId, initialAttemptType]);

  const closeDetails = () => {
    setSelectedResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <PageHeader title={t("reports.student")} />
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx}>
                <CardBody className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardBody>
              </Card>
            ))}
          </div>
          <Card>
            <CardBody>
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
        <PageHeader title={t("reports.student")} />
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <Card className="border-danger-600/40">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-danger-600">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">
                  {t("common.error")}: {error}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setView("reports")}>
                {t("common.back_to_reports")}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "all", label: t("reports.allQuizzes") },
    { key: "course", label: t("reports.courseQuizzes") },
    { key: "non-course", label: t("reports.nonCourseQuizzes") },
  ];

  const displayedQuizzes = performanceData
    ? activeTab === "all"
      ? performanceData.quizzesTaken
      : activeTab === "course"
        ? performanceData.courseQuizzes
        : performanceData.nonCourseQuizzes
    : [];

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        breadcrumbs={
          <button
            type="button"
            onClick={() => setView("reports")}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t("common.back_to_reports")}
          </button>
        }
        title={student?.name || t("reports.student")}
        description={student?.email}
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {performanceData && (
          <>
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
              {tabs.map(({ key, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("studentReport.totalQuizzes")}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-ink">
                      {activeTab === "all"
                        ? performanceData.totalQuizzes
                        : activeTab === "course"
                          ? performanceData.courseTotalQuizzes
                          : performanceData.nonCourseTotalQuizzes}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("studentReport.averageScore")}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-ink">
                      {activeTab === "all"
                        ? performanceData.averageScore
                        : activeTab === "course"
                          ? performanceData.courseAverageScore
                          : performanceData.nonCourseAverageScore}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-success-600">
                    <Award className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t("studentReport.averageAccuracy")}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-ink">
                      {activeTab === "all"
                        ? performanceData.averageAccuracy
                        : activeTab === "course"
                          ? performanceData.courseAverageAccuracy
                          : performanceData.nonCourseAverageAccuracy}
                      %
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Target className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardBody>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader>
                <h2 className="text-base font-semibold text-ink">
                  {t("studentReport.quizHistory")}
                </h2>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-5 py-3.5 text-left">{t("studentReport.quizTitle")}</th>
                      <th className="px-5 py-3.5 text-left">{t("studentReport.dateTaken")}</th>
                      <th className="px-5 py-3.5 text-left">{t("studentReport.score")}</th>
                      <th className="px-5 py-3.5 text-left">{t("studentReport.correctTotal")}</th>
                      <th className="px-5 py-3.5 text-left">{t("studentReport.accuracy")}</th>
                      <th className="px-5 py-3.5 text-left">{t("reports.type")}</th>
                      <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {displayedQuizzes.map((quiz, index) => (
                      <tr
                        key={quiz.participantId || index}
                        className="transition-colors hover:bg-surface-muted/40"
                      >
                        <td className="px-5 py-4 font-medium">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(quiz)}
                            className="inline-flex items-center gap-2 text-left font-semibold text-brand-700 hover:underline"
                          >
                            <FileText size={15} aria-hidden="true" />
                            {quiz.title}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-ink-muted">{quiz.date}</td>
                        <td className="px-5 py-4 font-semibold text-success-600">{quiz.score}</td>
                        <td className="px-5 py-4 font-medium text-ink-muted">
                          {quiz.correctAnswers} / {quiz.totalQuestions}
                        </td>
                        <td className="px-5 py-4 font-semibold text-ink">{quiz.accuracy}%</td>
                        <td className="px-5 py-4">
                          <Badge variant={quiz.isCourseMaterial ? "brand" : "neutral"}>
                            {quiz.isCourseMaterial
                              ? t("reports.courseQuizzes")
                              : t("reports.nonCourseQuizzes")}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              aria-label={t("studentReport.toggleType")}
                              size="sm"
                              onClick={() => handleToggleType(quiz)}
                              title={t("studentReport.toggleType")}
                            >
                              <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                            <IconButton
                              aria-label={t("common.delete")}
                              size="sm"
                              onClick={() => handleDeleteResult(quiz)}
                              className="text-danger-600 hover:bg-red-50 hover:text-danger-600"
                              title={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
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

      {/* Detailed Result Modal/Slide-over */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            role="presentation"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity"
            onClick={closeDetails}
          ></div>

          <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-surface shadow-pop">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between border-b border-line pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{selectedResult.quiz.title}</h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    {selectedResult.quiz.date} · {selectedResult.quiz.score} pts ·{" "}
                    {selectedResult.quiz.correctAnswers}/{selectedResult.quiz.totalQuestions} ·{" "}
                    {selectedResult.quiz.accuracy}%
                  </p>
                </div>
                <IconButton aria-label={t("common.close")} size="sm" onClick={closeDetails}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>

              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedResult.details.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${
                        item.isCorrect
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-red-200 bg-red-50/50"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="flex gap-2 text-base font-semibold text-ink">
                          <span className="text-ink-muted">#{item.number}</span>
                          <span>{item.questionText}</span>
                        </h3>
                        {item.isCorrect ? (
                          <Badge variant="success" className="shrink-0">
                            <CheckCircle className="h-3 w-3" aria-hidden="true" />
                            {t("common.correct", "Correct")}
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="shrink-0">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            {t("common.incorrect", "Incorrect")}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 text-sm">
                        <div className="rounded-lg border border-line bg-surface p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            {t("reports.studentAnswer", "Student Answer")}
                          </p>
                          <p
                            className={`font-medium ${
                              item.isCorrect ? "text-success-600" : "text-danger-600"
                            }`}
                          >
                            {item.studentAnswer}
                          </p>
                        </div>

                        {!item.isCorrect && (
                          <div className="rounded-lg border border-line bg-surface p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                              {t("reports.correctAnswer", "Correct Answer")}
                            </p>
                            <p className="font-medium text-ink">{item.correctAnswer}</p>
                          </div>
                        )}

                        <div className="mt-1 flex gap-4 text-xs text-ink-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} aria-hidden="true" />
                            {item.timeTaken}s
                          </span>
                          {item.points > 0 && (
                            <span className="font-semibold text-amber-700">
                              +{item.points} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
