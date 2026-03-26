-- Add randomize_answers column to quiz_sessions table
-- This flag tells students to shuffle answer option positions for each question
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS randomize_answers BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN quiz_sessions.randomize_answers IS 'When true, students see answer options in a shuffled order per question.';
