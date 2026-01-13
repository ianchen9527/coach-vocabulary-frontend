import { practiceService } from '../../services/practiceService';
import { api } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('practiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should call GET /api/practice/session', async () => {
      const mockResponse = {
        data: {
          exercises: [{ id: '1', type: 'multiple_choice' }],
          session_id: 'session-123',
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await practiceService.getSession();

      expect(api.get).toHaveBeenCalledWith('/api/practice/session');
      expect(result).toEqual(mockResponse.data);
    });

    it('should return response data directly', async () => {
      const expectedData = {
        exercises: [
          { id: '1', type: 'speaking' },
          { id: '2', type: 'multiple_choice' },
        ],
        session_id: 'xyz789',
      };

      (api.get as jest.Mock).mockResolvedValue({ data: expectedData });

      const result = await practiceService.getSession();

      expect(result).toEqual(expectedData);
    });
  });

  describe('submit', () => {
    it('should call POST /api/practice/submit with answers', async () => {
      const mockResponse = {
        data: {
          score: 80,
          correct_count: 8,
          total_count: 10,
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const answers = [
        {
          word_id: 'word-1',
          exercise_type: 'multiple_choice' as const,
          is_correct: true,
          response_time_ms: 1200,
        },
        {
          word_id: 'word-2',
          exercise_type: 'speaking' as const,
          is_correct: false,
          response_time_ms: 2500,
        },
      ];

      const result = await practiceService.submit(answers);

      expect(api.post).toHaveBeenCalledWith('/api/practice/submit', {
        answers: answers,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty answers array', async () => {
      const mockResponse = {
        data: {
          score: 0,
          correct_count: 0,
          total_count: 0,
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      await practiceService.submit([]);

      expect(api.post).toHaveBeenCalledWith('/api/practice/submit', {
        answers: [],
      });
    });

    it('should send the correct request body structure', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });

      const answers = [
        {
          word_id: 'test-word',
          exercise_type: 'multiple_choice' as const,
          is_correct: true,
          response_time_ms: 1000,
          selected_option_index: 2,
        },
      ];

      await practiceService.submit(answers);

      const calledWith = (api.post as jest.Mock).mock.calls[0][1];
      expect(calledWith).toHaveProperty('answers');
      expect(calledWith.answers).toHaveLength(1);
      expect(calledWith.answers[0]).toEqual(answers[0]);
    });
  });
});
