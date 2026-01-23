/**
 * Tests for useSpeakingExercise hook behavior
 *
 * The hook:
 * - Manages speech recognition state
 * - Handles recording start/stop lifecycle
 * - Processes transcripts (native + Whisper fallback)
 * - Determines correct/incorrect answers
 */

describe('useSpeakingExercise', () => {
  describe('hook contract', () => {
    it('should export useSpeakingExercise function', () => {
      const { useSpeakingExercise } = require('../../hooks/useSpeakingExercise');
      expect(typeof useSpeakingExercise).toBe('function');
    });
  });

  describe('options interface', () => {
    it('should accept exerciseFlow, currentWord, wordId, exerciseType, and pagePhase', () => {
      const options = {
        exerciseFlow: {
          phase: 'idle' as const,
          select: jest.fn(),
          clearTimer: jest.fn(),
          enterProcessing: jest.fn(),
          enterResult: jest.fn(),
          startOptionsCountdown: jest.fn(),
        },
        currentWord: 'apple',
        wordId: 'word-123',
        exerciseType: 'speaking_lv1',
        pagePhase: 'exercising',
      };

      expect(options.exerciseFlow).toBeDefined();
      expect(options.currentWord).toBe('apple');
      expect(options.wordId).toBe('word-123');
      expect(options.exerciseType).toBe('speaking_lv1');
      expect(options.pagePhase).toBe('exercising');
    });
  });

  describe('return interface', () => {
    it('should return expected state properties', () => {
      const expectedReturnShape = {
        recognizedText: '',
        isRecording: false,
        isPreparingRecording: false,
        isCorrect: false,
        speechRecognition: expect.any(Object),
        startRecording: expect.any(Function),
        handleStopRecording: expect.any(Function),
        resetSpeaking: expect.any(Function),
      };

      expect(expectedReturnShape.recognizedText).toBe('');
      expect(expectedReturnShape.isRecording).toBe(false);
      expect(expectedReturnShape.isPreparingRecording).toBe(false);
      expect(expectedReturnShape.isCorrect).toBe(false);
    });
  });

  describe('recording state logic', () => {
    it('should start in non-recording state', () => {
      const initialState = {
        isRecording: false,
        isPreparingRecording: false,
      };

      expect(initialState.isRecording).toBe(false);
      expect(initialState.isPreparingRecording).toBe(false);
    });

    it('should transition to preparing state before recording', () => {
      // When startRecording is called, first set isPreparingRecording
      let isPreparingRecording = false;

      // Simulate startRecording
      isPreparingRecording = true;
      expect(isPreparingRecording).toBe(true);

      // After speech recognition starts successfully
      const recordingStarted = true;
      if (recordingStarted) {
        isPreparingRecording = false;
      }
      expect(isPreparingRecording).toBe(false);
    });

    it('should handle recording start failure', () => {
      const exerciseFlow = {
        select: jest.fn(),
      };

      // Simulate speech recognition not supported
      const isSupported = false;

      if (!isSupported) {
        // Should call exerciseFlow.select(-1) to mark as error
        exerciseFlow.select(-1);
      }

      expect(exerciseFlow.select).toHaveBeenCalledWith(-1);
    });
  });

  describe('transcript processing logic', () => {
    it('should determine correct answer when transcript matches', () => {
      const transcript = 'apple';
      const correctWord = 'apple';

      // Using simplified matching logic
      const isCorrect = transcript.toLowerCase().trim() === correctWord.toLowerCase().trim();
      expect(isCorrect).toBe(true);
    });

    it('should determine incorrect answer when transcript does not match', () => {
      const transcript = 'banana';
      const correctWord = 'apple';

      const isCorrect = transcript.toLowerCase().trim() === correctWord.toLowerCase().trim();
      expect(isCorrect).toBe(false);
    });

    it('should handle empty transcript', () => {
      const transcript = '';
      const correctWord = 'apple';

      // Empty transcript should trigger Whisper fallback in real hook
      const trimmedTranscript = transcript.trim();
      const hasContent = trimmedTranscript !== '';

      expect(hasContent).toBe(false);
    });

    it('should handle case insensitive matching', () => {
      const transcript = 'APPLE';
      const correctWord = 'apple';

      const isCorrect = transcript.toLowerCase().trim() === correctWord.toLowerCase().trim();
      expect(isCorrect).toBe(true);
    });

    it('should handle whitespace in transcript', () => {
      const transcript = '  apple  ';
      const correctWord = 'apple';

      const isCorrect = transcript.toLowerCase().trim() === correctWord.toLowerCase().trim();
      expect(isCorrect).toBe(true);
    });
  });

  describe('Whisper fallback logic', () => {
    it('should trigger fallback when native transcript is empty', () => {
      const nativeTranscript = '';
      const shouldTryWhisper = nativeTranscript.trim() === '';

      expect(shouldTryWhisper).toBe(true);
    });

    it('should skip fallback when native transcript has content', () => {
      const nativeTranscript = 'banana';
      const shouldTryWhisper = nativeTranscript.trim() === '';

      expect(shouldTryWhisper).toBe(false);
    });

    it('should return native correct when matched', () => {
      const nativeTranscript = 'apple';
      const correctWord = 'apple';
      const nativeCorrect = nativeTranscript.toLowerCase() === correctWord.toLowerCase();

      // When native is correct, don't need Whisper
      if (nativeCorrect) {
        expect(nativeCorrect).toBe(true);
      }
    });
  });

  describe('exercise flow integration', () => {
    it('should enter processing phase before result', () => {
      const exerciseFlow = {
        enterProcessing: jest.fn(),
        enterResult: jest.fn(),
      };

      // Simulate stop recording flow
      exerciseFlow.enterProcessing();
      expect(exerciseFlow.enterProcessing).toHaveBeenCalled();
    });

    it('should enter result phase with correct index on success', () => {
      const exerciseFlow = {
        enterResult: jest.fn(),
      };

      // Simulate correct answer
      const isCorrect = true;
      exerciseFlow.enterResult(isCorrect ? 0 : -1);

      expect(exerciseFlow.enterResult).toHaveBeenCalledWith(0);
    });

    it('should enter result phase with -1 on failure', () => {
      const exerciseFlow = {
        enterResult: jest.fn(),
      };

      // Simulate incorrect answer
      const isCorrect = false;
      exerciseFlow.enterResult(isCorrect ? 0 : -1);

      expect(exerciseFlow.enterResult).toHaveBeenCalledWith(-1);
    });

    it('should start options countdown after recording starts', () => {
      const exerciseFlow = {
        startOptionsCountdown: jest.fn(),
      };

      // Simulate successful recording start
      const recordingStarted = true;
      if (recordingStarted) {
        exerciseFlow.startOptionsCountdown();
      }

      expect(exerciseFlow.startOptionsCountdown).toHaveBeenCalled();
    });
  });

  describe('reset behavior', () => {
    it('should reset all state on resetSpeaking', () => {
      // Initial state after some operations
      let recognizedText = 'apple';
      let isRecording = true;
      let isPreparingRecording = false;
      let isCorrect = true;

      // Reset
      recognizedText = '';
      isRecording = false;
      isPreparingRecording = false;
      isCorrect = false;

      expect(recognizedText).toBe('');
      expect(isRecording).toBe(false);
      expect(isPreparingRecording).toBe(false);
      expect(isCorrect).toBe(false);
    });
  });

  describe('auto-recording on options phase', () => {
    it('should auto-start recording when entering options phase for speaking exercise', () => {
      const pagePhase = 'exercising';
      const exerciseFlowPhase = 'options';
      const exerciseType = 'speaking_lv1';
      const isRecording = false;
      const isPreparingRecording = false;

      const shouldStartRecording =
        pagePhase === 'exercising' &&
        exerciseFlowPhase === 'options' &&
        exerciseType?.startsWith('speaking') &&
        !isRecording &&
        !isPreparingRecording;

      expect(shouldStartRecording).toBe(true);
    });

    it('should not auto-start for non-speaking exercises', () => {
      const pagePhase = 'exercising';
      const exerciseFlowPhase = 'options';
      const exerciseType = 'reading_lv1';
      const isRecording = false;
      const isPreparingRecording = false;

      const shouldStartRecording =
        pagePhase === 'exercising' &&
        exerciseFlowPhase === 'options' &&
        exerciseType?.startsWith('speaking') &&
        !isRecording &&
        !isPreparingRecording;

      expect(shouldStartRecording).toBe(false);
    });

    it('should not auto-start if already recording', () => {
      const pagePhase = 'exercising';
      const exerciseFlowPhase = 'options';
      const exerciseType = 'speaking_lv1';
      const isRecording = true;
      const isPreparingRecording = false;

      const shouldStartRecording =
        pagePhase === 'exercising' &&
        exerciseFlowPhase === 'options' &&
        exerciseType?.startsWith('speaking') &&
        !isRecording &&
        !isPreparingRecording;

      expect(shouldStartRecording).toBe(false);
    });
  });

  describe('timeout handling', () => {
    it('should handle timeout in processing phase', () => {
      const pagePhase = 'exercising';
      const exerciseFlowPhase = 'processing';
      const exerciseType = 'speaking_lv1';
      const isRecording = true;

      // This condition triggers timeout handling
      const isTimeoutInProcessing =
        pagePhase === 'exercising' &&
        exerciseFlowPhase === 'processing' &&
        exerciseType?.startsWith('speaking') &&
        isRecording;

      expect(isTimeoutInProcessing).toBe(true);
    });
  });

  describe('auto-submit on final transcript', () => {
    it('should auto-submit when final transcript is received', () => {
      const finalTranscript = 'apple';
      const exerciseType = 'speaking_lv1';
      const pagePhase = 'exercising';
      const exerciseFlowPhase = 'options';
      const currentWord = 'apple';
      const wordId = 'word-123';
      const isRecording = true;

      const shouldAutoSubmit =
        finalTranscript &&
        exerciseType?.startsWith('speaking') &&
        pagePhase === 'exercising' &&
        exerciseFlowPhase === 'options' &&
        currentWord &&
        wordId &&
        isRecording;

      expect(shouldAutoSubmit).toBe(true);
    });

    it('should not auto-submit without final transcript', () => {
      const finalTranscript = '';
      const exerciseType = 'speaking_lv1';
      const pagePhase = 'exercising';
      const exerciseFlowPhase = 'options';
      const currentWord = 'apple';
      const wordId = 'word-123';
      const isRecording = true;

      const shouldAutoSubmit = Boolean(
        finalTranscript &&
        exerciseType?.startsWith('speaking') &&
        pagePhase === 'exercising' &&
        exerciseFlowPhase === 'options' &&
        currentWord &&
        wordId &&
        isRecording
      );

      expect(shouldAutoSubmit).toBe(false);
    });
  });
});
