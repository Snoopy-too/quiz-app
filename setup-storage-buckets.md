# Supabase Storage Buckets Setup

## Required Buckets

Your app needs these 4 storage buckets:
- `quiz-images` - For quiz background images and question images
- `quiz-videos` - For question videos
- `quiz-gifs` - For question GIFs
- `user-avatars` - For user profile pictures

## Setup Instructions

### Option 1: Via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard** → Your Project
2. **Click "Storage"** in the left sidebar
3. **Click "New bucket"** button
4. **Create each bucket with these settings:**

   **Bucket 1: quiz-images**
   - Name: `quiz-images`
   - Public bucket: ✅ **YES** (check this box)
   - File size limit: 5 MB
   - Allowed MIME types: `image/*`
   - Click "Create bucket"

   **Bucket 2: quiz-videos**
   - Name: `quiz-videos`
   - Public bucket: ✅ **YES**
   - File size limit: 50 MB
   - Allowed MIME types: `video/*`
   - Click "Create bucket"

   **Bucket 3: quiz-gifs**
   - Name: `quiz-gifs`
   - Public bucket: ✅ **YES**
   - File size limit: 10 MB
   - Allowed MIME types: `image/gif`
   - Click "Create bucket"

   **Bucket 4: user-avatars**
   - Name: `user-avatars`
   - Public bucket: ✅ **YES**
   - File size limit: 2 MB
   - Allowed MIME types: `image/*`
   - Click "Create bucket"

5. **Done!** Try uploading an image in your app now.

### Option 2: Via SQL (Advanced)

Run the SQL script in `create-storage-buckets.sql` in your Supabase SQL Editor.

## Storage Policies

The buckets are set to public, which means:
- ✅ Anyone can **read** (view) files
- ✅ Authenticated users can **upload** files
- ✅ Users can **delete** their own files

If you need more restrictive access, edit the policies in Supabase Dashboard → Storage → [bucket name] → Policies.

## Verify Setup

After creating the buckets:
1. Go to Storage in Supabase Dashboard
2. You should see all 4 buckets listed
3. Try uploading a background image in Create Quiz - it should work now!
