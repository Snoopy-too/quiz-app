# Quiz App Setup Instructions

## Step 1: Run Database Schema

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `new-features-schema.sql`
5. Click **RUN** to execute the schema

This will add all necessary columns and tables for the new features.

## Step 2: Create Storage Buckets

You need to create the following storage buckets in Supabase:

1. Go to **Storage** in your Supabase Dashboard
2. Click **Create a new bucket**
3. Create these buckets (one at a time):

   - **quiz-images** - For question images
   - **quiz-videos** - For question videos
   - **quiz-gifs** - For GIFs
   - **quiz-backgrounds** - For quiz background images
   - **user-avatars** - For student/teacher avatars

   For each bucket:
   - Name: `quiz-images` (or the respective name)
   - Public bucket: ✅ **Check this box** (makes files publicly accessible)
   - File size limit: Leave default or set to 50MB
   - Allowed MIME types: Leave empty or specify (image/*, video/*, etc.)

## Step 3: Set Up Storage Policies

For each bucket you created, you need to add two policies:

### Policy 1: Allow Authenticated Users to Upload

1. Go to **Storage** > Click on the bucket name
2. Click **Policies** tab
3. Click **New Policy**
4. Choose **For full customization** > Create policy
5. Use these settings:

   **Policy Name:** `Authenticated users can upload`

   **Allowed operation:** `INSERT`

   **Target roles:** `authenticated`

   **Policy definition (USING):**
   ```sql
   true
   ```

   **WITH CHECK expression:**
   ```sql
   bucket_id = 'bucket-name'
   ```
   (Replace 'bucket-name' with the actual bucket name like 'quiz-images')

### Policy 2: Allow Public Read Access

1. Click **New Policy** again
2. Choose **For full customization** > Create policy
3. Use these settings:

   **Policy Name:** `Public can view files`

   **Allowed operation:** `SELECT`

   **Target roles:** `public`

   **Policy definition (USING):**
   ```sql
   bucket_id = 'bucket-name'
   ```
   (Replace 'bucket-name' with the actual bucket name)

**Repeat for all 5 buckets:**
- quiz-images
- quiz-videos
- quiz-gifs
- quiz-backgrounds
- user-avatars

## Step 4: Verify Everything Works

1. **Test the app:**
   - Create a quiz
   - Add a True/False question
   - Upload an image to a question
   - Upload a background image to the quiz
   - Enable randomization settings
   - Duplicate a quiz

2. **Check Storage:**
   - Go to Supabase Storage
   - Click on a bucket
   - Verify files are uploading successfully

## Quick SQL Script for Storage Policies

If you prefer to create policies via SQL, go to **SQL Editor** and run this for EACH bucket:

```sql
-- Replace 'quiz-images' with the actual bucket name for each bucket

-- Policy 1: Allow authenticated uploads
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES (
  'Authenticated users can upload',
  'quiz-images',
  'true',
  'bucket_id = ''quiz-images'''
) ON CONFLICT DO NOTHING;

-- Policy 2: Allow public reads
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Public can view files',
  'quiz-images',
  'bucket_id = ''quiz-images'''
) ON CONFLICT DO NOTHING;
```

Run this script 5 times, replacing 'quiz-images' with:
1. quiz-images
2. quiz-videos
3. quiz-gifs
4. quiz-backgrounds
5. user-avatars

## Troubleshooting

### "Bucket not found" error
- Make sure you created all 5 buckets
- Check bucket names match exactly (lowercase, with hyphens)

### "Permission denied" error
- Check that storage policies are created correctly
- Verify bucket is set to **Public**
- Check that user is authenticated

### Images not displaying
- Check that the file uploaded successfully in Storage
- Verify the public URL is being returned correctly
- Check browser console for CORS errors

## Next Features to Implement

After setup is complete, you can implement:
- ✅ Streak bonuses for students
- ✅ Nickname generator for quiz join
- ✅ CSV import for questions
- ✅ Quiz sharing with other teachers
- ✅ Student avatars
- ✅ Homework/assignment mode
- ✅ Team mode

All utility functions are already created in the `src/utils/` folder!
