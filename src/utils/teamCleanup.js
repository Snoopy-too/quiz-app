import { supabase } from "../supabaseClient";
import { clearActiveSession } from "./sessionPersistence";

/**
 * Safely removes a student from a team and quiz session while the session is in 'waiting' status.
 * If the student was the creator of the team and no other members/participants remain,
 * the empty team row is deleted so ghost teams do not clutter the teacher's lobby.
 *
 * @param {Object} params
 * @param {string} params.sessionId - Quiz session UUID
 * @param {string} params.userId - Current user UUID
 * @param {string} [params.teamId] - Team UUID (optional if unknown)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function leaveTeamAndSession({ sessionId, userId, teamId }) {
  if (!sessionId || !userId) {
    return { success: false, error: "Missing sessionId or userId" };
  }

  try {
    let resolvedTeamId = teamId;

    // 1. If teamId wasn't passed, find it from session_participants
    if (!resolvedTeamId) {
      const { data: part } = await supabase
        .from("session_participants")
        .select("team_id")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (part?.team_id) {
        resolvedTeamId = part.team_id;
      }
    }

    // 2. Remove participant from session_participants
    const { error: partDeleteError } = await supabase
      .from("session_participants")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (partDeleteError) {
      console.warn("[teamCleanup] Error removing session_participant:", partDeleteError.message);
    }

    // 3. Remove student from team_members if teamId is known
    if (resolvedTeamId) {
      const { error: memberDeleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", resolvedTeamId)
        .eq("student_id", userId);

      if (memberDeleteError) {
        console.warn("[teamCleanup] Error removing team_member:", memberDeleteError.message);
      }

      // 4. Check if the team was created by this user and has no other participants left
      try {
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, creator_id")
          .eq("id", resolvedTeamId)
          .maybeSingle();

        if (teamData && teamData.creator_id === userId) {
          // Check if any other participants are in session_participants for this team
          const { count: remainingParticipants } = await supabase
            .from("session_participants")
            .select("id", { count: "exact", head: true })
            .eq("team_id", resolvedTeamId);

          // Check if any other members exist in team_members
          const { count: remainingMembers } = await supabase
            .from("team_members")
            .select("id", { count: "exact", head: true })
            .eq("team_id", resolvedTeamId);

          if ((remainingParticipants ?? 0) === 0 && (remainingMembers ?? 0) === 0) {
            console.log("[teamCleanup] Deleting empty solo team created by user:", resolvedTeamId);
            const { error: teamDeleteError } = await supabase
              .from("teams")
              .delete()
              .eq("id", resolvedTeamId)
              .eq("creator_id", userId);

            if (teamDeleteError) {
              console.warn("[teamCleanup] Error deleting empty team:", teamDeleteError.message);
            }
          }
        }
      } catch (teamCheckErr) {
        console.warn("[teamCleanup] Error checking/deleting empty team:", teamCheckErr);
      }
    }

    // 5. Clear local active session storage
    clearActiveSession();

    return { success: true };
  } catch (err) {
    console.error("[teamCleanup] Failed to leave team and session:", err);
    return { success: false, error: err.message || "Failed to leave team" };
  }
}
