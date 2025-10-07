-- Fix Teacher Approval RLS Policy (Version 2 - Corrected)
-- Run this in Supabase SQL Editor

-- First, drop the problematic policy if it exists
DROP POLICY IF EXISTS "teachers_can_approve_their_students" ON users;

-- Create corrected policy: Teachers can update their students
-- This policy allows teachers to update students who are assigned to them
CREATE POLICY "teachers_can_approve_their_students"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if: the row being updated is a student assigned to the current teacher
    EXISTS (
      SELECT 1 FROM users teacher
      WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher'
      AND users.teacher_id = teacher.id
      AND users.role = 'student'
    )
  )
  WITH CHECK (
    -- Allow if: the row being updated is a student assigned to the current teacher
    EXISTS (
      SELECT 1 FROM users teacher
      WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher'
      AND users.teacher_id = teacher.id
      AND users.role = 'student'
    )
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users' AND policyname = 'teachers_can_approve_their_students';

-- Test the policy (optional - shows which students the current teacher can update)
-- Run this while logged in as a teacher to see if it works:
-- SELECT id, name, email, approved, teacher_id
-- FROM users
-- WHERE role = 'student' AND teacher_id = auth.uid();
