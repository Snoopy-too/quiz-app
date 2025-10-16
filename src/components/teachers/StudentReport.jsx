import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import VerticalNav from '../layout/VerticalNav';

export default function StudentReport({ setView, studentId, appState }) {
  const { t } = useTranslation();
  const [student, setStudent] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
            score,
            quiz_sessions (
              created_at,
              quizzes (
                title
              )
            ),
            quiz_answers (
              is_correct
            )
          `)
          .eq('user_id', studentId);

        if (participationsError) throw participationsError;

        const quizzesTaken = participations.map(p => {
          const totalAnswers = p.quiz_answers.length;
          const correctAnswers = p.quiz_answers.filter(a => a.is_correct).length;
          const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
          return {
            title: p.quiz_sessions.quizzes.title,
            date: new Date(p.quiz_sessions.created_at).toLocaleDateString(),
            score: p.score,
            accuracy: accuracy.toFixed(1),
          };
        });

        const totalQuizzes = quizzesTaken.length;
        const averageScore = totalQuizzes > 0 ? (quizzesTaken.reduce((acc, q) => acc + q.score, 0) / totalQuizzes).toFixed(0) : 0;
        const averageAccuracy = totalQuizzes > 0 ? (quizzesTaken.reduce((acc, q) => acc + parseFloat(q.accuracy), 0) / totalQuizzes).toFixed(1) : 0;

        setPerformanceData({
          quizzesTaken,
          totalQuizzes,
          averageScore,
          averageAccuracy,
        });

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <p className="text-sm text-gray-600">{t('studentReport.totalQuizzes')}</p>
                  <p className="text-3xl font-bold text-blue-600">{performanceData.totalQuizzes}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <p className="text-sm text-gray-600">{t('studentReport.averageScore')}</p>
                  <p className="text-3xl font-bold text-blue-700">{performanceData.averageScore}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <p className="text-sm text-gray-600">{t('studentReport.averageAccuracy')}</p>
                  <p className="text-3xl font-bold text-orange-600">{performanceData.averageAccuracy}%</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.quizzesTaken.map((quiz, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{quiz.title}</td>
                        <td className="px-6 py-4 text-gray-600">{quiz.date}</td>
                        <td className="px-6 py-4 text-green-600 font-semibold">{quiz.score}</td>
                        <td className="px-6 py-4 font-semibold">{quiz.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
