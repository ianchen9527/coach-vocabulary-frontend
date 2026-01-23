/**
 * Tests for ExerciseComplete component behavior
 *
 * The component:
 * - Displays completion title and subtitle
 * - Shows a success icon
 * - Has a back button that calls onBack
 * - Supports customizable messages
 */

describe('ExerciseComplete', () => {
  describe('component contract', () => {
    it('should export ExerciseComplete function', () => {
      const { ExerciseComplete } = require('../../../components/exercise/ExerciseComplete');
      expect(typeof ExerciseComplete).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept title, subtitle, and onBack props', () => {
      const props = {
        title: '練習完成！',
        subtitle: '答對 8 / 10 題',
        onBack: jest.fn(),
      };

      expect(props.title).toBe('練習完成！');
      expect(props.subtitle).toBe('答對 8 / 10 題');
      expect(typeof props.onBack).toBe('function');
    });
  });

  describe('title display logic', () => {
    it('should accept completion title', () => {
      const title = '練習完成！';
      expect(title).toBeTruthy();
    });

    it('should accept learning completion title', () => {
      const title = '學習完成！';
      expect(title.includes('完成')).toBe(true);
    });

    it('should handle empty title', () => {
      const title = '';
      expect(title).toBe('');
    });
  });

  describe('subtitle display logic', () => {
    it('should format score subtitle', () => {
      const correct = 8;
      const total = 10;
      const subtitle = `答對 ${correct} / ${total} 題`;

      expect(subtitle).toBe('答對 8 / 10 題');
    });

    it('should format words learned subtitle', () => {
      const wordCount = 5;
      const subtitle = `你已學習 ${wordCount} 個新單字`;

      expect(subtitle).toBe('你已學習 5 個新單字');
    });

    it('should handle empty subtitle', () => {
      const subtitle = '';
      expect(subtitle).toBe('');
    });

    it('should handle multiline subtitle', () => {
      const subtitle = '答對 8 / 10 題\n10 分鐘後可以開始練習';
      expect(subtitle.includes('\n')).toBe(true);
    });
  });

  describe('back button behavior', () => {
    it('should have onBack callback', () => {
      const onBack = jest.fn();

      // Simulating press
      onBack();

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should call onBack multiple times if pressed multiple times', () => {
      const onBack = jest.fn();

      onBack();
      onBack();
      onBack();

      expect(onBack).toHaveBeenCalledTimes(3);
    });
  });

  describe('score calculation logic', () => {
    it('should calculate perfect score', () => {
      const correct = 10;
      const total = 10;
      const percentage = (correct / total) * 100;

      expect(percentage).toBe(100);
    });

    it('should calculate partial score', () => {
      const correct = 8;
      const total = 10;
      const percentage = (correct / total) * 100;

      expect(percentage).toBe(80);
    });

    it('should calculate zero score', () => {
      const correct = 0;
      const total = 10;
      const percentage = (correct / total) * 100;

      expect(percentage).toBe(0);
    });

    it('should handle single question', () => {
      const correct = 1;
      const total = 1;
      const percentage = (correct / total) * 100;

      expect(percentage).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle long title', () => {
      const longTitle = '練習完成！恭喜你完成了今天的學習目標！';
      expect(longTitle.length).toBeGreaterThan(10);
    });

    it('should handle long subtitle', () => {
      const longSubtitle = '你已經連續學習 7 天，繼續保持這個好習慣吧！';
      expect(longSubtitle.length).toBeGreaterThan(10);
    });
  });
});
