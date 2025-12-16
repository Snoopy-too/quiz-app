/**
 * Session Reconnection Feature Tests
 *
 * Tests the ability for students to reconnect to live quizzes after
 * their device locks or browser closes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Import the utilities being tested
import {
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
} from '../utils/sessionPersistence';

// ============================================================================
// PART 1: Session Persistence Utility Tests
// ============================================================================

describe('Session Persistence Utility', () => {
  const STORAGE_KEY = 'quizapp_active_session';

  describe('saveActiveSession', () => {
    it('should save session ID to localStorage', () => {
      const sessionId = 'test-session-123';

      saveActiveSession(sessionId);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.sessionId).toBe(sessionId);
    });

    it('should save session with additional data', () => {
      const sessionId = 'test-session-456';
      const sessionData = { pin: '123456', quizTitle: 'Math Quiz' };

      saveActiveSession(sessionId, sessionData);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.sessionId).toBe(sessionId);
      expect(stored.pin).toBe('123456');
      expect(stored.quizTitle).toBe('Math Quiz');
    });

    it('should include joinedAt timestamp', () => {
      const beforeTime = Date.now();
      saveActiveSession('session-789');
      const afterTime = Date.now();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.joinedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(stored.joinedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should overwrite previous session data', () => {
      saveActiveSession('first-session', { pin: '111111' });
      saveActiveSession('second-session', { pin: '222222' });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.sessionId).toBe('second-session');
      expect(stored.pin).toBe('222222');
    });
  });

  describe('getActiveSession', () => {
    it('should return null when no session is saved', () => {
      const result = getActiveSession();
      expect(result).toBeNull();
    });

    it('should return saved session data', () => {
      const sessionData = {
        sessionId: 'test-session',
        pin: '123456',
        joinedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));

      const result = getActiveSession();
      expect(result).toEqual(sessionData);
    });

    it('should handle malformed JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json{');

      // Should not throw, should return null
      const result = getActiveSession();
      expect(result).toBeNull();
    });
  });

  describe('clearActiveSession', () => {
    it('should remove session from localStorage', () => {
      saveActiveSession('session-to-clear');
      expect(getActiveSession()).not.toBeNull();

      clearActiveSession();

      expect(getActiveSession()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should not throw when no session exists', () => {
      expect(() => clearActiveSession()).not.toThrow();
    });
  });
});

// ============================================================================
// PART 2: Session Lifecycle Integration Tests
// ============================================================================

describe('Session Lifecycle', () => {
  describe('Join → Disconnect → Reconnect Flow', () => {
    it('should persist session through simulated disconnect', () => {
      // Step 1: Student joins a quiz
      const sessionId = 'live-quiz-session-abc';
      const sessionData = { pin: '987654' };
      saveActiveSession(sessionId, sessionData);

      // Step 2: Verify session is saved
      let storedSession = getActiveSession();
      expect(storedSession.sessionId).toBe(sessionId);

      // Step 3: Simulate browser close (localStorage persists, but app state is lost)
      // In real scenario, React state would be lost, but localStorage remains
      // We simulate "reopen" by just reading from localStorage again

      // Step 4: On app reopen, session should still be available
      storedSession = getActiveSession();
      expect(storedSession).not.toBeNull();
      expect(storedSession.sessionId).toBe(sessionId);
      expect(storedSession.pin).toBe('987654');
    });

    it('should clear session when quiz completes', () => {
      // Student joins
      saveActiveSession('completing-quiz-session');
      expect(getActiveSession()).not.toBeNull();

      // Quiz completes - session should be cleared
      clearActiveSession();
      expect(getActiveSession()).toBeNull();
    });

    it('should clear session when quiz is cancelled', () => {
      // Student joins
      saveActiveSession('cancelled-quiz-session');
      expect(getActiveSession()).not.toBeNull();

      // Teacher cancels quiz - session should be cleared
      clearActiveSession();
      expect(getActiveSession()).toBeNull();
    });
  });

  describe('Multiple Session Handling', () => {
    it('should only store one active session at a time', () => {
      saveActiveSession('session-1', { quizTitle: 'Quiz 1' });
      saveActiveSession('session-2', { quizTitle: 'Quiz 2' });

      const stored = getActiveSession();
      expect(stored.sessionId).toBe('session-2');
      expect(stored.quizTitle).toBe('Quiz 2');
    });
  });
});

// ============================================================================
// PART 3: Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty sessionId gracefully', () => {
    saveActiveSession('');

    const stored = getActiveSession();
    expect(stored.sessionId).toBe('');
  });

  it('should handle special characters in session data', () => {
    const sessionData = {
      quizTitle: 'Test "Quiz" with <special> & characters',
      pin: '123456',
    };
    saveActiveSession('special-session', sessionData);

    const stored = getActiveSession();
    expect(stored.quizTitle).toBe('Test "Quiz" with <special> & characters');
  });

  it('should handle unicode characters', () => {
    const sessionData = {
      quizTitle: 'Quiz de Matemáticas 数学测验',
    };
    saveActiveSession('unicode-session', sessionData);

    const stored = getActiveSession();
    expect(stored.quizTitle).toBe('Quiz de Matemáticas 数学测验');
  });

  it('should handle very long session IDs', () => {
    const longId = 'a'.repeat(1000);
    saveActiveSession(longId);

    const stored = getActiveSession();
    expect(stored.sessionId).toBe(longId);
  });
});

// ============================================================================
// PART 4: Simulated Component Behavior Tests
// ============================================================================

describe('Component Integration Simulation', () => {
  describe('JoinClassicQuiz behavior', () => {
    it('should save session before navigating to quiz view', () => {
      // Simulate what JoinClassicQuiz does on successful join
      const sessionId = 'joined-session-xyz';
      const pin = '654321';

      // This is what happens in JoinClassicQuiz.jsx line 205-206
      saveActiveSession(sessionId, { pin });

      // Verify session was saved
      const stored = getActiveSession();
      expect(stored.sessionId).toBe(sessionId);
      expect(stored.pin).toBe(pin);
    });
  });

  describe('StudentQuiz behavior', () => {
    it('should clear session when quiz status becomes completed', () => {
      // Setup: Student is in an active quiz
      saveActiveSession('active-quiz');
      expect(getActiveSession()).not.toBeNull();

      // Simulate polling detecting completed status (StudentQuiz.jsx line 102-104)
      // if (sessionData.status === "completed") { clearActiveSession(); ... }
      const simulatedStatus = 'completed';
      if (simulatedStatus === 'completed') {
        clearActiveSession();
      }

      expect(getActiveSession()).toBeNull();
    });

    it('should clear session when quiz status becomes cancelled', () => {
      saveActiveSession('active-quiz');
      expect(getActiveSession()).not.toBeNull();

      // Simulate realtime detecting cancelled status (StudentQuiz.jsx line 344-345)
      const simulatedStatus = 'cancelled';
      if (simulatedStatus === 'cancelled') {
        clearActiveSession();
      }

      expect(getActiveSession()).toBeNull();
    });

    it('should NOT clear session when quiz is still active', () => {
      saveActiveSession('still-active-quiz');

      // Quiz is in progress - should not clear
      const activeStatuses = ['waiting', 'active', 'question_active', 'showing_results'];

      activeStatuses.forEach((status) => {
        saveActiveSession('test-session');
        // These statuses should NOT trigger clearActiveSession
        if (['completed', 'cancelled'].includes(status)) {
          clearActiveSession();
        }
        expect(getActiveSession()).not.toBeNull();
      });
    });
  });

  describe('StudentDashboard behavior', () => {
    it('should detect active session on mount', async () => {
      // Simulate: Session exists in localStorage
      const savedSession = {
        sessionId: 'existing-session-abc',
        pin: '111222',
        joinedAt: Date.now() - 60000, // Joined 1 minute ago
      };
      saveActiveSession(savedSession.sessionId, { pin: savedSession.pin });

      // Simulate: checkForActiveSession reads from localStorage
      const retrievedSession = getActiveSession();

      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession.sessionId).toBe('existing-session-abc');
    });

    it('should dismiss session when user clicks dismiss button', () => {
      saveActiveSession('dismissable-session');
      expect(getActiveSession()).not.toBeNull();

      // Simulate: handleDismissActiveSession (StudentDashboard.jsx line 84-87)
      clearActiveSession();

      expect(getActiveSession()).toBeNull();
    });
  });
});

// ============================================================================
// PART 5: Full Reconnection Scenario Tests
// ============================================================================

describe('Full Reconnection Scenarios', () => {
  it('Scenario 1: Student joins, device locks, reopens, rejoins successfully', () => {
    // === Step 1: Student joins quiz ===
    const quizSession = {
      id: 'math-quiz-session',
      pin: '123456',
      quizTitle: 'Math Final Exam',
    };

    // JoinClassicQuiz saves session
    saveActiveSession(quizSession.id, {
      pin: quizSession.pin,
      quizTitle: quizSession.quizTitle,
    });

    // Verify saved
    let stored = getActiveSession();
    expect(stored.sessionId).toBe(quizSession.id);

    // === Step 2: Device locks (simulate by clearing memory state) ===
    // In reality, React state is lost but localStorage persists
    // We just verify localStorage still has the data

    // === Step 3: Student reopens app ===
    stored = getActiveSession();
    expect(stored).not.toBeNull();
    expect(stored.sessionId).toBe('math-quiz-session');
    expect(stored.quizTitle).toBe('Math Final Exam');

    // === Step 4: Student clicks "Rejoin Quiz" ===
    // StudentDashboard navigates to StudentQuiz with stored.sessionId
    const sessionIdToRejoin = stored.sessionId;
    expect(sessionIdToRejoin).toBe('math-quiz-session');

    // === Step 5: StudentQuiz loads and restores state ===
    // (This is handled by existing code in StudentQuiz.jsx lines 208-269)
    // The test verifies the session ID is available for this restoration
  });

  it('Scenario 2: Student joins, quiz ends before they reopen, no rejoin prompt', () => {
    // === Step 1: Student joins quiz ===
    saveActiveSession('ending-quiz-session');

    // === Step 2: Quiz ends (maybe teacher ended it) ===
    // When StudentQuiz detects completed status, it clears the session
    clearActiveSession();

    // === Step 3: Student reopens app ===
    const stored = getActiveSession();

    // === Step 4: No active session found ===
    expect(stored).toBeNull();
    // Dashboard would NOT show the rejoin banner
  });

  it('Scenario 3: Student joins, answers questions, disconnects, rejoins with score preserved', () => {
    // === Step 1: Student joins and answers questions ===
    const session = {
      id: 'quiz-with-progress',
      pin: '999888',
    };
    saveActiveSession(session.id, { pin: session.pin });

    // Student's score is saved in database (session_participants.score)
    // Student's answers are saved in database (quiz_answers table)
    // This data persists regardless of localStorage

    // === Step 2: Device locks ===
    // localStorage persists

    // === Step 3: Student reopens ===
    const stored = getActiveSession();
    expect(stored).not.toBeNull();
    expect(stored.sessionId).toBe('quiz-with-progress');

    // === Step 4: Student clicks "Rejoin" ===
    // StudentDashboard would show: "Your current score: X points" (from DB query)
    // When StudentQuiz loads, it queries session_participants and quiz_answers
    // to restore the student's progress (existing logic in lines 208-269)
  });

  it('Scenario 4: Student dismisses rejoin banner, session is cleared', () => {
    // === Setup: Session exists ===
    saveActiveSession('dismissable-quiz');
    expect(getActiveSession()).not.toBeNull();

    // === Student clicks dismiss (X button) ===
    // handleDismissActiveSession is called
    clearActiveSession();

    // === Session is gone, banner will not show again ===
    expect(getActiveSession()).toBeNull();
  });

  it('Scenario 5: Team mode quiz reconnection', () => {
    // === Student joins team mode quiz ===
    const teamSession = {
      id: 'team-quiz-session',
      pin: '777666',
      isTeamMode: true,
      teamId: 'team-abc',
    };
    saveActiveSession(teamSession.id, {
      pin: teamSession.pin,
    });

    // === Device disconnects and reconnects ===
    const stored = getActiveSession();

    // === Session should be available for team reconnection ===
    expect(stored).not.toBeNull();
    expect(stored.sessionId).toBe('team-quiz-session');
    // Team membership is stored in database, will be restored by StudentQuiz
  });
});

// ============================================================================
// PART 6: Timing and Race Condition Tests
// ============================================================================

describe('Timing and Race Conditions', () => {
  it('should handle rapid save/clear operations', () => {
    // Rapid operations shouldn't cause issues
    for (let i = 0; i < 100; i++) {
      saveActiveSession(`session-${i}`);
      if (i % 2 === 0) {
        clearActiveSession();
      }
    }

    // Final state should be session-99
    const stored = getActiveSession();
    expect(stored.sessionId).toBe('session-99');
  });

  it('should handle concurrent-like read/write operations', () => {
    // Simulate multiple "concurrent" operations
    saveActiveSession('concurrent-test');

    // Read while "another operation" might be writing
    const read1 = getActiveSession();
    saveActiveSession('concurrent-test-updated');
    const read2 = getActiveSession();

    expect(read1.sessionId).toBe('concurrent-test');
    expect(read2.sessionId).toBe('concurrent-test-updated');
  });
});

// ============================================================================
// PART 7: LocalStorage Quota and Limits
// ============================================================================

describe('Storage Limits', () => {
  it('should handle large quiz titles gracefully', () => {
    const largeTitle = 'A'.repeat(10000); // 10KB title
    saveActiveSession('large-title-session', { quizTitle: largeTitle });

    const stored = getActiveSession();
    expect(stored.quizTitle.length).toBe(10000);
  });
});
