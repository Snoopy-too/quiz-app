-- Atomic score increment for session_participants.
-- Prevents read-modify-write races when a student reconnects mid-submit or
-- when the shared-device attribution path runs in parallel with a live submit.
--
-- Run this once in Supabase SQL editor. The JS client tolerates the function
-- being absent by falling back to the old update, so deploying the code before
-- running this is safe.

CREATE OR REPLACE FUNCTION public.increment_participant_score(
  p_participant_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  new_score integer;
BEGIN
  UPDATE public.session_participants
  SET score = COALESCE(score, 0) + p_delta
  WHERE id = p_participant_id
  RETURNING score INTO new_score;

  RETURN new_score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO anon;
