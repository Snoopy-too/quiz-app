-- Course Material Feature Migration
-- Run this SQL in your Supabase SQL Editor
-- This adds the is_course_material column to distinguish course quizzes from practice/non-course quizzes

-- Add is_course_material column to quizzes table
-- Default is TRUE so all existing quizzes are treated as course material
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_course_material BOOLEAN DEFAULT true;

-- Create index for filtering by course material type
CREATE INDEX IF NOT EXISTS idx_quizzes_is_course_material ON quizzes(is_course_material);

-- Update comment on the column
COMMENT ON COLUMN quizzes.is_course_material IS 'True for course material quizzes, False for practice/non-course quizzes';
