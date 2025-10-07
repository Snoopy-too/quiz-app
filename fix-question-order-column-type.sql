-- Fix question_order column type in quiz_sessions table
-- Run this in Supabase SQL Editor

-- Problem: question_order column is integer[] but question IDs are UUIDs
-- Error: "invalid input syntax for type integer" when trying to store UUID strings

-- Change column type from integer[] to uuid[]
ALTER TABLE quiz_sessions
ALTER COLUMN question_order TYPE uuid[]
USING question_order::text[]::uuid[];

-- Verify the change
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'quiz_sessions' AND column_name = 'question_order';
