# Question Order Implementation Guide

## Overview

This implementation adds persistent question ordering to quiz sessions, ensuring that both teachers and students see questions in the same order throughout a quiz session.

## Changes Made

### 1. Database Schema Update

A new column `question_order` needs to be added to the `quiz_sessions` table to store the shuffled question order.

### 2. TeacherControl.jsx Updates

- Added `questionOrder` state to track the order of questions
- Modified `loadSession` to:
  - Check if a session already has a `question_order`
  - Use existing order if present, or create a new one (shuffled if randomization is enabled)
- Modified `startQuiz` to persist the `question_order` to the database when starting the quiz

### 3. StudentQuiz.jsx Updates

- Modified `loadSession` to:
  - Check if the session has a `question_order`
  - Reorder questions based on the persisted order if present
  - Ensure consistent question display matching the teacher's view

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add question_order column to quiz_sessions table
ALTER TABLE quiz_sessions 
ADD COLUMN IF NOT EXISTS question_order INTEGER[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quiz_sessions.question_order IS 'Array of question IDs in the order they should be displayed for this session';
```

## How It Works

1. **Quiz Start**: When a teacher starts a quiz:
   - Questions are loaded and ordered by `order_index`
   - If randomization is enabled, questions are shuffled
   - The order (as an array of question IDs) is stored in `question_order`

2. **Teacher Navigation**: The teacher uses the persisted order when:
   - Displaying questions
   - Moving to next/previous questions
   - The `current_question_index` refers to the position in this ordered array

3. **Student View**: Students:
   - Load questions in the default order
   - Reorder them based on the session's `question_order` if present
   - See the exact same question at any given `current_question_index`

## Benefits

- **Consistency**: All participants see questions in the same order
- **Persistence**: Order is maintained even if the page is refreshed
- **Flexibility**: Works with both randomized and non-randomized quizzes
- **Single Source of Truth**: The `quiz_sessions` table holds the authoritative order

## Testing

1. Run the SQL migration in Supabase
2. Create a new quiz with randomization enabled
3. Start a quiz session as a teacher
4. Join as a student in another browser
5. Verify both see the same question when navigating
6. Refresh both pages and verify order is maintained