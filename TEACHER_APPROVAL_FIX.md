# Teacher Approval Fix - Action Required

## Problem
Teachers cannot approve students because of missing RLS (Row Level Security) policy in Supabase.

**Symptoms:**
- Clicking "Approve" shows success message but database remains `approved: false`
- Or shows permission error

## Root Cause
The current RLS policies on the `users` table don't allow teachers to update the `approved` field for their students.

## Fix Required

### Step 1: Run SQL Migration in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to: SQL Editor

2. **Run this SQL:**
   ```sql
   -- Execute: fix-teacher-approval-rls.sql
   ```

   Or copy-paste:
   ```sql
   CREATE POLICY "teachers_can_approve_their_students"
     ON users
     FOR UPDATE
     TO authenticated
     USING (
       -- The student being updated belongs to this teacher
       teacher_id = auth.uid() AND
       -- The current user is a teacher
       (SELECT role FROM users WHERE id = auth.uid()) = 'teacher'
     )
     WITH CHECK (
       -- The student being updated belongs to this teacher
       teacher_id = auth.uid() AND
       -- The current user is a teacher
       (SELECT role FROM users WHERE id = auth.uid()) = 'teacher' AND
       -- Only allow updating the approved field (prevent changing other sensitive fields)
       -- The role cannot be changed
       role = (SELECT role FROM users WHERE id = users.id) AND
       -- The email cannot be changed
       email = (SELECT email FROM users WHERE id = users.id) AND
       -- The teacher_id cannot be changed
       teacher_id = (SELECT teacher_id FROM users WHERE id = users.id)
     );
   ```

3. **Verify the policy was created:**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd
   FROM pg_policies
   WHERE tablename = 'users' AND policyname = 'teachers_can_approve_their_students';
   ```

   You should see one row returned with the policy details.

### Step 2: Redeploy Netlify

After pushing the latest code changes to GitHub:

1. **Go to Netlify Dashboard**
   - Navigate to: https://app.netlify.com/

2. **Trigger Redeploy**
   - Click on your site: `fidelsquizapp`
   - Go to: Deploys
   - Click: "Trigger deploy" → "Deploy site"

3. **Wait for deployment to complete**
   - Should take 1-2 minutes
   - Check deployment logs for any errors

### Step 3: Test the Fix

**On localhost:**
1. Refresh the page
2. Go to Manage Students
3. Click "Approve" on a pending student
4. Check browser console for detailed logs
5. Verify database shows `approved: true`

**On Netlify (after redeployment):**
1. Clear browser cache or open in incognito
2. Login as teacher
3. Go to Manage Students
4. Click "Approve" on a pending student
5. Verify database shows `approved: true`

## Debugging

If approval still fails, check browser console for error messages:

**Permission Error:**
```
Error code: 42501
Message: "new row violates row-level security policy"
```
→ RLS policy not applied correctly. Re-run Step 1.

**No Error but No Update:**
```
Updated data: []
```
→ Student doesn't have correct `teacher_id`. Check:
```sql
SELECT id, name, email, teacher_id, approved
FROM users
WHERE role = 'student';
```

**Network Error:**
```
Failed to fetch
```
→ Check Supabase connection. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`

## Verification Checklist

- [ ] RLS policy created in Supabase
- [ ] Policy verified in pg_policies table
- [ ] Latest code pushed to GitHub
- [ ] Netlify redeployed
- [ ] Localhost approval works
- [ ] Netlify approval works
- [ ] Tab switching doesn't redirect (localhost)
- [ ] Tab switching doesn't redirect (Netlify)

## Related Files
- `fix-teacher-approval-rls.sql` - SQL migration
- `src/components/teachers/ManageStudents.jsx` - Approval logic with enhanced error handling
- `src/App.jsx` - Tab switching fix (activeViews array)
