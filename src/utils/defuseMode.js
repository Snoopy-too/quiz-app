// Defuse Mode (Bomb Defusal) Utilities
// ponytail: pure functions, stdlib math, zero dependencies

/**
 * Calculates the total time limit for the quiz in Defuse Mode by summing
 * the time limits of all questions in the quiz.
 * Defaults each question to 30 seconds if time_limit is missing or invalid.
 * 
 * @param {Array<{ time_limit?: number|string }>} questions 
 * @returns {number} Total starting time in seconds
 */
export function calculateTotalQuizTime(questions = []) {
  if (!Array.isArray(questions) || questions.length === 0) return 60; // 1 min fallback

  return questions.reduce((total, q) => {
    const limit = parseInt(q?.time_limit, 10);
    return total + (Number.isFinite(limit) && limit > 0 ? limit : 30);
  }, 0);
}

/**
 * Calculates penalty deductions for Defuse Mode based on the percentage
 * of quiz-takers who answered a given question incorrectly.
 * 
 * Rules:
 * - < 25% incorrect: 0% deduction
 * - 25% to 49% incorrect: 10% of original starting time deducted
 * - 50% to 74% incorrect: 20% of original starting time deducted
 * - 75% or more incorrect: 30% of original starting time deducted
 * 
 * @param {number} totalQuizTakers Total number of students participating
 * @param {number} incorrectCount Number of incorrect answers
 * @param {number} originalStartingTime Original quiz countdown time in seconds
 * @returns {{
 *   totalQuizTakers: number,
 *   incorrectCount: number,
 *   correctCount: number,
 *   incorrectPct: number,
 *   penaltyPct: number,
 *   deductionSeconds: number,
 *   incurred: boolean
 * }}
 */
export function calculateDefusePenalty(totalQuizTakers, incorrectCount, originalStartingTime) {
  const takers = Math.max(0, parseInt(totalQuizTakers, 10) || 0);
  const incorrect = Math.min(takers, Math.max(0, parseInt(incorrectCount, 10) || 0));
  const origTime = Math.max(0, parseInt(originalStartingTime, 10) || 0);

  if (takers === 0 || origTime === 0) {
    return {
      totalQuizTakers: takers,
      incorrectCount: 0,
      correctCount: 0,
      incorrectPct: 0,
      penaltyPct: 0,
      deductionSeconds: 0,
      incurred: false,
    };
  }

  const incorrectPct = (incorrect / takers) * 100;
  let penaltyPct = 0;

  if (incorrectPct >= 75) {
    penaltyPct = 30;
  } else if (incorrectPct >= 50) {
    penaltyPct = 20;
  } else if (incorrectPct >= 25) {
    penaltyPct = 10;
  } else {
    penaltyPct = 0;
  }

  const deductionSeconds = Math.round(origTime * (penaltyPct / 100));

  return {
    totalQuizTakers: takers,
    incorrectCount: incorrect,
    correctCount: takers - incorrect,
    incorrectPct: Math.round(incorrectPct * 10) / 10,
    penaltyPct,
    deductionSeconds,
    incurred: penaltyPct > 0,
  };
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 * @param {number} totalSeconds 
 * @returns {string} e.g. "05:00", "01:23:45"
 */
export function formatBombTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
