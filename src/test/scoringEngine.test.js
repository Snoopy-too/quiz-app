
import { describe, it, expect } from 'vitest';

/**
 * Scoring Calculation Logic
 * Extracted from StudentQuiz.jsx to ensures rules are tested and documented.
 */
function calculateScore(isCorrect, timeRemaining, timeLimit, basePoints) {
    if (!isCorrect) return 0;

    // Calculate points based on time remaining (0-100 bonus points)
    // Logic: floor((timeRemaining / timeLimit) * 100)
    // If answered immediately (timeRemaining ~ timeLimit) -> +100 bonus
    // If answered at last second (timeRemaining ~ 1) -> +small bonus
    const timeBonus = Math.floor((timeRemaining / timeLimit) * 100);

    return basePoints + timeBonus;
}

describe('Scoring Engine', () => {
    it('should return 0 points for incorrect answer', () => {
        const score = calculateScore(false, 10, 20, 1000);
        expect(score).toBe(0);
    });

    it('should calculate max score for immediate answer', () => {
        // 20s limit, 20s remaining (immediate)
        const basePoints = 1000;
        const score = calculateScore(true, 20, 20, basePoints);

        // Bonus = floor(1 * 100) = 100
        // Total = 1100
        expect(score).toBe(1100);
    });

    it('should calculate partial bonus for mid-time answer', () => {
        // 20s limit, 10s remaining (half time)
        const basePoints = 1000;
        const score = calculateScore(true, 10, 20, basePoints);

        // Bonus = floor(0.5 * 100) = 50
        // Total = 1050
        expect(score).toBe(1050);
    });

    it('should calculate minimal bonus for last second answer', () => {
        // 20s limit, 1s remaining
        const basePoints = 1000;
        const score = calculateScore(true, 1, 20, basePoints);

        // Bonus = floor(0.05 * 100) = 5
        // Total = 1005
        expect(score).toBe(1005);
    });

    it('should handle timeRemaining = 0 (buzzer beater)', () => {
        // 20s limit, 0s remaining (just made it?)
        // IF the UI allows submitting at 0s. 
        const basePoints = 1000;
        const score = calculateScore(true, 0, 20, basePoints);

        // Bonus = 0
        // Total = 1000
        expect(score).toBe(1000);
    });
});
