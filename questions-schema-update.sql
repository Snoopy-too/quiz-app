-- Update Questions Table Schema
-- Run this SQL in your Supabase SQL Editor

-- Add missing columns to questions table if they don't exist
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'multiple_choice';

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS time_limit INT DEFAULT 30;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS points INT DEFAULT 100;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS options JSONB;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for ordering questions
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id_order ON questions(quiz_id, order_index);

-- Enable RLS on questions table if not already enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Teachers can create questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Teachers can update questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Teachers can delete questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Students can view questions during active sessions" ON questions;

-- RLS Policies for Questions

-- Teachers can view questions for their own quizzes
CREATE POLICY "Teachers can view questions for their quizzes"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- Teachers can create questions for their own quizzes
CREATE POLICY "Teachers can create questions for their quizzes"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- Teachers can update questions for their own quizzes
CREATE POLICY "Teachers can update questions for their quizzes"
  ON questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- Teachers can delete questions for their own quizzes
CREATE POLICY "Teachers can delete questions for their quizzes"
  ON questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- Students can view questions during active sessions (for quiz taking)
CREATE POLICY "Students can view questions during active sessions"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions
      JOIN session_participants ON session_participants.session_id = quiz_sessions.id
      WHERE quiz_sessions.quiz_id = questions.quiz_id
      AND session_participants.user_id = auth.uid()
      AND quiz_sessions.status IN ('active', 'question_active', 'showing_results')
    )
  );

-- Example questions table structure (for reference):
-- CREATE TABLE IF NOT EXISTS questions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
--   question_text TEXT NOT NULL,
--   question_type VARCHAR(50) DEFAULT 'multiple_choice',
--   options JSONB, -- Format: [{"text": "Answer 1", "is_correct": true}, ...]
--   time_limit INT DEFAULT 30,
--   points INT DEFAULT 100,
--   order_index INT DEFAULT 0,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );
