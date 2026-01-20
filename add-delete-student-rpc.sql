-- Function to allow teachers to strictly delete their own students from both public.users and auth.users
-- This ensures the user is completely removed from the system and cannot log in anymore.

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
  -- Get the ID of the user executing this function
  requesting_user_id := auth.uid();
  
  -- 1. Verify the requesting user is a teacher
  SELECT (role = 'teacher') INTO is_teacher
  FROM public.users
  WHERE id = requesting_user_id;
  
  IF is_teacher IS NULL OR NOT is_teacher THEN
    RAISE EXCEPTION 'Permission denied: Only teachers can perform this action.';
  END IF;

  -- 2. Verify the target student is actually linked to this teacher
  SELECT (teacher_id = requesting_user_id) INTO target_is_linked
  FROM public.users
  WHERE id = target_user_id;
  
  IF target_is_linked IS NULL OR NOT target_is_linked THEN
    RAISE EXCEPTION 'Permission denied: You can only delete students currently linked to your account.';
  END IF;

  -- 3. Delete from public.users first (to satisfy any constraints or just to be explicit)
  -- Note: If ON DELETE CASCADE is set up, deleting from auth.users might be enough, 
  -- but we do this to be safe and ensure the app logic (Manage Students) sees the deletion immediately.
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- 4. Delete from auth.users (requires security definer privilege)
  DELETE FROM auth.users WHERE id = target_user_id;
  
END;
$$;
