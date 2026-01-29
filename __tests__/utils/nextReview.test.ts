import { formatNextReviewLabel, getNextReviewLabel } from "../../utils/nextReview";
import type { NextReviewSchema } from "../../types/api";

describe("formatNextReviewLabel", () => {
  it("should format seconds < 3600 as minutes", () => {
    expect(formatNextReviewLabel(600)).toBe("10 分鐘後");
  });

  it("should ceil partial minutes", () => {
    expect(formatNextReviewLabel(59)).toBe("1 分鐘後");
    expect(formatNextReviewLabel(61)).toBe("2 分鐘後");
  });

  it("should format exactly 3600 as 1 hour", () => {
    expect(formatNextReviewLabel(3600)).toBe("1 小時後");
  });

  it("should format seconds >= 3600 and < 43200 as hours", () => {
    expect(formatNextReviewLabel(3601)).toBe("2 小時後");
    expect(formatNextReviewLabel(7200)).toBe("2 小時後");
  });

  it("should format exactly 43200 as 1 day", () => {
    expect(formatNextReviewLabel(43200)).toBe("1 天後");
  });

  it("should format seconds >= 43200 as days", () => {
    expect(formatNextReviewLabel(72000)).toBe("1 天後");
    expect(formatNextReviewLabel(158400)).toBe("2 天後");
    expect(formatNextReviewLabel(590400)).toBe("7 天後");
  });
});

describe("getNextReviewLabel", () => {
  it("should return null when correct and mastered", () => {
    const nextReview: NextReviewSchema = {
      correct_wait_seconds: 0,
      correct_is_mastered: true,
      incorrect_wait_seconds: 600,
    };
    expect(getNextReviewLabel(nextReview, true)).toBeNull();
  });

  it("should return formatted correct_wait_seconds when correct and not mastered", () => {
    const nextReview: NextReviewSchema = {
      correct_wait_seconds: 72000,
      correct_is_mastered: false,
      incorrect_wait_seconds: 600,
    };
    expect(getNextReviewLabel(nextReview, true)).toBe("1 天後");
  });

  it("should return formatted incorrect_wait_seconds when incorrect", () => {
    const nextReview: NextReviewSchema = {
      correct_wait_seconds: 72000,
      correct_is_mastered: false,
      incorrect_wait_seconds: 600,
    };
    expect(getNextReviewLabel(nextReview, false)).toBe("10 分鐘後");
  });

  it("should use incorrect_wait_seconds even when correct_is_mastered is true", () => {
    const nextReview: NextReviewSchema = {
      correct_wait_seconds: 0,
      correct_is_mastered: true,
      incorrect_wait_seconds: 600,
    };
    expect(getNextReviewLabel(nextReview, false)).toBe("10 分鐘後");
  });
});
