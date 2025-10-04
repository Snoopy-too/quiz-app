# Teacher Invitation Code System - Setup Instructions

## Overview
This system allows teachers to have unique invitation codes that students use during registration to automatically associate themselves with their teacher.

## Database Migration

### Step 1: Run the SQL Migration
Execute the SQL file `teacher-code-migration.sql` in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `teacher-code-migration.sql`
5. Click **Run** to execute the migration

### What the Migration Does:
- Adds `teacher_code` column to the `users` table (VARCHAR(8), UNIQUE)
- Adds `teacher_id` column to the `users` table (UUID, references users.id)
- Creates indexes for better query performance
- Creates a PostgreSQL function to generate random teacher codes
- Automatically generates unique codes for existing teachers

## How It Works

### For Teachers:
1. When a teacher registers, a unique 8-character code is automatically generated
2. The code appears prominently on their dashboard in the format: **ABCD-1234**
3. Teachers can click "Copy Code" to easily share it with students
4. Teachers only see students who registered with their code in "Manage Students"

### For Students:
1. During registration, students must enter a teacher code
2. The code is validated against existing teacher codes
3. If valid, the student is automatically associated with that teacher (`teacher_id` is set)
4. Invalid codes show an error message

## Code Format
- 8 characters: uppercase letters and numbers
- Excludes ambiguous characters (I, O, 0, 1)
- Example: `ABCD1234`
- Display format: `ABCD-1234` (with hyphen for readability)

## Files Modified

### New Files:
- `teacher-code-migration.sql` - Database schema changes
- `src/utils/teacherCode.js` - Utility functions for generating and formatting codes
- `TEACHER_CODE_SETUP.md` - This file

### Modified Files:
- `src/components/auth/Register.jsx` - Added teacher code field and validation
- `src/components/auth/Login.jsx` - Fetch teacher_code in user profile
- `src/components/dashboards/TeacherDashboard.jsx` - Display teacher code with copy button
- `src/components/teachers/ManageStudents.jsx` - Filter students by teacher_id

## Testing

### Test the System:
1. Register a new teacher account
2. Verify the teacher code appears on the teacher dashboard
3. Copy the teacher code
4. Register a new student account using that code
5. Log in as the teacher and verify the student appears in "Manage Students"
6. Try registering a student with an invalid code (should show error)

## Troubleshooting

### Teacher code not showing:
- Make sure the migration has been run
- Check that the teacher has a `teacher_code` in the database
- Verify the Login component is fetching `teacher_code` in the user profile

### Student not appearing in Manage Students:
- Verify the student's `teacher_id` matches the teacher's `id`
- Check the database to confirm the association was created

### Invalid code error when code is valid:
- Ensure the code is entered without the hyphen (system accepts both formats)
- Check that the teacher account exists and has `role = 'teacher'`
