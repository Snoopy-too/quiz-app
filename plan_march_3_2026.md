# Feature Implementation Plan: School Separation System

This plan details the architecture and implementation steps to introduce "Schools" to the application. The primary goal is to isolate user pools so teachers and students from different schools are strictly separated.

## 1. Database & Architecture Changes
We will implement the following database schema changes, adhering strictly to **Clean Architecture** boundaries and zero-trust security (Row Level Security).

### New Table: `schools`
* **Columns**: 
  * `id` (uuid, primary key, default `gen_random_uuid()`)
  * `name` (text, not null)
  * `created_at` (timestamp with time zone, default `now()`)
* **Security (RLS)**: 
  * Enable RLS (`ALTER TABLE schools ENABLE ROW LEVEL SECURITY;`).
  * Only users with the `super_admin` role (or equivalent) can insert/update/delete.
  * All public/authenticated users can `SELECT` (read-only) for registration dropdowns.

### Update Table: `users`
* **New Column**: `school_id` (uuid, references `schools(id)`, nullable to support initial migration of existing users).
* **Security Update**: 
  * Update RLS policies on the `users` table to ensure teachers can only ever view and interact with students who share the exact same `school_id`.

## 2. Super Admin Dashboard implementation
* **"Schools" Management Interface**: 
  * Add a new section for the Super Admin to create, view, and edit schools.
* **Retroactive Assignment List**:
  * Update the existing user list view. Add a "School" column.
  * Provide inline editing or a bulk-assignment tool allowing the Super Admin to assign existing teachers and students to the newly created schools in the database.
* **"Create User" Form Update**:
  * Add a "School" select field (dropdown) to the Super Admin's "Create User" form. Require this field for all new users to prevent orphans.

## 3. User Registration Flow
* **Teacher Registration**:
  * Add a "Select School" dropdown to the public teacher registration form. Form data will be validated via `zod`.
  * The selected `school_id` will be written to the new teacher's `users` record.
* **Student Registration**:
  * **No School Dropdown**: Students must NOT select a school.
  * **Teacher Code Resolution**: 
    1. The student provides a required "Teacher Code".
    2. The backend securely queries the DB for the teacher's profile matching that code.
    3. The teacher's `school_id` is automatically extracted and permanently assigned to the new student.

## 4. Teacher Dashboard Updates
* **"Create Student" Modal (Manage Students)**:
  * When a teacher manually creates a student account, the UI form will include hidden configuration for the teacher's linkage.
  * **Backend Guardrail**: The backend edge function or API handler must independently verify the logged-in teacher's `school_id` via their auth session and explicitly enforce the `INSERT`, ignoring any client-supplied spoofed values.
* **"Unlinked" Students List Filter**:
  * Update the SQL/Supabase query for the "Unlinked" button view.
  * Add the condition: only list students where `(is_unlinked = true) AND (student.school_id = teacher_auth.school_id)`.

## 5. Security & Governance 
* **Self-Audit Check**: 
  * Ensure the inclusion of `zod` schema parsing on all updated registration endpoints.
  * Run `npx supabase gen types typescript` after SQL migration execution to enforce "Strict Mode" TypeScript safety.
  * Verify all foreign key relations (`ON DELETE RESTRICT` or `SET NULL` depending on desired business logic for deleting a school) to prevent DB corruption.
