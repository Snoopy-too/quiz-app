-- Defuse Mode Migration
-- Adds columns to quiz_sessions for cumulative bomb defusal timer and crisis penalty tracking.
-- Run this SQL in your Supabase SQL Editor.

-- Add columns to quiz_sessions if they do not exist
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS bomb_total_time INT,
ADD COLUMN IF NOT EXISTS bomb_time_remaining INT,
ADD COLUMN IF NOT EXISTS bomb_penalty_info JSONB,
ADD COLUMN IF NOT EXISTS bomb_exploded BOOLEAN DEFAULT FALSE;

-- Document columns
COMMENT ON COLUMN quiz_sessions.bomb_total_time IS
  'Total starting time in seconds for Defuse Mode, computed from sum of all question time limits.';

COMMENT ON COLUMN quiz_sessions.bomb_time_remaining IS
  'Current remaining countdown seconds for Defuse Mode.';

COMMENT ON COLUMN quiz_sessions.bomb_penalty_info IS
  'Crisis penalty details for the most recent question (e.g. incorrect %, deduction %, deduction seconds).';

COMMENT ON COLUMN quiz_sessions.bomb_exploded IS
  'Flag set to true if the bomb timer reached 0 and exploded.';

-- Verify the columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quiz_sessions'
  AND column_name IN ('bomb_total_time', 'bomb_time_remaining', 'bomb_penalty_info', 'bomb_exploded');
