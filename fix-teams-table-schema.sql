-- Fix Teams Table Schema
-- This migration updates the teams table to support creating teams
-- BEFORE joining a quiz session (the intended workflow).
--
-- The original new-features-schema.sql required session_id as NOT NULL,
-- but the CreateTeam component allows students to create teams before
-- joining a quiz. This migration makes session_id optional and adds
-- the missing creator_id and teacher_id columns.
--
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Add missing columns if they don't exist
-- ============================================

-- Add creator_id column (who created the team)
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add teacher_id column (which teacher's class this team belongs to)
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add team_name column (may be named differently in different schemas)
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS team_name TEXT;

-- ============================================
-- STEP 2: Make session_id nullable
-- ============================================

-- First, check if session_id column exists and alter it
DO $$
BEGIN
  -- Check if session_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'session_id'
  ) THEN
    -- Make session_id nullable
    ALTER TABLE teams ALTER COLUMN session_id DROP NOT NULL;
    RAISE NOTICE 'session_id column is now nullable';
  ELSE
    -- Add session_id as optional column
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE;
    RAISE NOTICE 'session_id column added as optional';
  END IF;
END $$;

-- ============================================
-- STEP 3: Sync the 'name' column with 'team_name'
-- ============================================

-- If 'name' column exists but 'team_name' doesn't have data, copy it
DO $$
BEGIN
  -- Check if 'name' column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'name'
  ) THEN
    -- Update team_name from name where team_name is null
    UPDATE teams SET team_name = name WHERE team_name IS NULL AND name IS NOT NULL;
    RAISE NOTICE 'Synced name column to team_name';
  END IF;
END $$;

-- ============================================
-- STEP 4: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_teams_creator_id ON teams(creator_id);
CREATE INDEX IF NOT EXISTS idx_teams_teacher_id ON teams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teams_session_id ON teams(session_id);

-- ============================================
-- STEP 5: Update RLS policies
-- ============================================

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "students_can_create_teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams in their sessions" ON teams;

-- Students can create teams (without requiring session_id)
CREATE POLICY "students_can_create_teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
    )
    AND (creator_id IS NULL OR creator_id = auth.uid())
  );

-- Users can view teams they created or belong to
CREATE POLICY "users_can_view_their_teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid() OR
    teacher_id IN (SELECT teacher_id FROM users WHERE id = auth.uid()) OR
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = teams.session_id
      AND (
        quiz_sessions.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM session_participants
          WHERE session_participants.session_id = quiz_sessions.id
          AND session_participants.user_id = auth.uid()
        )
      )
    ))
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the updated table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- Check the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'teams'
ORDER BY policyname;
