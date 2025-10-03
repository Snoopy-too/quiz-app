# How to Reset or Create Test User Credentials

## 🔐 **Forgot Your Test Credentials?**

Here are three ways to recover access:

---

## **Option 1: Reset Password via Supabase Dashboard** (Recommended)

### Steps:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Find the user account
5. Click the **three dots menu** → **Send password recovery email**
6. Check the email inbox and follow the reset link

**OR**

Click **"Reset password"** button to manually set a new password

---

## **Option 2: View Existing Users and Update Their Roles**

### Steps:
1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query to see all users:

```sql
SELECT
  u.id,
  u.email,
  p.name,
  p.role,
  p.approved,
  p.verified
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
ORDER BY u.created_at DESC;
```

3. If you want to change a user's role:

```sql
-- Make someone a teacher
UPDATE public.users
SET role = 'teacher', approved = true, verified = true
WHERE email = 'your-email@example.com';

-- Make someone a superadmin
UPDATE public.users
SET role = 'superadmin', approved = true, verified = true
WHERE email = 'your-email@example.com';

-- Make someone a student
UPDATE public.users
SET role = 'student', student_id = 'STU001', approved = true, verified = true
WHERE email = 'your-email@example.com';
```

4. Reset the password via Dashboard (Step 1)

---

## **Option 3: Create Fresh Test Users**

### Steps:

### 1. Create Auth Users in Supabase Dashboard

Go to **Authentication** → **Users** → **Add user** (or **Invite user**)

Create these test accounts:

| Role | Email | Suggested Password |
|------|-------|-------------------|
| Student | student@test.com | Student123! |
| Teacher | teacher@test.com | Teacher123! |
| Super Admin | admin@test.com | Admin123! |

**IMPORTANT:**
- **Uncheck** "Send confirmation email" if you want to log in immediately
- **Check** "Auto confirm user"

### 2. Link Auth Users to Public Users Table

After creating each auth user, you need to add them to the `public.users` table.

Go to **SQL Editor** and run:

```sql
-- Get the auth user IDs first
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 3;
```

Then insert into public.users (replace `'AUTH_USER_ID'` with actual IDs):

```sql
-- Test Student
INSERT INTO public.users (id, email, name, role, student_id, approved, verified)
VALUES (
  'AUTH_USER_ID_FROM_ABOVE',
  'student@test.com',
  'Test Student',
  'student',
  'STU001',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  approved = true,
  verified = true;

-- Test Teacher
INSERT INTO public.users (id, email, name, role, approved, verified)
VALUES (
  'AUTH_USER_ID_FROM_ABOVE',
  'teacher@test.com',
  'Test Teacher',
  'teacher',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  approved = true,
  verified = true;

-- Test Super Admin
INSERT INTO public.users (id, email, name, role, approved, verified)
VALUES (
  'AUTH_USER_ID_FROM_ABOVE',
  'admin@test.com',
  'Test Admin',
  'superadmin',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  approved = true,
  verified = true;
```

---

## **Quick Reference: Default Test Credentials**

Once you've set up using Option 3, you can use:

### Student Account
- **Email:** student@test.com
- **Password:** Student123! (or whatever you set)
- **Role:** Student
- **Student ID:** STU001

### Teacher Account
- **Email:** teacher@test.com
- **Password:** Teacher123! (or whatever you set)
- **Role:** Teacher

### Super Admin Account
- **Email:** admin@test.com
- **Password:** Admin123! (or whatever you set)
- **Role:** Super Admin

---

## **Important Notes:**

### ⚠️ **Two-Part User System**
Your app uses Supabase Auth + Public Users table:
- `auth.users` - Handles authentication (login/password)
- `public.users` - Stores role, name, and app-specific data

Both must be in sync!

### ✅ **User Must Be:**
- `approved: true` (Teachers/Students need approval)
- `verified: true` (Email verified)

### 🔑 **Password Requirements:**
- Minimum 6 characters (Supabase default)
- Mix of letters and numbers recommended

### 🛡️ **Security Note:**
These are TEST credentials only. For production:
- Use strong, unique passwords
- Enable email verification
- Set up proper approval workflows
- Never commit real credentials to Git

---

## **Troubleshooting:**

### Problem: "Your account is awaiting approval"
**Solution:**
```sql
UPDATE public.users SET approved = true WHERE email = 'your-email@example.com';
```

### Problem: "Please verify your email"
**Solution:**
```sql
UPDATE public.users SET verified = true WHERE email = 'your-email@example.com';
```

### Problem: "Invalid credentials"
**Solution:** Reset password via Supabase Dashboard (Option 1)

### Problem: Can login but no dashboard appears
**Solution:** Check that user exists in `public.users` table with correct role
```sql
SELECT * FROM public.users WHERE email = 'your-email@example.com';
```

---

## **Need More Help?**

Check these Supabase docs:
- [User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Password Reset](https://supabase.com/docs/guides/auth/auth-password-reset)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
