-- New Features Database Schema Updates
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. MEDIA & QUESTION ENHANCEMENTS
-- ============================================

-- Add media support to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Add background image to quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS randomize_answers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ============================================
-- 2. TEAM MODE & GAME MODES
-- ============================================

-- Add game mode to quiz sessions
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS game_mode VARCHAR(50) DEFAULT 'live', -- 'live', 'team', 'homework', 'self_paced'
ADD COLUMN IF NOT EXISTS team_size INT DEFAULT 1;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50),
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, participant_id)
);

-- ============================================
-- 3. HOMEWORK/ASSIGNMENT MODE
-- ============================================

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  allow_multiple_attempts BOOLEAN DEFAULT false,
  show_correct_answers BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignment_submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. STREAK & GAMIFICATION
-- ============================================

-- Add streak tracking to session_participants
ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_bonus_points INT DEFAULT 0;

-- ============================================
-- 5. STUDENT PROFILES & NICKNAMES
-- ============================================

-- Add profile fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS nickname VARCHAR(50),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  xp_reward INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 6. QUIZ SHARING & COLLABORATION
-- ============================================

-- Create quiz_shares table (for sharing with specific teachers)
CREATE TABLE IF NOT EXISTS quiz_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, shared_with)
);

-- ============================================
-- 7. FOLDERS & WORKSPACES
-- ============================================

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  color VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create folder_items table (many-to-many: quizzes in folders)
CREATE TABLE IF NOT EXISTS folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(folder_id, quiz_id)
);

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_teams_session_id ON teams(session_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_participant_id ON team_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_shares_quiz_id ON quiz_shares(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_shares_shared_with ON quiz_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_folders_teacher_id ON folders(teacher_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id ON folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_quiz_id ON folder_items(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Teams policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams in their sessions"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
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
    )
  );

-- Assignments policies
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their assignments"
  ON assignments FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students can view published assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Folders policies
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their folders"
  ON folders FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Quiz shares policies
ALTER TABLE quiz_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view quizzes shared with them"
  ON quiz_shares FOR SELECT
  TO authenticated
  USING (shared_with = auth.uid() OR shared_by = auth.uid());

CREATE POLICY "Teachers can share their quizzes"
  ON quiz_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_shares.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- ============================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to calculate streak bonus
CREATE OR REPLACE FUNCTION calculate_streak_bonus(streak INT)
RETURNS INT AS $$
BEGIN
  RETURN CASE
    WHEN streak >= 5 THEN 100
    WHEN streak >= 3 THEN 50
    WHEN streak >= 2 THEN 25
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = FLOOR(NEW.total_xp / 1000) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_level_on_xp_change
  BEFORE UPDATE OF total_xp ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- ============================================
-- 11. SEED DATA - FUNNY NICKNAMES
-- ============================================

-- Create table for funny nickname generator
CREATE TABLE IF NOT EXISTS funny_nicknames (
  id SERIAL PRIMARY KEY,
  adjective VARCHAR(50) NOT NULL,
  noun VARCHAR(50) NOT NULL
);

INSERT INTO funny_nicknames (adjective, noun) VALUES
('Sneaky', 'Panda'),
('Dancing', 'Pickle'),
('Mighty', 'Potato'),
('Clever', 'Banana'),
('Brave', 'Taco'),
('Silly', 'Penguin'),
('Happy', 'Burrito'),
('Crazy', 'Unicorn'),
('Smart', 'Avocado'),
('Swift', 'Muffin'),
('Funky', 'Platypus'),
('Jazzy', 'Llama'),
('Bouncy', 'Donut'),
('Sparkly', 'Narwhal'),
('Groovy', 'Waffle')
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. ENABLE REALTIME FOR NEW TABLES
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;

-- ============================================
-- NOTES
-- ============================================

-- After running this schema:
-- 1. Configure Supabase Storage buckets for media uploads (images, videos, GIFs)
-- 2. Set up CORS and file upload policies in Supabase Storage
-- 3. Install necessary npm packages for file uploads and CSV parsing
-- 4. Update frontend components to support new features
