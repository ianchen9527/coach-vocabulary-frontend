import { View, Text } from "react-native";
import type { RefObject } from "react";
import { CountdownText } from "../ui/CountdownText";
import { ExerciseOptions } from "./ExerciseOptions";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { NextReviewTag } from "./NextReviewTag";
import type { OptionSchema, ExerciseType, NextReviewSchema } from "../../types/api";
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
  /** Coach mark 用：單字文字 ref */
  wordRef?: RefObject<View | null>;
  /** Coach mark 用：選項區域 ref */
  optionsRef?: RefObject<View | null>;
  /** Coach mark 用：倒數計時 ref */
  countdownRef?: RefObject<View | null>;
  /** 下次複習資訊（後端提供） */
  nextReview?: NextReviewSchema;
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
  wordRef,
  optionsRef,
  countdownRef,
  nextReview,
}: ReadingExerciseProps) {
  const isGridLayout = exerciseType === "reading_lv1";

  return (
    <View style={styles.exerciseContainer}>
      {/* Question phase */}
      {phase === "question" && (
        <>
          <View ref={countdownRef} collapsable={false}>
            <CountdownText remainingMs={remainingMs} />
          </View>
          <View ref={wordRef} collapsable={false}>
            <Text style={styles.readingWord}>{word}</Text>
          </View>
          <Text style={styles.readingInstruction}>準備作答...</Text>
        </>
      )}

      {/* Options phase */}
      {phase === "options" && (
        <>
          <View ref={countdownRef} collapsable={false}>
            <CountdownText remainingMs={remainingMs} />
          </View>
          <View ref={optionsRef} collapsable={false} style={{ width: "100%" }}>
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
          </View>
        </>
      )}

      {/* Result phase */}
      {phase === "result" && (
        <>
          {selectedIndex === -1 && (
            <Text style={styles.timeoutText}>時間到！</Text>
          )}
          {nextReview && (
            <NextReviewTag
              nextReview={nextReview}
              isCorrect={selectedIndex !== null && selectedIndex !== -1 && selectedIndex === correctIndex}
            />
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
