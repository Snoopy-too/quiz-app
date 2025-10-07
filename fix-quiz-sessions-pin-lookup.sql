-- Fix Quiz Sessions RLS Policy to Allow PIN Lookup
-- Run this in Supabase SQL Editor

-- Problem: Students cannot look up quiz_sessions by PIN because the RLS policy
-- only allows access if they're already a participant (chicken-and-egg problem)

-- Solution: Allow authenticated users to SELECT quiz_sessions without restrictions
-- (They still need to be approved/verified to login in the first place)

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view quiz sessions they host or participate in" ON quiz_sessions;

-- Create new SELECT policy: Allow all authenticated users to view quiz sessions
-- This allows students to look up sessions by PIN before joining
CREATE POLICY "authenticated_users_can_view_quiz_sessions"
  ON quiz_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'quiz_sessions' AND policyname = 'authenticated_users_can_view_quiz_sessions';

-- The other policies (INSERT, UPDATE, DELETE) remain unchanged:
-- - INSERT: Teachers can create quiz sessions
-- - UPDATE: Teachers can update their own sessions
-- - DELETE: Teachers can delete their own sessions
