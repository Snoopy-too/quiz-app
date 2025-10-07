-- Fix RLS Policy to Allow Teachers to Approve Their Students
-- Run this in Supabase SQL Editor

-- Add policy: Teachers can update the 'approved' field for their own students
CREATE POLICY "teachers_can_approve_their_students"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- The student being updated belongs to this teacher
    teacher_id = auth.uid() AND
    -- The current user is a teacher
    (SELECT role FROM users WHERE id = auth.uid()) = 'teacher'
  )
  WITH CHECK (
    -- The student being updated belongs to this teacher
    teacher_id = auth.uid() AND
    -- The current user is a teacher
    (SELECT role FROM users WHERE id = auth.uid()) = 'teacher' AND
    -- Only allow updating the approved field (prevent changing other sensitive fields)
    -- The role cannot be changed
    role = (SELECT role FROM users WHERE id = users.id) AND
    -- The email cannot be changed
    email = (SELECT email FROM users WHERE id = users.id) AND
    -- The teacher_id cannot be changed
    teacher_id = (SELECT teacher_id FROM users WHERE id = users.id)
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users' AND policyname = 'teachers_can_approve_their_students';
