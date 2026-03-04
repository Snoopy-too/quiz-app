-- Fix: Add missing teacher approval policy
-- The nuclear RLS rebuild dropped this policy. Teachers need it to approve/reject students.
-- Run this in Supabase SQL Editor.

-- Drop if it exists (idempotent)
DROP POLICY IF EXISTS "teachers_can_approve_their_students" ON users;
DROP POLICY IF EXISTS "teachers_approve_students" ON users;

-- Teachers can update students assigned to them (approve/reject)
-- Uses get_my_role() helper from the nuclear rebuild to avoid subquery issues
CREATE POLICY "teachers_approve_students"
  ON users FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND role = 'student'
    AND teacher_id = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'teacher'
    AND role = 'student'
    AND teacher_id = auth.uid()
  );

-- Verify
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'UPDATE'
ORDER BY policyname;
