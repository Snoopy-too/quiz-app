-- EMERGENCY FIX: Remove the recursive policy and disable RLS temporarily
-- Run this immediately in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "superadmin_all_access" ON users;
DROP POLICY IF EXISTS "authenticated_read_users" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "allow_insert_for_new_users" ON users;

-- Temporarily disable RLS to restore access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- You should now be able to log in again
