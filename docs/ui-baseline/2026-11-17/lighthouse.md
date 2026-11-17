# UI Baseline Record (2026-11-17)

## Bundle Baseline (`vite build` before overhaul)

- `dist/index.html`: `0.65 kB` (`gzip: 0.37 kB`)
- `dist/assets/index-*.css`: `67.00 kB` (`gzip: 10.67 kB`)
- `dist/assets/supabase-*.js`: `130.40 kB` (`gzip: 35.72 kB`)
- `dist/assets/vendor-*.js`: `141.54 kB` (`gzip: 45.47 kB`)
- `dist/assets/index-*.js`: `768.48 kB` (`gzip: 180.69 kB`)

## Baseline Code & Accessibility Audit

- **Token compliance:** Empty `tailwind.config.js`, 190+ hex literal occurrences across `src/**/*.{jsx,tsx}` outside `ThemeSelector.jsx`, heavy inline `style={{}}` gradient/focus/hover mutations.
- **Test baseline:** 9 Vitest test files, 80 tests passing (`npm test`).
- **Routing:** View state stored in `sessionStorage['quizapp_view']`, eager imports for all 26 screens.
- **Document metadata:** Generic `<title>QuizMaster App</title>`, default `/vite.svg` favicon, remote logo dependency (`https://pierenglishschool.com/quizapp/images/logo.png`), unoptimized `spring_theme.png` duplicated in `public/` and `src/images/`.
- **Lighthouse note:** Headless Chrome Lighthouse CLI was not run in this terminal session; automated accessibility verification uses `eslint-plugin-jsx-a11y` and `vitest-axe` across key primitives and screens.

## Post-Overhaul Build & Verification (2026-11-17)

- **Main entry & CSS:**
  - `dist/index.html`: `0.90 kB` (`gzip: 0.48 kB`)
  - `dist/assets/index-*.css`: `391.73 kB` (`gzip: 115.92 kB`, includes bundled `@fontsource-variable/inter` + `@fontsource/noto-sans-jp` CSS)
  - `dist/assets/index-*.js`: `314.89 kB` (`gzip: 99.18 kB`, down from `768.48 kB` / `180.69 kB` gzip before route splitting)
- **Shared vendor/schema chunks:**
  - `dist/assets/vendor-*.js`: `141.54 kB` (`gzip: 45.47 kB`)
  - `dist/assets/supabase-*.js`: `130.41 kB` (`gzip: 35.73 kB`)
  - `dist/assets/schemas-*.js`: `67.92 kB` (`gzip: 18.19 kB`)
- **Largest lazy-loaded route chunks:**
  - `dist/assets/QuizEditor-*.js`: `64.44 kB` (`gzip: 18.06 kB`)
  - `dist/assets/TeacherControl-*.js`: `57.74 kB` (`gzip: 14.35 kB`)
  - `dist/assets/ManageQuizzes-*.js`: `45.24 kB` (`gzip: 11.04 kB`)
  - `dist/assets/SuperAdminDashboard-*.js`: `43.35 kB` (`gzip: 9.22 kB`)
  - `dist/assets/ManageStudents-*.js`: `35.99 kB` (`gzip: 8.18 kB`)
  - `dist/assets/Reports-*.js`: `35.90 kB` (`gzip: 8.01 kB`)
  - `dist/assets/StudentQuiz-*.js`: `33.15 kB` (`gzip: 8.78 kB`)
- **Automated checks:**
  - `node scripts/check-tokens.mjs`: `0` disallowed hex literals across `src/**/*.{jsx,tsx}`.
  - `eslint src`: `0` errors (including all `jsx-a11y` rules).
  - `npm run typecheck`: `0` TypeScript errors (`strict: true`).
  - `npm test`: 13 test files, 94 tests passing (including `vitest-axe` primitive checks, URL routing checks, auth domain rules, `i18n` key parity, and `QuizEditor` workflow tests).
