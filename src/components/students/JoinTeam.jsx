import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Users, Check } from "lucide-react";
import { normalizeTeamCode } from "../../utils/teamCode";

export default function JoinTeam({ appState, setView, session, onBack }) {
  const { t } = useTranslation();
  const [teamCode, setTeamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [foundTeam, setFoundTeam] = useState(null);
  const [joining, setJoining] = useState(false);

  const findTeam = async () => {
    const normalizedCode = normalizeTeamCode(teamCode);

    if (!normalizedCode || normalizedCode.length !== 4) {
      setError(t('student.enterValid4CharCode'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query teams by team_code
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name, team_code, is_shared_device, creator_id")
        .eq("team_code", normalizedCode)
        .single();

      if (teamError || !team) {
        setError(t('student.teamNotFound'));
        setLoading(false);
        return;
      }

      // Check if this is a shared device team - shouldn't be joinable via code
      if (team.is_shared_device) {
        setError(t('student.teamIsSharedDevice'));
        setLoading(false);
        return;
      }

      // Check if user is already in the session with this team
      const { data: existingParticipant } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("user_id", appState.currentUser.id)
        .single();

      if (existingParticipant) {
        setError(t('student.alreadyInSession'));
        setLoading(false);
        return;
      }

      setFoundTeam(team);
    } catch (err) {
      console.error("Error finding team:", err);
      setError(t('errors.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const joinTeam = async () => {
    setJoining(true);
    setError(null);

    try {
      // Check if user is already a team member
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", foundTeam.id)
        .eq("student_id", appState.currentUser.id)
        .single();

      // Add to team_members if not already a member
      if (!existingMember) {
        const { error: memberError } = await supabase
          .from("team_members")
          .insert({
            team_id: foundTeam.id,
            student_id: appState.currentUser.id
          });

        if (memberError) {
          console.error("Error adding team member:", memberError);
          // Continue anyway - they might already be a member
        }
      }

      // Add to session_participants
      const { error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: appState.currentUser.id,
          team_id: foundTeam.id,
          is_team_entry: true,
          score: 0
        });

      if (participantError) {
        throw participantError;
      }

      // Navigate to quiz
      setView("student-quiz", session.id);
    } catch (err) {
      console.error("Error joining team:", err);
      setError(t('errors.failedToJoinTeam') + ": " + err.message);
    } finally {
      setJoining(false);
    }
  };

  // Team confirmation screen
  if (foundTeam) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <button
            onClick={() => setFoundTeam(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="text-5xl mb-4">👥</div>
          <h1 className="text-2xl font-bold mb-2">{t('student.teamFound')}</h1>

          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <div className="text-3xl font-bold text-blue-700 mb-2">
              {foundTeam.name}
            </div>
            <div className="text-gray-500 text-sm">
              {t('student.teamCode')}: {foundTeam.team_code}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={joinTeam}
            disabled={joining}
            className="w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Users size={24} />
            {joining ? t('student.joining') : t('student.joinTeam')}
          </button>
        </div>
      </div>
    );
  }

  // Team code entry screen
  return (
    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-2xl font-bold mb-2">{t('student.joinExistingTeam')}</h1>
        <p className="text-gray-600 mb-6">{t('student.enterTeamCodeFromCaptain')}</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder={t('student.teamCodePlaceholder')}
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
          className="w-full p-4 border-2 rounded-lg text-center text-3xl tracking-widest mb-4 uppercase"
          maxLength="4"
          autoCapitalize="characters"
        />

        <button
          onClick={findTeam}
          disabled={loading || teamCode.length < 4}
          className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('common.searching') : t('student.findTeam')}
        </button>
      </div>
    </div>
  );
}
