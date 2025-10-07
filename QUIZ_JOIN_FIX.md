# Quiz Join Fix - "Quiz not found" Error

## Problem
When a teacher starts a quiz and student enters the PIN, they get error: **"Invalid PIN - Quiz not found"**

**Root Cause:**
Row Level Security (RLS) policy on `quiz_sessions` table blocks students from viewing quiz sessions.

### The Chicken-and-Egg Problem

Current RLS policy says:
```sql
-- Students can only see quiz_sessions if they're already a participant
EXISTS (
  SELECT 1 FROM session_participants
  WHERE session_participants.session_id = quiz_sessions.id
  AND session_participants.user_id = auth.uid()
)
```

**Problem:** Students need to see the quiz_session to join it, but can't see it until they're already a participant!

### Flow That's Broken

1. Teacher starts quiz → creates `quiz_sessions` row with PIN
2. Student enters PIN → tries to SELECT from `quiz_sessions` by PIN
3. **RLS policy blocks the SELECT** → student can't see the session
4. Student gets "Quiz not found" error
5. Student can never join because they can't look up the session

---

## Fix Required

### Run This SQL in Supabase

Go to **Supabase Dashboard → SQL Editor** and execute:

```sql
-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view quiz sessions they host or participate in" ON quiz_sessions;

-- Create new SELECT policy: Allow all authenticated users to view quiz sessions
CREATE POLICY "authenticated_users_can_view_quiz_sessions"
  ON quiz_sessions
  FOR SELECT
  TO authenticated
  USING (true);
```

Or execute: `fix-quiz-sessions-pin-lookup.sql`

---

## Security Considerations

**Is this safe?**
✅ Yes! Here's why:

1. **Users must be authenticated** - only logged-in users can view sessions
2. **Users must be verified** - email verification required (enforced at login)
3. **Users must be approved** - teacher approval required (enforced at login)
4. **Students can only READ** - they cannot create, update, or delete sessions
5. **Students need the PIN** - they must know the 6-digit PIN to find a session
6. **Teachers control the flow** - teachers decide when to start/end sessions

**What students can see:**
- Quiz session ID, PIN, status, current question
- Basic metadata about the session

**What students CANNOT do:**
- Create quiz sessions (only teachers can)
- Update quiz sessions (only host teacher can)
- Delete quiz sessions (only host teacher can)
- See quiz sessions they don't have the PIN for (unless they guess it)

---

## Testing

### After Running the SQL

**1. Localhost Test:**
```
1. Login as teacher
2. Start a quiz (Manage Quizzes → Start Quiz)
3. Note the 6-digit PIN displayed
4. Logout
5. Login as student
6. Enter the PIN
7. Should join successfully ✅
```

**2. Netlify Test:**
```
1. Redeploy Netlify (after pushing code changes)
2. Login as teacher on https://fidelsquizapp.netlify.app/
3. Start a quiz
4. Note the PIN
5. Logout
6. Login as student
7. Enter the PIN
8. Should join successfully ✅
```

---

## Debugging

If students still can't join:

### Check Browser Console

**Error code 42501:**
```
Error: new row violates row-level security policy
```
→ RLS policy not applied correctly. Re-run the SQL.

**Error: "Quiz not found":**
```
sessions: []
sessionError: null
```
→ No session exists with that PIN. Verify:
1. Teacher actually started a quiz
2. PIN was entered correctly (6 digits)
3. Quiz session wasn't deleted

**Error: Permission denied:**
```
Error code: 42501
Message: permission denied for table quiz_sessions
```
→ Student is not authenticated. Check:
1. Student is logged in
2. Student's email is verified (`users.verified = true`)
3. Student is approved by teacher (`users.approved = true`)

### Verify in Supabase Database

```sql
-- Check if quiz sessions exist
SELECT id, pin, status, created_at
FROM quiz_sessions
WHERE status != 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'quiz_sessions'
ORDER BY policyname;
```

---

## Related Files

- `fix-quiz-sessions-pin-lookup.sql` - SQL migration to fix RLS policy
- `src/components/dashboards/StudentDashboard.jsx` - Student PIN entry with enhanced logging
- `src/components/teachers/ManageQuizzes.jsx` - Teacher quiz start with PIN generation
- `src/components/quizzes/TeacherControl.jsx` - Quiz session control panel

---

## Deployment Checklist

- [ ] Run SQL migration in Supabase
- [ ] Verify policy created: `authenticated_users_can_view_quiz_sessions`
- [ ] Push code changes to GitHub
- [ ] Redeploy Netlify
- [ ] Test on localhost: teacher starts → student joins
- [ ] Test on Netlify: teacher starts → student joins
- [ ] Verify no security issues (students can't modify sessions)
