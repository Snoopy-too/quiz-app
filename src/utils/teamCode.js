/**
 * Generate a random team join code
 * 4 characters using uppercase letters and numbers (excluding ambiguous chars like I, O, 0, 1)
 */
export function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Normalize team code input (uppercase, remove spaces)
 */
export function normalizeTeamCode(code) {
  return code.replace(/\s/g, '').toUpperCase();
}
