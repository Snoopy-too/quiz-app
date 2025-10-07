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
   -- Execute: fix-teacher-approval-rls-v2.sql
   ```

   Or copy-paste:
   ```sql
   -- Drop old policy if exists
   DROP POLICY IF EXISTS "teachers_can_approve_their_students" ON users;

   -- Create corrected policy
   CREATE POLICY "teachers_can_approve_their_students"
     ON users
     FOR UPDATE
     TO authenticated
     USING (
       -- Allow if: the row being updated is a student assigned to the current teacher
       EXISTS (
         SELECT 1 FROM users teacher
         WHERE teacher.id = auth.uid()
         AND teacher.role = 'teacher'
         AND users.teacher_id = teacher.id
         AND users.role = 'student'
       )
     )
     WITH CHECK (
       -- Allow if: the row being updated is a student assigned to the current teacher
       EXISTS (
         SELECT 1 FROM users teacher
         WHERE teacher.id = auth.uid()
         AND teacher.role = 'teacher'
         AND users.teacher_id = teacher.id
         AND users.role = 'student'
       )
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

**Subquery Error:**
```
Error code: 21000
Message: "more than one row returned by a subquery used as an expression"
```
→ Old/incorrect policy is still active. Run the DROP and CREATE commands from Step 1 again.

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
- `fix-teacher-approval-rls-v2.sql` - **CORRECTED SQL migration (use this one)**
- `fix-teacher-approval-rls.sql` - ~~Old version (has subquery error)~~
- `src/components/teachers/ManageStudents.jsx` - Approval logic with enhanced error handling
- `src/App.jsx` - Tab switching fix (activeViews array)
