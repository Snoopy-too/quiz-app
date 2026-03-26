# TeacherControl.jsx Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break down the 1722-line `TeacherControl.jsx` into a custom hook for all logic + 6 focused screen sub-components + shared UI helpers, keeping behavior identical.

**Architecture:** Extract all state, effects, data fetching, realtime subscriptions, and quiz control functions into `useTeacherSession` hook. Each render branch (mode selection, waiting lobby, countdown, active question, results, completed) becomes its own component. Shared UI patterns (background wrapper, media display, leaderboard, answer grid) become reusable components.

**Tech Stack:** React 18, Supabase JS, Vitest + @testing-library/react, i18next, Tailwind CSS, Lucide icons

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/hooks/useTeacherSession.js` | All state, effects, data fetching, realtime, quiz control logic |
| `src/components/quizzes/teacherControl/BackgroundWrapper.jsx` | Themed background + overlay + AlertModal/ConfirmModal |
| `src/components/quizzes/teacherControl/MediaDisplay.jsx` | Render image/video/gif for a question |
| `src/components/quizzes/teacherControl/AnswerOptionsGrid.jsx` | 4-color answer card grid (Heart/Spade/Diamond/Club) |
| `src/components/quizzes/teacherControl/Leaderboard.jsx` | Team + individual leaderboard display |
| `src/components/quizzes/teacherControl/ModeSelection.jsx` | Mode selection screen (classic/team/assign) |
| `src/components/quizzes/teacherControl/WaitingLobby.jsx` | Waiting for students screen |
| `src/components/quizzes/teacherControl/CountdownScreen.jsx` | "Starting in 5..." countdown |
| `src/components/quizzes/teacherControl/ActiveQuestion.jsx` | Live question screen with timer + answer tracking |
| `src/components/quizzes/teacherControl/QuestionResults.jsx` | Per-question results with answer counts + leaderboard |
| `src/components/quizzes/teacherControl/QuizCompleted.jsx` | Final results with podium + rankings |
| `src/test/useTeacherSession.test.js` | Tests for the extracted hook's pure logic |

### Files to modify:
| File | Change |
|------|--------|
| `src/components/quizzes/TeacherControl.jsx` | Slim down to ~60-line router that imports hook + sub-components |

---

## Task 1: Create `useTeacherSession` hook (logic extraction)

**Files:**
- Create: `src/hooks/useTeacherSession.js`
- Test: `src/test/useTeacherSession.test.js`

This is the highest-value change. Move ALL logic out of TeacherControl.jsx into a custom hook.

- [ ] **Step 1: Create `src/hooks/useTeacherSession.js`**

Extract from `TeacherControl.jsx` lines 12-802 into a custom hook. The hook receives `sessionId` and returns all state + actions.

```js
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function useTeacherSession(sessionId) {
  const { t } = useTranslation();

  // --- All useState declarations (lines 13-43) ---
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [theme, setTheme] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionOrder, setQuestionOrder] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState([]);
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [selectedMode, setSelectedMode] = useState("classic");
  const [isThinkingTime, setIsThinkingTime] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
  const [allStudentsAnswered, setAllStudentsAnswered] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [answerRevealCountdown, setAnswerRevealCountdown] = useState(4);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allowSharedDevice, setAllowSharedDevice] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [endingQuiz, setEndingQuiz] = useState(false);

  // --- All refs (lines 46-51) ---
  const currentQuestionRef = useRef(null);
  const sessionRef = useRef(null);
  const loadParticipantsTimerRef = useRef(null);
  const loadLiveAnswersTimerRef = useRef(null);

  // --- All useEffect hooks (lines 53-152) --- copy verbatim

  // --- All functions (lines 154-802) --- copy verbatim:
  // loadSession, loadParticipants, loadLiveAnswers,
  // setupRealtimeSubscriptions, selectMode, startQuiz,
  // shuffleArray, showQuestion, handleShowResults,
  // proceedToResults, showQuestionResults, nextQuestion,
  // endQuiz, closeSession

  // --- Background config (lines 804-846) ---
  const backgroundConfig = useMemo(getBackgroundConfig, [theme, quiz]);

  // Return everything sub-components need
  return {
    // Session state
    session, quiz, questions, shuffledQuestions, participants, teams,
    theme, currentQuestion, questionOrder, showResults, questionResults,
    liveAnswers, loading, error, showModeSelection, selectedMode,
    isThinkingTime, countdownValue, questionTimeRemaining,
    allStudentsAnswered, showAnswers, answerRevealCountdown,
    alertModal, confirmModal, showAssignModal,
    allowSharedDevice, randomizeQuestions, randomizeAnswers,
    startingQuiz, endingQuiz, backgroundConfig,

    // Setters needed by UI
    setAlertModal, setConfirmModal, setShowAssignModal,
    setAllowSharedDevice, setRandomizeQuestions, setRandomizeAnswers,

    // Actions
    selectMode, startQuiz, showQuestion, handleShowResults,
    nextQuestion, endQuiz, closeSession, loadParticipants,
  };
}
```

**Key detail:** Copy ALL function bodies and effects exactly as-is from TeacherControl.jsx. The only changes are:
- Import path for supabaseClient changes from `../../supabaseClient` to `../supabaseClient`
- The hook receives `sessionId` as a parameter instead of destructuring from props
- `setView` is NOT in the hook — it stays in the component (it's a prop)

- [ ] **Step 2: Write a basic smoke test**

Create `src/test/useTeacherSession.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';

// Mock supabase before importing the hook
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
  },
}));

describe('useTeacherSession', () => {
  it('module exports a function', async () => {
    const mod = await import('../hooks/useTeacherSession');
    expect(typeof mod.default).toBe('function');
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/test/useTeacherSession.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTeacherSession.js src/test/useTeacherSession.test.js
git commit -m "refactor: extract useTeacherSession hook from TeacherControl"
```

---

## Task 2: Create shared UI helper components

**Files:**
- Create: `src/components/quizzes/teacherControl/BackgroundWrapper.jsx`
- Create: `src/components/quizzes/teacherControl/MediaDisplay.jsx`
- Create: `src/components/quizzes/teacherControl/AnswerOptionsGrid.jsx`
- Create: `src/components/quizzes/teacherControl/Leaderboard.jsx`

These are small, presentational components extracted from repeated UI patterns.

- [ ] **Step 1: Create `BackgroundWrapper.jsx`**

Extracted from `renderWithBackground` (lines 848-882 of original). Receives `backgroundConfig`, `alertModal`, `confirmModal`, `setAlertModal`, `setConfirmModal`, and `children`.

```jsx
import React from "react";
import AlertModal from "../../common/AlertModal";
import ConfirmModal from "../../common/ConfirmModal";

export default function BackgroundWrapper({
  backgroundConfig,
  alertModal,
  confirmModal,
  setAlertModal,
  setConfirmModal,
  overlayStrength = 0.45,
  children,
}) {
  const useOverlay = backgroundConfig.overlay;

  return (
    <>
      <div className="min-h-screen relative" style={backgroundConfig.style}>
        {useOverlay && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0, 0, 0, ${overlayStrength})` }}
          />
        )}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmStyle="danger"
      />
    </>
  );
}
```

- [ ] **Step 2: Create `MediaDisplay.jsx`**

Extracted from lines 1294-1315 (repeated at 1449-1470). Renders image/video/gif for a question.

```jsx
import React from "react";
import AutoPlayVideo from "../../common/AutoPlayVideo";

export default function MediaDisplay({ question, className = "max-w-md mx-auto rounded-lg shadow-lg mb-4" }) {
  return (
    <>
      {question.image_url && (
        <img src={question.image_url} alt="Question" className={className} />
      )}
      {question.video_url && (
        <AutoPlayVideo
          src={question.video_url}
          className={className}
          reloadKey={question.id}
        />
      )}
      {question.gif_url && (
        <img src={question.gif_url} alt="GIF" className={className} />
      )}
    </>
  );
}
```

- [ ] **Step 3: Create `AnswerOptionsGrid.jsx`**

Extracted from the answer card grid (lines 1364-1385). Used by ActiveQuestion and QuestionResults.

```jsx
import React from "react";
import { Heart, Spade, Diamond, Club } from "lucide-react";

const ANSWER_STYLES = [
  { bg: "bg-red-500", icon: Heart },
  { bg: "bg-blue-600", icon: Spade },
  { bg: "bg-orange-500", icon: Diamond },
  { bg: "bg-green-500", icon: Club },
];

export default function AnswerOptionsGrid({ options, mode = "display", answerCounts }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {options?.map((opt, idx) => {
        const style = ANSWER_STYLES[idx];
        const IconComponent = style.icon;

        if (mode === "results") {
          const isCorrect = opt.is_correct;
          return (
            <div
              key={idx}
              className={`${style.bg} ${isCorrect ? "ring-4 ring-white" : "opacity-60"} text-white p-6 rounded-lg relative`}
            >
              <IconComponent size={24} className="absolute left-4 top-4" fill="white" />
              <div className="text-xl font-bold mb-2 mt-8">{opt.text}</div>
              <div className="text-lg">
                {answerCounts?.[idx] || 0} answer{answerCounts?.[idx] !== 1 ? "s" : ""}
              </div>
              {isCorrect && (
                <div className="absolute top-2 right-2 bg-white text-green-600 rounded-full p-2 font-bold">
                  ✓
                </div>
              )}
            </div>
          );
        }

        // Display mode (active question)
        return (
          <div
            key={idx}
            className={`${style.bg} text-white p-8 rounded-lg text-center text-2xl font-bold flex flex-col md:flex-row items-center justify-center gap-3 relative`}
          >
            <IconComponent size={28} className="shrink-0" fill="white" />
            <span className="text-center">{opt.text}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `Leaderboard.jsx`**

Extracted from the leaderboard sections (lines 1527-1588, reused in completed screen).

```jsx
import React from "react";

export default function Leaderboard({ participants, teams, mode, limit }) {
  const displayParticipants = limit ? participants.slice(0, limit) : participants;

  return (
    <div>
      {mode === "team" && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4 text-center">Team Leaderboard</h3>
          <div className="space-y-2">
            {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
              <div
                key={team.name}
                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-blue-200">
                    {team.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-lg font-semibold text-gray-800">{team.name}</span>
                </div>
                <span className="text-xl font-bold text-blue-700">{team.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-2xl font-bold mb-4 text-center">
        {mode === "team" ? "Individual Leaderboard" : "Leaderboard"}
      </h3>
      <div className="space-y-2">
        {displayParticipants.map((p, idx) => (
          <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
              {p.users?.avatar_url && (
                <img
                  src={p.users.avatar_url}
                  alt={p.users?.name || "Avatar"}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <span className="text-lg font-semibold">{p.users?.name || "Anonymous"}</span>
            </div>
            <span className="text-xl font-bold text-blue-700">{p.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the app still builds**

Run: `npx vite build`
Expected: Build succeeds (new files aren't imported yet, but should have no syntax errors)

- [ ] **Step 6: Commit**

```bash
git add src/components/quizzes/teacherControl/
git commit -m "refactor: add shared UI helpers for TeacherControl decomposition"
```

---

## Task 3: Create screen sub-components

**Files:**
- Create: `src/components/quizzes/teacherControl/ModeSelection.jsx`
- Create: `src/components/quizzes/teacherControl/WaitingLobby.jsx`
- Create: `src/components/quizzes/teacherControl/CountdownScreen.jsx`
- Create: `src/components/quizzes/teacherControl/ActiveQuestion.jsx`
- Create: `src/components/quizzes/teacherControl/QuestionResults.jsx`
- Create: `src/components/quizzes/teacherControl/QuizCompleted.jsx`

Each screen receives the hook's return value as props (spread or as a `session` object) plus `setView` from the parent.

- [ ] **Step 1: Create `ModeSelection.jsx`**

Extracted from lines 908-1062. Receives hook state + `setView` + `closeSession`.

The component renders the mode selection cards (Classic, Team, Assign Quiz), randomization options, and the AssignQuizModal. Props needed: `quiz`, `session`, `selectMode`, `closeSession`, `allowSharedDevice`, `setAllowSharedDevice`, `randomizeQuestions`, `setRandomizeQuestions`, `randomizeAnswers`, `setRandomizeAnswers`, `showAssignModal`, `setShowAssignModal`, `alertModal`, `setAlertModal`.

**Required imports:**
```jsx
import { useTranslation } from "react-i18next";
import { X, Shuffle } from "lucide-react";
import AssignQuizModal from "../../teachers/AssignQuizModal";
```

Each sub-component that uses `t()` must call `const { t } = useTranslation();` at the top of the function body.

Copy the JSX from lines 908-1062 into this component's return statement.

- [ ] **Step 2: Create `WaitingLobby.jsx`**

Extracted from lines 1064-1206. Shows the PIN, participant/team list, and Start Quiz button.

Props needed: `quiz`, `session`, `participants`, `teams`, `startQuiz`, `closeSession`, `loadParticipants`, `startingQuiz`.

Copy the JSX from lines 1064-1206. Import `Users`, `Play`, `RefreshCw`, `X` from lucide-react.

- [ ] **Step 3: Create `CountdownScreen.jsx`**

Extracted from lines 1208-1240. The simplest screen — just shows the countdown number.

Props needed: `quiz`, `countdownValue`, `closeSession`.

```jsx
import React from "react";
import { X } from "lucide-react";

export default function CountdownScreen({ quiz, countdownValue, closeSession }) {
  return (
    <>
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">{quiz.title}</h1>
        <button onClick={closeSession} className="text-red-600 hover:text-red-700">
          <X size={24} />
        </button>
      </nav>
      <div className="flex-1">
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
            <h2 className="text-4xl font-bold text-gray-800 mb-8">{quiz.title}</h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">Starting in...</p>
              <div className="text-8xl font-bold text-blue-700 animate-pulse">
                {countdownValue}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Get ready! The first question will appear shortly.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Create `ActiveQuestion.jsx`**

Extracted from lines 1242-1415. Uses `MediaDisplay` and `AnswerOptionsGrid` helpers.

Props needed: `quiz`, `session`, `currentQuestion`, `questions`, `participants`, `liveAnswers`, `isThinkingTime`, `questionTimeRemaining`, `allStudentsAnswered`, `showAnswers`, `answerRevealCountdown`, `closeSession`.

**Required imports:**
```jsx
import { useTranslation } from "react-i18next";
import { Clock, BrainCircuit, Users, X } from "lucide-react";
import MediaDisplay from "./MediaDisplay";
import AnswerOptionsGrid from "./AnswerOptionsGrid";
```

**Important:** The `!showAnswers` branch (original lines 1318-1361) contains an SVG circular countdown animation with `@keyframes circleProgress`. This stays **inline in ActiveQuestion** — it is NOT part of `AnswerOptionsGrid`. Only the `showAnswers` branch (original lines 1363-1385) delegates to `<AnswerOptionsGrid>`. The conditional structure is:
```jsx
{!showAnswers ? (
  /* SVG countdown animation — keep inline here */
) : (
  <AnswerOptionsGrid options={currentQuestion.options} mode="display" />
)}
```

- [ ] **Step 5: Create `QuestionResults.jsx`**

Extracted from lines 1417-1593. Uses `MediaDisplay`, `AnswerOptionsGrid` (results mode), and `Leaderboard`.

Props needed: `quiz`, `session`, `currentQuestion`, `questions`, `questionResults`, `participants`, `teams`, `nextQuestion`, `endQuiz`, `endingQuiz`, `closeSession`.

**Required imports:**
```jsx
import { SkipForward, Trophy, X } from "lucide-react";
import MediaDisplay from "./MediaDisplay";
import AnswerOptionsGrid from "./AnswerOptionsGrid";
import Leaderboard from "./Leaderboard";
```

Compute `answerCounts` locally in this component (lines 1420-1428), then pass to `AnswerOptionsGrid` with `mode="results"`.

**Note:** Pass `className="max-w-md mx-auto rounded-lg shadow-lg mb-6"` to `<MediaDisplay>` — the results screen uses `mb-6` (not the default `mb-4`). Pass `limit={5}` to `<Leaderboard>`.

- [ ] **Step 6: Create `QuizCompleted.jsx`**

Extracted from lines 1595-1718. Shows podium animation + final rankings.

Props needed: `quiz`, `session`, `participants`, `teams`, `setView`.

**Required imports:**
```jsx
import { Trophy } from "lucide-react";
import PodiumAnimation from "../../animations/PodiumAnimation";
```

The final rankings section uses ranking JSX directly (different styling than `Leaderboard` — medal emojis, colored borders — don't force reuse here).

- [ ] **Step 7: Commit**

```bash
git add src/components/quizzes/teacherControl/
git commit -m "refactor: add screen sub-components for TeacherControl"
```

---

## Task 4: Rewire TeacherControl.jsx as a thin router

**Files:**
- Modify: `src/components/quizzes/TeacherControl.jsx`

- [ ] **Step 1: Rewrite TeacherControl.jsx**

Replace the entire file with a thin router that imports the hook and delegates to sub-components:

```jsx
import React from "react";
import useTeacherSession from "../../hooks/useTeacherSession";
import BackgroundWrapper from "./teacherControl/BackgroundWrapper";
import ModeSelection from "./teacherControl/ModeSelection";
import WaitingLobby from "./teacherControl/WaitingLobby";
import CountdownScreen from "./teacherControl/CountdownScreen";
import ActiveQuestion from "./teacherControl/ActiveQuestion";
import QuestionResults from "./teacherControl/QuestionResults";
import QuizCompleted from "./teacherControl/QuizCompleted";

export default function TeacherControl({ sessionId, setView }) {
  const tc = useTeacherSession(sessionId);

  if (tc.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading session...</p>
      </div>
    );
  }

  if (tc.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error: {tc.error}</p>
          <button
            onClick={() => setView("manage-quizzes")}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const closeSession = (skipConfirm) => {
    if (skipConfirm) {
      tc.endQuiz("cancelled").then(() => setView("manage-quizzes"));
      return;
    }
    tc.closeSession(() => setView("manage-quizzes"));
  };

  const screenProps = { ...tc, setView, closeSession };

  const renderScreen = () => {
    if (tc.session.status === "waiting" && tc.showModeSelection) {
      return <ModeSelection {...screenProps} />;
    }
    if (tc.session.status === "waiting") {
      return <WaitingLobby {...screenProps} />;
    }
    if (tc.session.status === "active" && !tc.currentQuestion) {
      return <CountdownScreen {...screenProps} />;
    }
    if (tc.session.status === "question_active" && tc.currentQuestion) {
      return <ActiveQuestion {...screenProps} />;
    }
    if (tc.session.status === "showing_results" && tc.currentQuestion) {
      return <QuestionResults {...screenProps} />;
    }
    if (tc.session.status === "completed") {
      return <QuizCompleted {...screenProps} />;
    }
    return null;
  };

  return (
    <BackgroundWrapper
      backgroundConfig={tc.backgroundConfig}
      alertModal={tc.alertModal}
      confirmModal={tc.confirmModal}
      setAlertModal={tc.setAlertModal}
      setConfirmModal={tc.setConfirmModal}
    >
      {renderScreen()}
    </BackgroundWrapper>
  );
}
```

**Important:** The `closeSession` function here wraps the hook's version to add the `setView` navigation, since `setView` is a prop that doesn't belong in the hook.

- [ ] **Step 2: Adjust hook's `closeSession` to accept a callback**

In `useTeacherSession.js`, modify `closeSession` to accept a navigation callback instead of calling `setView` directly:

```js
const closeSession = (onComplete) => {
  setConfirmModal({
    isOpen: true,
    title: "End Session",
    message: "Are you sure you want to end this session? This will cancel the quiz for all students.",
    onConfirm: async () => {
      setConfirmModal({ ...confirmModal, isOpen: false });
      await endQuiz("cancelled");
      if (onComplete) onComplete();
    }
  });
};
```

- [ ] **Step 3: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Manual smoke test**

Start the dev server with `npx vite` and verify:
1. Teacher can create a session and see mode selection
2. Classic mode → waiting lobby → start quiz flow works
3. Questions display correctly with timer
4. Results show after each question
5. Final results screen with podium works

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/components/quizzes/TeacherControl.jsx src/hooks/useTeacherSession.js
git commit -m "refactor: rewire TeacherControl as thin router with hook + sub-components"
```

---

## Task 5: Cleanup and verify

- [ ] **Step 1: Verify no dead imports in any file**

Check that each new file only imports what it uses. Remove any unused imports.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run production build**

Run: `npx vite build`
Expected: Clean build, no warnings about unused exports

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: cleanup dead imports after TeacherControl decomposition"
```

---

## Summary of result

| Before | After |
|--------|-------|
| `TeacherControl.jsx` — 1722 lines | `TeacherControl.jsx` — ~70 lines (router) |
| | `useTeacherSession.js` — ~800 lines (all logic) |
| | 4 shared UI helpers — ~50-80 lines each |
| | 6 screen components — ~30-170 lines each |
| 1 file, 1 responsibility boundary | 12 files, clear separation of concerns |
