-- ============================================
-- SECURITY FIXES MIGRATION
-- Addresses all Supabase Security Advisor issues
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: ENABLE RLS AND CREATE POLICIES
-- (Fixes 5 "RLS Disabled in Public" errors)
-- ============================================

-- --------------------------------------------
-- 1. ASSIGNMENT_SUBMISSIONS
-- --------------------------------------------
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions
CREATE POLICY "students_view_own_submissions"
  ON assignment_submissions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can create their own submissions
CREATE POLICY "students_create_submissions"
  ON assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can update their own submissions
CREATE POLICY "students_update_own_submissions"
  ON assignment_submissions FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can view submissions for their assignments
CREATE POLICY "teachers_view_assignment_submissions"
  ON assignment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Teachers can update submissions for their assignments (grading)
CREATE POLICY "teachers_update_assignment_submissions"
  ON assignment_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Superadmins have full access
CREATE POLICY "superadmin_full_access_submissions"
  ON assignment_submissions FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- --------------------------------------------
-- 2. USER_ACHIEVEMENTS
-- --------------------------------------------
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "users_view_own_achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Teachers can view achievements of their students
CREATE POLICY "teachers_view_student_achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users student
      WHERE student.id = user_achievements.user_id
      AND student.teacher_id = auth.uid()
    )
  );

-- System/triggers can insert achievements (service role)
-- For authenticated users, only allow inserting own achievements
CREATE POLICY "insert_own_achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Superadmins have full access
CREATE POLICY "superadmin_full_access_achievements"
  ON user_achievements FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- --------------------------------------------
-- 3. ACHIEVEMENTS (master list)
-- --------------------------------------------
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view achievement definitions
CREATE POLICY "authenticated_view_achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- Superadmins can manage achievements
CREATE POLICY "superadmin_manage_achievements"
  ON achievements FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- --------------------------------------------
-- 4. FOLDER_ITEMS
-- --------------------------------------------
ALTER TABLE folder_items ENABLE ROW LEVEL SECURITY;

-- Teachers can view items in their own folders
CREATE POLICY "teachers_view_folder_items"
  ON folder_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_items.folder_id
      AND f.teacher_id = auth.uid()
    )
  );

-- Teachers can add items to their own folders
CREATE POLICY "teachers_insert_folder_items"
  ON folder_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_items.folder_id
      AND f.teacher_id = auth.uid()
    )
  );

-- Teachers can remove items from their own folders
CREATE POLICY "teachers_delete_folder_items"
  ON folder_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_items.folder_id
      AND f.teacher_id = auth.uid()
    )
  );

-- Superadmins have full access
CREATE POLICY "superadmin_full_access_folder_items"
  ON folder_items FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- --------------------------------------------
-- 5. FUNNY_NICKNAMES
-- --------------------------------------------
ALTER TABLE funny_nicknames ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read nicknames
CREATE POLICY "public_read_nicknames"
  ON funny_nicknames FOR SELECT
  TO authenticated, anon
  USING (true);

-- Superadmins can manage nicknames
CREATE POLICY "superadmin_manage_nicknames"
  ON funny_nicknames FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());


-- ============================================
-- PART 2: FIX FUNCTION SEARCH_PATH
-- (Fixes 6 "Function Search Path Mutable" warnings)
-- ============================================

-- --------------------------------------------
-- 1. generate_teacher_code
-- --------------------------------------------
CREATE OR REPLACE FUNCTION generate_teacher_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- --------------------------------------------
-- 2. is_superadmin
-- --------------------------------------------
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$;

-- --------------------------------------------
-- 3. calculate_streak_bonus
-- --------------------------------------------
CREATE OR REPLACE FUNCTION calculate_streak_bonus(streak INT)
RETURNS INT
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN CASE
    WHEN streak >= 5 THEN 100
    WHEN streak >= 3 THEN 50
    WHEN streak >= 2 THEN 25
    ELSE 0
  END;
END;
$$;

-- --------------------------------------------
-- 4. update_user_level (trigger function)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.level = FLOOR(NEW.total_xp / 1000) + 1;
  RETURN NEW;
END;
$$;

-- --------------------------------------------
-- 5. prevent_circular_folder_reference (trigger function)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION prevent_circular_folder_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_parent UUID;
  depth INT := 0;
  max_depth INT := 10;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id = NEW.parent_folder_id THEN
    RAISE EXCEPTION 'A folder cannot be its own parent';
  END IF;

  current_parent := NEW.parent_folder_id;

  WHILE current_parent IS NOT NULL AND depth < max_depth LOOP
    IF current_parent = NEW.id THEN
      RAISE EXCEPTION 'Circular folder reference detected';
    END IF;

    SELECT parent_folder_id INTO current_parent
    FROM public.quiz_folders
    WHERE id = current_parent;

    depth := depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

-- --------------------------------------------
-- 6. update_updated_at_column (trigger function)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================
-- PART 3: FIX SECURITY DEFINER VIEW
-- (Fixes "Security Definer View" error)
-- ============================================

-- Drop and recreate view without SECURITY DEFINER
-- The view will inherit RLS from the underlying quiz_folders table
DROP VIEW IF EXISTS folder_tree_with_counts;

CREATE VIEW folder_tree_with_counts AS
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
FROM public.quiz_folders f
LEFT JOIN public.quizzes q ON q.folder_id = f.id
LEFT JOIN public.quiz_folders sf ON sf.parent_folder_id = f.id
GROUP BY f.id, f.name, f.parent_folder_id, f.created_by, f.color, f.icon, f.order_index, f.created_at, f.updated_at;

-- Grant appropriate permissions
GRANT SELECT ON folder_tree_with_counts TO authenticated;


-- ============================================
-- PART 4: VERIFY EXISTING RLS ON PARTICIPANTS & SESSIONS
-- (Addresses the 2 "RLS Enabled No Policy" suggestions)
-- ============================================

-- Check if policies exist for session_participants (participants)
-- If these policies don't exist, uncomment and run:

/*
-- session_participants policies (if missing)
CREATE POLICY "students_join_sessions"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_view_session_participants"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM quiz_sessions qs
      WHERE qs.id = session_participants.session_id
      AND qs.host_id = auth.uid()
    )
  );

CREATE POLICY "participants_update_own"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
*/

/*
-- quiz_sessions policies (if missing)
CREATE POLICY "teachers_create_sessions"
  ON quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'superadmin')
    )
  );

CREATE POLICY "view_sessions"
  ON quiz_sessions FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = quiz_sessions.id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "hosts_update_sessions"
  ON quiz_sessions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "hosts_delete_sessions"
  ON quiz_sessions FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());
*/


-- ============================================
-- VERIFICATION QUERIES
-- Run these after the migration to verify
-- ============================================

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'assignment_submissions',
  'user_achievements',
  'achievements',
  'folder_items',
  'funny_nicknames',
  'session_participants',
  'quiz_sessions'
);

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check function search_path is set
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname IN (
  'generate_teacher_code',
  'is_superadmin',
  'calculate_streak_bonus',
  'update_user_level',
  'prevent_circular_folder_reference',
  'update_updated_at_column'
);
