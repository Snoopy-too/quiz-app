-- Teacher Code System Migration
-- Add columns to support teacher invitation code system

-- Add teacher_code column to users table (for teachers)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(8) UNIQUE;

-- Add teacher_id column to users table (for students)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id);

-- Create index for teacher_code for better query performance
CREATE INDEX IF NOT EXISTS idx_users_teacher_code
ON users(teacher_code)
WHERE teacher_code IS NOT NULL;

-- Create index for teacher_id for better query performance
CREATE INDEX IF NOT EXISTS idx_users_teacher_id
ON users(teacher_id)
WHERE teacher_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.teacher_code IS 'Unique invitation code for teachers to share with students';
COMMENT ON COLUMN users.teacher_id IS 'Reference to the teacher (used for students)';

-- Function to generate a random teacher code
CREATE OR REPLACE FUNCTION generate_teacher_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluded ambiguous chars: I, O, 0, 1
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate teacher codes for existing teachers who don't have one
DO $$
DECLARE
  teacher_record RECORD;
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  FOR teacher_record IN
    SELECT id FROM users WHERE role = 'teacher' AND teacher_code IS NULL
  LOOP
    -- Generate unique code
    LOOP
      new_code := generate_teacher_code();
      SELECT EXISTS(SELECT 1 FROM users WHERE teacher_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;

    -- Update teacher with new code
    UPDATE users SET teacher_code = new_code WHERE id = teacher_record.id;
  END LOOP;
END $$;
