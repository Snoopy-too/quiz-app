-- Complete Fix for Users Table RLS Policies
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies on users table to start fresh
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;

-- Enable RLS (in case it's not enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins can do EVERYTHING (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "superadmin_all_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
  );

-- Policy 2: All authenticated users can view user profiles
CREATE POLICY "authenticated_read_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Users can update their own profile (but cannot change their role)
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Policy 4: Allow new user registration
CREATE POLICY "allow_insert_for_new_users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
