-- ====================================================================
-- LINK STUDENTS TO TEACHER CBZP-LW5Q AND SCHOOL "Red Cross Himeji"
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ====================================================================

DO $$
DECLARE
  v_teacher_id UUID;
  v_school_id UUID;
BEGIN
  -- 1. Find teacher Fidel Montoya by code CBZP-LW5Q
  SELECT id INTO v_teacher_id
  FROM public.users
  WHERE teacher_code IN ('CBZP-LW5Q', 'CBZPLW5Q')
    AND role = 'teacher'
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Teacher with code CBZP-LW5Q not found.';
  END IF;

  -- 2. Find school "Red Cross Himeji"
  SELECT id INTO v_school_id
  FROM public.schools
  WHERE name ILIKE '%Red Cross Himeji%'
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'School "Red Cross Himeji" not found.';
  END IF;

  -- 3. Update the 20 students to link them and set their school
  UPDATE public.users
  SET 
    teacher_id = v_teacher_id,
    school_id = v_school_id,
    approved = true
  WHERE student_id IN (
    '12808', '12810', '12811', '12815', '12816', '12817', '12818', '12820',
    '12821', '12825', '12826', '12827', '12828', '12829', '12830', '12834',
    '12836', '12837', '12838', '12840'
  )
  AND role = 'student';

  RAISE NOTICE 'Successfully linked students to teacher % and school %', v_teacher_id, v_school_id;
END;
$$;

-- Verification: view the updated student records
SELECT id, name, email, student_id, teacher_id, school_id, approved
FROM public.users
WHERE student_id IN (
  '12808', '12810', '12811', '12815', '12816', '12817', '12818', '12820',
  '12821', '12825', '12826', '12827', '12828', '12829', '12830', '12834',
  '12836', '12837', '12838', '12840'
)
ORDER BY student_id ASC;
