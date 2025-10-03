-- Storage Policies for Quiz App
-- Run this in Supabase SQL Editor AFTER creating the storage buckets

-- ============================================
-- IMPORTANT: First create these buckets manually in Supabase Dashboard:
-- 1. quiz-images (Public)
-- 2. quiz-videos (Public)
-- 3. quiz-gifs (Public)
-- 4. quiz-backgrounds (Public)
-- 5. user-avatars (Public)
-- ============================================

-- Policy for quiz-images bucket
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES
  ('Authenticated users can upload to quiz-images', 'quiz-images', 'true'::text, 'INSERT'),
  ('Public can view quiz-images', 'quiz-images', 'true'::text, 'SELECT')
ON CONFLICT DO NOTHING;

-- Policy for quiz-videos bucket
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES
  ('Authenticated users can upload to quiz-videos', 'quiz-videos', 'true'::text, 'INSERT'),
  ('Public can view quiz-videos', 'quiz-videos', 'true'::text, 'SELECT')
ON CONFLICT DO NOTHING;

-- Policy for quiz-gifs bucket
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES
  ('Authenticated users can upload to quiz-gifs', 'quiz-gifs', 'true'::text, 'INSERT'),
  ('Public can view quiz-gifs', 'quiz-gifs', 'true'::text, 'SELECT')
ON CONFLICT DO NOTHING;

-- Policy for quiz-backgrounds bucket
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES
  ('Authenticated users can upload to quiz-backgrounds', 'quiz-backgrounds', 'true'::text, 'INSERT'),
  ('Public can view quiz-backgrounds', 'quiz-backgrounds', 'true'::text, 'SELECT')
ON CONFLICT DO NOTHING;

-- Policy for user-avatars bucket
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES
  ('Authenticated users can upload to user-avatars', 'user-avatars', 'true'::text, 'INSERT'),
  ('Public can view user-avatars', 'user-avatars', 'true'::text, 'SELECT')
ON CONFLICT DO NOTHING;

-- Verify policies were created
SELECT bucket_id, name, operation
FROM storage.policies
WHERE bucket_id IN ('quiz-images', 'quiz-videos', 'quiz-gifs', 'quiz-backgrounds', 'user-avatars')
ORDER BY bucket_id, operation;
