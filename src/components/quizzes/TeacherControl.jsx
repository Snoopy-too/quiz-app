import React from "react";
import useTeacherSession from "../../hooks/useTeacherSession";
import BackgroundWrapper from "./teacherControl/BackgroundWrapper";
import ModeSelection from "./teacherControl/ModeSelection";
import WaitingLobby from "./teacherControl/WaitingLobby";
import CountdownScreen from "./teacherControl/CountdownScreen";
import ActiveQuestion from "./teacherControl/ActiveQuestion";
import QuestionResults from "./teacherControl/QuestionResults";
import QuizCompleted from "./teacherControl/QuizCompleted";

export default function TeacherControl({ sessionId, setView }) {
  const tc = useTeacherSession(sessionId);

  if (tc.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading session...</p>
      </div>
    );
  }

  if (tc.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error: {tc.error}</p>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const closeSession = (skipConfirm) => {
    if (skipConfirm) {
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
