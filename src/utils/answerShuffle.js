// utils/answerShuffle.js
// Deterministic seeded shuffle — shared between teacher and student views
// so both sides see answers in exactly the same order when randomize_answers is on.

/**
 * Simple string → integer hash (DJB2-style).
 */
function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Seeded Fisher-Yates shuffle.
 * Returns a NEW array — never mutates the input.
 */
export function seededShuffle(array, seed) {
  const shuffled = [...array];
  let hash = stringHash(seed);

  const random = () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Build the answer-shuffle mapping for one question in one session.
 *
 * Returns:
 *   shuffledOptions      — options array in the display order students see
 *   shuffledToOriginal   — shuffledToOriginal[displayIdx] = originalIdx
 *                          (use this to map a clicked answer back to the DB index)
 *   originalToShuffled   — originalToShuffled[originalIdx] = displayIdx
 *                          (use this to map a stored DB index to a display position)
 */
export function buildAnswerShuffleMap(options, sessionId, questionId) {
  const seed = `${sessionId}-${questionId}-answers`;
  const indices = options.map((_, i) => i);
  const shuffledIndices = seededShuffle(indices, seed);

  const shuffledOptions = shuffledIndices.map(i => options[i]);

  // Reverse map: for each original index, what display position is it at?
  const originalToShuffled = new Array(options.length);
  shuffledIndices.forEach((origIdx, displayIdx) => {
    originalToShuffled[origIdx] = displayIdx;
  });

  return { shuffledOptions, shuffledToOriginal: shuffledIndices, originalToShuffled };
}
