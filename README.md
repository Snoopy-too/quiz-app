# QuizMaster (`quiz-app`)

Interactive classroom quiz platform supporting live sessions (Classic, Team, and Defuse modes), self-paced assigned quizzes, question banks with nested folders, themes, reports, and role-based workflows (`student`, `teacher`, `superadmin`).

## Development Commands

- `npm run dev` — Start Vite development server (`http://localhost:3000`).
- `npm run typecheck` — Run TypeScript strict type checking (`tsc --noEmit`).
- `npm run lint` — Run hex-token compliance check (`node scripts/check-tokens.mjs`) and ESLint (`eslint src`, including `jsx-a11y`).
- `npm test` — Run Vitest test suite (`vitest run`, including `vitest-axe` and locale key-parity tests).
- `npm run build` — Build production bundle into `dist/` with route-level code splitting.

## Architecture Layers

- `src/schemas/` — Runtime Zod schemas (`quiz.ts`, `dashboard.ts`, `auth.js`, `bulkEdit.js`).
- `src/domain/` — Pure domain rules (`auth.ts` for landing route resolution, approval/verification gates, and `sanitizeNextPath`).
- `src/infrastructure/` — Supabase typed client queries & mutations (`database.types.ts`, `dashboardRepository.ts`, `quizRepository.ts`).
- `src/hooks/` — Application state & side-effect hooks (`useQuizEditor.ts`, `useTeacherDashboard.ts`, `useStudentDashboard.ts`, `useJoinQuiz.ts`, `useTeacherSession.js`, `useManageQuizzes.js`, `useManageStudents.js`, `useReports.js`).
- `src/routes/` — Code-split React Router routes and guards (`router.tsx`, `guards.tsx`, `authContext.tsx`, `legacyNavigation.ts`, `NotFoundPage.tsx`).
- `src/components/ui/` — Accessible primitive library (`Button`, `IconButton`, `Card`, `Input`, `Textarea`, `Select`, `Field`, `Dialog`, `ToastProvider`, `Badge`, `PageHeader`, `EmptyState`, `Skeleton`, `Spinner`, `Icon`).
- `src/components/layout/` — `AppShell.tsx` (skip link `#main`, responsive sidebar/drawer) and `VerticalNav.jsx`.

## Design Tokens & Typography

- Semantic CSS channel tokens live in [src/theme/tokens.css](file:///c:/xampp/htdocs/quiz-app/src/theme/tokens.css) (`--brand-*`, `--accent-500`, `--surface`, `--surface-muted`, `--canvas`, `--line`, `--ink`, `--ink-muted`, `--success-600`, `--warning-500`, `--danger-600`, `--answer-1..4`, plus `[data-theme="dark"]` overrides).
- Non-CSS theme/SVG constants live in [src/theme/themeDefaults.ts](file:///c:/xampp/htdocs/quiz-app/src/theme/themeDefaults.ts).
- Local fonts: `@fontsource-variable/inter` and `@fontsource/noto-sans-jp`.
- Custom hex color literals outside `src/theme/` and `src/components/quizzes/ThemeSelector.jsx` are blocked by `scripts/check-tokens.mjs`.

## Route Map (`react-router`)

- Guest auth routes: `/login`, `/register` (supports `?teacher=CODE`), `/register/success`, `/verify`, `/forgot-password`, `/reset-password`
- Onboarding: `/complete-profile`
- Student workspace: `/student`, `/join/:pin?`, `/play/:sessionId`, `/student/assignments`, `/student/assignments/:assignmentId`, `/student/results`, `/student/team`
- Teacher workspace: `/teacher`, `/teacher/quizzes`, `/teacher/quizzes/new`, `/teacher/quizzes/:quizId/edit`, `/teacher/quizzes/:quizId/preview`, `/teacher/host/:sessionId`, `/teacher/students` (supports `?filter=pending`), `/teacher/reports`, `/teacher/reports/students/:studentId`, `/teacher/library/school`, `/teacher/library/community`
- Admin & settings: `/admin`, `/settings`, `/dev/ui` (dev only)
