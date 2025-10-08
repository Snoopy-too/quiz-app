-- Add teacher_invite_code column to users table for Google OAuth profile completion
ALTER TABLE users
ADD COLUMN IF NOT EXISTS teacher_invite_code TEXT;

COMMENT ON COLUMN users.teacher_invite_code IS 'Teacher invitation code supplied during onboarding (used for Google OAuth profile completion)';
