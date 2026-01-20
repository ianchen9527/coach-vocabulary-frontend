import {
  getExerciseCategory,
  getExerciseTitle,
  getPoolLabel,
  checkSpeakingAnswer,
} from '../../utils/exerciseHelpers';

describe('exerciseHelpers', () => {
  describe('getExerciseCategory', () => {
    it('should return "reading" for reading_lv1', () => {
      expect(getExerciseCategory('reading_lv1')).toBe('reading');
    });

    it('should return "reading" for reading_lv2', () => {
      expect(getExerciseCategory('reading_lv2')).toBe('reading');
    });

    it('should return "listening" for listening_lv1', () => {
      expect(getExerciseCategory('listening_lv1')).toBe('listening');
    });

    it('should return "listening" for listening_lv2', () => {
      expect(getExerciseCategory('listening_lv2')).toBe('listening');
    });

    it('should return "speaking" for speaking_lv1', () => {
      expect(getExerciseCategory('speaking_lv1')).toBe('speaking');
    });

    it('should return "speaking" for speaking_lv2', () => {
      expect(getExerciseCategory('speaking_lv2')).toBe('speaking');
    });

    it('should return "speaking" for unknown types', () => {
      expect(getExerciseCategory('unknown_type')).toBe('speaking');
    });
  });

  describe('getExerciseTitle', () => {
    describe('practice mode', () => {
      it('should return "閱讀練習" for reading category', () => {
        expect(getExerciseTitle('reading', 'practice')).toBe('閱讀練習');
      });

      it('should return "聽力練習" for listening category', () => {
        expect(getExerciseTitle('listening', 'practice')).toBe('聽力練習');
      });

      it('should return "口說練習" for speaking category', () => {
        expect(getExerciseTitle('speaking', 'practice')).toBe('口說練習');
      });

      it('should return "練習" for unknown category', () => {
        expect(getExerciseTitle('unknown', 'practice')).toBe('練習');
      });

      it('should default to practice mode when mode is not provided', () => {
        expect(getExerciseTitle('reading')).toBe('閱讀練習');
      });
    });

    describe('review mode', () => {
      it('should return "閱讀複習" for reading category', () => {
        expect(getExerciseTitle('reading', 'review')).toBe('閱讀複習');
      });

      it('should return "聽力複習" for listening category', () => {
        expect(getExerciseTitle('listening', 'review')).toBe('聽力複習');
      });

      it('should return "口說複習" for speaking category', () => {
        expect(getExerciseTitle('speaking', 'review')).toBe('口說複習');
      });

      it('should return "複習" for unknown category', () => {
        expect(getExerciseTitle('unknown', 'review')).toBe('複習');
      });
    });
  });

  describe('getPoolLabel', () => {
    it('should return "練習池 P1" for practice type with P pool', () => {
      expect(getPoolLabel('P1', 'practice')).toBe('練習池 P1');
    });

    it('should return "練習池 P3" for practice type with P pool', () => {
      expect(getPoolLabel('P3', 'practice')).toBe('練習池 P3');
    });

    it('should return "複習池 R1" for practice type with R pool', () => {
      expect(getPoolLabel('R1', 'practice')).toBe('複習池 R1');
    });

    it('should return "複習池 P1" for review type regardless of pool', () => {
      expect(getPoolLabel('P1', 'review')).toBe('複習池 P1');
    });

    it('should return "複習池 R2" for review type with R pool', () => {
      expect(getPoolLabel('R2', 'review')).toBe('複習池 R2');
    });

    it('should default to practice type when type is not provided', () => {
      expect(getPoolLabel('P2')).toBe('練習池 P2');
    });
  });

  describe('checkSpeakingAnswer', () => {
    describe('exact match', () => {
      it('should return true for exact match', () => {
        expect(checkSpeakingAnswer('apple', 'apple')).toBe(true);
      });

      it('should return true for case insensitive match', () => {
        expect(checkSpeakingAnswer('Apple', 'apple')).toBe(true);
        expect(checkSpeakingAnswer('APPLE', 'apple')).toBe(true);
        expect(checkSpeakingAnswer('apple', 'APPLE')).toBe(true);
      });

      it('should return true when transcript contains the word', () => {
        expect(checkSpeakingAnswer('I said apple', 'apple')).toBe(true);
        expect(checkSpeakingAnswer('the word is banana', 'banana')).toBe(true);
      });

      it('should handle leading and trailing whitespace', () => {
        expect(checkSpeakingAnswer('  apple  ', 'apple')).toBe(true);
        expect(checkSpeakingAnswer('apple', '  apple  ')).toBe(true);
      });
    });

    describe('phonetic matching', () => {
      it('should return true for phonetically similar words', () => {
        // "night" and "nite" have same phonetic encoding
        expect(checkSpeakingAnswer('nite', 'night')).toBe(true);
      });

      it('should return true for words that sound alike', () => {
        // "there" and "their" should match phonetically
        expect(checkSpeakingAnswer('their', 'there')).toBe(true);
        expect(checkSpeakingAnswer('there', 'their')).toBe(true);
      });

      it('should match "who" and "who\'s" phonetically', () => {
        // The transcript might include punctuation
        expect(checkSpeakingAnswer("who's", 'who')).toBe(true);
      });

      it('should handle multiple words in transcript for phonetic match', () => {
        expect(checkSpeakingAnswer('I think nite is the answer', 'night')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for empty transcript', () => {
        expect(checkSpeakingAnswer('', 'apple')).toBe(false);
      });

      it('should return false for completely different words', () => {
        expect(checkSpeakingAnswer('banana', 'apple')).toBe(false);
      });

      it('should return false for whitespace only transcript', () => {
        expect(checkSpeakingAnswer('   ', 'apple')).toBe(false);
      });

      it('should handle special characters in transcript', () => {
        expect(checkSpeakingAnswer('apple!', 'apple')).toBe(true);
        expect(checkSpeakingAnswer('apple?', 'apple')).toBe(true);
        expect(checkSpeakingAnswer('apple.', 'apple')).toBe(true);
      });

      it('should handle numbers in transcript', () => {
        expect(checkSpeakingAnswer('apple123', 'apple')).toBe(true);
      });
    });
  });
});
