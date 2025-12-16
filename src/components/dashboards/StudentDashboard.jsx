import { useState, useEffect } from "react";
import { Users, Trophy, BookOpen, ShieldAlert, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import VerticalNav from "../layout/VerticalNav";
import JoinClassicQuiz from "../students/JoinClassicQuiz";
import CreateTeam from "../students/CreateTeam";
import StudentResults from "../students/StudentResults";
import { supabase } from "../../supabaseClient";
import { getActiveSession, clearActiveSession } from "../../utils/sessionPersistence";

export default function StudentDashboard({ appState, setAppState, setView, error, setError }) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard, join-classic, create-team, results
  const isApproved = appState.currentUser?.approved;
  const [activeSession, setActiveSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for active quiz session on mount
  useEffect(() => {
    if (appState.currentUser?.id) {
      checkForActiveSession();
    }
  }, [appState.currentUser?.id]);

  const checkForActiveSession = async () => {
    try {
      // 1. Check localStorage for saved session
      const savedSession = getActiveSession();

      if (!savedSession?.sessionId) {
        setCheckingSession(false);
        return;
      }

      // 2. Verify session is still active in database
      const { data: dbSession, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("id, status, pin, quiz_id, quizzes(title)")
        .eq("id", savedSession.sessionId)
        .maybeSingle();

      if (sessionError) {
        console.error('[StudentDashboard] Error checking session:', sessionError);
        clearActiveSession();
        setCheckingSession(false);
        return;
      }

      // 3. Check if session is still active (not completed or cancelled)
      if (!dbSession || ["completed", "cancelled"].includes(dbSession.status)) {
        clearActiveSession();
        setCheckingSession(false);
        return;
      }

      // 4. Check if student is still a participant
      const { data: participant, error: participantError } = await supabase
        .from("session_participants")
        .select("id, score")
        .eq("session_id", savedSession.sessionId)
        .eq("user_id", appState.currentUser.id)
        .maybeSingle();

      if (participantError || !participant) {
        console.log('[StudentDashboard] Student not a participant, clearing session');
        clearActiveSession();
        setCheckingSession(false);
        return;
      }

      // Session is still active - show rejoin banner
      console.log('[StudentDashboard] Active session found:', dbSession);
      setActiveSession({
        ...dbSession,
        participantScore: participant.score
      });
      setCheckingSession(false);
    } catch (err) {
      console.error('[StudentDashboard] Error checking for active session:', err);
      setCheckingSession(false);
    }
  };

  const handleDismissActiveSession = () => {
    clearActiveSession();
    setActiveSession(null);
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setError(null);
  };

  const handleNavSelection = (nextView, sessionId) => {
    if (nextView === "student-dashboard") {
      handleBackToDashboard();
    }
    setView(nextView, sessionId);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="student-dashboard" setView={handleNavSelection} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 md:ml-64 pt-16 md:pt-0">
        {currentView === "dashboard" && (
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4 md:p-8">
            <div className="max-w-6xl w-full">
              <h1 className="text-2xl md:text-4xl font-bold text-white text-center mb-4 md:mb-6">
                {t('student.welcome', { name: appState.currentUser?.name })}
              </h1>

              {!isApproved && (
                <div className="mb-10 mx-auto max-w-2xl rounded-2xl bg-white/15 border border-white/30 backdrop-blur-sm p-5 text-center text-white">
                  <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                    <ShieldAlert size={24} />
                    {t('student.awaitingTeacherApproval')}
                  </div>
                  <p className="mt-2 text-sm text-white/80">
                    {t('student.approvalMessage')}
                  </p>
                </div>
              )}

              {/* Active Session Rejoin Banner */}
              {activeSession && (
                <div className="mb-6 mx-auto max-w-2xl">
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <RefreshCw size={20} className="text-yellow-700" />
                        <p className="font-bold text-yellow-800">{t('student.activeQuizFound', 'Active Quiz Found!')}</p>
                      </div>
                      <p className="text-yellow-700 mt-1">
                        {t('student.ongoingQuiz', 'You have an ongoing quiz')}: <span className="font-semibold">{activeSession.quizzes?.title || 'Quiz'}</span>
                      </p>
                      <p className="text-sm text-yellow-600">
                        {t('student.currentScore', 'Your current score')}: {activeSession.participantScore || 0} {t('quiz.points', 'points')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setView("student-quiz", activeSession.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                      >
                        {t('student.rejoinQuiz', 'Rejoin Quiz')}
                      </button>
                      <button
                        onClick={handleDismissActiveSession}
                        className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-4 py-3 rounded-lg font-medium transition-colors"
                        title={t('student.dismissActiveSession', 'Dismiss')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                {/* Card 1: Join Quiz (Classic Mode) */}
                <div
                  onClick={isApproved ? () => setCurrentView("join-classic") : undefined}
                  className={`bg-white rounded-2xl shadow-2xl p-8 transition-transform duration-200 flex flex-col items-center text-center ${
                    isApproved
                      ? "cursor-pointer hover:scale-105"
                      : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="bg-blue-50 rounded-full p-6 mb-4">
                    <BookOpen size={48} className="text-blue-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    {t('student.joinQuiz')}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {isApproved
                      ? t('student.enterPinToJoinIndividually')
                      : t('student.disabledUntilApproved')}
                  </p>
                  <div className="mt-auto">
                    <span
                      className={`inline-block px-6 py-2 rounded-lg font-semibold ${
                        isApproved
                          ? "bg-blue-700 text-white hover:bg-blue-800"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {t('actions.start')}
                    </span>
                  </div>
                </div>

                {/* Card 2: Create Team */}
                <div
                  onClick={isApproved ? () => setCurrentView("create-team") : undefined}
                  className={`bg-white rounded-2xl shadow-2xl p-8 transition-transform duration-200 flex flex-col items-center text-center ${
                    isApproved
                      ? "cursor-pointer hover:scale-105"
                      : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="bg-blue-100 rounded-full p-6 mb-4">
                    <Users size={48} className="text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    {t('student.createTeam')}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {isApproved
                      ? t('student.formTeamWithClassmates')
                      : t('student.disabledUntilApproved')}
                  </p>
                  <div className="mt-auto">
                    <span
                      className={`inline-block px-6 py-2 rounded-lg font-semibold ${
                        isApproved
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {t('common.create')}
                    </span>
                  </div>
                </div>

                {/* Card 3: View My Results */}
                <div
                  onClick={() => setCurrentView("results")}
                  className="bg-white rounded-2xl shadow-2xl p-8 cursor-pointer hover:scale-105 transition-transform duration-200 flex flex-col items-center text-center"
                >
                  <div className="bg-green-100 rounded-full p-6 mb-4">
                    <Trophy size={48} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    {t('student.viewMyResults')}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {t('student.seeQuizHistoryAndScores')}
                  </p>
                  <div className="mt-auto">
                    <span className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700">
                      {t('common.view')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "join-classic" && (
          <JoinClassicQuiz
            appState={appState}
            setView={setView}
            error={error}
            setError={setError}
            onBack={handleBackToDashboard}
            isApproved={isApproved}
          />
        )}

        {currentView === "create-team" && (
          <CreateTeam
            appState={appState}
            setView={setView}
            error={error}
            setError={setError}
            onBack={handleBackToDashboard}
            isApproved={isApproved}
          />
        )}

        {currentView === "results" && (
          <StudentResults
            appState={appState}
            onBack={handleBackToDashboard}
          />
        )}
      </div>
    </div>
  );
}
