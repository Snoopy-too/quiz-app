import React from "react";
import { useTranslation } from "react-i18next";
import useTeacherSession from "../../hooks/useTeacherSession";
import BackgroundWrapper from "./teacherControl/BackgroundWrapper";
import ModeSelection from "./teacherControl/ModeSelection";
import WaitingLobby from "./teacherControl/WaitingLobby";
import CountdownScreen from "./teacherControl/CountdownScreen";
import ActiveQuestion from "./teacherControl/ActiveQuestion";
import QuestionResults from "./teacherControl/QuestionResults";
import QuizCompleted from "./teacherControl/QuizCompleted";

export default function TeacherControl({ sessionId, setView }) {
  const { t } = useTranslation();
  const tc = useTeacherSession(sessionId);

  if (tc.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">{t('common.loading', 'Loading session...')}</p>
      </div>
    );
  }

  if (tc.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error: {tc.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => tc.reloadSession()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              {t('teacherControl.reloadSession', 'Reload Session')}
            </button>
            <button
              onClick={() => setView("manage-quizzes")}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const closeSession = (skipConfirm) => {
    if (skipConfirm === true) {
      tc.endQuiz("cancelled").then(() => setView("manage-quizzes"));
      return;
    }
    tc.closeSession(() => setView("manage-quizzes"));
  };

  const screenProps = { ...tc, setView, closeSession };

  const renderScreen = () => {
    if (tc.session.status === "waiting" && tc.showModeSelection) {
      return <ModeSelection {...screenProps} />;
    }
    if (tc.session.status === "waiting") {
      return <WaitingLobby {...screenProps} />;
    }
    if (tc.session.status === "active" && !tc.currentQuestion) {
      return <CountdownScreen {...screenProps} />;
    }
    if (tc.session.status === "question_active" && tc.currentQuestion) {
      return <ActiveQuestion {...screenProps} />;
    }
    if (tc.session.status === "showing_results" && tc.currentQuestion) {
      return <QuestionResults {...screenProps} />;
    }
    if (tc.session.status === "completed") {
      return <QuizCompleted {...screenProps} />;
    }
    if (tc.session.status === "cancelled") {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-10 text-center max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {t('session.quizCancelled', 'Quiz Cancelled')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('session.sessionEnded', 'This quiz session has ended.')}
            </p>
            <button
              onClick={() => setView("manage-quizzes")}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 font-semibold"
            >
              {t('quiz.backToQuizzes', 'Back to Quizzes')}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <BackgroundWrapper
      backgroundConfig={tc.backgroundConfig}
      alertModal={tc.alertModal}
      confirmModal={tc.confirmModal}
      setAlertModal={tc.setAlertModal}
      setConfirmModal={tc.setConfirmModal}
    >
      {renderScreen()}
    </BackgroundWrapper>
  );
}

