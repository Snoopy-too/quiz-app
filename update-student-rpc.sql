-- Function to allow teachers to update their own students' details and password
-- This uses SECURITY DEFINER to allow it to update auth.users

CREATE OR REPLACE FUNCTION update_student_account(
  target_user_id UUID,
  new_name TEXT,
  new_student_id TEXT,
  new_password TEXT DEFAULT NULL
)
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
    RAISE EXCEPTION 'Permission denied: You can only edit students currently linked to your account.';
  END IF;

  -- 3. Update public.users
  UPDATE public.users 
  SET 
    name = new_name,
    student_id = new_student_id
  WHERE id = target_user_id;
  
  -- 4. Update auth.users password if provided
  -- We use the service role capability of security definer to update auth.users
  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  END IF;
  
END;
$$;
