-- ============================================================================
-- Migration: fix-validate-answer-uuid-array.sql
-- Date:      2026-04-21
-- Purpose:   Hotfix for validate_and_correct_answer() trigger.
--            The original trigger in fix-answer-integrity-and-score-lockdown.sql
--            used jsonb_typeof() / jsonb_array_length() / ->> on
--            v_session.question_order, but question_order is a native uuid[]
--            column (see fix-question-order-column-type.sql), not jsonb.
--            Result: every correct answer submission raised
--              "function jsonb_typeof(uuid[]) does not exist"
--            and students could not submit answers.
--
--            This migration replaces the function with native-array operators
--            (array_length, 1-indexed subscripting with current_question_index+1
--            because Postgres arrays are 1-indexed but current_question_index
--            is 0-indexed from JS).
--
-- Run this in Supabase SQL Editor.
-- ============================================================================

BEGIN;

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

  -- 2. Validate session status (allow showing_results for late arrivals)
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
  --    question_order is uuid[] (native Postgres array, 1-indexed).
  --    current_question_index is 0-indexed (comes from JS), so add 1.
  IF v_session.question_order IS NOT NULL
     AND array_length(v_session.question_order, 1) > v_session.current_question_index
  THEN
    v_expected_question_id := v_session.question_order[v_session.current_question_index + 1];
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
    IF NEW.points_earned < 0 THEN
      NEW.points_earned := 0;
    ELSIF NEW.points_earned > v_question.points * 2 THEN
      NEW.points_earned := v_question.points * 2;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
