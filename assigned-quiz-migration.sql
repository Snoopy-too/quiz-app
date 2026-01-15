-- Assigned Quiz Feature Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLE: quiz_assignments
-- Stores quiz assignments from teachers to students
-- ============================================

CREATE TABLE IF NOT EXISTS quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Assignment metadata
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),

  -- Tracking timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  score INT DEFAULT 0,
  total_questions INT,
  correct_answers INT DEFAULT 0,
  time_taken INT,  -- Total seconds to complete

  -- Question state (for resuming)
  question_order UUID[],
  current_question_index INT DEFAULT 0,

  -- Email notification tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ
);

-- Indexes for quiz_assignments
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_teacher_id ON quiz_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_id ON quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_status ON quiz_assignments(status);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_deadline ON quiz_assignments(deadline);

-- ============================================
-- TABLE: assignment_answers
-- Stores student answers for assigned quizzes
-- ============================================

CREATE TABLE IF NOT EXISTS assignment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES quiz_assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index INT,
  is_correct BOOLEAN DEFAULT FALSE,
  points_earned INT DEFAULT 0,
  time_taken INT,  -- Seconds for this question
  answered_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(assignment_id, question_id)
);

-- Indexes for assignment_answers
CREATE INDEX IF NOT EXISTS idx_assignment_answers_assignment_id ON assignment_answers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_answers_question_id ON assignment_answers(question_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can create assignments for their students
CREATE POLICY "teachers_create_assignments"
  ON quiz_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Policy: Teachers and assigned students can view assignments
CREATE POLICY "users_view_assignments"
  ON quiz_assignments FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() OR student_id = auth.uid()
  );

-- Policy: Teachers can update their own assignments
CREATE POLICY "teachers_update_assignments"
  ON quiz_assignments FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Policy: Students can update their own assignments (for progress tracking)
CREATE POLICY "students_update_own_assignments"
  ON quiz_assignments FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Policy: Teachers can delete their assignments
CREATE POLICY "teachers_delete_assignments"
  ON quiz_assignments FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Policy: Students can insert answers for their assignments
CREATE POLICY "students_insert_answers"
  ON assignment_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE id = assignment_answers.assignment_id
      AND student_id = auth.uid()
    )
  );

-- Policy: Students can update their own answers
CREATE POLICY "students_update_answers"
  ON assignment_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE id = assignment_answers.assignment_id
      AND student_id = auth.uid()
    )
  );

-- Policy: Teachers and students can view answers
CREATE POLICY "users_view_answers"
  ON assignment_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE id = assignment_answers.assignment_id
      AND (student_id = auth.uid() OR teacher_id = auth.uid())
    )
  );

-- ============================================
-- FUNCTION: Check and update expired assignments
-- Call this periodically or before fetching assignments
-- ============================================

CREATE OR REPLACE FUNCTION check_expired_assignments()
RETURNS void AS $$
BEGIN
  UPDATE quiz_assignments
  SET status = 'expired'
  WHERE status IN ('pending', 'in_progress')
    AND deadline < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get pending assignment count for a student
-- Useful for dashboard badge
-- ============================================

CREATE OR REPLACE FUNCTION get_pending_assignment_count(p_student_id UUID)
RETURNS INT AS $$
DECLARE
  count_result INT;
BEGIN
  -- First expire any overdue assignments
  UPDATE quiz_assignments
  SET status = 'expired'
  WHERE student_id = p_student_id
    AND status IN ('pending', 'in_progress')
    AND deadline < NOW();

  -- Then count pending
  SELECT COUNT(*) INTO count_result
  FROM quiz_assignments
  WHERE student_id = p_student_id
    AND status IN ('pending', 'in_progress');

  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
