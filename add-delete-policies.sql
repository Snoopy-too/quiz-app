-- Migration: Add DELETE policies for session_participants and quiz_answers
-- This allows teachers to delete quiz results for students in their sessions

-- Drop existing delete policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Teachers can delete session participants" ON session_participants;
DROP POLICY IF EXISTS "Teachers can delete quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Hosts can delete participants in their sessions" ON session_participants;
DROP POLICY IF EXISTS "Hosts can delete answers in their sessions" ON quiz_answers;

-- Allow teachers (hosts) to delete participants in their quiz sessions
CREATE POLICY "Hosts can delete participants in their sessions"
  ON session_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = session_participants.session_id
      AND quiz_sessions.host_id = auth.uid()
    )
  );

-- Allow teachers (hosts) to delete quiz answers in their sessions
CREATE POLICY "Hosts can delete answers in their sessions"
  ON quiz_answers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = quiz_answers.session_id
      AND quiz_sessions.host_id = auth.uid()
    )
  );

-- Also allow students to delete their own participation/answers if needed
DROP POLICY IF EXISTS "Users can delete their own participation" ON session_participants;
DROP POLICY IF EXISTS "Users can delete their own answers" ON quiz_answers;

CREATE POLICY "Users can delete their own participation"
  ON session_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own answers"
  ON quiz_answers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.id = quiz_answers.participant_id
      AND session_participants.user_id = auth.uid()
    )
  );
