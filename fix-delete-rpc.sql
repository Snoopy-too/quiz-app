-- Fix Delete Student RPC
-- This script does three things:
-- 1. Cleans up the orphaned 'Sally Brown' (sally@herself.com) from auth.users
-- 2. Re-creates the delete_student_account function with explicit permissions
-- 3. Grants execute access to authenticated users

-- 1. CLEANUP ORPHANED USER
DELETE FROM auth.users WHERE email = 'sally@herself.com';


-- 2. RECREATE FUNCTION
DROP FUNCTION IF EXISTS delete_student_account(UUID);

CREATE OR REPLACE FUNCTION delete_student_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requesting_user_id UUID;
  is_teacher BOOLEAN;
  target_is_linked BOOLEAN;
BEGIN
  -- Get the requestor ID
  requesting_user_id := auth.uid();
  
  -- Check 1: Verify requestor is a teacher
  SELECT (role = 'teacher') INTO is_teacher
  FROM public.users
  WHERE id = requesting_user_id;
  
  IF is_teacher IS NULL OR NOT is_teacher THEN
    RAISE EXCEPTION 'Permission denied: Only teachers can perform this action.';
  END IF;

  -- Check 2: Verify target student is linked to this teacher
  SELECT (teacher_id = requesting_user_id) INTO target_is_linked
  FROM public.users
  WHERE id = target_user_id;
  
  -- IMPORTANT: We check this BEFORE deleting from public.users
  -- If the user was already deleted from public.users (partial state), this check might fail.
  -- However, for a proper flow, both exist.
  
  IF target_is_linked IS NULL OR NOT target_is_linked THEN
    -- Fallback: If the user is NOT in public.users (maybe already half-deleted?), 
    -- we might still want to allow deletion if we are 'superadmin' but here we are 'teacher'.
    -- If the row is gone from public.users, the teacher can't 'see' them anyway to click delete.
    RAISE EXCEPTION 'Permission denied: You can only delete students linked to your account.';
  END IF;

  -- 3. Delete from public.users
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- 4. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
END;
$$;

-- 3. GRANT PERMISSION (CRITICAL STEP)
GRANT EXECUTE ON FUNCTION delete_student_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_student_account(UUID) TO service_role;
