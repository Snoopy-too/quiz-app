-- Migration: Add Survey Mode to Quizzes
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_survey BOOLEAN DEFAULT false;
