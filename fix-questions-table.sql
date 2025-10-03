-- Fix Questions Table - Ensure correct column names
-- Run this SQL in your Supabase SQL Editor

-- First, let's check what columns exist
-- You can run: SELECT column_name FROM information_schema.columns WHERE table_name = 'questions';

-- Drop the table if it exists with wrong schema and recreate
DROP TABLE IF EXISTS questions CASCADE;

-- Create questions table with correct schema
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'multiple_choice',
  options JSONB, -- Format: [{"text": "Answer 1", "is_correct": true}, ...]
  time_limit INT DEFAULT 30,
  points INT DEFAULT 100,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_quiz_id_order ON questions(quiz_id, order_index);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

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

-- Students can view questions during active sessions
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

-- Enable realtime for questions table
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
