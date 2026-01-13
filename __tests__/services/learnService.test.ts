import { learnService } from '../../services/learnService';
import { api } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('learnService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should call GET /api/learn/session', async () => {
      const mockResponse = {
        data: {
          words: [{ id: '1', word: 'test' }],
          session_id: 'session-123',
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await learnService.getSession();

      expect(api.get).toHaveBeenCalledWith('/api/learn/session');
      expect(result).toEqual(mockResponse.data);
    });

    it('should return response data directly', async () => {
      const expectedData = {
        words: [
          { id: '1', word: 'hello' },
          { id: '2', word: 'world' },
        ],
        session_id: 'abc123',
      };

      (api.get as jest.Mock).mockResolvedValue({ data: expectedData });

      const result = await learnService.getSession();

      expect(result).toEqual(expectedData);
    });
  });

  describe('complete', () => {
    it('should call POST /api/learn/complete with word_ids', async () => {
      const mockResponse = {
        data: { success: true },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const wordIds = ['word-1', 'word-2', 'word-3'];
      const result = await learnService.complete(wordIds);

      expect(api.post).toHaveBeenCalledWith('/api/learn/complete', {
        word_ids: wordIds,
        answers: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should include answers when provided', async () => {
      const mockResponse = {
        data: { success: true },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const wordIds = ['word-1'];
      const answers = [
        {
          word_id: 'word-1',
          exercise_type: 'multiple_choice' as const,
          is_correct: true,
          response_time_ms: 1500,
        },
      ];

      await learnService.complete(wordIds, answers);

      expect(api.post).toHaveBeenCalledWith('/api/learn/complete', {
        word_ids: wordIds,
        answers: answers,
      });
    });

    it('should handle empty word_ids array', async () => {
      const mockResponse = {
        data: { success: true },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      await learnService.complete([]);

      expect(api.post).toHaveBeenCalledWith('/api/learn/complete', {
        word_ids: [],
        answers: undefined,
      });
    });
  });
});
