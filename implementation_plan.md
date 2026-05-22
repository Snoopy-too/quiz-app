# Implementation Plan - Super Admin User Impersonation (Sudo Mode)

This plan details the design and implementation of a professional "User Impersonation" feature. This allows the Super Admin to view the dashboard and act as another user (Teacher or Student) to troubleshoot problems, and then easily exit back to the Super Admin control panel.

---

## User Review Required

> [!IMPORTANT]
> **Security Guardrails for Impersonation**:
> 1. **Access Control**: Impersonation is strictly restricted to users who are authenticated as `superadmin` in the Supabase `users` table. If the authenticated session is not a superadmin, impersonation is completely bypassed and ignored.
> 2. **Session Persistence**: Impersonation status will be stored in `sessionStorage` (as `quizapp_impersonatedUser`) to persist troubleshooting state across page reloads. It will not persist across browser close, and will never touch `localStorage` to avoid leakage.
> 3. **Database Write Permissions**: While impersonating, the Super Admin retains their original Supabase auth session. The database RLS (Row Level Security) policies enforce security boundaries:
>    - The superadmin has `superadmin_all_access` on the `users` table and read/write policies on `quizzes`.
>    - If RLS is triggered (e.g. attempting to update another user's quiz), it will fail securely. This is standard for troubleshooting modes to prevent accidental data modification.

---

## Open Questions

None at this stage. The architecture is clear and the current React state design allows for a straightforward drop-in implementation.

---

## Proposed Changes

### Core Routing and Impersonation State

#### [MODIFY] [App.jsx](file:///C:/xampp/htdocs/quiz-app/src/App.jsx)
- Add `impersonatorUser` to `appState` initialization.
- Read `quizapp_impersonatedUser` from `sessionStorage` on load. If present and the authenticated user is a `superadmin`, restore the impersonation state.
- Expose an `impersonateUser(targetUser)` function:
  1. Set `sessionStorage.setItem('quizapp_impersonatedUser', JSON.stringify(targetUser))`
  2. Set `appState.impersonatorUser` to the current admin profile.
  3. Set `appState.currentUser` to `targetUser`.
  4. Route to the appropriate dashboard (e.g., `teacher-dashboard` or `student-dashboard`).
- Expose an `exitImpersonation()` function:
  1. Clear `sessionStorage.removeItem('quizapp_impersonatedUser')`
  2. Restore `appState.currentUser` to `appState.impersonatorUser`.
  3. Set `appState.impersonatorUser` to `null`.
  4. Route back to `superadmin-dashboard`.
- Render a global, non-intrusive floating troubleshooting banner at the bottom-right of the viewport when `appState.impersonatorUser` is active, allowing the superadmin to exit impersonation at any time.

---

### Dashboard Impersonation Entry point

#### [MODIFY] [SuperAdminDashboard.jsx](file:///C:/xampp/htdocs/quiz-app/src/components/dashboards/SuperAdminDashboard.jsx)
- Accept `setAppState` and `setView` as props.
- Add an "Impersonate User" button (using the Lucide `Eye` icon) in the Actions column of the users table (only shown for non-admin users, or users other than the active superadmin).
- When clicked, trigger the impersonation logic in `App.jsx`.

---

### Syncing Components to Use Active User State

The following components currently query data using `supabase.auth.getUser()`. We will update them to use `appState.currentUser.id` (or `_appState.currentUser.id`) to fetch quizzes, folders, and reports of the impersonated user instead of the superadmin's own files.

#### [MODIFY] [useManageQuizzes.js](file:///C:/xampp/htdocs/quiz-app/src/hooks/useManageQuizzes.js)
- Replace `supabase.auth.getUser()` with `appState?.currentUser?.id` for fetching/creating quizzes and folders.

#### [MODIFY] [CreateQuiz.jsx](file:///C:/xampp/htdocs/quiz-app/src/components/quizzes/CreateQuiz.jsx)
- Replace `supabase.auth.getUser()` with `appState?.currentUser?.id` for fetching folders and saving quizzes.
- Pass `currentUserId={appState?.currentUser?.id}` to `<ThemeSelector />`.

#### [MODIFY] [EditQuiz.jsx](file:///C:/xampp/htdocs/quiz-app/src/components/quizzes/EditQuiz.jsx)
- Replace `supabase.auth.getUser()` with `_appState?.currentUser?.id` for fetching folders.
- Pass `currentUserId={_appState?.currentUser?.id}` to `<ThemeSelector />`.

#### [MODIFY] [ThemeSelector.jsx](file:///C:/xampp/htdocs/quiz-app/src/components/quizzes/ThemeSelector.jsx)
- Accept `currentUserId` as an optional prop.
- If `currentUserId` is provided, skip `supabase.auth.getUser()`.

#### [MODIFY] [PublicQuizzes.jsx](file:///C:/xampp/htdocs/quiz-app/src/components/teachers/PublicQuizzes.jsx)
- Replace `supabase.auth.getUser()` with `appState?.currentUser?.id` for fetching public/imported quizzes.

#### [MODIFY] [Reports.jsx](file:///C:/xampp/htdocs/quiz-app/src/components/teachers/Reports.jsx)
- Replace `supabase.auth.getUser()` with `appState?.currentUser?.id` for fetching teacher reports and performance tables.

---

## Verification Plan

### Manual Verification
1. **Login as Super Admin**: Verify the dashboard loads normally.
2. **Access Users List**: Find a teacher and a student user.
3. **Trigger Impersonation**:
   - Click the "Impersonate" eye icon next to a Teacher user.
   - Verify the view redirects to the Teacher Dashboard showing that teacher's invite code and navigation.
   - Verify the floating banner appears at the bottom-right showing "Troubleshooting Mode: Acting as [Teacher Name] ([Email])" with an "Exit" button.
   - Refresh the page and verify that impersonation is persisted.
4. **Test Navigation**:
   - Go to "My Quizzes", "Students", "Reports". Verify that the loaded quizzes, folders, student lists, and report stats belong to the impersonated teacher.
5. **Exit Impersonation**:
   - Click "Exit Impersonation" on the floating banner.
   - Verify the view redirects back to the Super Admin Dashboard and the banner disappears.
6. **Impersonate Student**:
   - Repeat the process for a Student user. Verify redirect to the Student Dashboard and that "My Results" and "Assigned Quizzes" belong to the student.
7. **Security Check**:
   - Ensure a regular teacher or student cannot trigger impersonation or set the sessionStorage key to act as someone else.
