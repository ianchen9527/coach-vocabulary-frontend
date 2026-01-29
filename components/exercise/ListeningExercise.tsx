import { View, Text } from "react-native";
import type { RefObject } from "react";
import { Volume2 } from "lucide-react-native";
import { CountdownText } from "../ui/CountdownText";
import { ExerciseOptions } from "./ExerciseOptions";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { colors } from "../../lib/tw";
import { NextReviewTag } from "./NextReviewTag";
import type { OptionSchema, ExerciseType, NextReviewSchema } from "../../types/api";
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
  /** Coach mark 用：播放圖示 ref */
  speakerRef?: RefObject<View | null>;
  /** Coach mark 用：選項區域 ref */
  optionsRef?: RefObject<View | null>;
  /** Coach mark 用：倒數計時 ref */
  countdownRef?: RefObject<View | null>;
  /** 下次複習資訊（後端提供） */
  nextReview?: NextReviewSchema;
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
  speakerRef,
  optionsRef,
  countdownRef,
  nextReview,
}: ListeningExerciseProps) {
  const isGridLayout = exerciseType === "listening_lv1";

  return (
    <View style={styles.exerciseContainer}>
      {/* Question phase - audio playback indicator */}
      {phase === "question" && (
        <>
          <View ref={countdownRef} collapsable={false}>
            <CountdownText remainingMs={remainingMs} />
          </View>
          <View ref={speakerRef} collapsable={false}>
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
          </View>
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
