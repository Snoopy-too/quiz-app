-- Fix RLS Policies for Assigned Quizzes
-- Allows students to view questions and quizzes for their assignments

-- 1. Policy for viewing questions in assigned quizzes
-- This allows students to fetch questions for quizzes assigned to them
DROP POLICY IF EXISTS "students_can_view_assigned_questions" ON questions;

CREATE POLICY "students_can_view_assigned_questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE quiz_assignments.quiz_id = questions.quiz_id
      AND quiz_assignments.student_id = auth.uid()
    )
  );

-- 2. Policy for viewing assigned quizzes details
-- This allows students to fetch quiz details (title, theme, etc) for quizzes assigned to them
DROP POLICY IF EXISTS "students_can_view_assigned_quizzes" ON quizzes;

CREATE POLICY "students_can_view_assigned_quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE quiz_assignments.quiz_id = quizzes.id
      AND quiz_assignments.student_id = auth.uid()
    )
  );

-- Verify policies
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('questions', 'quizzes') 
AND policyname LIKE 'students_can_view_assigned%';
