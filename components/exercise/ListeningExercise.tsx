import { View, Text } from "react-native";
import { Volume2 } from "lucide-react-native";
import { CountdownText } from "../ui/CountdownText";
import { ExerciseOptions } from "./ExerciseOptions";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { colors } from "../../lib/tw";
import type { OptionSchema, ExerciseType } from "../../types/api";
import type { ExercisePhase } from "../../hooks/useExerciseFlow";

export interface ListeningExerciseProps {
  /** The options to display */
  options: OptionSchema[];
  /** Index of the correct option */
  correctIndex: number | null;
  /** Current exercise phase from useExerciseFlow */
  phase: ExercisePhase;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Currently selected option index (null if none selected) */
  selectedIndex: number | null;
  /** Callback when an option is selected */
  onSelect: (index: number) => void;
  /** The exercise type (listening_lv1, listening_lv2) */
  exerciseType: ExerciseType;
  /** Whether audio is currently playing */
  isSpeaking: boolean;
}

/**
 * ListeningExercise component handles the listening exercise flow:
 * - Question phase: Shows audio playback indicator with countdown
 * - Options phase: Shows options for selection with countdown
 * - Result phase: Shows the result with correct/incorrect indication
 */
export function ListeningExercise({
  options,
  correctIndex,
  phase,
  remainingMs,
  selectedIndex,
  onSelect,
  exerciseType,
  isSpeaking,
}: ListeningExerciseProps) {
  const isGridLayout = exerciseType === "listening_lv1";

  return (
    <View style={styles.exerciseContainer}>
      {/* Question phase - audio playback indicator */}
      {phase === "question" && (
        <>
          <CountdownText remainingMs={remainingMs} />
          <View style={styles.listeningContainer}>
            <View style={styles.listeningButton}>
              <Volume2
                size={48}
                color={isSpeaking ? colors.primary : colors.mutedForeground}
              />
            </View>
            <Text style={styles.listeningText}>
              {isSpeaking ? "播放中..." : "準備作答..."}
            </Text>
          </View>
        </>
      )}

      {/* Options phase */}
      {phase === "options" && (
        <>
          <CountdownText remainingMs={remainingMs} />
          <ExerciseOptions
            options={options}
            selectedIndex={null}
            correctIndex={correctIndex}
            showResult={false}
            onSelect={onSelect}
            disabled={false}
            layout={isGridLayout ? "grid" : "list"}
            showImage={isGridLayout}
          />
        </>
      )}

      {/* Result phase */}
      {phase === "result" && (
        <>
          {selectedIndex === -1 && (
            <Text style={styles.timeoutText}>時間到！</Text>
          )}
          <ExerciseOptions
            options={options}
            selectedIndex={selectedIndex}
            correctIndex={correctIndex}
            showResult={true}
            onSelect={() => {}}
            disabled={true}
            layout={isGridLayout ? "grid" : "list"}
            showImage={isGridLayout}
          />
        </>
      )}
    </View>
  );
}
