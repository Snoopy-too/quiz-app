import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";
import { GamePinSchema } from "../schemas/dashboard";
import { saveActiveSession } from "../utils/sessionPersistence";

interface UseJoinQuizArgs {
  userId: string | undefined;
  isApproved: boolean;
  onSuccess: (sessionId: string) => void;
  onError?: (msg: string | null) => void;
}

export interface TeamCandidate {
  team_id: string;
  joined_at?: string | null;
  teams?: {
    name?: string | null;
    team_name?: string | null;
  } | null;
  session_id?: string;
}

export interface QuizSessionRecord {
  id: string;
  pin: string;
  status: string;
  mode?: string | null;
  created_at?: string | null;
}

export function useJoinQuiz({ userId, isApproved, onSuccess, onError }: UseJoinQuizArgs) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [foundTeam, setFoundTeam] = useState<TeamCandidate | null>(null);
  const [availableTeams, setAvailableTeams] = useState<TeamCandidate[]>([]);
  const [pendingSession, setPendingSession] = useState<QuizSessionRecord | null>(null);
  const [teamModeSession, setTeamModeSession] = useState<QuizSessionRecord | null>(null);
  const [showTeamModeOptions, setShowTeamModeOptions] = useState(false);
  const [showJoinTeamByCode, setShowJoinTeamByCode] = useState(false);

  const reportError = useCallback(
    (msg: string | null) => {
      onError?.(msg);
    },
    [onError],
  );

  const joinWithSpecificTeam = useCallback(
    async (session: QuizSessionRecord, team: TeamCandidate) => {
      if (!userId) return;
      try {
        const { error: participantError } = await supabase
          .from("session_participants")
          .insert({
            session_id: session.id,
            user_id: userId,
            team_id: team.team_id,
            is_team_entry: true,
            score: 0,
          })
          .select()
          .single();

        if (participantError && participantError.code !== "23505") {
          throw new Error(`${t("errors.failedToJoinQuiz")}: ${participantError.message}`);
        }

        saveActiveSession(session.id, { pin: session.pin });
        onSuccess(session.id);
      } catch (err) {
        reportError(err instanceof Error ? err.message : t("errors.failedToJoinQuiz"));
        setLoading(false);
      }
    },
    [userId, onSuccess, reportError, t],
  );

  const joinByPin = useCallback(
    async (rawPin: string) => {
      if (!isApproved) {
        reportError(t("student.accountAwaitingApproval"));
        return;
      }

      const parsed = GamePinSchema.safeParse(rawPin);
      if (!parsed.success) {
        reportError(t("student.enterValid6DigitPIN"));
        return;
      }

      if (!userId) {
        reportError(t("errors.notAuthenticated"));
        return;
      }

      const pin = parsed.data;
      setLoading(true);
      reportError(null);

      try {
        const { data: sessions, error: sessionError } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("pin", pin);

        if (sessionError) {
          if (sessionError.code === "42501" || sessionError.message?.includes("policy")) {
            reportError(t("errors.permissionDeniedEnsureApproved"));
            setLoading(false);
            return;
          }
          throw sessionError;
        }

        if (!sessions || sessions.length === 0) {
          reportError(t("errors.invalidPinQuizNotFound"));
          setLoading(false);
          return;
        }

        const session = sessions[0] as QuizSessionRecord;

        if (session.status === "completed" || session.status === "cancelled") {
          reportError(t("errors.quizAlreadyEnded"));
          setLoading(false);
          return;
        }

        const { data: existingParticipant } = await supabase
          .from("session_participants")
          .select("id")
          .eq("session_id", session.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (session.status !== "waiting" && !existingParticipant) {
          reportError(t("errors.quizAlreadyStarted"));
          setLoading(false);
          return;
        }

        if (session.mode === "team") {
          const { data: myTeams } = await supabase
            .from("team_members")
            .select("team_id, joined_at, teams(name, team_name)")
            .eq("student_id", userId);

          const typedMyTeams = (myTeams || []) as TeamCandidate[];

          if (typedMyTeams.length > 0) {
            let activeTeamIds: string[] = [];
            try {
              const { data: rpcData, error: rpcError } = await supabase.rpc(
                "get_active_teams_for_session",
                { p_session_id: session.id },
              );
              if (rpcError) throw rpcError;
              activeTeamIds = ((rpcData || []) as Array<{ team_id: string }>).map(
                (item) => item.team_id,
              );
            } catch {
              const { data: sessionParticipants } = await supabase
                .from("session_participants")
                .select("team_id")
                .eq("session_id", session.id)
                .eq("is_team_entry", true);
              activeTeamIds = ((sessionParticipants || []) as Array<{ team_id: string | null }>)
                .map((p) => p.team_id)
                .filter((id): id is string => Boolean(id));
            }

            const myActiveTeams = typedMyTeams.filter((team) =>
              activeTeamIds.includes(team.team_id),
            );

            let candidateTeams = typedMyTeams;
            if (myActiveTeams.length > 0) {
              candidateTeams = myActiveTeams;
            } else if (session.created_at) {
              const sessionTime = new Date(session.created_at).getTime();
              const recentTeams = typedMyTeams.filter(
                (team) => team.joined_at && new Date(team.joined_at).getTime() > sessionTime,
              );
              if (recentTeams.length > 0) {
                candidateTeams = recentTeams;
              }
            }

            if (candidateTeams.length === 1) {
              const team = candidateTeams[0];
              if (activeTeamIds.includes(team.team_id)) {
                setFoundTeam({ ...team, session_id: session.id });
                setLoading(false);
              } else {
                await joinWithSpecificTeam(session, team);
              }
              return;
            }

            if (candidateTeams.length > 1) {
              setAvailableTeams(candidateTeams);
              setPendingSession(session);
              setLoading(false);
              return;
            }

            reportError(t("errors.failedToJoinQuiz"));
            setLoading(false);
            return;
          }

          setTeamModeSession(session);
          setShowTeamModeOptions(true);
          setLoading(false);
          return;
        }

        const { error: participantError } = await supabase
          .from("session_participants")
          .insert({
            session_id: session.id,
            user_id: userId,
            score: 0,
            is_team_entry: false,
          })
          .select()
          .single();

        if (participantError && participantError.code !== "23505") {
          throw new Error(`${t("errors.failedToJoinQuiz")}: ${participantError.message}`);
        }

        saveActiveSession(session.id, { pin: session.pin });
        onSuccess(session.id);
      } catch (err) {
        reportError(
          `${t("errors.errorJoiningQuiz")}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        setLoading(false);
      }
    },
    [isApproved, userId, reportError, t, joinWithSpecificTeam, onSuccess],
  );

  const confirmJoinTeam = useCallback(async () => {
    if (!foundTeam?.session_id || !userId) return;
    setLoading(true);
    reportError(null);
    try {
      const { error: participantError } = await supabase.from("session_participants").insert({
        session_id: foundTeam.session_id,
        user_id: userId,
        team_id: foundTeam.team_id,
        is_team_entry: true,
        score: 0,
      });

      if (participantError && participantError.code !== "23505") {
        throw participantError;
      }

      saveActiveSession(foundTeam.session_id);
      onSuccess(foundTeam.session_id);
    } catch (err) {
      reportError(
        `${t("errors.failedToJoinQuiz")}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      setFoundTeam(null);
      setLoading(false);
    }
  }, [foundTeam, userId, reportError, onSuccess, t]);

  const cancelJoinTeam = useCallback(() => {
    setFoundTeam(null);
    setAvailableTeams([]);
    setPendingSession(null);
    setShowTeamModeOptions(false);
    setTeamModeSession(null);
    setShowJoinTeamByCode(false);
    setLoading(false);
  }, []);

  const handleSelectTeam = useCallback(
    async (team: TeamCandidate) => {
      if (!pendingSession) return;
      setLoading(true);
      await joinWithSpecificTeam(pendingSession, team);
    },
    [pendingSession, joinWithSpecificTeam],
  );

  return {
    loading,
    foundTeam,
    availableTeams,
    teamModeSession,
    showTeamModeOptions,
    setShowTeamModeOptions,
    setTeamModeSession,
    showJoinTeamByCode,
    setShowJoinTeamByCode,
    joinByPin,
    confirmJoinTeam,
    cancelJoinTeam,
    handleSelectTeam,
  };
}
