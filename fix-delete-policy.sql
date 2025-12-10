-- Allow teachers to delete their own students
-- Run this in Supabase SQL Editor

-- Drop existing policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "teachers_can_delete_their_students" ON users;

-- Create DELETE policy
CREATE POLICY "teachers_can_delete_their_students"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid() 
    AND role = 'student'
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users' AND policyname = 'teachers_can_delete_their_students';
