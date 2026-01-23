import { View, Text, Image } from "react-native";
import { Volume2 } from "lucide-react-native";
import { CountdownText } from "../ui/CountdownText";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { colors } from "../../lib/tw";

export interface DisplayPhaseProps {
  /** The word to display */
  word: string;
  /** The translation to display */
  translation: string;
  /** Image URL for the word (optional) */
  imageUrl: string | null;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Whether audio is currently playing */
  isSpeaking: boolean;
  /** Asset URL getter function */
  getAssetUrl: (url: string | null) => string | null;
}

/**
 * DisplayPhase component - Shows word information during the display/learning phase
 *
 * Used by Learn and Review screens to display:
 * - Word image (if available)
 * - Word text
 * - Translation
 * - Audio status indicator
 * - Countdown timer
 */
export function DisplayPhase({
  word,
  translation,
  imageUrl,
  remainingMs,
  isSpeaking,
  getAssetUrl,
}: DisplayPhaseProps) {
  return (
    <View style={styles.displayContainer}>
      {/* Countdown timer */}
      <CountdownText remainingMs={remainingMs} />

      {/* Word image */}
      {imageUrl && (
        <Image
          source={{ uri: getAssetUrl(imageUrl) || undefined }}
          style={styles.wordImage}
          resizeMode="contain"
        />
      )}

      {/* Word text */}
      <Text style={styles.wordText}>{word}</Text>

      {/* Translation */}
      <Text style={styles.translationText}>{translation}</Text>

      {/* Audio status indicator */}
      <View style={styles.speakerContainer}>
        <Volume2
          size={24}
          color={isSpeaking ? colors.primary : colors.mutedForeground}
        />
        <Text style={styles.speakerText}>
          {isSpeaking ? "播放中..." : "已播放"}
        </Text>
      </View>
    </View>
  );
}
