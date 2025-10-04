# Quiz Theme System - Setup Instructions

## Overview
The quiz theme system allows teachers to apply visual themes to their quizzes, similar to Kahoot. Themes include background images, color gradients, and ensure text readability during quiz sessions.

## Database Migration

### Step 1: Run the SQL Migration
Execute the SQL file `quiz-themes-migration.sql` in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `quiz-themes-migration.sql`
5. Click **Run** to execute the migration

### What the Migration Does:
- Creates `themes` table with theme data
- Adds `theme_id` column to `quizzes` table
- Inserts 10 pre-configured themes with backgrounds and colors
- Auto-assigns Standard theme to existing quizzes

## Available Themes

### 1. **Standard** (Default)
- Colors: Purple (#7C3AED) to Blue (#2563EB)
- Background: Gradient
- Best for: General quizzes

### 2. **Summer**
- Colors: Amber (#F59E0B) to Cyan (#06B6D4)
- Background: Beach/Ocean image
- Best for: Fun, relaxed topics

### 3. **Autumn**
- Colors: Red (#DC2626) to Orange (#F97316)
- Background: Fall landscape
- Best for: Seasonal content

### 4. **Winter**
- Colors: Blue (#3B82F6) to Purple (#8B5CF6)
- Background: Snow/Ice image
- Best for: Cold weather topics

### 5. **Space**
- Colors: Indigo (#6366F1) to Purple (#8B5CF6)
- Background: Stars/Galaxy
- Best for: Science, astronomy

### 6. **Nature**
- Colors: Green (#16A34A) to Emerald (#059669)
- Background: Forest image
- Best for: Environmental topics

### 7. **Ocean**
- Colors: Sky (#0EA5E9) to Cyan (#06B6D4)
- Background: Underwater image
- Best for: Marine biology, water topics

### 8. **Sunset**
- Colors: Orange (#F97316) to Pink (#EC4899)
- Background: Sky image
- Best for: Creative, artistic topics

### 9. **Dark**
- Colors: Gray-800 (#1F2937) to Gray-700 (#374151)
- Background: Solid color
- Best for: Night mode, formal content

### 10. **Neon**
- Colors: Pink (#EC4899) to Purple (#8B5CF6)
- Background: Gradient
- Best for: Modern, energetic quizzes

## How to Use Themes

### For Teachers - Creating a Quiz:
1. Go to **Create New Quiz**
2. Fill in quiz title and details
3. Scroll to **Quiz Theme** section
4. Click on a theme card to select it
5. The selected theme shows a checkmark
6. Continue with quiz creation

### For Teachers - Editing Quiz Theme:
1. Open **Edit Quiz** for an existing quiz
2. Click the theme badge (🎨 Theme Name) in the header
3. A modal opens with all available themes
4. Select a new theme
5. Click **Save Theme**
6. Theme is applied immediately

### For Students - Taking a Quiz:
- When joining a quiz session, the selected theme automatically applies
- Background images or gradients display behind quiz content
- Text remains readable with semi-transparent white overlays
- Theme persists throughout the entire quiz session

## Theme Components

### Background Styles:
- **Image-based**: Uses Unsplash images for visual themes
- **Gradient-based**: Uses CSS gradients for solid color themes
- **Fixed attachment**: Background stays in place while scrolling

### Color Usage:
- **Primary Color**: Main accent color (buttons, highlights)
- **Secondary Color**: Secondary accent (gradients, borders)
- **Text Color**: Ensures readability (default: white)

### Readability Features:
- Semi-transparent white overlays (bg-white/95)
- Backdrop blur effects for better contrast
- High-contrast text colors
- Shadow effects for depth

## Customization

### Adding New Themes:
You can add custom themes by inserting into the `themes` table:

```sql
INSERT INTO themes (name, background_image_url, primary_color, secondary_color, text_color, is_default)
VALUES (
  'Custom Theme',
  'https://images.unsplash.com/photo-xxx?w=1200&q=80',
  '#FF5733',
  '#C70039',
  '#FFFFFF',
  false
);
```

### Theme Structure:
- `name`: Display name (VARCHAR 100)
- `background_image_url`: Optional image URL (TEXT)
- `primary_color`: Hex color code (VARCHAR 20)
- `secondary_color`: Hex color code (VARCHAR 20)
- `text_color`: Hex color code (VARCHAR 20, default: #FFFFFF)
- `is_default`: Boolean flag for default theme

## Files Modified

### New Files:
- `quiz-themes-migration.sql` - Database schema
- `src/components/quizzes/ThemeSelector.jsx` - Theme picker component
- `QUIZ_THEMES_SETUP.md` - This documentation

### Modified Files:
- `src/components/quizzes/CreateQuiz.jsx` - Added theme selection
- `src/components/quizzes/EditQuiz.jsx` - Added theme editing
- `src/components/students/StudentQuiz.jsx` - Applied theme styles

## Testing

### Test the Theme System:
1. Run the migration in Supabase
2. Create a new quiz and select a theme
3. Edit an existing quiz and change its theme
4. Start a quiz session as a teacher
5. Join as a student and verify theme appears
6. Try different themes to see various backgrounds

## Troubleshooting

### Theme not displaying:
- Verify migration has been run
- Check that quiz has a `theme_id` set
- Ensure theme record exists in `themes` table

### Background image not loading:
- Check image URL is accessible
- Verify CORS settings allow image loading
- Try a different image URL

### Text not readable:
- Adjust `text_color` in theme
- Increase overlay opacity (bg-white/95 to bg-white/98)
- Add text-shadow for better contrast

## Image Credits
Background images are sourced from Unsplash.com with proper attribution and usage rights.
