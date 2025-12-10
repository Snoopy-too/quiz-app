-- Fix Spring Theme (Use Local Image)
-- Run this in Supabase SQL Editor

-- Update the Spring theme to use the local image file
-- I have moved the image to the 'public' folder so it can be served correctly.

UPDATE themes
SET
  background_image_url = '/spring_theme.png',
  primary_color = '#84CC16',
  secondary_color = '#34D399'
WHERE name = 'Spring';

-- Verify
SELECT * FROM themes WHERE name = 'Spring';
