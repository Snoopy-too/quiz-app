-- Fix Teams RLS for Quiz Session Access
-- This migration adds an RLS policy to allow quiz session hosts 
-- to view teams that have joined their sessions.
-- 
-- The issue: When a teacher queries session_participants with a JOIN to teams,
-- the teams data is null because the teacher isn't the team's teacher_id.
--
-- Run this in Supabase SQL Editor

-- Allow session hosts to view teams that have participants in their sessions
CREATE POLICY "hosts_can_view_teams_in_their_sessions"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    -- Check if this team has a participant in a session hosted by the current user
    EXISTS (
      SELECT 1 FROM session_participants sp
      JOIN quiz_sessions qs ON qs.id = sp.session_id
      WHERE sp.team_id = teams.id
      AND qs.host_id = auth.uid()
    )
  );

-- Also ensure team_members are visible for these teams
CREATE POLICY "hosts_can_view_team_members_in_their_sessions"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN session_participants sp ON sp.team_id = teams.id
      JOIN quiz_sessions qs ON qs.id = sp.session_id
      WHERE team_members.team_id = teams.id
      AND qs.host_id = auth.uid()
    )
  );

-- Verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;
