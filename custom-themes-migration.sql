-- Custom Themes Migration
-- Adds created_by column to themes table to support teacher-created custom themes

-- Add created_by column to themes table
ALTER TABLE themes
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance when fetching user's themes
CREATE INDEX IF NOT EXISTS idx_themes_created_by
ON themes(created_by);

-- Update RLS policies to allow teachers to manage their own themes

-- Enable RLS on themes table (if not already enabled)
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Anyone can view themes" ON themes;
DROP POLICY IF EXISTS "Teachers can create their own themes" ON themes;
DROP POLICY IF EXISTS "Teachers can update their own themes" ON themes;
DROP POLICY IF EXISTS "Teachers can delete their own themes" ON themes;

-- Policy: Users can view:
-- 1. Global themes (created_by IS NULL)
-- 2. Their own custom themes (created_by = auth.uid())
-- 3. Themes used by public quizzes (so public quizzes display correctly for all users)
CREATE POLICY "Anyone can view themes"
ON themes FOR SELECT
USING (
  created_by IS NULL
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.theme_id = themes.id
    AND quizzes.is_public = true
  )
);

-- Policy: Teachers can create their own custom themes
CREATE POLICY "Teachers can create their own themes"
ON themes FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- Policy: Teachers can update only their own themes
CREATE POLICY "Teachers can update their own themes"
ON themes FOR UPDATE
USING (
  auth.uid() = created_by
  AND created_by IS NOT NULL
);

-- Policy: Teachers can delete only their own themes
CREATE POLICY "Teachers can delete their own themes"
ON themes FOR DELETE
USING (
  auth.uid() = created_by
  AND created_by IS NOT NULL
);

-- Add comments for documentation
COMMENT ON COLUMN themes.created_by IS 'User ID of the teacher who created this custom theme (NULL for built-in themes)';
