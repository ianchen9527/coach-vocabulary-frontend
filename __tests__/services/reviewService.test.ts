import { reviewService } from '../../services/reviewService';
import { api } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should call GET /api/review/session', async () => {
      const mockResponse = {
        data: {
          words: [{ id: '1', word: 'review' }],
          session_id: 'review-session-123',
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await reviewService.getSession();

      expect(api.get).toHaveBeenCalledWith('/api/review/session');
      expect(result).toEqual(mockResponse.data);
    });

    it('should return response data directly', async () => {
      const expectedData = {
        words: [
          { id: '1', word: 'apple' },
          { id: '2', word: 'banana' },
        ],
        session_id: 'review-xyz',
      };

      (api.get as jest.Mock).mockResolvedValue({ data: expectedData });

      const result = await reviewService.getSession();

      expect(result).toEqual(expectedData);
    });
  });

  describe('complete', () => {
    it('should call POST /api/review/complete with word_ids', async () => {
      const mockResponse = {
        data: { success: true, review_count: 5 },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const wordIds = ['word-1', 'word-2', 'word-3'];
      const result = await reviewService.complete(wordIds);

      expect(api.post).toHaveBeenCalledWith('/api/review/complete', {
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

      const wordIds = ['word-1', 'word-2'];
      const answers = [
        {
          word_id: 'word-1',
          exercise_type: 'speaking' as const,
          is_correct: true,
          response_time_ms: 2000,
        },
        {
          word_id: 'word-2',
          exercise_type: 'multiple_choice' as const,
          is_correct: false,
          response_time_ms: 1500,
        },
      ];

      await reviewService.complete(wordIds, answers);

      expect(api.post).toHaveBeenCalledWith('/api/review/complete', {
        word_ids: wordIds,
        answers: answers,
      });
    });

    it('should handle empty word_ids array', async () => {
      const mockResponse = {
        data: { success: true },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      await reviewService.complete([]);

      expect(api.post).toHaveBeenCalledWith('/api/review/complete', {
        word_ids: [],
        answers: undefined,
      });
    });

    it('should send the correct request body structure', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });

      const wordIds = ['id-1', 'id-2'];
      const answers = [
        {
          word_id: 'id-1',
          exercise_type: 'multiple_choice' as const,
          is_correct: true,
          response_time_ms: 1200,
        },
      ];

      await reviewService.complete(wordIds, answers);

      const calledWith = (api.post as jest.Mock).mock.calls[0][1];
      expect(calledWith).toHaveProperty('word_ids', wordIds);
      expect(calledWith).toHaveProperty('answers', answers);
    });
  });
});
