# SSE & Connection Optimization for 50 Concurrent Users

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the quiz app's realtime communication to handle 50 concurrent students on unreliable WiFi without dropped connections, memory leaks, or database exhaustion.

**Architecture:** The app uses Supabase Realtime (WebSocket) + fallback HTTP polling in a hybrid approach. We'll add debouncing to coalesce rapid-fire events, fix subscription lifecycle bugs, batch N+1 queries, add polling backoff, and strip hot-path logging. All changes are in 3 files: `supabaseClient.js`, `TeacherControl.jsx`, `StudentQuiz.jsx`.

**Tech Stack:** React, Supabase JS SDK, PostgreSQL (via Supabase)

---

### Task 1: Configure Supabase Client for Poor WiFi Resilience

**Files:**
- Modify: `src/supabaseClient.js:14-20`

- [ ] **Step 1: Add realtime config with reconnect backoff**

```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries) => Math.min(1000 * 2 ** tries, 30000),
  },
});
```

- [ ] **Step 2: Verify app still loads**

Run: `npm run dev` and confirm no console errors on the Supabase client.

- [ ] **Step 3: Commit**

```bash
git add src/supabaseClient.js
git commit -m "feat: configure Supabase realtime with reconnect backoff and rate limiting"
```

---

### Task 2: Add Debounce Utility and Fix TeacherControl Subscription Lifecycle

**Files:**
- Modify: `src/components/quizzes/TeacherControl.jsx:48-75, 232-349, 351-371, 373-449`

#### Step Group A: Fix the dependency array and add debouncing

- [ ] **Step 1: Stabilize the main useEffect dependency array**

Change line 75 from:
```javascript
}, [sessionId, session?.status, currentQuestion?.id]);
```
to:
```javascript
}, [sessionId]);
```

This prevents tearing down and recreating WebSocket subscriptions + polling every time the session status or question changes. The refs (`sessionRef`, `currentQuestionRef`) already provide the latest values to the polling callback.

- [ ] **Step 2: Add debounce refs and a debounced loadParticipants wrapper**

After the existing refs (around line 46), add:

```javascript
const loadParticipantsTimerRef = useRef(null);
const loadLiveAnswersTimerRef = useRef(null);
```

Then wrap the realtime event handlers (inside `setupRealtimeSubscriptions`) to debounce calls. Replace the participant channel callback (line 387-393):

```javascript
(payload) => {
  console.log('[TeacherControl] Participant change detected:', payload.eventType);
  clearTimeout(loadParticipantsTimerRef.current);
  loadParticipantsTimerRef.current = setTimeout(() => loadParticipants(), 500);
}
```

Replace the answer channel callback (lines 415-432):

```javascript
(payload) => {
  console.log('[TeacherControl] New answer detected for question:', payload.new.question_id);
  clearTimeout(loadParticipantsTimerRef.current);
  loadParticipantsTimerRef.current = setTimeout(() => loadParticipants(), 500);
  const activeQuestion = currentQuestionRef.current;
  if (activeQuestion && payload.new.question_id === activeQuestion.id) {
    clearTimeout(loadLiveAnswersTimerRef.current);
    loadLiveAnswersTimerRef.current = setTimeout(() => loadLiveAnswers(activeQuestion.id), 300);
  }
}
```

- [ ] **Step 3: Clean up debounce timers on unmount**

In the cleanup return (line 70-73), add:

```javascript
return () => {
  cleanup();
  clearInterval(pollInterval);
  clearTimeout(loadParticipantsTimerRef.current);
  clearTimeout(loadLiveAnswersTimerRef.current);
};
```

#### Step Group B: Batch the N+1 team member queries

- [ ] **Step 4: Replace Promise.all per-team query with single batch query**

Replace lines 272-294 (the `Promise.all` block) with:

```javascript
// Batch-fetch all team members in a single query instead of N+1
const teamEntries = (data || []).filter(p => p.is_team_entry === true && p.team_id);
let teamMembersMap = {};

if (teamEntries.length > 0) {
  const teamIds = [...new Set(teamEntries.map(p => p.team_id))];
  const { data: allMembers } = await supabase
    .from("team_members")
    .select("team_id, student_id, users(name)")
    .in("team_id", teamIds);

  if (allMembers) {
    for (const m of allMembers) {
      if (!teamMembersMap[m.team_id]) teamMembersMap[m.team_id] = [];
      teamMembersMap[m.team_id].push(m);
    }
  }
}

const participantsWithTeams = (data || []).map(p => {
  if (p.is_team_entry === true && p.team_id && teamMembersMap[p.team_id]) {
    return { ...p, teamMembers: teamMembersMap[p.team_id] };
  }
  return p;
});
```

This replaces N queries (one per team) with 1 query using `.in()`.

#### Step Group C: Increase polling interval and add backoff

- [ ] **Step 5: Increase polling interval from 3s to 5s**

Change line 55 from `}, 3000);` to `}, 5000);`.

#### Step Group D: Strip verbose logging from hot paths

- [ ] **Step 6: Remove excessive console.log calls in loadParticipants and loadLiveAnswers**

Remove or reduce the following log lines in `loadParticipants`:
- Line 235: keep (entry point, useful)
- Lines 268-269: remove (logs full data array every call)
- Line 297: keep but simplify to just count
- Lines 302, 305, 314, 317, 347: remove (team processing details)

In `loadLiveAnswers`:
- Line 357: remove
- Line 366: remove

In `setupRealtimeSubscriptions`:
- Lines 417-421: already replaced in Step 2
- Lines 389-391: already replaced in Step 2

- [ ] **Step 7: Commit**

```bash
git add src/components/quizzes/TeacherControl.jsx
git commit -m "fix: debounce realtime handlers, batch team queries, fix subscription lifecycle"
```

---

### Task 3: Fix StudentQuiz Polling Cleanup and Backoff

**Files:**
- Modify: `src/components/students/StudentQuiz.jsx:130-169, 305-338`

- [ ] **Step 1: Fix the recursive polling timer leak**

Replace the polling block (lines 135-168) with a ref-based approach:

```javascript
// Fallback polling — backs off when realtime is delivering updates
const pollTimerRef = useRef(null);
```

Add `pollTimerRef` to the existing refs section (around line 18-21). Then replace the polling + cleanup in the useEffect:

```javascript
const schedulePoll = () => {
  const interval = realtimeAliveRef.current ? 8000 : 3000;
  pollTimerRef.current = setTimeout(async () => {
    try {
      const { data: sessionData, error } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!error && sessionData) {
        setSession(prev => {
          if (!prev || prev.status !== sessionData.status || prev.current_question_index !== sessionData.current_question_index) {
            return sessionData;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('[StudentQuiz] Error polling session:', err);
    }
    schedulePoll();
  }, interval);
};
schedulePoll();

return () => {
  cleanup();
  clearTimeout(pollTimerRef.current);
};
```

Using a ref ensures cleanup always cancels the latest scheduled timer, not just the one captured in the closure.

- [ ] **Step 2: Strip verbose logging from realtime subscription**

In `setupRealtimeSubscriptions` (lines 305-338), reduce logging:
- Line 306: remove
- Line 320: keep (useful state change)
- Lines 326-331: simplify to just log errors

- [ ] **Step 3: Commit**

```bash
git add src/components/students/StudentQuiz.jsx
git commit -m "fix: use ref for poll timer cleanup, increase backoff intervals"
```

---

### Task 4: Manual Smoke Test

- [ ] **Step 1: Start dev server and test teacher flow**

Run: `npm run dev`
1. Create a quiz session as teacher
2. Open 3+ student tabs and join the session
3. Start the quiz, verify answers appear on teacher screen
4. Verify no console errors about leaked subscriptions

- [ ] **Step 2: Test reconnection resilience**

1. Open student tab, join session
2. In browser DevTools > Network, toggle "Offline" mode for 5 seconds
3. Toggle back online
4. Verify student reconnects and receives next question

- [ ] **Step 3: Verify team mode still works**

1. Create a team-mode session
2. Add students to teams
3. Run quiz, verify team scores aggregate correctly
