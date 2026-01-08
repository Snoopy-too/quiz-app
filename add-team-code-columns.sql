-- Migration: Add team_code and is_shared_device columns to teams table
-- This enables two team mode scenarios:
-- 1. Separate Devices: Students join via 4-character team code
-- 2. Shared Device: Team plays on one device, results attributed to all members

-- Add team_code column for short 4-character join codes
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS team_code VARCHAR(4);

-- Add is_shared_device flag to distinguish between the two modes
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS is_shared_device BOOLEAN DEFAULT false;

-- Add unique index for team_code lookups (only for non-null codes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code) WHERE team_code IS NOT NULL;

-- Add index for session-based team queries with shared device flag
CREATE INDEX IF NOT EXISTS idx_teams_session_shared ON teams(session_id, is_shared_device) WHERE session_id IS NOT NULL;
