-- SQL Migration: Add SELECT policies for Super Admin
-- Run this in your Supabase SQL Editor

-- 1. session_participants SELECT access
DROP POLICY IF EXISTS "superadmin_view_session_participants" ON session_participants;
CREATE POLICY "superadmin_view_session_participants"
  ON session_participants FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- 2. quiz_answers SELECT access
DROP POLICY IF EXISTS "superadmin_view_quiz_answers" ON quiz_answers;
CREATE POLICY "superadmin_view_quiz_answers"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- 3. quiz_sessions SELECT access
DROP POLICY IF EXISTS "superadmin_view_quiz_sessions" ON quiz_sessions;
CREATE POLICY "superadmin_view_quiz_sessions"
  ON quiz_sessions FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- 4. quiz_assignments SELECT access
DROP POLICY IF EXISTS "superadmin_view_quiz_assignments" ON quiz_assignments;
CREATE POLICY "superadmin_view_quiz_assignments"
  ON quiz_assignments FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- 5. assignment_answers SELECT access
DROP POLICY IF EXISTS "superadmin_view_assignment_answers" ON assignment_answers;
CREATE POLICY "superadmin_view_assignment_answers"
  ON assignment_answers FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- 6. questions SELECT access
DROP POLICY IF EXISTS "superadmin_view_questions" ON questions;
CREATE POLICY "superadmin_view_questions"
  ON questions FOR SELECT
  TO authenticated
  USING (is_superadmin());
