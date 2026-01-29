import { View, Text, StyleSheet } from "react-native";
import { getNextReviewLabel } from "../../utils/nextReview";
import { colors } from "../../lib/tw";
import type { NextReviewSchema } from "../../types/api";

export interface NextReviewTagProps {
  /** 後端提供的下次複習資訊 */
  nextReview: NextReviewSchema;
  /** 該題是否答對 */
  isCorrect: boolean;
}

/**
 * 顯示下次複習時間的標籤（pill badge）
 */
export function NextReviewTag({ nextReview, isCorrect }: NextReviewTagProps) {
  const label = getNextReviewLabel(nextReview, isCorrect);

  if (label === null) {
    // 已精熟
    return (
      <View style={tagStyles.badge}>
        <Text style={tagStyles.text}>已精熟！</Text>
      </View>
    );
  }

  return (
    <View style={tagStyles.badge}>
      <Text style={tagStyles.text}>
        下次練習：{label}
      </Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  badge: {
    backgroundColor: `${colors.accent}1A`,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9999,
    marginBottom: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
});
