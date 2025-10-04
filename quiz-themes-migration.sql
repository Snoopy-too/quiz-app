-- Quiz Themes System Migration
-- Add themes table and theme support to quizzes

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  background_image_url TEXT,
  primary_color VARCHAR(20) NOT NULL,
  secondary_color VARCHAR(20) NOT NULL,
  text_color VARCHAR(20) DEFAULT '#FFFFFF',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add theme_id column to quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES themes(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quizzes_theme_id
ON quizzes(theme_id);

-- Insert default themes
INSERT INTO themes (name, background_image_url, primary_color, secondary_color, text_color, is_default)
VALUES
  -- Standard Theme (default)
  (
    'Standard',
    NULL,
    '#7C3AED', -- Purple
    '#2563EB', -- Blue
    '#FFFFFF',
    true
  ),
  -- Summer Theme
  (
    'Summer',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    '#F59E0B', -- Amber
    '#06B6D4', -- Cyan
    '#FFFFFF',
    false
  ),
  -- Autumn Theme
  (
    'Autumn',
    'https://images.unsplash.com/photo-1476362555312-ab9e108a0b7e?w=1200&q=80',
    '#DC2626', -- Red
    '#F97316', -- Orange
    '#FFFFFF',
    false
  ),
  -- Winter Theme
  (
    'Winter',
    'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=1200&q=80',
    '#3B82F6', -- Blue
    '#8B5CF6', -- Purple
    '#FFFFFF',
    false
  ),
  -- Space Theme
  (
    'Space',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80',
    '#6366F1', -- Indigo
    '#8B5CF6', -- Purple
    '#FFFFFF',
    false
  ),
  -- Nature Theme
  (
    'Nature',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    '#16A34A', -- Green
    '#059669', -- Emerald
    '#FFFFFF',
    false
  ),
  -- Ocean Theme
  (
    'Ocean',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80',
    '#0EA5E9', -- Sky
    '#06B6D4', -- Cyan
    '#FFFFFF',
    false
  ),
  -- Sunset Theme
  (
    'Sunset',
    'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=1200&q=80',
    '#F97316', -- Orange
    '#EC4899', -- Pink
    '#FFFFFF',
    false
  ),
  -- Dark Mode Theme
  (
    'Dark',
    NULL,
    '#1F2937', -- Gray-800
    '#374151', -- Gray-700
    '#FFFFFF',
    false
  ),
  -- Neon Theme
  (
    'Neon',
    NULL,
    '#EC4899', -- Pink
    '#8B5CF6', -- Purple
    '#FFFFFF',
    false
  )
ON CONFLICT DO NOTHING;

-- Set default theme for existing quizzes (use Standard theme)
DO $$
DECLARE
  standard_theme_id UUID;
BEGIN
  -- Get the Standard theme ID
  SELECT id INTO standard_theme_id FROM themes WHERE is_default = true LIMIT 1;

  -- Update quizzes without a theme
  IF standard_theme_id IS NOT NULL THEN
    UPDATE quizzes
    SET theme_id = standard_theme_id
    WHERE theme_id IS NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE themes IS 'Quiz themes with background images and color schemes';
COMMENT ON COLUMN themes.name IS 'Theme display name';
COMMENT ON COLUMN themes.background_image_url IS 'URL to background image (can be null for solid colors)';
COMMENT ON COLUMN themes.primary_color IS 'Primary theme color (hex code)';
COMMENT ON COLUMN themes.secondary_color IS 'Secondary theme color (hex code)';
COMMENT ON COLUMN themes.text_color IS 'Text color for readability (hex code)';
COMMENT ON COLUMN themes.is_default IS 'Whether this is the default theme';
COMMENT ON COLUMN quizzes.theme_id IS 'Reference to the theme for this quiz';
