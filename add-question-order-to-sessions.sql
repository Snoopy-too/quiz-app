-- Add question_order column to quiz_sessions table
-- This stores the shuffled question order for each session
ALTER TABLE quiz_sessions 
ADD COLUMN question_order INTEGER[] DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN quiz_sessions.question_order IS 'Array of question IDs in the order they should be presented for this session. NULL means use default order_index.';