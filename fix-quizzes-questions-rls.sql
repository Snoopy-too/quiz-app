-- Fix Missing RLS Policies for Quizzes and Questions Tables
-- Run this in Supabase SQL Editor

-- Problem: Students cannot view quizzes or questions when joining a quiz session
-- because there are no RLS policies allowing them to read these tables

-- ============================================
-- QUIZZES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on quizzes table (if not already enabled)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Teachers can view all quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can update their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can delete their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Students can view quizzes in active sessions" ON quizzes;

-- Policy 1: Teachers can view all quizzes (for browsing/sharing)
CREATE POLICY "teachers_can_view_quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'superadmin')
    )
  );

-- Policy 2: Students can view quizzes they are participating in
CREATE POLICY "students_can_view_active_quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
    )
    AND EXISTS (
      SELECT 1 FROM quiz_sessions
      JOIN session_participants ON session_participants.session_id = quiz_sessions.id
      WHERE quiz_sessions.quiz_id = quizzes.id
      AND session_participants.user_id = auth.uid()
    )
  );

-- Policy 3: Anyone can view public quizzes (templates)
CREATE POLICY "anyone_can_view_public_quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Policy 4: Teachers can create quizzes
CREATE POLICY "teachers_can_create_quizzes"
  ON quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'superadmin')
    )
  );

-- Policy 5: Teachers can update their own quizzes
CREATE POLICY "teachers_can_update_their_quizzes"
  ON quizzes
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy 6: Teachers can delete their own quizzes
CREATE POLICY "teachers_can_delete_their_quizzes"
  ON quizzes
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- QUESTIONS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on questions table (if not already enabled)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Teachers can manage questions" ON questions;
DROP POLICY IF EXISTS "Students can view questions in active sessions" ON questions;

-- Policy 1: Teachers can manage all questions for their quizzes
CREATE POLICY "teachers_can_manage_questions"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- Policy 2: Students can view questions when participating in a quiz session
CREATE POLICY "students_can_view_session_questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions
      JOIN session_participants ON session_participants.session_id = quiz_sessions.id
      WHERE quiz_sessions.quiz_id = questions.quiz_id
      AND session_participants.user_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('quizzes', 'questions')
ORDER BY tablename, policyname;
