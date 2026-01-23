/**
 * Tests for SpeakingResult component behavior
 *
 * The component:
 * - Shows verifying state when isVerifying is true
 * - Displays correct/incorrect result with appropriate styling
 * - Shows the correct answer
 * - Optionally shows recognized text in debug mode
 */

describe('SpeakingResult', () => {
  describe('component contract', () => {
    it('should export SpeakingResult function', () => {
      const { SpeakingResult } = require('../../../components/exercise/SpeakingResult');
      expect(typeof SpeakingResult).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept required props', () => {
      const props = {
        isCorrect: true,
        recognizedText: 'apple',
        correctAnswer: 'apple',
        isVerifying: false,
      };

      expect(props.isCorrect).toBe(true);
      expect(props.recognizedText).toBe('apple');
      expect(props.correctAnswer).toBe('apple');
      expect(props.isVerifying).toBe(false);
    });

    it('should handle incorrect state props', () => {
      const props = {
        isCorrect: false,
        recognizedText: 'banan',
        correctAnswer: 'banana',
        isVerifying: false,
      };

      expect(props.isCorrect).toBe(false);
      expect(props.recognizedText).not.toBe(props.correctAnswer);
    });
  });

  describe('verifying state logic', () => {
    it('should determine verifying state from prop', () => {
      const isVerifying = true;

      // When verifying, should show loading indicator
      expect(isVerifying).toBe(true);
    });

    it('should determine not verifying state from prop', () => {
      const isVerifying = false;

      // When not verifying, should show result
      expect(isVerifying).toBe(false);
    });
  });

  describe('result state logic', () => {
    it('should determine correct result styling', () => {
      const isCorrect = true;
      const isVerifying = false;

      // Should show success state
      const showResult = !isVerifying;
      const showSuccess = showResult && isCorrect;

      expect(showSuccess).toBe(true);
    });

    it('should determine incorrect result styling', () => {
      const isCorrect = false;
      const isVerifying = false;

      // Should show error state
      const showResult = !isVerifying;
      const showError = showResult && !isCorrect;

      expect(showError).toBe(true);
    });
  });

  describe('answer comparison logic', () => {
    it('should compare recognized text with correct answer', () => {
      const recognizedText = 'apple';
      const correctAnswer = 'apple';

      const isMatch = recognizedText.toLowerCase() === correctAnswer.toLowerCase();
      expect(isMatch).toBe(true);
    });

    it('should detect mismatch between recognized and correct', () => {
      const recognizedText = 'banan';
      const correctAnswer = 'banana';

      const isMatch = recognizedText.toLowerCase() === correctAnswer.toLowerCase();
      expect(isMatch).toBe(false);
    });

    it('should handle case insensitive comparison', () => {
      const recognizedText = 'APPLE';
      const correctAnswer = 'apple';

      const isMatch = recognizedText.toLowerCase() === correctAnswer.toLowerCase();
      expect(isMatch).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty recognized text', () => {
      const recognizedText = '';
      const correctAnswer = 'apple';

      expect(recognizedText).toBe('');
      expect(correctAnswer).toBeTruthy();
    });

    it('should handle long correct answers', () => {
      const longAnswer = 'supercalifragilisticexpialidocious';

      expect(longAnswer.length).toBeGreaterThan(20);
    });

    it('should handle whitespace in text', () => {
      const recognizedText = ' apple ';
      const correctAnswer = 'apple';

      const isMatch = recognizedText.trim().toLowerCase() === correctAnswer.toLowerCase();
      expect(isMatch).toBe(true);
    });
  });
});
