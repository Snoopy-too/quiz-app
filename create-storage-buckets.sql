-- Create Storage Buckets for Quiz App
-- Run this in Supabase SQL Editor

-- Create quiz-images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-images',
  'quiz-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/*']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create quiz-videos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-videos',
  'quiz-videos',
  true,
  52428800, -- 50 MB
  ARRAY['video/*']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create quiz-gifs bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-gifs',
  'quiz-gifs',
  true,
  10485760, -- 10 MB
  ARRAY['image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create user-avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/*']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for authenticated users to upload/delete
-- Policy: Anyone can read public files (automatically enabled for public buckets)
-- Policy: Authenticated users can upload to quiz-images
CREATE POLICY "Authenticated users can upload quiz images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-images');

CREATE POLICY "Users can delete their own quiz images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Authenticated users can upload to quiz-videos
CREATE POLICY "Authenticated users can upload quiz videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-videos');

CREATE POLICY "Users can delete their own quiz videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Authenticated users can upload to quiz-gifs
CREATE POLICY "Authenticated users can upload quiz gifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-gifs');

CREATE POLICY "Users can delete their own quiz gifs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-gifs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Authenticated users can upload to user-avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

-- Verify buckets were created
SELECT * FROM storage.buckets WHERE id IN ('quiz-images', 'quiz-videos', 'quiz-gifs', 'user-avatars');
