# Supabase Setup Guide - Visual Walkthrough

## 🎯 Overview

```
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE SETUP                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step 1: Database Schema                               │
│  ├─ Add columns to questions table                    │
│  ├─ Add columns to quizzes table                      │
│  └─ Create new tables (teams, assignments, etc.)      │
│                                                         │
│  Step 2: Storage Buckets                              │
│  ├─ quiz-images      (for question images)            │
│  ├─ quiz-videos      (for question videos)            │
│  ├─ quiz-gifs        (for question GIFs)              │
│  ├─ quiz-backgrounds (for quiz backgrounds)           │
│  └─ user-avatars     (for profile pictures)           │
│                                                         │
│  Step 3: Storage Policies                             │
│  ├─ Allow authenticated users to UPLOAD               │
│  └─ Allow public to READ/VIEW files                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Step 1: Database Schema

### What This Does:
Adds new columns to existing tables and creates new tables.

### Where to Go:
**Supabase Dashboard** → **SQL Editor** (left sidebar)

### What to Do:
1. Click **New query**
2. Open `new-features-schema.sql` in your code editor
3. **Copy ALL** the SQL (Ctrl+A, Ctrl+C)
4. **Paste** into Supabase SQL Editor
5. Click **RUN** (bottom right)

### Expected Result:
```
✅ Success. No rows returned
```

### What Gets Added:

#### Questions Table (new columns):
- `image_url` - Stores image URL
- `video_url` - Stores video URL
- `gif_url` - Stores GIF URL

#### Quizzes Table (new columns):
- `background_image_url` - Quiz background image
- `randomize_questions` - Boolean for randomization
- `randomize_answers` - Boolean for randomization
- `is_template` - Boolean for templates
- `is_public` - Boolean for public quizzes

#### New Tables Created:
- `teams` - For team mode
- `team_members` - Team participant tracking
- `assignments` - For homework mode
- `assignment_submissions` - Student homework submissions
- `folders` - Quiz organization
- `quiz_shares` - Quiz sharing between teachers

---

## 📦 Step 2: Create Storage Buckets

### What This Does:
Creates folders in Supabase Cloud Storage to store uploaded files.

### Where to Go:
**Supabase Dashboard** → **Storage** (left sidebar)

### What to Do:

#### For Each Bucket:

1. Click **New bucket** (top right)
2. Fill in the form:

**Bucket 1: quiz-images**
```
Name: quiz-images
Public bucket: ✅ CHECKED
File size limit: 52428800 (50 MB)
Allowed MIME types: (leave empty)
```

**Bucket 2: quiz-videos**
```
Name: quiz-videos
Public bucket: ✅ CHECKED
File size limit: 104857600 (100 MB)
Allowed MIME types: (leave empty)
```

**Bucket 3: quiz-gifs**
```
Name: quiz-gifs
Public bucket: ✅ CHECKED
File size limit: 52428800 (50 MB)
Allowed MIME types: (leave empty)
```

**Bucket 4: quiz-backgrounds**
```
Name: quiz-backgrounds
Public bucket: ✅ CHECKED
File size limit: 52428800 (50 MB)
Allowed MIME types: (leave empty)
```

**Bucket 5: user-avatars**
```
Name: user-avatars
Public bucket: ✅ CHECKED
File size limit: 10485760 (10 MB)
Allowed MIME types: (leave empty)
```

3. Click **Create bucket**
4. Repeat for all 5 buckets

### Expected Result:
You should see 5 buckets in the Storage dashboard:

```
📦 quiz-images       Public  50 MB
📦 quiz-videos       Public  100 MB
📦 quiz-gifs         Public  50 MB
📦 quiz-backgrounds  Public  50 MB
📦 user-avatars      Public  10 MB
```

---

## 🔐 Step 3: Storage Policies

### What This Does:
Sets permissions for who can upload and view files.

### Where to Go:
**Supabase Dashboard** → **SQL Editor**

### What to Do:
1. Click **New query**
2. Open `storage-policies.sql` in your code editor
3. **Copy ALL** the SQL
4. **Paste** into Supabase SQL Editor
5. Click **RUN**

### Expected Result:
```
┌─────────────┬────────────────────────────┬───────────┐
│ bucket_id   │ name                       │ operation │
├─────────────┼────────────────────────────┼───────────┤
│ quiz-gifs   │ Authenticated can upload   │ INSERT    │
│ quiz-gifs   │ Public can view            │ SELECT    │
│ quiz-images │ Authenticated can upload   │ INSERT    │
│ quiz-images │ Public can view            │ SELECT    │
│ ... (10 rows total)                                  │
└──────────────────────────────────────────────────────┘
```

### What This Means:
- **INSERT policy** = Logged-in users can upload files
- **SELECT policy** = Anyone can view/download files (public access)

---

## ✅ Verification Steps

### Test 1: Database Columns
Run this in SQL Editor:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name IN ('image_url', 'video_url', 'gif_url');
```
**Expected:** 3 rows returned

### Test 2: Storage Buckets
Run this in SQL Editor:
```sql
SELECT name, public FROM storage.buckets;
```
**Expected:** 5 rows, all with `public = true`

### Test 3: Storage Policies
Run this in SQL Editor:
```sql
SELECT COUNT(*) FROM storage.policies
WHERE bucket_id IN ('quiz-images', 'quiz-videos', 'quiz-gifs', 'quiz-backgrounds', 'user-avatars');
```
**Expected:** `count = 10`

---

## 🧪 Live Test

### Upload Test:
1. Open your quiz app: http://localhost:5175
2. Login as teacher
3. Create a quiz
4. Edit quiz → Add question
5. Click image upload box
6. Select any image
7. **Success**: Preview shows immediately

### Storage Verification:
1. Go to Supabase → Storage → quiz-images
2. You should see your uploaded image
3. Click the image → Copy URL
4. Paste URL in browser → Image displays

---

## 🆘 Troubleshooting

### ❌ Error: "Bucket not found"
**Solution:** You didn't create all 5 buckets. Go back to Step 2.

### ❌ Error: "Permission denied"
**Solution:** Storage policies missing. Run `storage-policies.sql` again.

### ❌ Error: "Column 'image_url' does not exist"
**Solution:** Database schema not applied. Run `new-features-schema.sql`.

### ❌ Upload works but image doesn't display
**Cause:** Bucket is not public
**Solution:**
1. Storage → Click bucket name
2. Click **Configuration**
3. Toggle **Public** to ON

### ❌ SQL Error: "relation already exists"
**Cause:** Schema was already run
**Solution:** This is OK! The schema uses `IF NOT EXISTS` so it's safe to re-run.

---

## 📚 Additional Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- `IMPLEMENTATION_GUIDE.md` - Feature implementation examples
- `SETUP_CHECKLIST.md` - Detailed checklist

---

## 🎉 Success!

Once complete, your quiz app will support:
- ✅ Image uploads in questions
- ✅ Video uploads in questions
- ✅ GIF uploads in questions
- ✅ Background images for quizzes
- ✅ User profile avatars
- ✅ Quiz duplication with media
- ✅ Randomization settings
- ✅ Podium animations

**Estimated Setup Time: 5-10 minutes**
