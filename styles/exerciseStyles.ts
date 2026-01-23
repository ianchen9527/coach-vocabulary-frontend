import { StyleSheet } from "react-native";
import { colors } from "../lib/tw";

export const exerciseCommonStyles = StyleSheet.create({
  // Loading screen
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.mutedForeground,
    marginTop: 16,
  },

  // Complete screen
  completeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  completeIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.success}33`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 32,
  },

  // Main container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Content
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Pool badge
  poolBadge: {
    backgroundColor: `${colors.accent}1A`,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9999,
    marginBottom: 16,
  },
  poolBadgeText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
  },

  // Timeout text
  timeoutText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.destructive,
    marginBottom: 16,
  },

  // Common buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },
  destructiveButton: {
    backgroundColor: colors.destructive,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.destructiveForeground,
  },
  successButton: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.successForeground,
  },

  // Listening exercise
  listeningContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  listeningButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  listeningText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },

  // Speaking exercise
  speakingImage: {
    width: 128,
    height: 128,
    borderRadius: 16,
    backgroundColor: colors.muted,
    marginBottom: 16,
  },
  speakingWord: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  speakingInstruction: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 16,
  },

  // Recording
  recordingContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: `${colors.destructive}33`,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.destructive,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: colors.destructive,
    fontWeight: "500",
  },

  // Transcript display
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

  // Result display
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

  // Correct answer display
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

  // Display phase
  displayContainer: {
    alignItems: "center",
  },
  wordImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.muted,
    marginBottom: 24,
  },
  wordText: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  translationText: {
    fontSize: 24,
    color: colors.mutedForeground,
    marginBottom: 16,
  },
  speakerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  speakerText: {
    color: colors.mutedForeground,
    marginLeft: 8,
  },

  // Exercise container
  exerciseContainer: {
    width: "100%",
    alignItems: "center",
  },

  // Intro screen
  introContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  introTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 16,
  },
  introSubtitle: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 32,
  },

  // Reading exercise
  readingWord: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  readingInstruction: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 32,
  },

  // Exercise word text (used in question phase)
  exerciseWordText: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  exerciseHintText: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 32,
  },

  // Preparing recording
  preparingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  preparingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.mutedForeground,
  },

  // Audio status (learn screen)
  audioStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  audioStatusText: {
    color: colors.mutedForeground,
    marginLeft: 8,
  },

  // Steps list for intro screen
  stepsContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.accent,
    marginRight: 8,
  },
  stepText: {
    fontSize: 18,
    color: colors.foreground,
  },
  timeWarning: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 24,
  },
});
