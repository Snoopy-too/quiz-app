-- Add question_configurations column to quiz_sessions table
-- Run this in Supabase SQL Editor

-- Problem: Answer options are shuffled independently by teacher and students,
-- causing different colors/symbols and answer orders between participants

-- Solution: Store question-specific configurations (answer order, etc.) in database
-- so all participants see identical quiz presentation

-- Add JSONB column to store question configurations
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS question_configurations JSONB DEFAULT '{}'::jsonb;

-- Structure will be:
-- {
--   "question_id_uuid": {
--     "answer_order": [0, 2, 1, 3]  -- indices for how to reorder options
--   }
-- }

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quiz_sessions' AND column_name = 'question_configurations';

-- Show example of what data looks like
SELECT id, pin, question_configurations
FROM quiz_sessions
WHERE status != 'completed'
LIMIT 5;
