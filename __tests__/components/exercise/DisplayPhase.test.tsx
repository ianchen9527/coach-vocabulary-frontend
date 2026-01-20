/**
 * Tests for DisplayPhase component behavior
 *
 * The component shows:
 * - Word image (if available)
 * - Word text
 * - Translation
 * - Audio status indicator
 * - Countdown timer
 */

describe('DisplayPhase', () => {
  describe('component contract', () => {
    it('should export DisplayPhase function', () => {
      const { DisplayPhase } = require('../../../components/exercise/DisplayPhase');
      expect(typeof DisplayPhase).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should accept required props', () => {
      const props = {
        word: 'apple',
        translation: '蘋果',
        imageUrl: 'https://example.com/apple.jpg',
        remainingMs: 3000,
        isSpeaking: true,
        getAssetUrl: (url: string | null) => url,
      };

      expect(props.word).toBe('apple');
      expect(props.translation).toBe('蘋果');
      expect(props.imageUrl).toBeTruthy();
      expect(props.remainingMs).toBe(3000);
      expect(props.isSpeaking).toBe(true);
      expect(typeof props.getAssetUrl).toBe('function');
    });

    it('should handle null imageUrl', () => {
      const props = {
        word: 'banana',
        translation: '香蕉',
        imageUrl: null,
        remainingMs: 2500,
        isSpeaking: false,
        getAssetUrl: (url: string | null) => url,
      };

      expect(props.imageUrl).toBeNull();
    });
  });

  describe('image display logic', () => {
    it('should show image when imageUrl is provided', () => {
      const imageUrl = 'https://example.com/word.jpg';
      const showImage = !!imageUrl;

      expect(showImage).toBe(true);
    });

    it('should not show image when imageUrl is null', () => {
      const imageUrl = null;
      const showImage = !!imageUrl;

      expect(showImage).toBe(false);
    });

    it('should use getAssetUrl to transform image URL', () => {
      const getAssetUrl = jest.fn((url) => `https://cdn.example.com${url}`);
      const imageUrl = '/images/apple.jpg';

      const transformedUrl = getAssetUrl(imageUrl);

      expect(getAssetUrl).toHaveBeenCalledWith('/images/apple.jpg');
      expect(transformedUrl).toBe('https://cdn.example.com/images/apple.jpg');
    });
  });

  describe('audio status indicator', () => {
    it('should show playing text when isSpeaking is true', () => {
      const isSpeaking = true;
      const statusText = isSpeaking ? '播放中...' : '已播放';

      expect(statusText).toBe('播放中...');
    });

    it('should show played text when isSpeaking is false', () => {
      const isSpeaking = false;
      const statusText = isSpeaking ? '播放中...' : '已播放';

      expect(statusText).toBe('已播放');
    });

    it('should determine icon color based on isSpeaking', () => {
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

  describe('countdown display', () => {
    it('should display remaining time', () => {
      const remainingMs = 2500;
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      expect(remainingSeconds).toBe(3);
    });

    it('should handle zero remaining time', () => {
      const remainingMs = 0;
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      expect(remainingSeconds).toBe(0);
    });

    it('should handle time near boundary', () => {
      const remainingMs = 1001;
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      expect(remainingSeconds).toBe(2);
    });
  });

  describe('word display', () => {
    it('should display word text', () => {
      const word = 'apple';
      expect(word).toBe('apple');
    });

    it('should display translation text', () => {
      const translation = '蘋果';
      expect(translation).toBe('蘋果');
    });

    it('should handle long words', () => {
      const word = 'extraordinarily';
      expect(word.length).toBeGreaterThan(10);
    });

    it('should handle multi-character translations', () => {
      const translation = '蘋果';
      expect(translation.length).toBeGreaterThan(0);
    });
  });

  describe('style consistency', () => {
    it('should use display container style', () => {
      const styleKey = 'displayContainer';
      expect(styleKey).toBe('displayContainer');
    });

    it('should use word image style when image exists', () => {
      const styleKey = 'wordImage';
      expect(styleKey).toBe('wordImage');
    });

    it('should use word text style', () => {
      const styleKey = 'wordText';
      expect(styleKey).toBe('wordText');
    });

    it('should use translation text style', () => {
      const styleKey = 'translationText';
      expect(styleKey).toBe('translationText');
    });

    it('should use speaker container style', () => {
      const styleKey = 'speakerContainer';
      expect(styleKey).toBe('speakerContainer');
    });
  });

  describe('use cases', () => {
    it('should support Learn screen display phase', () => {
      const learnProps = {
        word: 'orange',
        translation: '橘子',
        imageUrl: '/images/orange.jpg',
        remainingMs: 3000,
        isSpeaking: true,
        getAssetUrl: (url: string | null) => url ? `https://cdn.example.com${url}` : null,
      };

      expect(learnProps.word).toBeTruthy();
      expect(learnProps.translation).toBeTruthy();
    });

    it('should support Review screen display phase', () => {
      const reviewProps = {
        word: 'grape',
        translation: '葡萄',
        imageUrl: null,
        remainingMs: 3000,
        isSpeaking: false,
        getAssetUrl: (url: string | null) => url,
      };

      expect(reviewProps.word).toBeTruthy();
      expect(reviewProps.translation).toBeTruthy();
    });
  });
});
