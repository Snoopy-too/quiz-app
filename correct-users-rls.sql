-- Correct Users Table RLS Policies (No Infinite Recursion)
-- Run this AFTER running emergency-fix-rls.sql

-- Step 1: Create a function to check if current user is superadmin
-- This function uses SECURITY DEFINER to bypass RLS when checking role
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies using the function

-- Policy 1: Everyone can read all users (needed for app functionality)
CREATE POLICY "users_select_all"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Super admins can insert users
CREATE POLICY "superadmin_insert_users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Policy 3: Super admins can update any user
CREATE POLICY "superadmin_update_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Policy 4: Super admins can delete users
CREATE POLICY "superadmin_delete_users"
  ON users
  FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- Policy 5: Regular users can update their own profile (excluding role changes)
-- Note: Role protection is handled at application level
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND NOT is_superadmin())
  WITH CHECK (id = auth.uid());

-- Policy 6: Allow user registration (for signup)
CREATE POLICY "allow_user_registration"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';
