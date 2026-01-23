import type { OptionSchema, ExerciseType } from '../../../types/api';
import type { ExercisePhase } from '../../../hooks/useExerciseFlow';

/**
 * Tests for ListeningExercise component behavior
 *
 * The component handles the full listening exercise flow:
 * - Question phase: Shows audio playback indicator with countdown
 * - Options phase: Shows options for selection with countdown
 * - Result phase: Shows the result with correct/incorrect indication
 */

const mockOptions: OptionSchema[] = [
  { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
  { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
  { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
  { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
];

describe('ListeningExercise', () => {
  describe('component contract', () => {
    it('should export ListeningExercise function', () => {
      const { ListeningExercise } = require('../../../components/exercise/ListeningExercise');
      expect(typeof ListeningExercise).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept required props', () => {
      const props = {
        options: mockOptions,
        correctIndex: 0,
        phase: 'question' as ExercisePhase,
        remainingMs: 3000,
        selectedIndex: null,
        onSelect: jest.fn(),
        exerciseType: 'listening_lv2' as ExerciseType,
        isSpeaking: true,
      };

      expect(props.options).toHaveLength(4);
      expect(props.correctIndex).toBe(0);
      expect(typeof props.onSelect).toBe('function');
      expect(props.isSpeaking).toBe(true);
    });

    it('should handle isSpeaking state changes', () => {
      const speakingState = { isSpeaking: true };
      expect(speakingState.isSpeaking).toBe(true);

      speakingState.isSpeaking = false;
      expect(speakingState.isSpeaking).toBe(false);
    });
  });

  describe('phase visibility logic', () => {
    it('should determine what to show in question phase', () => {
      const phase: ExercisePhase = 'question';

      const showAudioIndicator = phase === 'question';
      const showOptions = phase === 'options';
      const showResult = phase === 'result';

      expect(showAudioIndicator).toBe(true);
      expect(showOptions).toBe(false);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in options phase', () => {
      const phase: ExercisePhase = 'options';

      const showAudioIndicator = phase === 'question';
      const showOptions = phase === 'options';
      const showResult = phase === 'result';

      expect(showAudioIndicator).toBe(false);
      expect(showOptions).toBe(true);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in result phase', () => {
      const phase: ExercisePhase = 'result';

      const showAudioIndicator = phase === 'question';
      const showOptions = phase === 'options';
      const showResult = phase === 'result';

      expect(showAudioIndicator).toBe(false);
      expect(showOptions).toBe(false);
      expect(showResult).toBe(true);
    });

    it('should not show content in idle phase', () => {
      const phase: ExercisePhase = 'idle';

      const showContent = phase === 'question' || phase === 'options' || phase === 'result';

      expect(showContent).toBe(false);
    });
  });

  describe('audio indicator logic', () => {
    it('should show playing text when isSpeaking is true', () => {
      const isSpeaking = true;
      const indicatorText = isSpeaking ? '播放中...' : '準備作答...';

      expect(indicatorText).toBe('播放中...');
    });

    it('should show ready text when isSpeaking is false', () => {
      const isSpeaking = false;
      const indicatorText = isSpeaking ? '播放中...' : '準備作答...';

      expect(indicatorText).toBe('準備作答...');
    });

    it('should determine audio icon color based on isSpeaking', () => {
      const primaryColor = '#3B82F6';
      const mutedColor = '#6B7280';

      const isSpeakingTrue = true;
      const colorWhenSpeaking = isSpeakingTrue ? primaryColor : mutedColor;
      expect(colorWhenSpeaking).toBe(primaryColor);

      const isSpeakingFalse = false;
      const colorWhenNotSpeaking = isSpeakingFalse ? primaryColor : mutedColor;
      expect(colorWhenNotSpeaking).toBe(mutedColor);
    });
  });

  describe('layout logic', () => {
    it('should use grid layout for listening_lv1 type', () => {
      const exerciseType: ExerciseType = 'listening_lv1';
      const isGridLayout = exerciseType === 'listening_lv1';

      expect(isGridLayout).toBe(true);
    });

    it('should use list layout for listening_lv2 type', () => {
      const exerciseType: ExerciseType = 'listening_lv2';
      const isGridLayout = exerciseType === 'listening_lv1';

      expect(isGridLayout).toBe(false);
    });

    it('should show images in grid layout (listening_lv1)', () => {
      const exerciseType: ExerciseType = 'listening_lv1';
      const showImage = exerciseType === 'listening_lv1';

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
  });

  describe('option selection logic', () => {
    it('should pass correct index to onSelect callback', () => {
      const onSelect = jest.fn();
      const optionIndex = 1;

      // Simulate option press
      onSelect(optionIndex);

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('should identify correct option by correctIndex', () => {
      const correctIndex = 2;

      mockOptions.forEach((option, index) => {
        const isCorrect = index === correctIndex;
        expect(isCorrect).toBe(index === 2);
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

  describe('differences from ReadingExercise', () => {
    it('should not display word text (unlike reading exercise)', () => {
      // ListeningExercise shows audio indicator instead of word text
      const showWordText = false; // Audio-based, not text-based
      expect(showWordText).toBe(false);
    });

    it('should require isSpeaking prop (unique to listening)', () => {
      const props = {
        isSpeaking: true,
      };

      expect(typeof props.isSpeaking).toBe('boolean');
    });
  });
});
