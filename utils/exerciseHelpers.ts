import { doubleMetaphone } from 'double-metaphone';

/**
 * Get exercise category from type
 */
export function getExerciseCategory(type: string): string {
  if (type.startsWith("reading")) return "reading";
  if (type.startsWith("listening")) return "listening";
  return "speaking";
}

/**
 * Get exercise title from category
 */
export function getExerciseTitle(category: string): string {
  switch (category) {
    case "reading":
      return "閱讀練習";
    case "listening":
      return "聽力練習";
    case "speaking":
      return "口說練習";
    default:
      return "練習";
  }
}

/**
 * Get pool label from pool identifier
 */
export function getPoolLabel(pool: string, type: "practice" | "review" = "practice"): string {
  if (type === "review") {
    return `複習池 ${pool}`;
  }
  if (pool.startsWith("P")) {
    return `練習池 ${pool}`;
  }
  return `複習池 ${pool}`;
}

/**
 * Check if speaking answer is correct
 * 1. First tries exact match (includes)
 * 2. If no exact match, tries phonetic matching using Double Metaphone
 */
export function checkSpeakingAnswer(transcript: string, correctWord: string): boolean {
  const normalizedTranscript = transcript.toLowerCase().trim();
  const normalizedCorrect = correctWord.toLowerCase().trim();

  // 1. Exact match: transcript contains the correct word
  if (normalizedTranscript.includes(normalizedCorrect)) {
    return true;
  }

  // 2. Phonetic match: check if any word in transcript sounds like the correct word
  const [correctPrimary, correctAlt] = doubleMetaphone(normalizedCorrect);
  const words = normalizedTranscript.split(/\s+/);

  for (const word of words) {
    // Remove punctuation (e.g., "who's" -> "whos")
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (!cleanWord) continue;

    const [wordPrimary, wordAlt] = doubleMetaphone(cleanWord);

    // Match if any combination matches
    if (
      wordPrimary === correctPrimary ||
      wordPrimary === correctAlt ||
      wordAlt === correctPrimary ||
      wordAlt === correctAlt
    ) {
      return true;
    }
  }

  return false;
}
