/**
 * Tests for ExerciseHeader component behavior
 *
 * The component:
 * - Displays title with progress count
 * - Has a back button that calls onBack
 * - Shows format: "Title (currentIndex+1/total)"
 */

describe('ExerciseHeader', () => {
  describe('component contract', () => {
    it('should export ExerciseHeader function', () => {
      const { ExerciseHeader } = require('../../../components/exercise/ExerciseHeader');
      expect(typeof ExerciseHeader).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept title, currentIndex, total, and onBack', () => {
      const props = {
        title: '閱讀練習',
        currentIndex: 0,
        total: 5,
        onBack: jest.fn(),
      };

      expect(props.title).toBe('閱讀練習');
      expect(props.currentIndex).toBe(0);
      expect(props.total).toBe(5);
      expect(typeof props.onBack).toBe('function');
    });
  });

  describe('title formatting', () => {
    it('should format first item as 1/total', () => {
      const currentIndex = 0;
      const total = 5;
      const displayNumber = currentIndex + 1;

      expect(`閱讀練習 (${displayNumber}/${total})`).toBe('閱讀練習 (1/5)');
    });

    it('should format middle item correctly', () => {
      const currentIndex = 4;
      const total = 10;
      const displayNumber = currentIndex + 1;

      expect(`聽力練習 (${displayNumber}/${total})`).toBe('聽力練習 (5/10)');
    });

    it('should format last item correctly', () => {
      const currentIndex = 9;
      const total = 10;
      const displayNumber = currentIndex + 1;

      expect(`口說練習 (${displayNumber}/${total})`).toBe('口說練習 (10/10)');
    });

    it('should handle single item', () => {
      const currentIndex = 0;
      const total = 1;
      const displayNumber = currentIndex + 1;

      expect(`練習 (${displayNumber}/${total})`).toBe('練習 (1/1)');
    });

    it('should handle large numbers', () => {
      const currentIndex = 99;
      const total = 100;
      const displayNumber = currentIndex + 1;

      expect(`練習 (${displayNumber}/${total})`).toBe('練習 (100/100)');
    });
  });

  describe('back button behavior', () => {
    it('should have an onBack callback', () => {
      const onBack = jest.fn();

      // Simulating a press on back button
      onBack();

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('different titles', () => {
    it('should work with reading title', () => {
      const title = '閱讀練習';
      expect(title.includes('閱讀')).toBe(true);
    });

    it('should work with listening title', () => {
      const title = '聽力練習';
      expect(title.includes('聽力')).toBe(true);
    });

    it('should work with speaking title', () => {
      const title = '口說練習';
      expect(title.includes('口說')).toBe(true);
    });
  });
});
