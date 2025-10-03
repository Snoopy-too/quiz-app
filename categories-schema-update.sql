-- Update Categories Table to Support Teacher-Created Categories
-- Run this SQL in your Supabase SQL Editor

-- Add created_by column to categories table if it doesn't exist
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add created_at if it doesn't exist
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Teachers can create categories" ON categories;
DROP POLICY IF EXISTS "Teachers can update their own categories" ON categories;
DROP POLICY IF EXISTS "Teachers can delete their own categories" ON categories;

-- RLS Policies for Categories

-- Everyone can view categories (needed for dropdowns)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Teachers can create categories
CREATE POLICY "Teachers can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

-- Teachers can update their own categories
CREATE POLICY "Teachers can update their own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own categories
CREATE POLICY "Teachers can delete their own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Optional: Insert some default categories if the table is empty
INSERT INTO categories (name, created_by)
VALUES
  ('General Knowledge', NULL),
  ('Science', NULL),
  ('Math', NULL),
  ('History', NULL),
  ('Geography', NULL),
  ('Literature', NULL),
  ('Technology', NULL),
  ('Sports', NULL)
ON CONFLICT DO NOTHING;
