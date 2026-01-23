import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GraduationCap } from "lucide-react-native";
import { colors } from "../../lib/tw";

export interface TutorialSummaryProps {
  /** 開始學習按鈕點擊回調 */
  onStart: () => void;
}

/**
 * 教學完成畫面
 * 顯示成功訊息和「開始學習」按鈕
 */
export function TutorialSummary({ onStart }: TutorialSummaryProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconContainer}>
        <GraduationCap size={48} color={colors.success} />
      </View>
      <Text style={styles.title}>教學完成！</Text>
      <Text style={styles.subtitle}>
        • 我們會在你快要忘記時提醒你複習{"\n"}
        • 練習內容會針對你需要加強的單字{"\n"}
        • 每次練習會有不同的題型
      </Text>
      <TouchableOpacity style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>開始學習</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.success}33`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 26,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },
});
