-- ============================================================================
-- Migration: fix-answer-integrity-and-score-lockdown.sql
-- Date:      2026-04-21
-- Purpose:   Fix 6 (server-side answer integrity) + Fix 7 (score lockdown)
-- ============================================================================
-- 
-- IMPACT SUMMARY (per Antigravity Guardrail):
--  • Creates 3 new functions (validate_and_correct_answer,
--    guard_participant_score_update, increment_participant_score replacement)
--  • Creates 2 new BEFORE triggers on quiz_answers and session_participants
--  • Replaces the existing increment_participant_score RPC (INVOKER → DEFINER)
--  • Does NOT drop any tables, columns, or indexes
--  • Does NOT delete any existing data
--
-- Run this in Supabase SQL Editor AFTER deploying the JS code changes.
-- The client-side fallback in StudentQuiz.jsx (direct .update({ score }))
-- will start failing for students after this migration — this is intentional.
-- ============================================================================

BEGIN;

-- ============================================
-- FIX 6: SERVER-SIDE ANSWER INTEGRITY TRIGGER
-- ============================================
-- Blocks cheating vectors:
--   • Crafted answer with is_correct: true for a wrong option
--   • Out-of-bounds selected_option_index
--   • Submitting answers when the quiz isn't in question_active status
--   • Submitting answers for a question that isn't currently active

CREATE OR REPLACE FUNCTION public.validate_and_correct_answer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_question RECORD;
  v_option_count INT;
  v_correct BOOLEAN;
  v_expected_question_id UUID;
BEGIN
  -- 1. Look up the session
  SELECT status, current_question_index, quiz_id, question_order
    INTO v_session
    FROM quiz_sessions
   WHERE id = NEW.session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', NEW.session_id;
  END IF;

  -- 2. Validate session is in question_active status
  --    (Allow 'showing_results' too — a student's answer might arrive after
  --     the teacher already clicked "Show Results" but before the DB status
  --     propagated. Blocking this would lose the answer silently.)
  IF v_session.status NOT IN ('question_active', 'showing_results') THEN
    RAISE EXCEPTION 'Cannot submit answer: session status is "%" (expected question_active)', v_session.status;
  END IF;

  -- 3. Look up the question and validate it belongs to this quiz
  SELECT id, options, points, quiz_id
    INTO v_question
    FROM questions
   WHERE id = NEW.question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found: %', NEW.question_id;
  END IF;

  IF v_question.quiz_id != v_session.quiz_id THEN
    RAISE EXCEPTION 'Question does not belong to this quiz';
  END IF;

  -- 4. Validate the question is the currently active one.
  --    Use question_order array if it exists, otherwise fall back to order_index.
  IF v_session.question_order IS NOT NULL
     AND jsonb_typeof(v_session.question_order) = 'array'
     AND jsonb_array_length(v_session.question_order) > v_session.current_question_index
  THEN
    v_expected_question_id := (v_session.question_order ->> v_session.current_question_index)::UUID;
  ELSE
    SELECT q.id INTO v_expected_question_id
      FROM questions q
     WHERE q.quiz_id = v_session.quiz_id
     ORDER BY q.order_index ASC
     LIMIT 1
    OFFSET v_session.current_question_index;
  END IF;

  IF v_expected_question_id IS NOT NULL AND NEW.question_id != v_expected_question_id THEN
    RAISE EXCEPTION 'Cannot submit answer for a question that is not currently active (expected %, got %)',
      v_expected_question_id, NEW.question_id;
  END IF;

  -- 5. Validate selected_option_index is within bounds
  v_option_count := jsonb_array_length(v_question.options);

  IF NEW.selected_option_index IS NULL
     OR NEW.selected_option_index < 0
     OR NEW.selected_option_index >= v_option_count
  THEN
    RAISE EXCEPTION 'selected_option_index % is out of bounds (valid: 0..%)',
      COALESCE(NEW.selected_option_index::TEXT, 'NULL'), v_option_count - 1;
  END IF;

  -- 6. Derive is_correct SERVER-SIDE (ignore whatever the client sent)
  v_correct := COALESCE(
    (v_question.options -> NEW.selected_option_index ->> 'is_correct')::BOOLEAN,
    FALSE
  );
  NEW.is_correct := v_correct;

  -- 7. Enforce points_earned sanity
  IF NOT v_correct THEN
    NEW.points_earned := 0;
  ELSE
    -- Cap at question.points * 2 (points + maximum possible time bonus)
    IF NEW.points_earned < 0 THEN
      NEW.points_earned := 0;
    ELSIF NEW.points_earned > v_question.points * 2 THEN
      NEW.points_earned := v_question.points * 2;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS trg_validate_answer ON public.quiz_answers;

CREATE TRIGGER trg_validate_answer
  BEFORE INSERT ON public.quiz_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_correct_answer();

COMMENT ON FUNCTION public.validate_and_correct_answer() IS
  'Fix 6: Server-side answer integrity. Derives is_correct from the question''s '
  'options array, validates session status, current question, and option bounds.';


-- ============================================
-- FIX 7: LOCK DOWN SCORE MANIPULATION
-- ============================================

-- 7a. Replace increment_participant_score with SECURITY DEFINER + validation.
--     The function now verifies:
--       • Caller is the participant (auth.uid() matches user_id)
--       • Session is in question_active status
--       • Delta is non-negative and within a sane ceiling

CREATE OR REPLACE FUNCTION public.increment_participant_score(
  p_participant_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score integer;
  v_participant RECORD;
  v_session RECORD;
  v_max_points integer;
BEGIN
  -- 1. Look up the participant
  SELECT sp.id, sp.user_id, sp.session_id, sp.score
    INTO v_participant
    FROM session_participants sp
   WHERE sp.id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  -- 2. Verify the caller owns this participant row
  IF v_participant.user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own score';
  END IF;

  -- 3. Verify the session is in question_active status
  SELECT qs.status, qs.quiz_id
    INTO v_session
    FROM quiz_sessions qs
   WHERE qs.id = v_participant.session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Allow during question_active and showing_results (late submits)
  IF v_session.status NOT IN ('question_active', 'showing_results') THEN
    RAISE EXCEPTION 'Cannot update score: session status is "%" (expected question_active)', v_session.status;
  END IF;

  -- 4. Validate delta bounds
  IF p_delta < 0 THEN
    RAISE EXCEPTION 'Score delta cannot be negative';
  END IF;

  -- Get the maximum points for any question in this quiz as a ceiling
  SELECT COALESCE(MAX(q.points), 1000) * 2
    INTO v_max_points
    FROM questions q
   WHERE q.quiz_id = v_session.quiz_id;

  IF p_delta > v_max_points THEN
    RAISE EXCEPTION 'Score delta % exceeds maximum allowed (%)', p_delta, v_max_points;
  END IF;

  -- 5. Set a session flag so the guard trigger allows this update
  PERFORM set_config('app.score_update_via_rpc', 'true', true);

  -- 6. Atomically increment
  UPDATE session_participants
     SET score = COALESCE(score, 0) + p_delta
   WHERE id = p_participant_id
  RETURNING score INTO new_score;

  RETURN new_score;
END;
$$;

COMMENT ON FUNCTION public.increment_participant_score(uuid, integer) IS
  'Fix 7: SECURITY DEFINER score increment with validation. Checks caller '
  'ownership, session status, and delta bounds before allowing the update.';

-- Ensure execution permissions
GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO anon;


-- 7b. Guard trigger: block direct score manipulation by students.
--     Only allows score changes from:
--       • The validated increment_participant_score RPC (via session flag)
--       • Teachers (for shared-device score attribution in endQuiz)
--       • Service role / postgres (migrations, admin operations)

CREATE OR REPLACE FUNCTION public.guard_participant_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if score hasn't actually changed
  IF COALESCE(NEW.score, 0) = COALESCE(OLD.score, 0) THEN
    RETURN NEW;
  END IF;

  -- Allow if called from the validated RPC (session variable was set)
  IF current_setting('app.score_update_via_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow if no auth context (direct postgres / migration / service_role)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow if the caller is a teacher (needed for shared-device score attribution)
  IF EXISTS (
    SELECT 1 FROM users
     WHERE id = auth.uid()
       AND role = 'teacher'
  ) THEN
    RETURN NEW;
  END IF;

  -- Block: student is trying to directly modify score outside the RPC
  RAISE EXCEPTION 'Direct score modification is not allowed. Scores are updated automatically when you submit answers.';
END;
$$;

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS trg_guard_score_update ON public.session_participants;

CREATE TRIGGER trg_guard_score_update
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_participant_score_update();

COMMENT ON FUNCTION public.guard_participant_score_update() IS
  'Fix 7: Blocks students from directly UPDATEing their score on '
  'session_participants. Only the validated RPC and teachers are allowed.';

COMMIT;
