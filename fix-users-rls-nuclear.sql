-- ==========================================================
-- NUCLEAR FIX: Drop ALL users policies and rebuild from scratch.
-- This resolves the "more than one row returned by a subquery
-- used as an expression" error (code 21000) by eliminating every
-- legacy policy that used inline scalar subqueries.
-- ==========================================================

-- Step 0: Ensure the SECURITY DEFINER helper exists.
--         This bypasses RLS when checking the caller's own role,
--         so we never need a scalar subquery inside a policy.
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

-- Also create a helper to get own role safely (single value, no ambiguity)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================================
-- Step 1: Drop EVERY known policy name from all migration files
-- ==========================================================
DROP POLICY IF EXISTS "superadmin_all_access"          ON users;
DROP POLICY IF EXISTS "authenticated_read_users"       ON users;
DROP POLICY IF EXISTS "users_update_own_profile"       ON users;
DROP POLICY IF EXISTS "allow_insert_for_new_users"     ON users;
DROP POLICY IF EXISTS "users_select_all"               ON users;
DROP POLICY IF EXISTS "superadmin_insert_users"        ON users;
DROP POLICY IF EXISTS "superadmin_update_users"        ON users;
DROP POLICY IF EXISTS "superadmin_delete_users"        ON users;
DROP POLICY IF EXISTS "users_update_own"               ON users;
DROP POLICY IF EXISTS "allow_user_registration"        ON users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile"  ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration"           ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users"      ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users"      ON users;
-- Catch-all: drop any other straggler policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END;
$$;

-- ==========================================================
-- Step 2: Ensure RLS is enabled
-- ==========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- Step 3: Recreate CLEAN policies (no inline scalar subqueries)
-- ==========================================================

-- 3a. All authenticated users can read user profiles
CREATE POLICY "users_select_all"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- 3b. Anon users can also read (needed for registration checks)
CREATE POLICY "users_select_anon"
  ON users FOR SELECT
  TO anon
  USING (true);

-- 3c. Allow anyone to insert (registration & admin user creation)
CREATE POLICY "users_insert_all"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3d. Superadmins can update ANY user
CREATE POLICY "superadmin_update_any"
  ON users FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- 3e. Regular users can update ONLY their own row, and cannot change their role
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND NOT is_superadmin())
  WITH CHECK (
    id = auth.uid()
    AND role = get_my_role()   -- prevents role escalation
  );

-- 3f. Superadmins can delete any user
CREATE POLICY "superadmin_delete"
  ON users FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- ==========================================================
-- Step 4: Verify – should show exactly the 6 policies above
-- ==========================================================
SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
