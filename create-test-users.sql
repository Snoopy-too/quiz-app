-- =====================================================
-- CREATE TEST USERS FOR QUIZMASTER APP
-- =====================================================
-- Run this in Supabase SQL Editor to create test accounts
--
-- IMPORTANT: After running this, you'll need to set passwords
-- via Supabase Dashboard or use the password reset flow
-- =====================================================

-- Option 1: View existing users (check what you have)
SELECT
  id,
  email,
  raw_user_meta_data->>'name' as name,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Option 2: View users table with roles
SELECT
  id,
  email,
  name,
  role,
  approved,
  verified,
  student_id
FROM public.users
ORDER BY created_at DESC;

-- =====================================================
-- RESET PASSWORD FOR EXISTING USER (via Supabase Dashboard)
-- =====================================================
-- Go to: Authentication > Users > Click on user > Send password recovery email
-- OR use the "Reset Password" button in the dashboard

-- =====================================================
-- CREATE NEW TEST USERS
-- =====================================================
-- Note: You need to create auth users via Supabase Dashboard first,
-- then run the INSERT statements below to add them to public.users table

-- After creating auth users in Supabase Dashboard, use these templates:

-- Test Student
-- Email: student@test.com
-- Password: Student123! (set in Supabase Dashboard)
-- Then run:
/*
INSERT INTO public.users (id, email, name, role, student_id, approved, verified)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID', -- Get this from auth.users after creating
  'student@test.com',
  'Test Student',
  'student',
  'STU001',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  approved = EXCLUDED.approved,
  verified = EXCLUDED.verified;
*/

-- Test Teacher
-- Email: teacher@test.com
-- Password: Teacher123! (set in Supabase Dashboard)
-- Then run:
/*
INSERT INTO public.users (id, email, name, role, approved, verified)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID',
  'teacher@test.com',
  'Test Teacher',
  'teacher',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  approved = EXCLUDED.approved,
  verified = EXCLUDED.verified;
*/

-- Test Super Admin
-- Email: admin@test.com
-- Password: Admin123! (set in Supabase Dashboard)
-- Then run:
/*
INSERT INTO public.users (id, email, name, role, approved, verified)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID',
  'admin@test.com',
  'Test Admin',
  'superadmin',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  approved = EXCLUDED.approved,
  verified = EXCLUDED.verified;
*/

-- =====================================================
-- UPDATE EXISTING USER ROLES (if needed)
-- =====================================================

-- Make an existing user a teacher
/*
UPDATE public.users
SET role = 'teacher', approved = true, verified = true
WHERE email = 'your-email@example.com';
*/

-- Make an existing user a superadmin
/*
UPDATE public.users
SET role = 'superadmin', approved = true, verified = true
WHERE email = 'your-email@example.com';
*/

-- Make an existing user a student
/*
UPDATE public.users
SET role = 'student', student_id = 'STU001', approved = true, verified = true
WHERE email = 'your-email@example.com';
*/
