# Quiz App Setup Checklist

## ✅ Step 1: Database Schema (REQUIRED)

- [ ] Open Supabase Dashboard
- [ ] Navigate to **SQL Editor**
- [ ] Copy contents from `new-features-schema.sql`
- [ ] Paste and **RUN** the SQL
- [ ] Verify no errors in execution

**Why:** Adds new columns (image_url, video_url, gif_url, background_image_url, randomize settings, etc.)

---

## ✅ Step 2: Create Storage Buckets (REQUIRED)

Navigate to **Storage** > **Create a new bucket** for each:

- [ ] **quiz-images**
  - Public: ✅ YES
  - File size limit: 50MB

- [ ] **quiz-videos**
  - Public: ✅ YES
  - File size limit: 100MB

- [ ] **quiz-gifs**
  - Public: ✅ YES
  - File size limit: 50MB

- [ ] **quiz-backgrounds**
  - Public: ✅ YES
  - File size limit: 50MB

- [ ] **user-avatars**
  - Public: ✅ YES
  - File size limit: 10MB

**Why:** Storage buckets hold uploaded media files

---

## ✅ Step 3: Set Storage Policies (REQUIRED)

### Option A: Via SQL (Recommended - Faster)

- [ ] Go to **SQL Editor**
- [ ] Copy contents from `storage-policies.sql`
- [ ] Paste and **RUN** the SQL
- [ ] Check results show 10 policies created (2 per bucket)

### Option B: Via Dashboard (Manual)

For EACH of the 5 buckets, create 2 policies:

**Policy 1: Upload Permission**
- Name: `Authenticated users can upload`
- Operation: `INSERT`
- Target roles: `authenticated`
- USING expression: `true`

**Policy 2: Read Permission**
- Name: `Public can view files`
- Operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'bucket-name'`

Total policies to create: **10** (2 per bucket × 5 buckets)

**Why:** Policies control who can upload and view files

---

## ✅ Step 4: Test the Features

### Test True/False Questions
- [ ] Create a quiz
- [ ] Add a True/False question
- [ ] Verify only 2 options show (True/False)

### Test Image Upload
- [ ] Edit a question
- [ ] Click image upload box
- [ ] Select an image file
- [ ] Verify preview appears
- [ ] Save question
- [ ] Check Supabase Storage > quiz-images for the file

### Test Quiz Settings
- [ ] Create a new quiz
- [ ] Upload background image
- [ ] Enable "Randomize questions"
- [ ] Enable "Randomize answers"
- [ ] Save quiz

### Test Quiz Duplication
- [ ] Go to Manage Quizzes
- [ ] Click purple copy button on a quiz
- [ ] Verify new quiz appears with "(Copy)" in title
- [ ] Verify all questions were copied

### Test Podium Animation
- [ ] Start a quiz with 3+ students
- [ ] Complete the quiz
- [ ] Verify animated podium shows top 3 winners

---

## 🎯 Verification Commands

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if new columns exist in questions table
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name IN ('image_url', 'video_url', 'gif_url');

-- Check if new columns exist in quizzes table
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'quizzes'
AND column_name IN ('background_image_url', 'randomize_questions', 'randomize_answers');

-- Check storage buckets
SELECT name, public
FROM storage.buckets
WHERE name IN ('quiz-images', 'quiz-videos', 'quiz-gifs', 'quiz-backgrounds', 'user-avatars');

-- Check storage policies (should return 10 rows)
SELECT bucket_id, name, operation
FROM storage.policies
WHERE bucket_id IN ('quiz-images', 'quiz-videos', 'quiz-gifs', 'quiz-backgrounds', 'user-avatars')
ORDER BY bucket_id;
```

---

## 🚨 Common Issues

### Issue: "Column does not exist"
**Solution:** Run `new-features-schema.sql` in SQL Editor

### Issue: "Bucket not found"
**Solution:** Create the 5 storage buckets manually in Supabase Dashboard

### Issue: "Permission denied" when uploading
**Solution:** Run `storage-policies.sql` or create policies manually

### Issue: Images not displaying
**Solution:**
1. Check bucket is set to **Public**
2. Verify policies exist
3. Check browser console for errors

---

## ✅ Success Criteria

You'll know setup is complete when:

- ✅ You can upload an image to a question
- ✅ Image displays in teacher control view
- ✅ Image displays in student quiz view
- ✅ Background image uploads to quiz
- ✅ Quiz duplication works with all media
- ✅ Podium animation shows on quiz completion

---

## Next Steps After Setup

Once all checkboxes are complete, you can:

1. **Test in production** - Create quizzes with media
2. **Implement more features** - Streak bonuses, nicknames, CSV import
3. **Customize styling** - Adjust colors, animations, layouts
4. **Deploy** - Host on Vercel, Netlify, or your preferred platform

Need help? Check `IMPLEMENTATION_GUIDE.md` for code examples!
