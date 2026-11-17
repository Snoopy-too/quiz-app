/** @type {import('tailwindcss').Config} */
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;
const scale = (name, steps) =>
  Object.fromEntries(steps.map((s) => [s, rgb(`--${name}-${s}`)]));

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: scale("brand", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        accent: { 500: rgb("--accent-500") },
        surface: { DEFAULT: rgb("--surface"), muted: rgb("--surface-muted") },
        canvas: rgb("--canvas"),
        line: rgb("--line"),
        ink: { DEFAULT: rgb("--ink"), muted: rgb("--ink-muted") },
        success: { 600: rgb("--success-600") },
        warning: { 500: rgb("--warning-500") },
        danger: { 600: rgb("--danger-600") },
        answer: {
          1: rgb("--answer-1"),
          2: rgb("--answer-2"),
          3: rgb("--answer-3"),
          4: rgb("--answer-4"),
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Noto Sans JP"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.08)",
        pop: "0 12px 32px -8px rgb(16 24 40 / 0.18)",
      },
    },
  },
  plugins: [],
};
