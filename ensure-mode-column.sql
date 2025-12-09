-- Ensure quiz_sessions has mode column for Team Mode functionality
-- Run this in Supabase SQL Editor

-- Add mode column if it doesn't exist
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'classic';

-- Set default for existing sessions
UPDATE quiz_sessions
SET mode = 'classic'
WHERE mode IS NULL;

-- Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quiz_sessions' AND column_name = 'mode';

-- Show current sessions with their mode
SELECT id, pin, status, mode, created_at
FROM quiz_sessions
ORDER BY created_at DESC
LIMIT 10;
