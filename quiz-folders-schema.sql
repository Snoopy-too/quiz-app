-- Quiz Folders Feature Schema
-- This allows teachers to organize quizzes into folders and sub-folders

-- ============================================
-- TABLES
-- ============================================

-- Table: quiz_folders
-- Stores folder structure for organizing quizzes
CREATE TABLE IF NOT EXISTS quiz_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES quiz_folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color VARCHAR(20) DEFAULT 'gray', -- Optional color for visual organization
  icon VARCHAR(50) DEFAULT 'folder', -- Optional icon identifier
  order_index INT DEFAULT 0, -- For custom ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add folder_id column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES quiz_folders(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES for better query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quiz_folders_created_by ON quiz_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_folders_parent_folder_id ON quiz_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_folder_id ON quizzes(folder_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on quiz_folders
ALTER TABLE quiz_folders ENABLE ROW LEVEL SECURITY;

-- Teachers can create their own folders
CREATE POLICY "Teachers can create folders"
  ON quiz_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

-- Teachers can view their own folders
CREATE POLICY "Teachers can view their own folders"
  ON quiz_folders FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Teachers can update their own folders
CREATE POLICY "Teachers can update their own folders"
  ON quiz_folders FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own folders
CREATE POLICY "Teachers can delete their own folders"
  ON quiz_folders FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Trigger for quiz_folders updated_at
CREATE TRIGGER update_quiz_folders_updated_at
  BEFORE UPDATE ON quiz_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent circular folder references
CREATE OR REPLACE FUNCTION prevent_circular_folder_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_parent UUID;
  depth INT := 0;
  max_depth INT := 10;
BEGIN
  -- If no parent, no circular reference possible
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cannot be its own parent
  IF NEW.id = NEW.parent_folder_id THEN
    RAISE EXCEPTION 'A folder cannot be its own parent';
  END IF;

  -- Check for circular reference by traversing up the tree
  current_parent := NEW.parent_folder_id;

  WHILE current_parent IS NOT NULL AND depth < max_depth LOOP
    -- If we find our own ID in the parent chain, it's circular
    IF current_parent = NEW.id THEN
      RAISE EXCEPTION 'Circular folder reference detected';
    END IF;

    -- Move up one level
    SELECT parent_folder_id INTO current_parent
    FROM quiz_folders
    WHERE id = current_parent;

    depth := depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent circular references
CREATE TRIGGER check_circular_folder_reference
  BEFORE INSERT OR UPDATE ON quiz_folders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_folder_reference();

-- ============================================
-- HELPER VIEWS (Optional)
-- ============================================

-- View to get folder tree with quiz counts
CREATE OR REPLACE VIEW folder_tree_with_counts AS
SELECT
  f.id,
  f.name,
  f.parent_folder_id,
  f.created_by,
  f.color,
  f.icon,
  f.order_index,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT q.id) as quiz_count,
  COUNT(DISTINCT sf.id) as subfolder_count
FROM quiz_folders f
LEFT JOIN quizzes q ON q.folder_id = f.id
LEFT JOIN quiz_folders sf ON sf.parent_folder_id = f.id
GROUP BY f.id, f.name, f.parent_folder_id, f.created_by, f.color, f.icon, f.order_index, f.created_at, f.updated_at;

-- ============================================
-- NOTES
-- ============================================

-- After running this schema:
-- 1. Verify RLS policies are active
-- 2. Test folder creation and nesting
-- 3. Test moving quizzes between folders
-- 4. Test deleting folders (quizzes should have folder_id set to NULL)
-- 5. Test circular reference prevention
