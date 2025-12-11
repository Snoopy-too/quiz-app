-- Add Default Themes Migration
-- Ensures 15 built-in themes are available for all users

-- First, let's make sure all the original themes exist, plus add new ones
INSERT INTO themes (name, background_image_url, primary_color, secondary_color, text_color, is_default, created_by)
VALUES
  -- 1. Standard Theme (default)
  (
    'Standard',
    NULL,
    '#7C3AED',
    '#2563EB',
    '#FFFFFF',
    true,
    NULL
  ),
  -- 2. Summer Theme
  (
    'Summer',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    '#F59E0B',
    '#06B6D4',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 3. Autumn Theme
  (
    'Autumn',
    'https://images.unsplash.com/photo-1476362555312-ab9e108a0b7e?w=1200&q=80',
    '#DC2626',
    '#F97316',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 4. Winter Theme
  (
    'Winter',
    'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=1200&q=80',
    '#3B82F6',
    '#8B5CF6',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 5. Space Theme
  (
    'Space',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80',
    '#6366F1',
    '#8B5CF6',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 6. Nature Theme
  (
    'Nature',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    '#16A34A',
    '#059669',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 7. Ocean Theme
  (
    'Ocean',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80',
    '#0EA5E9',
    '#06B6D4',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 8. Sunset Theme
  (
    'Sunset',
    'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=1200&q=80',
    '#F97316',
    '#EC4899',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 9. Dark Theme
  (
    'Dark',
    NULL,
    '#1F2937',
    '#374151',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 10. Neon Theme
  (
    'Neon',
    NULL,
    '#EC4899',
    '#8B5CF6',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 11. Spring Theme
  (
    'Spring',
    'https://images.unsplash.com/photo-1462275646964-a0e3571f4f83?w=1200&q=80',
    '#10B981',
    '#F472B6',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 12. Mountains Theme
  (
    'Mountains',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    '#475569',
    '#64748B',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 13. City Lights Theme
  (
    'City Lights',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80',
    '#F59E0B',
    '#EF4444',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 14. Tropical Theme
  (
    'Tropical',
    'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=1200&q=80',
    '#14B8A6',
    '#22C55E',
    '#FFFFFF',
    false,
    NULL
  ),
  -- 15. Aurora Theme
  (
    'Aurora',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80',
    '#22D3EE',
    '#A855F7',
    '#FFFFFF',
    false,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Note: We don't delete duplicate themes because they may be referenced by existing quizzes.
-- The ThemeSelector component already handles deduplication on the frontend.
