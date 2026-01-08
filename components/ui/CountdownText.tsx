import { Text, StyleSheet } from "react-native";
import { colors } from "../../lib/tw";

interface CountdownTextProps {
  remainingMs: number;
}

/**
 * 倒數計時文字組件
 *
 * 顯示格式：X.Xs（如 3.0s, 2.5s）
 */
export function CountdownText({ remainingMs }: CountdownTextProps) {
  const formatSeconds = (ms: number): string => {
    return (ms / 1000).toFixed(1) + "s";
  };

  return (
    <Text style={styles.countdownText}>
      {formatSeconds(remainingMs)}
    </Text>
  );
}

const styles = StyleSheet.create({
  countdownText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 24,
    fontVariant: ["tabular-nums"],
  },
});
