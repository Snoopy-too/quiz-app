import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");

const ALLOWED_EXACT = new Set([
  path.normalize(path.join(ROOT, "components", "quizzes", "ThemeSelector.jsx")),
]);

const ALLOWED_DIRS = [
  path.normalize(path.join(ROOT, "theme")),
];

function isAllowed(filePath) {
  const normalized = path.normalize(filePath);
  if (ALLOWED_EXACT.has(normalized)) return true;
  return ALLOWED_DIRS.some((dir) => normalized.startsWith(dir + path.sep));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (/\.(jsx|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const HEX_COLOR_RE = /(?<!href=["'])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g;

const violations = [];

for (const file of walk(ROOT)) {
  if (isAllowed(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  const lines = stripComments(raw).split(/\r?\n/);
  lines.forEach((line, idx) => {
    const matches = line.match(HEX_COLOR_RE);
    if (matches) {
      violations.push({
        file: path.relative(process.cwd(), file),
        line: idx + 1,
        matches: matches.join(", "),
      });
    }
  });
}

if (violations.length > 0) {
  console.error(`Found ${violations.length} disallowed hex color literal(s) outside src/theme/ and ThemeSelector.jsx:`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> ${v.matches}`);
  }
  process.exit(1);
}

console.log("check-tokens: passed (0 disallowed hex color literals in src/**/*.{jsx,tsx}).");
