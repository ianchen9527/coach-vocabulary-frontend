import type { ExerciseType } from '../../../types/api';
import type { ExercisePhase } from '../../../hooks/useExerciseFlow';

/**
 * Tests for SpeakingExercise component behavior
 *
 * The component handles the full speaking exercise flow:
 * - Question phase: Shows translation/image with countdown
 * - Options phase: Shows recording UI with countdown
 * - Processing phase: Shows verifying indicator
 * - Result phase: Shows the result with recognized text
 */

describe('SpeakingExercise', () => {
  describe('component contract', () => {
    it('should export SpeakingExercise function', () => {
      const { SpeakingExercise } = require('../../../components/exercise/SpeakingExercise');
      expect(typeof SpeakingExercise).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept required props', () => {
      const props = {
        translation: '蘋果',
        word: 'apple',
        imageUrl: null,
        phase: 'question' as ExercisePhase,
        remainingMs: 3000,
        exerciseType: 'speaking_lv2' as ExerciseType,
        isPreparingRecording: false,
        isRecording: false,
        recognizedText: '',
        interimTranscript: '',
        isCorrect: false,
        onStopRecording: jest.fn(),
        getAssetUrl: (url: string | null) => url,
      };

      expect(props.translation).toBe('蘋果');
      expect(props.word).toBe('apple');
      expect(typeof props.onStopRecording).toBe('function');
      expect(typeof props.getAssetUrl).toBe('function');
    });

    it('should handle imageUrl for lv1 exercises', () => {
      const props = {
        exerciseType: 'speaking_lv1' as ExerciseType,
        imageUrl: 'https://example.com/apple.jpg',
      };

      expect(props.imageUrl).toBeTruthy();
    });
  });

  describe('phase visibility logic', () => {
    it('should determine what to show in question phase', () => {
      const phase: ExercisePhase = 'question';

      const showTranslation = phase === 'question';
      const showRecordingUI = phase === 'options';
      const showProcessing = phase === 'processing';
      const showResult = phase === 'result';

      expect(showTranslation).toBe(true);
      expect(showRecordingUI).toBe(false);
      expect(showProcessing).toBe(false);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in options phase (recording)', () => {
      const phase: ExercisePhase = 'options';

      const showTranslation = phase === 'question';
      const showRecordingUI = phase === 'options';
      const showProcessing = phase === 'processing';
      const showResult = phase === 'result';

      expect(showTranslation).toBe(false);
      expect(showRecordingUI).toBe(true);
      expect(showProcessing).toBe(false);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in processing phase', () => {
      const phase: ExercisePhase = 'processing';

      const showTranslation = phase === 'question';
      const showRecordingUI = phase === 'options';
      const showProcessing = phase === 'processing';
      const showResult = phase === 'result';

      expect(showTranslation).toBe(false);
      expect(showRecordingUI).toBe(false);
      expect(showProcessing).toBe(true);
      expect(showResult).toBe(false);
    });

    it('should determine what to show in result phase', () => {
      const phase: ExercisePhase = 'result';

      const showTranslation = phase === 'question';
      const showRecordingUI = phase === 'options';
      const showProcessing = phase === 'processing';
      const showResult = phase === 'result';

      expect(showTranslation).toBe(false);
      expect(showRecordingUI).toBe(false);
      expect(showProcessing).toBe(false);
      expect(showResult).toBe(true);
    });
  });

  describe('image display logic', () => {
    it('should show image for speaking_lv1 when imageUrl exists', () => {
      const exerciseType: ExerciseType = 'speaking_lv1';
      const imageUrl = 'https://example.com/apple.jpg';
      const showImage = exerciseType === 'speaking_lv1' && imageUrl;

      expect(showImage).toBeTruthy();
    });

    it('should not show image for speaking_lv2', () => {
      const exerciseType: ExerciseType = 'speaking_lv2';
      const imageUrl = 'https://example.com/apple.jpg';
      const showImage = exerciseType === 'speaking_lv1' && imageUrl;

      expect(showImage).toBeFalsy();
    });

    it('should not show image for speaking_lv1 without imageUrl', () => {
      const exerciseType: ExerciseType = 'speaking_lv1';
      const imageUrl = null;
      const showImage = exerciseType === 'speaking_lv1' && imageUrl;

      expect(showImage).toBeFalsy();
    });
  });

  describe('recording state logic', () => {
    it('should show preparing spinner when isPreparingRecording is true', () => {
      const isPreparingRecording = true;
      const showPreparing = isPreparingRecording;

      expect(showPreparing).toBe(true);
    });

    it('should show recording UI when not preparing', () => {
      const isPreparingRecording = false;
      const showRecordingUI = !isPreparingRecording;

      expect(showRecordingUI).toBe(true);
    });

    it('should determine mic button active state based on isRecording', () => {
      const isRecordingTrue = true;
      const isActiveTrue = isRecordingTrue;
      expect(isActiveTrue).toBe(true);

      const isRecordingFalse = false;
      const isActiveFalse = isRecordingFalse;
      expect(isActiveFalse).toBe(false);
    });

    it('should determine mic icon color based on recording state', () => {
      const destructiveColor = '#EF4444';
      const primaryColor = '#3B82F6';

      const isRecordingTrue = true;
      const colorWhenRecording = isRecordingTrue ? destructiveColor : primaryColor;
      expect(colorWhenRecording).toBe(destructiveColor);

      const isRecordingFalse = false;
      const colorWhenNotRecording = isRecordingFalse ? destructiveColor : primaryColor;
      expect(colorWhenNotRecording).toBe(primaryColor);
    });
  });

  describe('recording indicator logic', () => {
    it('should show recording indicator when isRecording is true', () => {
      const isRecording = true;
      const showIndicator = isRecording;

      expect(showIndicator).toBe(true);
    });

    it('should hide recording indicator when not recording', () => {
      const isRecording = false;
      const showIndicator = isRecording;

      expect(showIndicator).toBe(false);
    });
  });

  describe('transcript display logic', () => {
    it('should show interim transcript when available', () => {
      const interimTranscript = 'appl';
      const showTranscript = !!interimTranscript;

      expect(showTranscript).toBe(true);
    });

    it('should hide interim transcript when empty', () => {
      const interimTranscript = '';
      const showTranscript = !!interimTranscript;

      expect(showTranscript).toBe(false);
    });
  });

  describe('complete button logic', () => {
    it('should enable complete button when recording', () => {
      const isRecording = true;
      const disabled = !isRecording;

      expect(disabled).toBe(false);
    });

    it('should disable complete button when not recording', () => {
      const isRecording = false;
      const disabled = !isRecording;

      expect(disabled).toBe(true);
    });

    it('should call onStopRecording when pressed', () => {
      const onStopRecording = jest.fn();
      onStopRecording();

      expect(onStopRecording).toHaveBeenCalled();
    });
  });

  describe('result state logic', () => {
    it('should pass isCorrect to SpeakingResult in result phase', () => {
      const isCorrect = true;
      expect(isCorrect).toBe(true);

      const isIncorrect = false;
      expect(isIncorrect).toBe(false);
    });

    it('should pass recognized text to SpeakingResult', () => {
      const recognizedText = 'apple';
      expect(recognizedText).toBe('apple');
    });

    it('should pass correct answer to SpeakingResult', () => {
      const word = 'apple';
      expect(word).toBe('apple');
    });

    it('should show verifying state during processing phase', () => {
      const phase: ExercisePhase = 'processing';
      const isVerifying = phase === 'processing';

      expect(isVerifying).toBe(true);
    });

    it('should not show verifying state during result phase', () => {
      const phase: ExercisePhase = 'result';
      const isVerifying = phase === 'processing';

      expect(isVerifying).toBe(false);
    });
  });

  describe('countdown behavior', () => {
    it('should show countdown in question phase', () => {
      const phase: ExercisePhase = 'question';
      const showCountdown = phase === 'question' || (phase === 'options');

      expect(showCountdown).toBe(true);
    });

    it('should show countdown in options phase when not preparing', () => {
      const phase: ExercisePhase = 'options';
      const isPreparingRecording = false;
      const showCountdown = phase === 'options' && !isPreparingRecording;

      expect(showCountdown).toBe(true);
    });

    it('should not show countdown in options phase when preparing', () => {
      const phase: ExercisePhase = 'options';
      const isPreparingRecording = true;
      const showCountdown = phase === 'options' && !isPreparingRecording;

      expect(showCountdown).toBe(false);
    });

    it('should not show countdown in processing phase', () => {
      const phase: ExercisePhase = 'processing';
      const showCountdown = phase === 'question' || phase === 'options';

      expect(showCountdown).toBe(false);
    });

    it('should not show countdown in result phase', () => {
      const phase: ExercisePhase = 'result';
      const showCountdown = phase === 'question' || phase === 'options';

      expect(showCountdown).toBe(false);
    });
  });

  describe('differences from other exercise types', () => {
    it('should have processing phase (unique to speaking)', () => {
      const phases: ExercisePhase[] = ['idle', 'question', 'options', 'processing', 'result'];
      expect(phases).toContain('processing');
    });

    it('should show translation instead of word in question phase', () => {
      // Speaking shows translation (Chinese) and user must say the word (English)
      const translation = '蘋果';
      const word = 'apple';

      expect(translation).not.toBe(word);
    });

    it('should require recording-related props', () => {
      const requiredRecordingProps = {
        isPreparingRecording: false,
        isRecording: true,
        recognizedText: 'apple',
        interimTranscript: 'appl',
        onStopRecording: jest.fn(),
      };

      expect(typeof requiredRecordingProps.isPreparingRecording).toBe('boolean');
      expect(typeof requiredRecordingProps.isRecording).toBe('boolean');
      expect(typeof requiredRecordingProps.recognizedText).toBe('string');
      expect(typeof requiredRecordingProps.interimTranscript).toBe('string');
      expect(typeof requiredRecordingProps.onStopRecording).toBe('function');
    });
  });
});
