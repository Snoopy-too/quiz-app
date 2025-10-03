-- Quiz App Database Schema
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Table: quiz_sessions
-- Stores live quiz session data with PIN codes
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  pin VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  -- Status values: 'waiting', 'active', 'question_active', 'showing_results', 'completed'
  current_question_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: session_participants
-- Tracks students who joined a quiz session
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Table: quiz_answers
-- Stores individual answer submissions
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index INT,
  is_correct BOOLEAN DEFAULT FALSE,
  points_earned INT DEFAULT 0,
  time_taken INT, -- in seconds
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, participant_id, question_id)
);

-- ============================================
-- INDEXES for better query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_pin ON quiz_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_host_id ON quiz_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);

CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_score ON session_participants(score DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id ON quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_participant_id ON quiz_answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Quiz Sessions Policies
-- Teachers can create and manage their own sessions
CREATE POLICY "Teachers can create quiz sessions"
  ON quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can view their own sessions"
  ON quiz_sessions FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = quiz_sessions.id
      AND session_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their own sessions"
  ON quiz_sessions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Teachers can delete their own sessions"
  ON quiz_sessions FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());

-- Session Participants Policies
-- Students can join sessions
CREATE POLICY "Students can join sessions"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
    )
  );

CREATE POLICY "Users can view participants in their sessions"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = session_participants.session_id
      AND quiz_sessions.host_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update their own data"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Quiz Answers Policies
-- Students can submit their own answers
CREATE POLICY "Students can submit answers"
  ON quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.id = quiz_answers.participant_id
      AND session_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view answers in their sessions"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.id = quiz_answers.participant_id
      AND session_participants.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = quiz_answers.session_id
      AND quiz_sessions.host_id = auth.uid()
    )
  );

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Enable realtime for live quiz updates
-- Note: You may need to enable this in Supabase Dashboard > Database > Replication
-- Add these tables to the "supabase_realtime" publication

-- Run this to add tables to realtime publication:
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_answers;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for quiz_sessions
CREATE TRIGGER update_quiz_sessions_updated_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTES
-- ============================================

-- After running this schema, make sure to:
-- 1. Enable Realtime in Supabase Dashboard for these tables
-- 2. Verify RLS policies are active
-- 3. Test with different user roles (teacher, student)
-- 4. Ensure the 'questions' table already exists with proper structure

-- Expected questions table structure:
-- CREATE TABLE questions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
--   question_text TEXT NOT NULL,
--   question_type VARCHAR(50) DEFAULT 'multiple_choice',
--   options JSONB, -- Array of {text: string, is_correct: boolean}
--   time_limit INT DEFAULT 30,
--   points INT DEFAULT 100,
--   order_index INT DEFAULT 0,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );
