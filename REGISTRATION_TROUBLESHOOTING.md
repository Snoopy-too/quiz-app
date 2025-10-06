# Registration Troubleshooting Guide

## Issue: "This email is already registered" Error

### Root Cause
The registration process has two steps:
1. Create auth user in Supabase Auth
2. Create profile in the `users` table

If step 2 fails, the auth user exists but the profile doesn't (orphaned auth user). On retry, the email already exists in the `users` table, causing registration to fail.

### Solution 1: Use Different Email (Recommended)
Simply register with a different email address.

### Solution 2: Login with Existing Account
If you previously registered successfully, try logging in instead.

### Solution 3: Clean Up Database (For Admins)

#### Check if profile exists:
```sql
SELECT id, email, role, verified, approved
FROM users
WHERE email = 'your-email@example.com';
```

#### If profile exists - User should login
The registration completed successfully. User should login instead.

#### If profile does NOT exist - Orphaned auth user
Delete the orphaned entry from the `users` table (if any partial entry exists):

```sql
-- Check for any orphaned entries
SELECT * FROM users WHERE email = 'your-email@example.com';

-- Delete orphaned entry (if it exists)
DELETE FROM users WHERE email = 'your-email@example.com';
```

Then delete the auth user from Supabase Auth:
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user by email
3. Click the "..." menu → Delete user

After cleanup, user can register again with the same email.

## Prevention
The updated registration flow now:
1. ✅ Checks if email exists in `users` table BEFORE creating auth user
2. ✅ Shows user-friendly error messages
3. ✅ Logs orphaned auth user IDs for admin cleanup

## Quick Cleanup Query
To find and remove ALL orphaned entries (use with caution):

```sql
-- Find emails that appear to be duplicates or incomplete
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Check specific user's status
SELECT id, email, role, verified, approved, teacher_id, student_id, created_at
FROM users
WHERE email = 'specific-email@example.com'
ORDER BY created_at DESC;
```

## Current Known Issue
**Email:** fidel@montoyahome.com
- Has an orphaned profile entry in the `users` table
- Needs cleanup before registration can succeed

**To fix:**
```sql
DELETE FROM users WHERE email = 'fidel@montoyahome.com';
```

Then the user should be able to register successfully.
