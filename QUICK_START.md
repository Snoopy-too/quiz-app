# Quick Start - 3 Steps to Complete Setup

## 🚀 Step 1: Run Database Schema (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy all contents from `new-features-schema.sql`
3. Paste and click **RUN**
4. Wait for success message

## 📦 Step 2: Create Storage Buckets (3 minutes)

Go to **Storage** → Click **New bucket** 5 times:

| Bucket Name | Public? | Size Limit |
|-------------|---------|------------|
| `quiz-images` | ✅ Yes | 50 MB |
| `quiz-videos` | ✅ Yes | 100 MB |
| `quiz-gifs` | ✅ Yes | 50 MB |
| `quiz-backgrounds` | ✅ Yes | 50 MB |
| `user-avatars` | ✅ Yes | 10 MB |

**IMPORTANT:** Check "Public bucket" for all 5!

## 🔐 Step 3: Add Storage Policies (1 minute)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy all contents from `storage-policies.sql`
3. Paste and click **RUN**
4. Verify: Should see "10 rows" returned

---

## ✅ You're Done!

Test it out:
- Create a quiz
- Upload an image to a question
- Start the quiz and see the image display

---

## 📝 Detailed Instructions

- `SETUP_CHECKLIST.md` - Full checklist with verification
- `SETUP_INSTRUCTIONS.md` - Step-by-step guide with troubleshooting
- `IMPLEMENTATION_GUIDE.md` - Code examples for all features

---

## 🆘 Need Help?

**Can't upload images?**
→ Check buckets are created and set to Public

**"Permission denied" error?**
→ Run `storage-policies.sql` in SQL Editor

**"Column does not exist" error?**
→ Run `new-features-schema.sql` in SQL Editor

---

**Total Time: ~6 minutes** ⏱️
