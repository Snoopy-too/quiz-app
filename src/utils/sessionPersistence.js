/**
 * Session Persistence Utility
 *
 * Manages localStorage-based persistence of active quiz sessions.
 * This allows students to reconnect to a live quiz after their device
 * locks or browser closes.
 */

const ACTIVE_SESSION_KEY = 'quizapp_active_session';

/**
 * Save active session when student joins a quiz
 * @param {string} sessionId - The quiz session ID
 * @param {object} sessionData - Additional session info (quizTitle, pin, etc.)
 */
export function saveActiveSession(sessionId, sessionData = {}) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      sessionId,
      joinedAt: Date.now(),
      ...sessionData
    }));
  } catch (err) {
    console.error('[SessionPersistence] Failed to save active session:', err);
  }
}

/**
 * Get stored active session
 * @returns {object|null} The saved session data or null if none exists
 */
export function getActiveSession() {
  try {
    const data = localStorage.getItem(ACTIVE_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[SessionPersistence] Failed to get active session:', err);
    return null;
  }
}

/**
 * Clear active session (called when quiz completes or is cancelled)
 */
export function clearActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (err) {
    console.error('[SessionPersistence] Failed to clear active session:', err);
  }
}
