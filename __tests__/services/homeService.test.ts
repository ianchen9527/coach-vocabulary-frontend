import { homeService } from '../../services/homeService';
import { api } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('homeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should call GET /api/home/stats', async () => {
      const mockResponse = {
        data: {
          today_learned: 10,
          today_completed: 7,
          available_practice: 5,
          available_review: 3,
          upcoming_24h: 8,
          can_learn: true,
          can_practice: true,
          can_review: true,
          next_available_time: '2024-01-01T12:00:00Z',
          current_level: {
            id: 1,
            order: 2,
            label: 'Intermediate',
          },
          current_category: {
            id: 1,
            order: 1,
            label: 'Basic',
          },
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await homeService.getStats();

      expect(api.get).toHaveBeenCalledWith('/api/home/stats');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle null values for optional fields', async () => {
      const mockResponse = {
        data: {
          today_learned: 0,
          today_completed: 0,
          available_practice: 0,
          available_review: 0,
          upcoming_24h: 0,
          can_learn: false,
          can_practice: false,
          can_review: false,
          next_available_time: null,
          current_level: null,
          current_category: null,
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await homeService.getStats();

      expect(result.next_available_time).toBeNull();
      expect(result.current_level).toBeNull();
      expect(result.current_category).toBeNull();
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Network error');
      (api.get as jest.Mock).mockRejectedValue(mockError);

      await expect(homeService.getStats()).rejects.toThrow('Network error');
    });
  });

  describe('getWordPool', () => {
    it('should call GET /api/home/word-pool', async () => {
      const mockResponse = {
        data: {
          pools: {
            P0: [
              { word_id: '1', word: 'apple', translation: '蘋果', next_available_time: null },
            ],
            P1: [
              { word_id: '2', word: 'banana', translation: '香蕉', next_available_time: '2024-01-01T12:00:00Z' },
            ],
          },
          total_count: 2,
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await homeService.getWordPool();

      expect(api.get).toHaveBeenCalledWith('/api/home/word-pool');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty pools', async () => {
      const mockResponse = {
        data: {
          pools: {},
          total_count: 0,
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await homeService.getWordPool();

      expect(result.pools).toEqual({});
      expect(result.total_count).toBe(0);
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Unauthorized');
      (api.get as jest.Mock).mockRejectedValue(mockError);

      await expect(homeService.getWordPool()).rejects.toThrow('Unauthorized');
    });
  });
});
