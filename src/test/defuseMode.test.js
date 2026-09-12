import { describe, it, expect } from "vitest";
import {
  calculateTotalQuizTime,
  calculateDefusePenalty,
  formatBombTime,
} from "../utils/defuseMode";

describe("defuseMode utilities", () => {
  describe("calculateTotalQuizTime", () => {
    it("should sum time limits of all questions", () => {
      const questions = [
        { time_limit: 30 },
        { time_limit: 45 },
        { time_limit: 15 },
      ];
      expect(calculateTotalQuizTime(questions)).toBe(90);
    });

    it("should use 30 seconds default for questions missing time_limit", () => {
      const questions = [
        { time_limit: null },
        { question_text: "What is 2+2?" },
        { time_limit: 20 },
      ];
      expect(calculateTotalQuizTime(questions)).toBe(80); // 30 + 30 + 20
    });

    it("should return 60s fallback for empty or invalid input", () => {
      expect(calculateTotalQuizTime([])).toBe(60);
      expect(calculateTotalQuizTime(null)).toBe(60);
    });
  });

  describe("calculateDefusePenalty", () => {
    const originalTime = 300; // 5 minutes = 300 seconds

    it("should incur 0% penalty if less than 25% are incorrect", () => {
      // 20 out of 100 incorrect = 20%
      const res = calculateDefusePenalty(100, 20, originalTime);
      expect(res.penaltyPct).toBe(0);
      expect(res.deductionSeconds).toBe(0);
      expect(res.incurred).toBe(false);
      expect(res.incorrectPct).toBe(20);
    });

    it("should incur 10% penalty if 25% to 49% are incorrect", () => {
      // 1 out of 4 incorrect = 25%
      const res = calculateDefusePenalty(4, 1, originalTime);
      expect(res.penaltyPct).toBe(10);
      expect(res.deductionSeconds).toBe(30); // 10% of 300 = 30s
      expect(res.incurred).toBe(true);
      expect(res.incorrectPct).toBe(25);

      // 40 out of 100 incorrect = 40%
      const res2 = calculateDefusePenalty(100, 40, originalTime);
      expect(res2.penaltyPct).toBe(10);
      expect(res2.deductionSeconds).toBe(30);
    });

    it("should incur 20% penalty if 50% to 74% are incorrect", () => {
      // 2 out of 4 incorrect = 50%
      const res = calculateDefusePenalty(4, 2, originalTime);
      expect(res.penaltyPct).toBe(20);
      expect(res.deductionSeconds).toBe(60); // 20% of 300 = 60s
      expect(res.incurred).toBe(true);
      expect(res.incorrectPct).toBe(50);

      // 70 out of 100 incorrect = 70%
      const res2 = calculateDefusePenalty(100, 70, originalTime);
      expect(res2.penaltyPct).toBe(20);
      expect(res2.deductionSeconds).toBe(60);
    });

    it("should incur 30% penalty if 75% or more are incorrect", () => {
      // 3 out of 4 incorrect = 75%
      const res = calculateDefusePenalty(4, 3, originalTime);
      expect(res.penaltyPct).toBe(30);
      expect(res.deductionSeconds).toBe(90); // 30% of 300 = 90s
      expect(res.incurred).toBe(true);
      expect(res.incorrectPct).toBe(75);

      // 4 out of 4 incorrect = 100%
      const res2 = calculateDefusePenalty(4, 4, originalTime);
      expect(res2.penaltyPct).toBe(30);
      expect(res2.deductionSeconds).toBe(90);
    });

    it("should handle 0 quiz takers or 0 original time gracefully", () => {
      const res = calculateDefusePenalty(0, 0, originalTime);
      expect(res.incurred).toBe(false);
      expect(res.deductionSeconds).toBe(0);

      const res2 = calculateDefusePenalty(4, 2, 0);
      expect(res2.incurred).toBe(false);
      expect(res2.deductionSeconds).toBe(0);
    });
  });

  describe("formatBombTime", () => {
    it("should format seconds into MM:SS correctly", () => {
      expect(formatBombTime(300)).toBe("05:00");
      expect(formatBombTime(65)).toBe("01:05");
      expect(formatBombTime(9)).toBe("00:09");
      expect(formatBombTime(0)).toBe("00:00");
      expect(formatBombTime(-5)).toBe("00:00");
    });

    it("should format hours when time >= 3600", () => {
      expect(formatBombTime(3665)).toBe("1:01:05");
    });
  });
});
