import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import VerticalNav from '../layout/VerticalNav';
import { Trash2, RefreshCw } from 'lucide-react';
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

  const fetchStudentData = async () => {
      try {
        const { data: studentData, error: studentError } = await supabase
          .from('users')
          .select('*')
          .eq('id', studentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

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

        // Filter out cancelled sessions - only include completed quizzes
        const completedParticipations = participations.filter(
          p => p.quiz_sessions?.status === 'completed'
        );

        const quizzesTaken = completedParticipations.map(p => {
          const totalAnswers = p.quiz_answers.length;
          const correctAnswers = p.quiz_answers.filter(a => a.is_correct).length;
          const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
          const isCourseMaterial = p.quiz_sessions.quizzes.is_course_material !== false;
          return {
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
          console.log('[StudentReport] Deleting quiz result for participant:', quiz.participantId);

          // Delete quiz answers for this participant
          const { error: answersError, count: answersDeleted } = await supabase
            .from('quiz_answers')
            .delete()
            .eq('participant_id', quiz.participantId)
            .select();

          console.log('[StudentReport] Answers delete result:', { answersError, answersDeleted });

          if (answersError) {
            console.error('[StudentReport] Error deleting answers:', answersError);
          }

          // Delete the session participant record
          const { data: deletedParticipant, error: participantError } = await supabase
            .from('session_participants')
            .delete()
            .eq('id', quiz.participantId)
            .select();

          console.log('[StudentReport] Participant delete result:', { deletedParticipant, participantError });

          if (participantError) {
            throw participantError;
          }

          // Check if deletion actually happened
          if (!deletedParticipant || deletedParticipant.length === 0) {
            throw new Error('Record not deleted - you may not have permission to delete this result');
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t("reports.allQuizzes")}
                </button>
                <button
                  onClick={() => setActiveTab('course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'course'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t("reports.courseQuizzes")}
                </button>
                <button
                  onClick={() => setActiveTab('non-course')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'non-course'
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
                        <td className="px-6 py-4 font-medium">{quiz.title}</td>
                        <td className="px-6 py-4 text-gray-600">{quiz.date}</td>
                        <td className="px-6 py-4 text-green-600 font-semibold">{quiz.score}</td>
                        <td className="px-6 py-4 font-semibold">{quiz.accuracy}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            quiz.isCourseMaterial
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
    </div>
  );
}
