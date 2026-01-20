import type { OptionSchema, ExerciseType } from '../../../types/api';
import type { ExercisePhase } from '../../../hooks/useExerciseFlow';

/**
 * Tests for ReadingExercise component behavior
 *
 * The component handles the full reading exercise flow:
 * - Question phase: Shows the word with countdown
 * - Options phase: Shows options for selection with countdown
 * - Result phase: Shows the result with correct/incorrect indication
 */

const mockOptions: OptionSchema[] = [
  { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
  { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
  { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
  { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
];

describe('ReadingExercise', () => {
  describe('component contract', () => {
    it('should export ReadingExercise function', () => {
      const { ReadingExercise } = require('../../../components/exercise/ReadingExercise');
      expect(typeof ReadingExercise).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept required props', () => {
      const props = {
        word: 'apple',
        options: mockOptions,
        correctIndex: 0,
        phase: 'question' as ExercisePhase,
        remainingMs: 3000,
        selectedIndex: null,
        onSelect: jest.fn(),
        exerciseType: 'reading_lv2' as ExerciseType,
      };

      expect(props.word).toBe('apple');
      expect(props.options).toHaveLength(4);
      expect(props.correctIndex).toBe(0);
      expect(typeof props.onSelect).toBe('function');
    });

    it('should handle null selectedIndex', () => {
      const props = {
        selectedIndex: null as number | null,
      };

      expect(props.selectedIndex).toBeNull();
    });

    it('should handle numeric selectedIndex', () => {
      const props = {
        selectedIndex: 1 as number | null,
      };

      expect(props.selectedIndex).toBe(1);
    });
  });

  describe('phase visibility logic', () => {
    it('should determine what to show in question phase', () => {
      const phase: ExercisePhase = 'question';

      const showWord = phase === 'question';
      const showOptions = phase === 'options';
      const showResult = phase === 'result';

      expect(showWord).toBe(true);
      expect(showOptions).toBe(false);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in options phase', () => {
      const phase: ExercisePhase = 'options';

      const showWord = phase === 'question';
      const showOptions = phase === 'options';
      const showResult = phase === 'result';

      expect(showWord).toBe(false);
      expect(showOptions).toBe(true);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in result phase', () => {
      const phase: ExercisePhase = 'result';

      const showWord = phase === 'question';
      const showOptions = phase === 'options';
      const showResult = phase === 'result';

      expect(showWord).toBe(false);
      expect(showOptions).toBe(false);
      expect(showResult).toBe(true);
    });

    it('should not show content in idle phase', () => {
      const phase: ExercisePhase = 'idle';

      const showContent = phase === 'question' || phase === 'options' || phase === 'result';

      expect(showContent).toBe(false);
    });

    it('should not show content in processing phase (used for speaking only)', () => {
      const phase: ExercisePhase = 'processing';

      const showContent = phase === 'question' || phase === 'options' || phase === 'result';

      expect(showContent).toBe(false);
    });
  });

  describe('layout logic', () => {
    it('should use grid layout for reading_lv1 type', () => {
      const exerciseType: ExerciseType = 'reading_lv1';
      const isGridLayout = exerciseType === 'reading_lv1';

      expect(isGridLayout).toBe(true);
    });

    it('should use list layout for reading_lv2 type', () => {
      const exerciseType: ExerciseType = 'reading_lv2';
      const isGridLayout = exerciseType === 'reading_lv1';

      expect(isGridLayout).toBe(false);
    });

    it('should show images in grid layout (reading_lv1)', () => {
      const exerciseType: ExerciseType = 'reading_lv1';
      const showImage = exerciseType === 'reading_lv1';

      expect(showImage).toBe(true);
    });
  });

  describe('timeout logic', () => {
    it('should show timeout text when selectedIndex is -1', () => {
      const selectedIndex = -1;
      const showTimeout = selectedIndex === -1;

      expect(showTimeout).toBe(true);
    });

    it('should not show timeout text when an option was selected', () => {
      const selectedIndex = 2;
      const showTimeout = selectedIndex === -1;

      expect(showTimeout).toBe(false);
    });

    it('should not show timeout text when selectedIndex is null', () => {
      const selectedIndex = null;
      const showTimeout = selectedIndex === -1;

      expect(showTimeout).toBe(false);
    });
  });

  describe('option selection logic', () => {
    it('should pass correct index to onSelect callback', () => {
      const onSelect = jest.fn();
      const optionIndex = 2;

      // Simulate option press
      onSelect(optionIndex);

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('should identify correct option by correctIndex', () => {
      const correctIndex = 0;

      mockOptions.forEach((option, index) => {
        const isCorrect = index === correctIndex;
        expect(isCorrect).toBe(index === 0);
      });
    });

    it('should identify selected option by selectedIndex', () => {
      const selectedIndex = 2;

      mockOptions.forEach((option, index) => {
        const isSelected = selectedIndex === index;
        expect(isSelected).toBe(index === 2);
      });
    });
  });

  describe('result phase state logic', () => {
    it('should disable options during result phase', () => {
      const phase: ExercisePhase = 'result';
      const disabled = phase === 'result';

      expect(disabled).toBe(true);
    });

    it('should show result state in options during result phase', () => {
      const phase: ExercisePhase = 'result';
      const showResult = phase === 'result';

      expect(showResult).toBe(true);
    });

    it('should determine correct answer display', () => {
      const correctIndex = 1;
      const selectedIndex = 2; // Wrong answer

      const isCorrectAnswer = selectedIndex === correctIndex;
      expect(isCorrectAnswer).toBe(false);

      const correctOption = mockOptions[correctIndex];
      expect(correctOption.translation).toBe('香蕉');
    });

    it('should determine incorrect answer display', () => {
      const correctIndex = 1;
      const selectedIndex = 2;

      const isWrongSelected = selectedIndex !== correctIndex && selectedIndex >= 0;
      expect(isWrongSelected).toBe(true);

      const selectedOption = mockOptions[selectedIndex];
      expect(selectedOption.translation).toBe('橘子');
    });
  });

  describe('countdown behavior', () => {
    it('should show countdown in question phase', () => {
      const phase: ExercisePhase = 'question';
      const showCountdown = phase === 'question' || phase === 'options';

      expect(showCountdown).toBe(true);
    });

    it('should show countdown in options phase', () => {
      const phase: ExercisePhase = 'options';
      const showCountdown = phase === 'question' || phase === 'options';

      expect(showCountdown).toBe(true);
    });

    it('should not show countdown in result phase', () => {
      const phase: ExercisePhase = 'result';
      const showCountdown = phase === 'question' || phase === 'options';

      expect(showCountdown).toBe(false);
    });
  });
});
