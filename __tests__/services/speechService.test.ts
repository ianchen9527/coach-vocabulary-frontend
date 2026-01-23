import { speechService } from '../../services/speechService';
import { api } from '../../services/api';
import { Platform } from 'react-native';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    post: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:8000',
    },
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

describe('speechService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transcribe', () => {
    describe('web platform', () => {
      beforeAll(() => {
        (Platform as any).OS = 'web';
      });

      it('should call POST /api/speech/transcribe with FormData for web Blob', async () => {
        const mockResponse = {
          data: {
            success: true,
            transcript: 'hello world',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
        const result = await speechService.transcribe(audioBlob, 'word-123', 'native transcript');

        expect(api.post).toHaveBeenCalledWith(
          '/api/speech/transcribe',
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Connection': 'close',
            },
            timeout: 10000,
          }
        );
        expect(result).toBe('hello world');
      });

      it('should send correct form data fields', async () => {
        const mockResponse = {
          data: {
            success: true,
            transcript: 'test',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
        await speechService.transcribe(audioBlob, 'word-456', 'native text');

        const call = (api.post as jest.Mock).mock.calls[0];
        const formData = call[1] as FormData;

        expect(formData.get('word_id')).toBe('word-456');
        expect(formData.get('platform')).toBe('web');
        expect(formData.get('native_transcript')).toBe('native text');
      });

      it('should not include native_transcript when null', async () => {
        const mockResponse = {
          data: {
            success: true,
            transcript: 'test',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
        await speechService.transcribe(audioBlob, 'word-789', null);

        const call = (api.post as jest.Mock).mock.calls[0];
        const formData = call[1] as FormData;

        expect(formData.get('native_transcript')).toBeNull();
      });
    });

    describe('native platform (iOS)', () => {
      beforeAll(() => {
        (Platform as any).OS = 'ios';
      });

      afterAll(() => {
        (Platform as any).OS = 'web';
      });

      it('should handle file URI for native platforms', async () => {
        const mockResponse = {
          data: {
            success: true,
            transcript: 'hello',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const fileUri = 'file:///path/to/recording.wav';
        const result = await speechService.transcribe(fileUri, 'word-123', null);

        expect(api.post).toHaveBeenCalled();
        expect(result).toBe('hello');

        const call = (api.post as jest.Mock).mock.calls[0];
        const formData = call[1] as FormData;
        expect(formData.get('platform')).toBe('ios');
      });
    });

    describe('native platform (Android)', () => {
      beforeAll(() => {
        (Platform as any).OS = 'android';
      });

      afterAll(() => {
        (Platform as any).OS = 'web';
      });

      it('should set platform to android', async () => {
        const mockResponse = {
          data: {
            success: true,
            transcript: 'hello',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const fileUri = 'file:///path/to/recording.wav';
        await speechService.transcribe(fileUri, 'word-123', null);

        const call = (api.post as jest.Mock).mock.calls[0];
        const formData = call[1] as FormData;
        expect(formData.get('platform')).toBe('android');
      });
    });

    describe('error handling', () => {
      beforeAll(() => {
        (Platform as any).OS = 'web';
      });

      it('should throw error when response.success is false', async () => {
        const mockResponse = {
          data: {
            success: false,
            transcript: '',
            error: 'Transcription failed',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

        await expect(
          speechService.transcribe(audioBlob, 'word-123', null)
        ).rejects.toThrow('Transcription failed');
      });

      it('should throw default error when success is false but no error message', async () => {
        const mockResponse = {
          data: {
            success: false,
            transcript: '',
          },
        };

        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

        await expect(
          speechService.transcribe(audioBlob, 'word-123', null)
        ).rejects.toThrow('Transcription failed');
      });

      it('should propagate network errors', async () => {
        const mockError = new Error('Network error');
        (api.post as jest.Mock).mockRejectedValue(mockError);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

        await expect(
          speechService.transcribe(audioBlob, 'word-123', null)
        ).rejects.toThrow('Network error');
      });

      it('should propagate timeout errors', async () => {
        const mockError = new Error('timeout of 10000ms exceeded');
        (api.post as jest.Mock).mockRejectedValue(mockError);

        const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

        await expect(
          speechService.transcribe(audioBlob, 'word-123', null)
        ).rejects.toThrow('timeout of 10000ms exceeded');
      });
    });
  });
});
