import type { NextReviewSchema } from "../types/api";

/**
 * 將等待秒數格式化為人類可讀的下次複習標籤
 */
export function formatNextReviewLabel(waitSeconds: number): string {
  if (waitSeconds < 3600) {
    // 不到 1 小時 → 顯示分鐘
    const minutes = Math.ceil(waitSeconds / 60);
    return `${minutes} 分鐘後`;
  }
  if (waitSeconds < 43200) {
    // 不到 12 小時 → 顯示小時
    const hours = Math.ceil(waitSeconds / 3600);
    return `${hours} 小時後`;
  }
  // 12 小時以上 → 顯示天數
  const days = Math.ceil(waitSeconds / 86400);
  return `${days} 天後`;
}

/**
 * 根據答對/答錯取得下次複習標籤文字
 * @returns 標籤文字，已精熟時回傳 null
 */
export function getNextReviewLabel(
  nextReview: NextReviewSchema,
  isCorrect: boolean
): string | null {
  if (isCorrect && nextReview.correct_is_mastered) {
    return null;
  }
  const waitSeconds = isCorrect
    ? nextReview.correct_wait_seconds
    : nextReview.incorrect_wait_seconds;
  return formatNextReviewLabel(waitSeconds);
}
