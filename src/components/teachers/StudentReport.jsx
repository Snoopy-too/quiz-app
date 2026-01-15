import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import VerticalNav from '../layout/VerticalNav';
import { Trash2, RefreshCw, X, CheckCircle, XCircle, Clock, HelpCircle, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import AlertModal from '../common/AlertModal';

export default function StudentReport({ setView, studentId, appState }) {
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
                is_course_material
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
              is_course_material
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
        .filter(p => p.quiz_sessions?.status === 'completed')
        .map(p => {
          const totalAnswers = p.quiz_answers.length;
          const correctAnswers = p.quiz_answers.filter(a => a.is_correct).length;
          const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
          const isCourseMaterial = p.quiz_sessions.quizzes.is_course_material !== false;
          return {
            type: 'session',
            participantId: p.id,
            sessionId: p.session_id,
            quizId: p.quiz_sessions.quizzes.id,
            title: p.quiz_sessions.quizzes.title,
            date: new Date(p.quiz_sessions.created_at).toLocaleDateString(),
            score: p.score,
            accuracy: accuracy.toFixed(1),
            isCourseMaterial,
          };
        });

      // Process assignments
      const assignmentQuizzes = assignmentsData.map(a => {
        const totalAnswers = a.assignment_answers.length;
        const correctAnswers = a.assignment_answers.filter(ans => ans.is_correct).length;
        const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
        const isCourseMaterial = a.quizzes?.is_course_material !== false;

        return {
          type: 'assignment',
          participantId: a.id, // Using assignment ID as participant ID analog
          sessionId: null,
          quizId: a.quizzes?.id,
          title: a.quizzes?.title || 'Unknown Quiz',
          date: new Date(a.completed_at).toLocaleDateString(),
          score: a.score,
          accuracy: accuracy.toFixed(1),
          isCourseMaterial
        };
      });

      const quizzesTaken = [...sessionQuizzes, ...assignmentQuizzes].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
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
        setConfirmModal({ ...confirmModal, isOpen: false });
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

          setAlertModal({
            isOpen: true,
            title: t('common.success'),
            message: t('studentReport.resultDeleted'),
            type: 'success'
          });

          // Refresh the data
          fetchStudentData();
        } catch (err) {
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
          type: question.type
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

  const closeDetails = () => {
    setSelectedResult(null);
  };

  if (loading) {
    return <div className="p-6">{t('loading')}</div>;
  }

  if (error) {
    return <div className="p-6">{t('error')}: {error}</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <VerticalNav currentView="reports" setView={setView} appState={appState} />
      <div className="flex-1 ml-64">
        <div className="p-6">
          <button onClick={() => setView('reports')} className="text-blue-600 hover:underline mb-4">&larr; {t('back_to_reports')}</button>
          <h1 className="text-3xl font-bold mb-2">{student?.name}</h1>
          <p className="text-gray-600 mb-6">{student?.email}</p>

          {performanceData && (
            <>
              {/* Tab Navigation */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t("reports.allQuizzes")}
                </button>
                <button
                  onClick={() => setActiveTab('course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'course'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t("reports.courseQuizzes")}
                </button>
                <button
                  onClick={() => setActiveTab('non-course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'non-course'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t("reports.nonCourseQuizzes")}
                </button>
              </div>

              {/* Stats Cards - show based on active tab */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <p className="text-sm text-gray-600">{t('studentReport.totalQuizzes')}</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {activeTab === 'all' ? performanceData.totalQuizzes :
                      activeTab === 'course' ? performanceData.courseTotalQuizzes :
                        performanceData.nonCourseTotalQuizzes}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <p className="text-sm text-gray-600">{t('studentReport.averageScore')}</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {activeTab === 'all' ? performanceData.averageScore :
                      activeTab === 'course' ? performanceData.courseAverageScore :
                        performanceData.nonCourseAverageScore}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <p className="text-sm text-gray-600">{t('studentReport.averageAccuracy')}</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {activeTab === 'all' ? performanceData.averageAccuracy :
                      activeTab === 'course' ? performanceData.courseAverageAccuracy :
                        performanceData.nonCourseAverageAccuracy}%
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-4">{t('studentReport.quizHistory')}</h2>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('studentReport.quizTitle')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('studentReport.dateTaken')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('studentReport.score')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('studentReport.accuracy')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('reports.type')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'all' ? performanceData.quizzesTaken :
                      activeTab === 'course' ? performanceData.courseQuizzes :
                        performanceData.nonCourseQuizzes).map((quiz, index) => (
                          <tr key={quiz.participantId || index} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">
                              <button
                                onClick={() => handleViewDetails(quiz)}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium flex items-center gap-2"
                              >
                                <FileText size={16} />
                                {quiz.title}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{quiz.date}</td>
                            <td className="px-6 py-4 text-green-600 font-semibold">{quiz.score}</td>
                            <td className="px-6 py-4 font-semibold">{quiz.accuracy}%</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${quiz.isCourseMaterial
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {quiz.isCourseMaterial ? t('reports.courseQuizzes') : t('reports.nonCourseQuizzes')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleType(quiz)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title={t('studentReport.toggleType')}
                                >
                                  <RefreshCw size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteResult(quiz)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title={t('common.delete')}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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

      {/* Detailed Result Modal/Slide-over */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeDetails}
          ></div>

          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedResult.quiz.title}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedResult.quiz.date} • {selectedResult.quiz.score} pts • {selectedResult.quiz.accuracy}%
                  </p>
                </div>
                <button
                  onClick={closeDetails}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedResult.details.map((item) => (
                    <div key={item.id} className={`border rounded-lg p-4 ${item.isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-800 text-lg flex gap-2">
                          <span className="text-gray-500">#{item.number}</span>
                          {item.questionText}
                        </h3>
                        {item.isCorrect ? (
                          <span className="flex items-center text-green-600 font-medium bg-green-100 px-2 py-1 rounded text-xs whitespace-nowrap">
                            <CheckCircle size={14} className="mr-1" />
                            {t('common.correct', 'Correct')}
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 font-medium bg-red-100 px-2 py-1 rounded text-xs whitespace-nowrap">
                            <XCircle size={14} className="mr-1" />
                            {t('common.incorrect', 'Incorrect')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="bg-white p-3 rounded border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('reports.studentAnswer', 'Student Answer')}</p>
                          <p className={`font-medium ${item.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {item.studentAnswer}
                          </p>
                        </div>

                        {!item.isCorrect && (
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('reports.correctAnswer', 'Correct Answer')}</p>
                            <p className="font-medium text-gray-800">
                              {item.correctAnswer}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-4 text-gray-500 text-xs mt-1">
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            {item.timeTaken}s
                          </span>
                          {item.points > 0 && (
                            <span className="flex items-center text-amber-600 font-semibold">
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
