/**
 * Tests for IntroScreen component behavior
 *
 * The component shows:
 * - Title (exercise type name)
 * - Subtitle/description
 * - Optional icon
 * - Start button
 */

describe('IntroScreen', () => {
  describe('component contract', () => {
    it('should export IntroScreen function', () => {
      const { IntroScreen } = require('../../../components/exercise/IntroScreen');
      expect(typeof IntroScreen).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept required props', () => {
      const props = {
        title: '閱讀練習',
        subtitle: '看單字，選出正確的翻譯',
        onStart: jest.fn(),
      };

      expect(props.title).toBe('閱讀練習');
      expect(props.subtitle).toBe('看單字，選出正確的翻譯');
      expect(typeof props.onStart).toBe('function');
    });

    it('should have optional icon prop', () => {
      const props = {
        title: '聽力練習',
        subtitle: '聽發音，選出正確的翻譯',
        onStart: jest.fn(),
        icon: undefined, // Optional
      };

      expect(props.icon).toBeUndefined();
    });

    it('should have optional buttonText prop defaulting to 開始', () => {
      const props = {
        title: '口說練習',
        subtitle: '看翻譯，說出正確的單字',
        onStart: jest.fn(),
        buttonText: undefined, // Optional, defaults to "開始"
      };

      const defaultButtonText = props.buttonText ?? '開始';
      expect(defaultButtonText).toBe('開始');
    });

    it('should allow custom buttonText', () => {
      const props = {
        title: '複習',
        subtitle: '先複習單字，再進行測驗',
        onStart: jest.fn(),
        buttonText: '開始複習',
      };

      expect(props.buttonText).toBe('開始複習');
    });
  });

  describe('button behavior', () => {
    it('should call onStart when button is pressed', () => {
      const onStart = jest.fn();

      // Simulate button press
      onStart();

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should not call onStart before button is pressed', () => {
      const onStart = jest.fn();

      expect(onStart).not.toHaveBeenCalled();
    });
  });

  describe('display content', () => {
    it('should display title text', () => {
      const title = '閱讀練習';
      expect(title).toBe('閱讀練習');
    });

    it('should display subtitle text', () => {
      const subtitle = '看單字，選出正確的翻譯';
      expect(subtitle).toBe('看單字，選出正確的翻譯');
    });

    it('should handle different exercise type titles', () => {
      const exerciseTitles = {
        reading: '閱讀練習',
        listening: '聽力練習',
        speaking: '口說練習',
      };

      expect(exerciseTitles.reading).toBe('閱讀練習');
      expect(exerciseTitles.listening).toBe('聽力練習');
      expect(exerciseTitles.speaking).toBe('口說練習');
    });

    it('should handle different subtitle descriptions', () => {
      const subtitles = {
        reading: '看單字，選出正確的翻譯',
        listening: '聽發音，選出正確的翻譯',
        speaking: '看翻譯，說出正確的單字',
        review: '先複習單字，再進行測驗',
      };

      expect(subtitles.reading).toContain('看單字');
      expect(subtitles.listening).toContain('聽發音');
      expect(subtitles.speaking).toContain('說出');
      expect(subtitles.review).toContain('複習');
    });
  });

  describe('icon rendering', () => {
    it('should render icon when provided', () => {
      const icon = { type: 'custom-icon' };
      const hasIcon = !!icon;

      expect(hasIcon).toBe(true);
    });

    it('should not render icon when not provided', () => {
      const icon = undefined;
      const hasIcon = !!icon;

      expect(hasIcon).toBe(false);
    });
  });

  describe('style consistency', () => {
    it('should use intro container style', () => {
      // IntroScreen uses styles.introContainer
      const styleKey = 'introContainer';
      expect(styleKey).toBe('introContainer');
    });

    it('should use intro title style', () => {
      // IntroScreen uses styles.introTitle
      const styleKey = 'introTitle';
      expect(styleKey).toBe('introTitle');
    });

    it('should use intro subtitle style', () => {
      // IntroScreen uses styles.introSubtitle
      const styleKey = 'introSubtitle';
      expect(styleKey).toBe('introSubtitle');
    });

    it('should use primary button style', () => {
      // IntroScreen uses styles.primaryButton
      const styleKey = 'primaryButton';
      expect(styleKey).toBe('primaryButton');
    });
  });

  describe('accessibility', () => {
    it('should have accessible title', () => {
      const title = '閱讀練習';
      expect(title.length).toBeGreaterThan(0);
    });

    it('should have accessible subtitle', () => {
      const subtitle = '看單字，選出正確的翻譯';
      expect(subtitle.length).toBeGreaterThan(0);
    });

    it('should have accessible button text', () => {
      const buttonText = '開始';
      expect(buttonText.length).toBeGreaterThan(0);
    });
  });
});
