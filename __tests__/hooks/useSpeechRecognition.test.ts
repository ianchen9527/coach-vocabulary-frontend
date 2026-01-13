import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

// Store event handlers for testing
const eventHandlers: Record<string, Function> = {};

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn((event: string, handler: Function) => {
    eventHandlers[event] = handler;
  }),
}));

// Mock for platform - not web so isSupported is true
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Make sure webkitSpeechRecognition exists for web fallback check
Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: class {},
  writable: true,
});

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
    // Reset permission mock to default granted state
    (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
  });

  describe('initial state', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.isRecognizing).toBe(false);
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.finalTranscript).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(true);
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.abort).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('start', () => {
    it('should return true when started successfully', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      let startResult: boolean = false;
      await act(async () => {
        startResult = await result.current.start();
      });

      expect(startResult).toBe(true);
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'en-US',
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
        })
      );
    });

    it('should return false when permission is denied', async () => {
      (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
      });

      const { result } = renderHook(() => useSpeechRecognition());

      let startResult: boolean = true;
      await act(async () => {
        startResult = await result.current.start();
      });

      expect(startResult).toBe(false);
      expect(result.current.error).toBe('麥克風權限被拒絕，請至設定中開啟');
    });

    it('should use custom config when provided', async () => {
      const config = {
        lang: 'zh-TW',
        interimResults: false,
        continuous: true,
      };

      const { result } = renderHook(() => useSpeechRecognition(config));

      let startResult: boolean = false;
      await act(async () => {
        startResult = await result.current.start();
      });

      // Debug: check if start succeeded
      expect(startResult).toBe(true);
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'zh-TW',
          interimResults: false,
          continuous: true,
        })
      );
    });
  });

  describe('reset', () => {
    it('should clear finalTranscript and interimTranscript', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Manually trigger a result event to set transcripts
      await act(async () => {
        // First start to set up event handlers
        await result.current.start();
      });

      // Simulate receiving a result
      await act(async () => {
        if (eventHandlers['result']) {
          eventHandlers['result']({
            isFinal: true,
            results: [{ transcript: 'test transcript' }],
          });
        }
      });

      expect(result.current.finalTranscript).toBe('test transcript');

      // Now reset
      await act(async () => {
        result.current.reset();
      });

      expect(result.current.finalTranscript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('abort', () => {
    it('should stop recognition', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.abort();
      });

      expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop recognition to get final result', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.stop();
      });

      expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    it('should register event handlers on mount', () => {
      renderHook(() => useSpeechRecognition());

      expect(useSpeechRecognitionEvent).toHaveBeenCalledWith('start', expect.any(Function));
      expect(useSpeechRecognitionEvent).toHaveBeenCalledWith('end', expect.any(Function));
      expect(useSpeechRecognitionEvent).toHaveBeenCalledWith('result', expect.any(Function));
      expect(useSpeechRecognitionEvent).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should update interimTranscript when receiving interim results', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        if (eventHandlers['result']) {
          eventHandlers['result']({
            isFinal: false,
            results: [{ transcript: 'hello wo' }],
          });
        }
      });

      expect(result.current.interimTranscript).toBe('hello wo');
      expect(result.current.finalTranscript).toBe('');
    });

    it('should update finalTranscript when receiving final results', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        if (eventHandlers['result']) {
          eventHandlers['result']({
            isFinal: true,
            results: [{ transcript: 'hello world' }],
          });
        }
      });

      expect(result.current.finalTranscript).toBe('hello world');
      expect(result.current.interimTranscript).toBe('');
    });

    it('should set error when error event is received', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        if (eventHandlers['error']) {
          eventHandlers['error']({ error: 'no-speech' });
        }
      });

      expect(result.current.error).toBe('未偵測到語音，請重試');
      expect(result.current.isRecognizing).toBe(false);
    });
  });
});
