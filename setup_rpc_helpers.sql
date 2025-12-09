-- Helper functions for Team Mode
-- Run this in Supabase SQL Editor

-- 1. Helper to fetch active teams in a session (Bypasses RLS so joining students can see them)
CREATE OR REPLACE FUNCTION get_active_teams_for_session(p_session_id UUID)
RETURNS TABLE (team_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.team_id
  FROM session_participants sp
  WHERE sp.session_id = p_session_id
  AND sp.is_team_entry = true
  AND sp.team_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cleanup function (Ensures this exists if not created previously)
CREATE OR REPLACE FUNCTION cleanup_session_teams(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete all team members for teams that participated in this session
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
