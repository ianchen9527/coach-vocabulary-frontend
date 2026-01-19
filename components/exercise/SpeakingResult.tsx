import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Check, X } from "lucide-react-native";
import { colors } from "../../lib/tw";
import { DEBUG_MODE } from "../../lib/config";

interface SpeakingResultProps {
  isCorrect: boolean;
  recognizedText: string;
  correctAnswer: string;
  isVerifying?: boolean;
}

export function SpeakingResult({
  isCorrect,
  recognizedText,
  correctAnswer,
  isVerifying = false,
}: SpeakingResultProps) {
  // 顯示驗證中狀態
  if (isVerifying) {
    return (
      <View style={styles.verifyingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.verifyingText}>驗證中...</Text>
      </View>
    );
  }

  return (
    <>
      {/* 結果圖示 */}
      <View
        style={[
          styles.resultIconContainer,
          isCorrect ? styles.resultCorrect : styles.resultIncorrect,
        ]}
      >
        {isCorrect ? (
          <Check size={64} color={colors.success} />
        ) : (
          <X size={64} color={colors.destructive} />
        )}
      </View>

      {/* 你說的內容（僅 debug 模式顯示） */}
      {DEBUG_MODE && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>你說：</Text>
          <Text style={styles.transcriptText}>"{recognizedText}"</Text>
        </View>
      )}

      {/* 正確答案 */}
      <View style={styles.correctAnswerBox}>
        <Text style={styles.correctAnswerLabel}>正確答案：</Text>
        <Text style={styles.correctAnswerText}>{correctAnswer}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  resultIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  resultCorrect: {
    backgroundColor: `${colors.success}33`,
  },
  resultIncorrect: {
    backgroundColor: `${colors.destructive}33`,
  },
  transcriptBox: {
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    width: "100%",
  },
  transcriptLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 18,
    color: colors.foreground,
    fontWeight: "500",
  },
  correctAnswerBox: {
    backgroundColor: `${colors.success}1A`,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
  },
  correctAnswerLabel: {
    fontSize: 14,
    color: colors.success,
    marginBottom: 4,
    fontWeight: "600",
  },
  correctAnswerText: {
    fontSize: 20,
    color: colors.success,
    fontWeight: "bold",
  },
  verifyingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.mutedForeground,
    fontWeight: "500",
  },
});
