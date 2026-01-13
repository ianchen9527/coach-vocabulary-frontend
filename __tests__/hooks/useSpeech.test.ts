import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSpeech } from '../../hooks/useSpeech';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          setOnPlaybackStatusUpdate: jest.fn(),
          stopAsync: jest.fn().mockResolvedValue(undefined),
          unloadAsync: jest.fn().mockResolvedValue(undefined),
        },
      }),
    },
  },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

describe('useSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });
  });

  describe('speak with audioUrl', () => {
    it('should play audio when audioUrl is provided', async () => {
      const mockSound = {
        setOnPlaybackStatusUpdate: jest.fn(),
        stopAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
      };

      (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
        sound: mockSound,
      });

      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        const speakPromise = result.current.speak('test', 'https://example.com/audio.mp3');

        // Wait for createAsync to be called
        await waitFor(() => {
          expect(Audio.Sound.createAsync).toHaveBeenCalled();
        });

        // Simulate playback finished callback
        const callback = mockSound.setOnPlaybackStatusUpdate.mock.calls[0][0];
        callback({ isLoaded: true, didJustFinish: true });

        await speakPromise;
      });

      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: 'https://example.com/audio.mp3' },
        { shouldPlay: true }
      );
    });

    it('should set isSpeaking to false after playback finishes', async () => {
      const mockSound = {
        setOnPlaybackStatusUpdate: jest.fn(),
        stopAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
      };

      (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
        sound: mockSound,
      });

      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        const speakPromise = result.current.speak('test', 'https://example.com/audio.mp3');

        // Wait for createAsync to be called
        await waitFor(() => {
          expect(Audio.Sound.createAsync).toHaveBeenCalled();
        });

        // Simulate playback finished
        const callback = mockSound.setOnPlaybackStatusUpdate.mock.calls[0][0];
        callback({ isLoaded: true, didJustFinish: true });

        await speakPromise;
      });

      // After playback finishes, isSpeaking should be false
      expect(result.current.isSpeaking).toBe(false);
      // Verify unload was called
      expect(mockSound.unloadAsync).toHaveBeenCalled();
    });
  });

  describe('speak with TTS (no audioUrl)', () => {
    it('should use TTS when audioUrl is null', async () => {
      const { result } = renderHook(() => useSpeech());

      let speakPromise: Promise<void>;

      await act(async () => {
        speakPromise = result.current.speak('Hello world', null);

        // Wait for Speech.speak to be called
        await waitFor(() => {
          expect(Speech.speak).toHaveBeenCalled();
        });

        // Trigger the onDone callback
        const speechCall = (Speech.speak as jest.Mock).mock.calls[0];
        const options = speechCall[1];
        options.onDone();

        await speakPromise;
      });

      expect(Speech.speak).toHaveBeenCalledWith('Hello world', expect.objectContaining({
        language: 'en-US',
        rate: 0.9,
      }));
    });

    it('should use TTS when audioUrl is not provided', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        const speakPromise = result.current.speak('Test message');

        // Wait for Speech.speak to be called
        await waitFor(() => {
          expect(Speech.speak).toHaveBeenCalled();
        });

        const speechCall = (Speech.speak as jest.Mock).mock.calls[0];
        const options = speechCall[1];
        options.onDone();

        await speakPromise;
      });

      expect(Speech.speak).toHaveBeenCalled();
    });

    it('should handle TTS error gracefully', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        const speakPromise = result.current.speak('Test message');

        // Wait for Speech.speak to be called
        await waitFor(() => {
          expect(Speech.speak).toHaveBeenCalled();
        });

        const speechCall = (Speech.speak as jest.Mock).mock.calls[0];
        const options = speechCall[1];
        options.onError();

        await speakPromise;
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should stop TTS playback', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        result.current.cancel();
      });

      expect(Speech.stop).toHaveBeenCalled();
    });

    it('should stop audio playback if currently playing', async () => {
      const mockSound = {
        setOnPlaybackStatusUpdate: jest.fn(),
        stopAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
      };

      (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
        sound: mockSound,
      });

      const { result } = renderHook(() => useSpeech());

      // Start playing audio
      await act(async () => {
        result.current.speak('test', 'https://example.com/audio.mp3');

        // Wait for createAsync to be called
        await waitFor(() => {
          expect(Audio.Sound.createAsync).toHaveBeenCalled();
        });
      });

      // Cancel
      await act(async () => {
        await result.current.cancel();
      });

      expect(mockSound.stopAsync).toHaveBeenCalled();
      expect(mockSound.unloadAsync).toHaveBeenCalled();
    });

    it('should set isSpeaking to false after cancel', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        result.current.cancel();
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('fallback to TTS', () => {
    it('should fallback to TTS when audio playback fails', async () => {
      (Audio.Sound.createAsync as jest.Mock).mockRejectedValue(new Error('Audio failed'));

      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        const speakPromise = result.current.speak('fallback test', 'https://example.com/audio.mp3');

        // Wait for the TTS to be called (as fallback)
        await waitFor(() => {
          expect(Speech.speak).toHaveBeenCalled();
        });

        const speechCall = (Speech.speak as jest.Mock).mock.calls[0];
        const options = speechCall[1];
        options.onDone();

        await speakPromise;
      });

      expect(Speech.speak).toHaveBeenCalledWith('fallback test', expect.anything());
    });
  });
});
