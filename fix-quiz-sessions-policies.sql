-- Fix Quiz Sessions RLS Policies - Remove Infinite Recursion
-- Run this SQL in your Supabase SQL Editor

-- Drop all existing policies on quiz_sessions
DROP POLICY IF EXISTS "Teachers can create quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Teachers can view their own sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Teachers can update their own sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Teachers can delete their own sessions" ON quiz_sessions;

-- Create simpler, non-recursive policies

-- Teachers can create quiz sessions
CREATE POLICY "Teachers can create quiz sessions"
  ON quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Anyone can view sessions (teachers see their own, students see sessions they join via PIN)
CREATE POLICY "Anyone can view quiz sessions"
  ON quiz_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Teachers can update their own sessions
CREATE POLICY "Teachers can update their own sessions"
  ON quiz_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Teachers can delete their own sessions
CREATE POLICY "Teachers can delete their own sessions"
  ON quiz_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);
