-- Create Teams and Team Members Tables
-- Run this in Supabase SQL Editor

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure required columns exist even if table was created previously without them
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_creator ON teams(creator_id);
CREATE INDEX IF NOT EXISTS idx_teams_teacher ON teams(teacher_id);

-- ============================================
-- TEAM MEMBERS TABLE (Junction Table)
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, student_id) -- Prevent duplicate team memberships
);

-- Ensure required columns exist if table was previously created without them
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_student ON team_members(student_id);

-- ============================================
-- UPDATE SESSION_PARTICIPANTS TABLE
-- ============================================
-- Add columns to track team participation
ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_team_entry BOOLEAN DEFAULT false;

-- Add index for team queries
CREATE INDEX IF NOT EXISTS idx_session_participants_team ON session_participants(team_id);

-- ============================================
-- RLS POLICIES FOR TEAMS
-- ============================================

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Students can view teams in their teacher's class
CREATE POLICY "students_can_view_teacher_teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.teacher_id = teams.teacher_id
      AND users.role = 'student'
    )
  );

-- Students can create teams
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
    AND creator_id = auth.uid()
  );

-- Team creators can update their teams
CREATE POLICY "creators_can_update_teams"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Team creators can delete their teams
CREATE POLICY "creators_can_delete_teams"
  ON teams
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Students can view team members in their teacher's teams
CREATE POLICY "students_can_view_team_members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN users ON users.id = auth.uid()
      WHERE teams.id = team_members.team_id
      AND users.teacher_id = teams.teacher_id
      AND users.role = 'student'
    )
  );

-- Team creators can add members
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

-- Team creators can remove members
CREATE POLICY "creators_can_remove_team_members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.creator_id = auth.uid()
    )
  );

-- Teachers can view all teams in their class
CREATE POLICY "teachers_can_view_their_teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'superadmin')
      AND users.id = teams.teacher_id
    )
  );

-- Teachers can view team members
CREATE POLICY "teachers_can_view_team_members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN users ON users.id = auth.uid()
      WHERE teams.id = team_members.team_id
      AND users.id = teams.teacher_id
      AND users.role IN ('teacher', 'superadmin')
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('teams', 'team_members')
ORDER BY table_name, ordinal_position;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;
