-- Enable Linking and Unlinking of Students (Version 2 - Explicit Drop & Create)
-- Run this in Supabase SQL Editor

-- 1. Drop conflicting or restrictive update policies if they exist
DROP POLICY IF EXISTS "teachers_can_approve_their_students" ON users;
DROP POLICY IF EXISTS "teachers_can_manage_students" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users; -- Sometimes interferes if conditions overlap

-- 2. Restore user self-update policy (without role change check complexity for now, or just ID check)
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Create a comprehensive 'Teacher Manage Students' policy
-- This allows teachers to UPDATE students if:
-- a) The student is currently assigned to them (allows approving, verifying, editing, AND UNLINKING)
-- b) The student is currently unassigned (allows LINKING)
CREATE POLICY "teachers_can_manage_students"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update if currently my student OR if unassigned student
    (teacher_id = auth.uid() AND role = 'student')
    OR 
    (teacher_id IS NULL AND role = 'student')
  )
  WITH CHECK (
    -- Can update TO being my student OR TO being unassigned
    -- This allows:
    -- 1. Setting teacher_id = NULL (Unlink)
    -- 2. Setting teacher_id = my_id (Link)
    -- 3. Updating other fields while keeping teacher_id = my_id
    (teacher_id = auth.uid() AND role = 'student')
    OR
    (teacher_id IS NULL AND role = 'student')
  );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'UPDATE';
