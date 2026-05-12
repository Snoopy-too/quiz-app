-- ============================================================================
-- Migration: fix-incorrect-student-scores.sql
-- Date:      2026-05-12
-- Purpose:   Correct scores for students affected by the resume-scoring bug
--            where pointsEarned was not loaded from the DB on quiz resume.
--
-- IMPACT SUMMARY (per Antigravity Guardrail):
--  • Updates the `score` column on quiz_assignments for affected rows ONLY
--  • Recalculates from the authoritative assignment_answers.points_earned data
--  • Does NOT delete, drop, or structurally modify anything
--  • Targets exactly 2 students by student_id number (26208 and 26120)
--  • DRY RUN query included — run Step 1 first to verify before applying
-- ============================================================================

-- =====================
-- STEP 1: DRY RUN — Verify affected rows before updating
-- Run this first to confirm which assignments will be corrected.
-- =====================

SELECT
  qa.id AS assignment_id,
  u.name AS student_name,
  u.student_id AS student_id_no,
  qa.score AS current_score,
  qa.correct_answers,
  qa.total_questions,
  recalc.correct_score AS recalculated_score
FROM quiz_assignments qa
JOIN users u ON u.id = qa.student_id
JOIN LATERAL (
  SELECT COALESCE(SUM(aa.points_earned), 0) AS correct_score
  FROM assignment_answers aa
  WHERE aa.assignment_id = qa.id
) recalc ON TRUE
WHERE u.student_id IN ('26208', '26120')
  AND qa.status = 'completed'
  AND qa.score != recalc.correct_score;


-- =====================
-- STEP 2: APPLY FIX — Recalculate scores from assignment_answers
-- Only run after verifying Step 1 output looks correct.
-- =====================

UPDATE quiz_assignments qa
SET score = recalc.correct_score
FROM (
  SELECT
    qa2.id AS assignment_id,
    COALESCE(SUM(aa.points_earned), 0) AS correct_score
  FROM quiz_assignments qa2
  JOIN users u ON u.id = qa2.student_id
  LEFT JOIN assignment_answers aa ON aa.assignment_id = qa2.id
  WHERE u.student_id IN ('26208', '26120')
    AND qa2.status = 'completed'
  GROUP BY qa2.id
) recalc
WHERE qa.id = recalc.assignment_id
  AND qa.score != recalc.correct_score;
