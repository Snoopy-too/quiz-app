# Files Requiring Refactoring Audit

The following files exceed 600 lines of code. This typically indicates a violation of the **Single Responsibility Principle** and may lead to increased technical debt, slower build times, and reduced developer productivity.

## Large Files List (Sorted by Line Count)

| File Path | Line Count | Priority |
| :--- | :--- | :--- |
| `src/components/quizzes/TeacherControl.jsx` | 1722 lines | **Critical** |
| `src/components/teachers/ManageQuizzes.jsx` | 1503 lines | **Critical** |
| `src/components/teachers/ManageStudents.jsx` | 1427 lines | **High** |
| `src/components/teachers/Reports.jsx` | 1286 lines | **High** |
| `src/components/quizzes/EditQuiz.jsx` | 1281 lines | **High** |
| `src/components/quizzes/CreateQuiz.jsx` | 1231 lines | **High** |
| `src/components/students/StudentQuiz.jsx` | 885 lines | Medium |
| `src/locales/ja.json` | 835 lines | Low (Data) |
| `src/locales/en.json` | 834 lines | Low (Data) |
| `src/components/teachers/PublicQuizzes.jsx` | 809 lines | Medium |
| `src/App.jsx` | 764 lines | Medium |
| `src/components/students/StudentResults.jsx` | 749 lines | Medium |
| `src/components/students/AssignedQuizTaking.jsx` | 739 lines | Medium |
| `src/components/teachers/StudentReport.jsx` | 670 lines | Medium |
| `src/components/quizzes/ThemeSelector.jsx` | 626 lines | Low |

## Recommendations

1.  **Component Decomposition**: Break down large components (1000+ lines) into smaller, reusable atoms and molecules.
2.  **Logic Extraction**: Move complex business logic, API calls, and state management into custom hooks or utility functions.
3.  **State Management**: Consider using context or a state management library for components with excessive prop drilling and local state.
4.  **Localization Management**: For translation files over 800 lines, consider splitting them by feature or module (e.g., `auth.en.json`, `teacher.en.json`).
