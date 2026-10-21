-- Migration: Allow students to join and leave teams themselves
-- Run this in Supabase SQL Editor if students experience RLS permission errors when joining or leaving teams
--
-- Background: Previously only team creators could insert or delete from team_members.
-- This migration allows any authenticated student to insert/delete their own row in team_members.

-- 1. Ensure RLS is enabled on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 2. Allow students to insert their own membership (Join team via 4-character code)
DROP POLICY IF EXISTS "students_can_join_team_members" ON team_members;
CREATE POLICY "students_can_join_team_members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
  );

-- 3. Allow students to delete their own membership (Leave / Switch team)
DROP POLICY IF EXISTS "students_can_leave_team_members" ON team_members;
CREATE POLICY "students_can_leave_team_members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid()
  );

-- 4. Verification query
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY policyname;
