-- Fix: Replace scalar subqueries in users RLS policies with the
-- is_superadmin() SECURITY DEFINER function to prevent
-- "more than one row returned by a subquery" errors.
--
-- Root cause: policies using (SELECT role FROM users WHERE id = auth.uid())
-- can break when the query joining users with other tables causes the
-- subquery to evaluate in a context where it returns multiple rows.

-- Ensure the SECURITY DEFINER function exists
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

-- Drop the problematic policies
DROP POLICY IF EXISTS "superadmin_all_access" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "superadmin_update_users" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Recreate superadmin full access policy using the function (not a subquery)
CREATE POLICY "superadmin_all_access"
  ON users
  FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Recreate self-update policy using the function for role-change protection
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT u.role FROM users u WHERE u.id = auth.uid() LIMIT 1)
  );

-- Verify
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
