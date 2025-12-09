-- Fix Team Members Table Schema
-- This migration updates the team_members table to support creating teams
-- BEFORE joining a quiz session.
--
-- The original new-features-schema.sql used participant_id (NOT NULL),
-- but the CreateTeam component uses student_id to directly reference users.
-- This migration adds student_id and makes participant_id optional.
--
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Add student_id column if it doesn't exist
-- ============================================

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 2: Make participant_id nullable (if it exists)
-- ============================================

DO $$
BEGIN
  -- Check if participant_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'participant_id'
  ) THEN
    -- Make participant_id nullable
    ALTER TABLE team_members ALTER COLUMN participant_id DROP NOT NULL;
    RAISE NOTICE 'participant_id column is now nullable';
  END IF;
END $$;

-- ============================================
-- STEP 3: Add joined_at column if missing
-- ============================================

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- STEP 4: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_team_members_student_id ON team_members(student_id);

-- ============================================
-- STEP 5: Update RLS policies for team_members
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "creators_can_add_team_members" ON team_members;

-- Allow team creators to add members using student_id
CREATE POLICY "creators_can_add_team_members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.creator_id = auth.uid()
    )
  );

-- ============================================
-- STEP 6: Add unique constraint if not exists
-- ============================================

-- First check and add unique constraint for team_id + student_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'team_members_team_id_student_id_key'
  ) THEN
    BEGIN
      ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_student_id_key UNIQUE (team_id, student_id);
      RAISE NOTICE 'Added unique constraint for team_id + student_id';
    EXCEPTION WHEN duplicate_table THEN
      RAISE NOTICE 'Unique constraint already exists';
    END;
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the updated table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'team_members'
ORDER BY ordinal_position;

-- Check the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY policyname;
