-- Team Mode Migration
-- Add columns to support team mode functionality

-- Add mode column to quiz_sessions
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'classic';

-- Add team-related columns to session_participants
ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS player_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);

-- Create index for team_name for better query performance
CREATE INDEX IF NOT EXISTS idx_session_participants_team_name
ON session_participants(team_name)
WHERE team_name IS NOT NULL;

-- Update existing sessions to have classic mode
UPDATE quiz_sessions
SET mode = 'classic'
WHERE mode IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN quiz_sessions.mode IS 'Quiz mode: classic (individual) or team';
COMMENT ON COLUMN session_participants.player_name IS 'Player display name (used in team mode)';
COMMENT ON COLUMN session_participants.team_name IS 'Team name (used in team mode)';
