import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";

export interface IntroScreenProps {
  /** The title to display */
  title: string;
  /** The subtitle/description to display */
  subtitle: string;
  /** Optional icon to display above the title */
  icon?: React.ReactNode;
  /** Callback when the start button is pressed */
  onStart: () => void;
  /** Custom button text (defaults to "開始") */
  buttonText?: string;
}

/**
 * IntroScreen component - A reusable intro screen for exercise flows
 *
 * Used by Practice and Review screens to show:
 * - Exercise type title (e.g., "閱讀練習", "聽力練習")
 * - Subtitle/description
 * - Start button
 */
export function IntroScreen({
  title,
  subtitle,
  icon,
  onStart,
  buttonText = "開始",
}: IntroScreenProps) {
  return (
    <SafeAreaView style={styles.introContainer}>
      {icon}
      <Text style={styles.introTitle}>{title}</Text>
      <Text style={styles.introSubtitle}>{subtitle}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
        <Text style={styles.primaryButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
