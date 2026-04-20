# Handoff — Live quiz crash (stale-closure bug) + student attack surface

**Date opened:** 2026-04-20
**Trigger:** During a live classroom quiz with 37 students, after Q2's answers were in, clicking "Next Question" re-loaded Q2 instead of advancing to Q3. Repeated clicks kept re-loading Q2. Had to abandon the quiz.

## Root cause (high confidence)

**Stale closure in the auto-advance timer inside `useTeacherSession.js`.**

### The mechanism

1. `showQuestion(questionIndex)` (`src/hooks/useTeacherSession.js:575-665`) registers `autoAdvanceTimerRef.current = setTimeout(() => showQuestionResults(questionIndex), (time_limit + 4) * 1000)` via `startActualTimer` at line 617-626.
2. The `showQuestionResults` captured inside that `setTimeout` is the one from the render where `showQuestion` was invoked — i.e., the render from `nextQuestion`'s click (where `session.current_question_index` is still the PREVIOUS question's index, e.g., 0 when we're transitioning into Q2).
3. `showQuestionResults` (`useTeacherSession.js:681-706`) does `setSession({ ...session, status: "showing_results" })` — spreading the CLOSURE's `session`. That closure's `session.current_question_index` is stale (0).
4. If `allStudentsAnswered` never becomes true (easy with 37 students — one slow/disconnected/late-joining student is enough), the early-cancel branch in the effect at `useTeacherSession.js:142-162` never runs, the stale 34s timer is never cleared, and when it fires it rewrites local state back to `{ current_question_index: 0, status: "showing_results" }`.
5. The DB is correctly at `cqi: 1` but the teacher's local state is now `cqi: 0`. Teacher clicks Next → `nextQuestion` (line 708-711) computes `session.current_question_index + 1 = 1` → `showQuestion(1)` → **reloads Q2**. Every subsequent click re-enters the same loop because the newly-registered timer is set from another render where `cqi` was 0 at call-time.

### Why it can't self-heal

`useTeacherSession` has **no polling or realtime subscription on `quiz_sessions`** (students have both — see `StudentQuiz.jsx:157-193` polling and `StudentQuiz.jsx:329-354` realtime). Nothing forces local teacher state back in sync with DB. The teacher is stuck until page reload.

### Secondary contributor

Several `setSession({ ...session, ... })` calls in the hook use the closure's `session` object rather than the functional updater — any callback that fires from an older render can clobber fields set by a newer render.

Locations using the fragile pattern:
- `useTeacherSession.js:485` (`selectMode`)
- `useTeacherSession.js:550` (`startQuiz`)
- `useTeacherSession.js:634-638` (`showQuestion`, team branch)
- `useTeacherSession.js:651-655` (`showQuestion`, classic branch)
- `useTeacherSession.js:702` (`showQuestionResults`)
- `useTeacherSession.js:799` (`endQuiz`)

## Student-side attack surface (ranked by impact)

### Directly triggers the teacher-stuck bug
- **Not answering / disconnecting during `question_active`** → `allStudentsAnswered` stays false → stale 34s timer fires → state reverts. Most likely cause of today's incident.
- **Joining late during `question_active` / `showing_results`.** `JoinClassicQuiz.jsx:74-78` only blocks `completed`. A late join raises `participants.length`, which can flip `allAnswered` back to false mid-question.
- **Submitting a late answer for a previous question** (student's client lagged behind teacher). The insert fires realtime events that can race with the all-answered effect.

### Data integrity / fairness (not a crash, but cheating)
- **Crafted answer with `is_correct: true` for a wrong option.** RLS on `quiz_answers` (`database-schema.sql:142-153`) doesn't verify correctness server-side.
- **Direct call to `increment_participant_score` RPC** — it's `SECURITY INVOKER`, so a student can score themselves any amount (`add-increment-score-rpc.sql:15`).
- **Direct UPDATE on own `session_participants.score`** — RLS allows `user_id = auth.uid()` update with no column-scoped restriction (`database-schema.sql:136-140`).

### Already defended (verify these assumptions still hold)
- Double-submit of same question: `UNIQUE(session_id, participant_id, question_id)` in DB (`database-schema.sql:45`) + `submittingRef` + `hasAnswered` client guards.
- Double-join (two tabs): `UNIQUE(session_id, user_id)` (`database-schema.sql:30`) + 23505 handler in `JoinClassicQuiz.jsx:200-207`.
- Spam-tapping answers: `submittingRef` in `StudentQuiz.jsx:397-400`.
- Render errors: `ErrorBoundary` wraps quiz routes (commit 604dc32).

## Fix plan (ordered by bang-for-buck)

### 1. Fix the stale closure (CRITICAL — stops today's specific crash)

**File:** `src/hooks/useTeacherSession.js`

Change every `setSession({ ...session, ... })` to the functional form:
```js
setSession(prev => ({ ...prev, status: "showing_results" }));
```

Specific lines: 485, 550, 634-638, 651-655, 702, 799.

In `showQuestionResults` (line 681-706), replace reliance on the closure's `session`:
```js
const showQuestionResults = async (questionIndex) => {
  try {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    // Only update if this call corresponds to the session's current question
    // (protects against stale timers firing after teacher already advanced).
    if (currentSession.current_question_index !== questionIndex) {
      console.warn('[TeacherControl] Stale showQuestionResults ignored', {
        timerIndex: questionIndex,
        sessionIndex: currentSession.current_question_index,
      });
      return;
    }
    // ...existing body, using currentSession instead of session, and
    // setSession(prev => ({ ...prev, status: "showing_results" }))
  }
};
```

This makes stale timers a harmless no-op instead of a state-reverting bug.

### 2. Teacher-side session polling + realtime (defense in depth)

**File:** `src/hooks/useTeacherSession.js` (around `setupRealtimeSubscriptions`, line 374-431 and the poll interval at line 68-80)

Add:
- Subscribe to `quiz_sessions` UPDATE events filtered by `id=eq.${sessionId}` (mirror `StudentQuiz.jsx:329-349`). On payload, `setSession(prev => ({ ...prev, ...payload.new }))`.
- In the existing 5s poll (`useTeacherSession.js:68-80`), also re-fetch `quiz_sessions` and heal local state if DB's `current_question_index` / `status` differs.

This ensures that even if some other bug corrupts local state, the teacher re-syncs within a few seconds.

### 3. Guard `nextQuestion` against re-entry

**File:** `src/hooks/useTeacherSession.js:708-711`

Two options — do both for belt-and-braces:

a. Before computing the next index, re-read `current_question_index` from DB:
```js
const nextQuestion = async () => {
  const { data } = await supabase
    .from('quiz_sessions')
    .select('current_question_index, status')
    .eq('id', sessionId)
    .single();
  const cqi = data?.current_question_index ?? session.current_question_index;
  showQuestion(cqi + 1);
};
```

b. Have `showQuestion(questionIndex)` bail out if `questionIndex <= sessionRef.current?.current_question_index` while status is already `question_active` (don't re-enter the same question). Emit a warning.

### 4. Lock late joiners once the quiz has started

**File:** `src/components/students/JoinClassicQuiz.jsx:74-78`

Extend the gate:
```js
if (session.status === "completed" || session.status === "cancelled") { ... }
if (session.status !== "waiting") {
  setError(t('errors.quizAlreadyStarted'));
  setLoading(false);
  return;
}
```

Add the `quizAlreadyStarted` key to all locale files (`src/locales/*.json`).

Decision needed from user: should we allow a small grace window (e.g., during Q1 only) for students who were slow to tap Join? Leaning toward "no grace" because the bug risk outweighs the convenience.

### 5. Re-evaluate timers when participants change mid-question

**File:** `src/hooks/useTeacherSession.js:142-162`

The effect only acts on the `allAnswered` → true transition. Add a symmetrical branch:
- If `allAnswered` becomes false while a 2s early-advance timer is pending, cancel the 2s timer and restore a fresh time_limit-based auto-advance.
- Alternatively, cap: if `participants.length` grew within the last X seconds, ignore late joiners for the purposes of "all answered" calculation.

Simpler variant: just don't count participants whose `joined_at` is after the question started. Requires reading `joined_at` on session_participants.

### 6. Server-side answer integrity (follow-up, not urgent for crash fix)

Add a DB trigger or wrap inserts in an RPC that:
- Derives `is_correct` from the `questions.options[selected_option_index].is_correct` (ignore client-submitted value).
- Validates `session.status === 'question_active'` and `session.current_question_index` matches the question.
- Validates `selected_option_index` is within `0..options.length - 1`.

Blocks the crafted-answer cheating vector.

### 7. Lock down score manipulation

- Revoke student UPDATE on `session_participants.score` via column-level RLS (Postgres 15+ supports it, or use a trigger to raise on score change).
- Change `increment_participant_score` RPC to `SECURITY DEFINER`, and add checks:
  - Caller is the `user_id` on the participant row.
  - Quiz session is in `question_active` status.
  - Points delta is within `0..(question.points * 2)` (sanity ceiling).

File: `add-increment-score-rpc.sql` → new migration.

### 8. "Out of sync" recovery UI

**File:** `src/components/quizzes/TeacherControl.jsx` (inside the alert modal shown on error)

Add a "Reload session" button that clears local state and re-calls `loadSession`. Reduces the risk of full page reloads losing the teacher's place.

## Testing plan

After each fix, verify:

- [ ] **Simulated slow student:** Open 2 student tabs, let one answer each question and the other never answer. Confirm quiz completes without stuck-on-Q2 behavior.
- [ ] **Late join:** Teacher starts quiz. Once Q1 is active, student 2 tries to join by PIN. Confirm they get "quiz already started" error.
- [ ] **Participant increase mid-question:** Manually insert a session_participants row while Q2 is active. Confirm teacher's all-answered math still reaches "all answered" after the manual row's user answers (or add grace logic).
- [ ] **Stale timer simulation:** Put a `console.log` inside the auto-advance callback. Trigger the "never-all-answered" path (one student offline). Confirm the callback either no-ops or updates with correct index, not a stale one.
- [ ] **Session polling heal:** With DevTools, manually set `session.current_question_index` to the wrong value in React state (via a debug hook). Confirm the 5s poll restores it.
- [ ] **Answer correctness server-side:** With a raw supabase call, attempt to insert `{ is_correct: true, selected_option_index: <wrong option> }`. Confirm it's rejected or overwritten.

## Files that will be touched

- `src/hooks/useTeacherSession.js` — fixes 1, 2, 3b, 5
- `src/components/students/JoinClassicQuiz.jsx` — fix 4
- `src/locales/*.json` — fix 4 i18n key
- `src/components/quizzes/TeacherControl.jsx` — fix 8
- New SQL migration — fixes 6, 7

## Open questions for when we pick this up

1. Late-join grace window: none, Q1 only, or first N seconds? Current lean: **none**.
2. Team mode has its own 5s thinking-time timer (`useTeacherSession.js:644-647`) — same stale-closure pattern? Quick audit needed.
3. The 500ms / 300ms debounce in realtime handlers (`useTeacherSession.js:389-390, 413-417`) — do we need to clear these on unmount? Currently they clear on the outer cleanup (line 85-86), looks OK.
4. Should the teacher also get a visible "X of Y answered" count that shows _which_ specific students haven't answered, so they can proactively advance past disconnected students?
