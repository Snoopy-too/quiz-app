import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ArrowLeft } from "lucide-react";

export default function JoinClassicQuiz({ appState, setView, error, setError, onBack, isApproved }) {
  const { t } = useTranslation();
  const [joinPin, setJoinPin] = useState("");
  const [loading, setLoading] = useState(false);

  const joinQuiz = async () => {
    if (!isApproved) {
      setError(t('student.accountAwaitingApproval'));
      return;
    }

    if (!joinPin || joinPin.length !== 6) {
      setError(t('student.enterValid6DigitPIN'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find session by PIN
      console.log('Looking for quiz with PIN:', joinPin);
      console.log('Current user:', appState.currentUser?.id, appState.currentUser?.email);

      const { data: sessions, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("pin", joinPin);

      console.log('Query result:', { sessions, sessionError });

      if (sessionError) {
        console.error('Session query error details:', {
          message: sessionError.message,
          code: sessionError.code,
          details: sessionError.details,
          hint: sessionError.hint
        });

        if (sessionError.code === '42501' || sessionError.message?.includes('policy')) {
          setError(t('errors.permissionDeniedEnsureApproved'));
          setLoading(false);
          return;
        }

        throw sessionError;
      }

      if (!sessions || sessions.length === 0) {
        console.warn('No quiz session found with PIN:', joinPin);
        setError(t('errors.invalidPinQuizNotFound'));
        setLoading(false);
        return;
      }

      const session = sessions[0];
      console.log('Found session:', session);

      if (session.status === "completed") {
        setError(t('errors.quizAlreadyEnded'));
        setLoading(false);
        return;
      }

      // Create participant record and join directly (classic mode only)
      console.log('Creating participant record for user:', appState.currentUser?.id);

      const { data: participant, error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: appState.currentUser.id,
          score: 0,
          is_team_entry: false
        })
        .select()
        .single();

      if (participantError) {
        // Check if error is due to duplicate entry (already joined)
        if (participantError.code === '23505') {
          console.log('Student already joined this session, proceeding...');
        } else if (participantError.message?.includes('is_team_entry')) {
          console.warn('Missing is_team_entry column on session_participants table, retrying without flag');
          const { error: fallbackError } = await supabase
            .from("session_participants")
            .insert({
              session_id: session.id,
              user_id: appState.currentUser.id,
              score: 0
            });

          if (fallbackError && fallbackError.code !== '23505') {
            console.error('Fallback insert failed:', fallbackError);
            throw new Error(t('errors.databaseMigrationIncomplete'));
          }
        } else {
          console.error('Failed to create participant:', participantError);
          throw new Error(`${t('errors.failedToJoinQuiz')}: ${participantError.message}`);
        }
      } else {
        console.log('Participant created successfully:', participant);
      }

      // Navigate to quiz
      setView("student-quiz", session.id);
    } catch (err) {
      setError(t('errors.errorJoiningQuiz') + ": " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          {t('student.backToDashboard')}
        </button>

        <h1 className="text-3xl font-bold text-center mb-6">{t('student.joinQuiz')}</h1>
        <p className="text-center text-gray-600 mb-6">{t('student.enterPinFromTeacher')}</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder={t('session.enterPin')}
          value={joinPin}
          onChange={(e) => setJoinPin(e.target.value)}
          className="w-full p-4 border-2 rounded-lg text-center text-2xl mb-4"
          maxLength="6"
        />

        <button
          onClick={joinQuiz}
          disabled={loading || !isApproved}
          className="w-full bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('student.joining') : t('student.joinQuiz')}
        </button>

        {!isApproved && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            {t('student.waitingForTeacherApprovalMessage')}
          </p>
        )}
      </div>
    </div>
  );
}
