import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Mic } from "lucide-react-native";
import { CountdownText } from "../ui/CountdownText";
import { SpeakingResult } from "./SpeakingResult";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { colors } from "../../lib/tw";
import type { ExerciseType } from "../../types/api";
import type { ExercisePhase } from "../../hooks/useExerciseFlow";

export interface SpeakingExerciseProps {
  /** The translation to display (what the user should say in English) */
  translation: string;
  /** The correct word (answer) */
  word: string;
  /** Image URL for lv1 exercises */
  imageUrl: string | null;
  /** Current exercise phase from useExerciseFlow */
  phase: ExercisePhase;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** The exercise type (speaking_lv1, speaking_lv2) */
  exerciseType: ExerciseType;
  /** Whether currently preparing recording */
  isPreparingRecording: boolean;
  /** Whether currently recording */
  isRecording: boolean;
  /** Recognized text from speech recognition */
  recognizedText: string;
  /** Interim transcript (real-time recognition) */
  interimTranscript: string;
  /** Whether the answer is correct */
  isCorrect: boolean;
  /** Callback to stop recording */
  onStopRecording: () => void;
  /** Asset URL getter function */
  getAssetUrl: (url: string | null) => string | null;
}

/**
 * SpeakingExercise component handles the speaking exercise flow:
 * - Question phase: Shows translation/image with countdown
 * - Options phase: Shows recording UI with countdown
 * - Processing phase: Shows verifying indicator
 * - Result phase: Shows the result with recognized text
 */
export function SpeakingExercise({
  translation,
  word,
  imageUrl,
  phase,
  remainingMs,
  exerciseType,
  isPreparingRecording,
  isRecording,
  recognizedText,
  interimTranscript,
  isCorrect,
  onStopRecording,
  getAssetUrl,
}: SpeakingExerciseProps) {
  const showImage = exerciseType === "speaking_lv1" && imageUrl;

  return (
    <View style={styles.exerciseContainer}>
      {/* Question phase */}
      {phase === "question" && (
        <>
          <CountdownText remainingMs={remainingMs} />
          {showImage && (
            <Image
              source={{ uri: getAssetUrl(imageUrl) || undefined }}
              style={styles.speakingImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.speakingWord}>{translation}</Text>
          <Text style={styles.speakingInstruction}>準備作答...</Text>
        </>
      )}

      {/* Options phase */}
      {phase === "options" && (
        <>
          {isPreparingRecording ? (
            // Preparing recording - show spinner
            <View style={styles.preparingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.preparingText}>準備錄音中...</Text>
            </View>
          ) : (
            // Recording - show countdown + recording UI
            <>
              <CountdownText remainingMs={remainingMs} />
              {/* Recording indicator */}
              <View style={styles.recordingContainer}>
                <View
                  style={[
                    styles.micButton,
                    isRecording && styles.micButtonActive,
                  ]}
                >
                  <Mic
                    size={48}
                    color={isRecording ? colors.destructive : colors.primary}
                  />
                </View>
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>錄音中...</Text>
                  </View>
                )}
              </View>

              {/* Real-time transcript */}
              {interimTranscript && (
                <View style={styles.transcriptBox}>
                  <Text style={styles.transcriptLabel}>辨識中：</Text>
                  <Text style={styles.transcriptText}>
                    "{interimTranscript}"
                  </Text>
                </View>
              )}

              {/* Complete button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onStopRecording}
                disabled={!isRecording}
              >
                <Text style={styles.primaryButtonText}>完成</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {/* Processing phase - verifying */}
      {phase === "processing" && (
        <SpeakingResult
          isCorrect={false}
          recognizedText=""
          correctAnswer={word}
          isVerifying={true}
        />
      )}

      {/* Result phase */}
      {phase === "result" && (
        <SpeakingResult
          isCorrect={isCorrect}
          recognizedText={recognizedText}
          correctAnswer={word}
          isVerifying={false}
        />
      )}
    </View>
  );
}
