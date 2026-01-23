import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
  /** Numbered step instructions to display */
  steps?: string[];
  /** Time limit warning text */
  timeWarning?: string;
}

/**
 * IntroScreen component - A reusable intro screen for exercise flows
 *
 * Used by Practice and Review screens to show:
 * - Exercise type title (e.g., "閱讀練習", "聽力練習")
 * - Subtitle/description
 * - Optional numbered steps
 * - Optional time warning
 * - Start button
 */
export function IntroScreen({
  title,
  subtitle,
  icon,
  onStart,
  buttonText = "開始",
  steps,
  timeWarning,
}: IntroScreenProps) {
  return (
    <SafeAreaView style={styles.introContainer}>
      {icon}
      <Text style={styles.introTitle}>{title}</Text>
      {subtitle ? <Text style={styles.introSubtitle}>{subtitle}</Text> : null}
      {steps && steps.length > 0 && (
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
      {timeWarning ? (
        <Text style={styles.timeWarning}>{timeWarning}</Text>
      ) : null}
      <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
        <Text style={styles.primaryButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
