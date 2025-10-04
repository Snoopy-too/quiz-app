/**
 * Generate a random teacher invitation code
 * 8 characters using uppercase letters and numbers (excluding ambiguous chars like I, O, 0, 1)
 */
export function generateTeacherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format teacher code for display (adds hyphen in the middle)
 * Example: ABCD1234 -> ABCD-1234
 */
export function formatTeacherCode(code) {
  if (!code || code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Remove formatting from teacher code
 * Example: ABCD-1234 -> ABCD1234
 */
export function unformatTeacherCode(code) {
  return code.replace(/-/g, '').toUpperCase();
}
