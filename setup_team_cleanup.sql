-- Function to cleanup team memberships after a quiz session
-- This ensures students don't see "old" teams in future quizzes
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION cleanup_session_teams(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete all team members for teams that participated in this session
  -- This effectively "disbands" the team from the student's perspective
  -- but keeps the Team Name and ID for historical reports.
  DELETE FROM team_members
  WHERE team_id IN (
    SELECT team_id 
    FROM session_participants 
    WHERE session_id = p_session_id
    AND is_team_entry = true
    AND team_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
