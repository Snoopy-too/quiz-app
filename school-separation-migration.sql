-- ============================================
-- SCHOOL SEPARATION MIGRATION
-- Purpose: Introduce school-level isolation for teachers and students.
-- Run this in the Supabase SQL Editor.
-- ============================================

-- 1. Create the schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for schools
-- All authenticated users can read schools (for dropdown population)
CREATE POLICY "Authenticated users can read schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (true);

-- Only superadmins can insert schools
CREATE POLICY "Superadmins can insert schools"
  ON public.schools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Only superadmins can update schools
CREATE POLICY "Superadmins can update schools"
  ON public.schools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Only superadmins can delete schools
CREATE POLICY "Superadmins can delete schools"
  ON public.schools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- 4. Add school_id column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users(school_id);

-- 6. Allow anon users to read schools (for the registration form)
CREATE POLICY "Anon users can read schools"
  ON public.schools FOR SELECT
  TO anon
  USING (true);
