-- Team Scoring Mode Migration
-- Adds a column to quiz_sessions to let teachers choose between
-- "combined" (sum of all members' scores) and "average" (mean score per member).
-- This is purely a front-end display concern; individual participant scores
-- remain unchanged in the database.

-- Add team_scoring_mode column to quiz_sessions
-- Default is 'combined' to preserve existing behavior.
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS team_scoring_mode VARCHAR(20) DEFAULT 'combined';

-- Document the column
COMMENT ON COLUMN quiz_sessions.team_scoring_mode IS
  'How team scores are calculated in Team mode: combined (sum) or average (mean per member). Default: combined.';
