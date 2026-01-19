-- Track Imported Quizzes Migration
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. ADD COLUMNS TO QUIZZES TABLE
-- ============================================

-- Add source_quiz_id to track which public quiz this was imported from
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS source_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL;

-- Add imported_at to track when the quiz was imported
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- Add updated_at to track when the quiz was last modified
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. CREATE INDEX FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quizzes_source_quiz_id ON quizzes(source_quiz_id);

-- ============================================
-- 3. CREATE TRIGGER TO AUTO-UPDATE updated_at
-- ============================================

-- Function to update updated_at timestamp (may already exist)
CREATE OR REPLACE FUNCTION update_quiz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_updated_at();

-- ============================================
-- 4. SET updated_at FOR EXISTING QUIZZES
-- ============================================

-- Set updated_at to created_at for all existing quizzes that don't have it
UPDATE quizzes
SET updated_at = created_at
WHERE updated_at IS NULL;

-- ============================================
-- 5. RLS POLICY FOR VIEWING SOURCE QUIZ INFO
-- ============================================

-- Teachers need to be able to read source_quiz_id from their own quizzes
-- This should already be covered by existing policies

-- ============================================
-- 4. CREATE TRIGGER TO UPDATE QUIZ updated_at WHEN QUESTIONS CHANGE
-- ============================================

-- Function to update quiz's updated_at when questions are modified
CREATE OR REPLACE FUNCTION update_quiz_updated_at_on_question_change()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT or UPDATE, use NEW.quiz_id
  -- For DELETE, use OLD.quiz_id
  IF TG_OP = 'DELETE' THEN
    UPDATE quizzes SET updated_at = NOW() WHERE id = OLD.quiz_id;
    RETURN OLD;
  ELSE
    UPDATE quizzes SET updated_at = NOW() WHERE id = NEW.quiz_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_quiz_on_question_insert ON questions;
DROP TRIGGER IF EXISTS update_quiz_on_question_update ON questions;
DROP TRIGGER IF EXISTS update_quiz_on_question_delete ON questions;

-- Trigger for question inserts
CREATE TRIGGER update_quiz_on_question_insert
  AFTER INSERT ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_updated_at_on_question_change();

-- Trigger for question updates
CREATE TRIGGER update_quiz_on_question_update
  AFTER UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_updated_at_on_question_change();

-- Trigger for question deletes
CREATE TRIGGER update_quiz_on_question_delete
  AFTER DELETE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_updated_at_on_question_change();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quizzes'
AND column_name IN ('source_quiz_id', 'imported_at', 'updated_at');
