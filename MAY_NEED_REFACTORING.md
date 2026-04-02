# Files Requiring Refactoring Audit

The following files exceed 600 lines of code. This typically indicates a violation of the **Single Responsibility Principle** and may lead to increased technical debt, slower build times, and reduced developer productivity.

## Completed Refactors

| Original File | Was | Now | Hook | Sub-components |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/quizzes/TeacherControl.jsx` | 1722 lines | **81 lines** | `useTeacherSession.js` (855 lines) | 10 components in `teacherControl/` |
| `src/components/teachers/ManageQuizzes.jsx` | 1503 lines | **424 lines** | `useManageQuizzes.js` (640 lines) | 5 components in `manageQuizzes/` |
| `src/components/teachers/ManageStudents.jsx` | 1427 lines | **150 lines** | `useManageStudents.js` (712 lines) | 5 components in `manageStudents/` |

### Refactoring pattern used

Each refactor follows the same pattern — can be reused for remaining files:

1. **Hook extraction** — All `useState`, `useRef`, `useEffect`, and functions move into `src/hooks/use<Name>.js`. The hook receives `appState` and returns all state + actions. Navigation (`setView`) stays in the parent component via a callback pattern.
2. **Sub-component extraction** — Each distinct UI section (modals, tables, cards, toolbars) becomes its own file under a `<componentName>/` subdirectory next to the parent.
3. **Layout shell** — The original file becomes a slim shell: imports hook + sub-components, handles loading/error guards, wires props.
4. **Stale closure fix** — Replace `{ ...someModal, isOpen: false }` with `prev => ({ ...prev, isOpen: false })` functional updater pattern wherever `setConfirmModal`/`setAlertModal` are called inside async callbacks.
5. **Plans** stored in `docs/superpowers/plans/` for reference.

### Key conventions

- `useTranslation()` must be called in **each** sub-component that uses `t()` (not passed as a prop).
- Hooks use `"../supabaseClient"` import path (from `src/hooks/`).
- Sub-components receive `currentUserId` prop instead of `appState.currentUser.id` directly.
- All 41 tests pass after each refactor. Build verified clean.

---

## Remaining Files (Next Up)

| File Path | Line Count | Priority | Notes |
| :--- | :--- | :--- | :--- |
| `src/components/teachers/Reports.jsx` | 1286 lines | **High** | **Next in queue** |
| `src/components/quizzes/EditQuiz.jsx` | 1281 lines | **High** | |
| `src/components/quizzes/CreateQuiz.jsx` | 1231 lines | **High** | |
| `src/components/students/StudentQuiz.jsx` | 885 lines | Medium | |
| `src/components/teachers/PublicQuizzes.jsx` | 809 lines | Medium | |
| `src/App.jsx` | 764 lines | Medium | |
| `src/components/students/StudentResults.jsx` | 749 lines | Medium | |
| `src/components/students/AssignedQuizTaking.jsx` | 739 lines | Medium | |
| `src/components/teachers/StudentReport.jsx` | 670 lines | Medium | |
| `src/components/quizzes/ThemeSelector.jsx` | 626 lines | Low | |
| `src/locales/ja.json` | 835 lines | Low (Data) | |
| `src/locales/en.json` | 834 lines | Low (Data) | |

## Recommendations

1.  **Component Decomposition**: Break down large components (1000+ lines) into smaller, reusable atoms and molecules.
2.  **Logic Extraction**: Move complex business logic, API calls, and state management into custom hooks or utility functions.
3.  **State Management**: Consider using context or a state management library for components with excessive prop drilling and local state.
4.  **Localization Management**: For translation files over 800 lines, consider splitting them by feature or module (e.g., `auth.en.json`, `teacher.en.json`).
