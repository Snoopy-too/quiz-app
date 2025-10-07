-- Remove verification_code column from users table
-- Now using Supabase's built-in email verification instead
-- Run this in Supabase SQL Editor

-- Drop the index first
DROP INDEX IF EXISTS idx_users_verification_code;

-- Drop the column
ALTER TABLE users
DROP COLUMN IF EXISTS verification_code;
