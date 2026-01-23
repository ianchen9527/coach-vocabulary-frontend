import { View, Text } from "react-native";
import { CountdownText } from "../ui/CountdownText";
import { ExerciseOptions } from "./ExerciseOptions";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import type { OptionSchema, ExerciseType } from "../../types/api";
import type { ExercisePhase } from "../../hooks/useExerciseFlow";

export interface ReadingExerciseProps {
  /** The word to display in the question phase */
  word: string;
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
  /** The exercise type (reading_lv1, reading_lv2) */
  exerciseType: ExerciseType;
}

/**
 * ReadingExercise component handles the reading exercise flow:
 * - Question phase: Shows the word with countdown
 * - Options phase: Shows options for selection with countdown
 * - Result phase: Shows the result with correct/incorrect indication
 */
export function ReadingExercise({
  word,
  options,
  correctIndex,
  phase,
  remainingMs,
  selectedIndex,
  onSelect,
  exerciseType,
}: ReadingExerciseProps) {
  const isGridLayout = exerciseType === "reading_lv1";

  return (
    <View style={styles.exerciseContainer}>
      {/* Question phase */}
      {phase === "question" && (
        <>
          <CountdownText remainingMs={remainingMs} />
          <Text style={styles.readingWord}>{word}</Text>
          <Text style={styles.readingInstruction}>準備作答...</Text>
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
