import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ArrowLeft } from "lucide-react";

export default function JoinClassicQuiz({ appState, setView, error, setError, onBack, isApproved }) {
  const { t } = useTranslation();
  const [joinPin, setJoinPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundTeam, setFoundTeam] = useState(null);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [pendingSession, setPendingSession] = useState(null);

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

      // Check for team mode
      if (session.mode === 'team') {
        console.log('Session is in team mode, checking for existing team memberships...');

        // 1. Get all teams the student belongs to
        const { data: myTeams, error: teamError } = await supabase
          .from('team_members')
          .select('team_id, teams(name, team_name)')
          .eq('student_id', appState.currentUser.id);

        if (teamError) {
          console.error('Error fetching student teams:', teamError);
        } else if (myTeams && myTeams.length > 0) {
          const teamIds = myTeams.map(t => t.team_id);
          console.log('Student belongs to teams:', teamIds);

          // 2. Check current session participants to find active teams
          // Use RPC to bypass RLS policies if needed (since joining student isn't in session yet)
          let activeTeamIds = [];

          try {
            const { data: rpcData, error: rpcError } = await supabase
              .rpc('get_active_teams_for_session', { p_session_id: session.id });

            if (rpcError) throw rpcError;
            activeTeamIds = rpcData?.map(t => t.team_id) || [];
            console.log('Active teams loaded via RPC:', activeTeamIds);
          } catch (err) {
            console.warn('RPC get_active_teams_for_session failed, falling back to direct query:', err);

            // Fallback: Direct query (might return empty if RLS blocks read access)
            const { data: sessionParticipants, error: checkError } = await supabase
              .from('session_participants')
              .select('team_id')
              .eq('session_id', session.id)
              .eq('is_team_entry', true);

            if (checkError) console.error('Error checking team participants:', checkError);
            activeTeamIds = sessionParticipants?.map(p => p.team_id) || [];
          }

          // Filter my teams to see if any are already in the session
          const myActiveTeams = myTeams.filter(t => activeTeamIds.includes(t.team_id));

          console.log('My active teams in session:', myActiveTeams);

          // Priority Logic:
          // 1. If I belong to teams currently in the session, I almost certainly want to join one of them.
          //    So we filter the list to ONLY those teams.
          // 2. If I don't belong to any active teams, then I can choose from ANY of my teams (to start a new entry).

          let candidateTeams = myTeams;
          if (myActiveTeams.length > 0) {
            candidateTeams = myActiveTeams;
          }

          if (candidateTeams.length === 1) {
            // Only one valid option - check if it's new or existing
            const team = candidateTeams[0];
            const isAlreadyIn = activeTeamIds.includes(team.team_id);

            if (isAlreadyIn) {
              setFoundTeam({ ...team, session_id: session.id });
            } else {
              // Not in session (matches myActiveTeams logic only if count=0, so this path is for the 'start new' case)
              await joinWithSpecificTeam(session, team);
            }
            return;
          } else if (candidateTeams.length > 1) {
            // Multiple candidates (either multiple active, or multiple potential new ones)
            setAvailableTeams(candidateTeams);
            setPendingSession(session);
            setLoading(false);
            return;
          } else {
            // Should not happen given logic above (myTeams > 0 check), but fallback
            console.warn('No candidate teams found');
            setError(t('errors.failedToJoinQuiz'));
            setLoading(false);
            return;
          }
        } else {
          // Student doesn't belong to any team - show error in team mode
          console.log('Student does not belong to any team');
          setError(t('errors.mustJoinTeamFirst') || 'You must create or join a team before joining a Team Mode quiz.');
          setLoading(false);
          return;
        }
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

  const confirmJoinTeam = async () => {
    if (!foundTeam) return;

    setLoading(true);
    setError(null);

    try {
      const { error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: foundTeam.session_id,
          user_id: appState.currentUser.id,
          team_id: foundTeam.team_id,
          is_team_entry: true,
          score: 0
        });

      if (participantError) {
        if (participantError.code === '23505') {
          console.log('Already joined team session');
        } else {
          throw participantError;
        }
      }

      // Navigate to quiz
      setView("student-quiz", foundTeam.session_id);
    } catch (err) {
      console.error('Error joining team:', err);
      setError(t('errors.failedToJoinQuiz') + ": " + err.message);
      setFoundTeam(null);
      setLoading(false);
    }
  };

  const cancelJoinTeam = () => {
    setFoundTeam(null);
    setAvailableTeams([]);
    setPendingSession(null);
    setLoading(false);
  };

  const joinWithSpecificTeam = async (session, team) => {
    const teamName = team.teams?.name || team.teams?.team_name || 'Unknown Team';
    console.log('Joining session with team:', teamName);

    try {
      const { data: participant, error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: appState.currentUser.id,
          team_id: team.team_id,
          is_team_entry: true,
          score: 0
        })
        .select()
        .single();

      if (participantError) {
        if (participantError.code === '23505') {
          console.log('Already joined this session, proceeding...');
        } else {
          console.error('Failed to create team participant:', participantError);
          throw new Error(`${t('errors.failedToJoinQuiz')}: ${participantError.message}`);
        }
      } else {
        console.log('Team participant created successfully:', participant);
      }

      // Navigate to quiz
      setView("student-quiz", session.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team) => {
    if (!pendingSession) return;
    setLoading(true);
    await joinWithSpecificTeam(pendingSession, team);
  };

  if (foundTeam) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">{t('student.joinTeam')}</h2>
          <p className="text-gray-600 mb-6">
            {t('student.yourTeamIsAlreadyInSession', { teamName: foundTeam.teams?.team_name })}
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-bold text-lg text-blue-800">{foundTeam.teams?.team_name}</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={confirmJoinTeam}
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              {t('student.joinAsTeamMember')}
            </button>
            <button
              onClick={cancelJoinTeam}
              className="w-full bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 font-semibold"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (availableTeams.length > 0) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">{t('student.selectTeam')}</h2>
          <p className="text-gray-600 mb-6">
            {t('student.selectTeamDescription') || "Choose which team you want to represent in this quiz:"}
          </p>

          <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
            {availableTeams.map((teamEntry) => (
              <button
                key={teamEntry.team_id}
                onClick={() => handleSelectTeam(teamEntry)}
                className="w-full bg-blue-50 border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-100 text-blue-900 p-4 rounded-xl font-bold transition-all flex items-center justify-between group"
              >
                <span>{teamEntry.teams?.name || teamEntry.teams?.team_name || "Unknown Team"}</span>
                <span className="opacity-0 group-hover:opacity-100 text-blue-600">➜</span>
              </button>
            ))}
          </div>

          <button
            onClick={cancelJoinTeam}
            className="w-full bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 font-semibold"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4 pt-20 md:pt-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 w-full max-w-sm md:max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-3 md:mb-4 text-sm md:text-base"
        >
          <ArrowLeft size={20} />
          {t('student.backToDashboard')}
        </button>

        <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6">{t('student.joinQuiz')}</h1>
        <p className="text-center text-gray-600 mb-4 md:mb-6 text-sm md:text-base">{t('student.enterPinFromTeacher')}</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 md:px-4 md:py-3 rounded mb-3 md:mb-4 text-sm md:text-base">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder={t('session.enterPin')}
          value={joinPin}
          onChange={(e) => setJoinPin(e.target.value)}
          className="w-full p-3 md:p-4 border-2 rounded-lg text-center text-xl md:text-2xl mb-3 md:mb-4"
          maxLength="6"
        />

        <button
          onClick={joinQuiz}
          disabled={loading || !isApproved}
          className="w-full bg-blue-700 text-white p-3 md:p-4 rounded-lg hover:bg-blue-800 text-base md:text-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('student.joining') : t('student.joinQuiz')}
        </button>

        {!isApproved && (
          <p className="mt-3 md:mt-4 text-xs md:text-sm text-gray-500 text-center">
            {t('student.waitingForTeacherApprovalMessage')}
          </p>
        )}
      </div>
    </div>
  );
}
