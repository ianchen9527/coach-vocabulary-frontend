import { analysisService } from '../../services/analysisService';
import { api } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('analysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should call GET /api/level-analysis/session', async () => {
      const mockResponse = {
        data: {
          exercises: [
            {
              word_id: 'word-1',
              word: 'apple',
              translation: '蘋果',
              image_url: null,
              audio_url: null,
              pool: 'P0',
              type: 'reading_lv1',
              options: [
                { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
              ],
              correct_index: 0,
              level_order: 1,
            },
          ],
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analysisService.getSession();

      expect(api.get).toHaveBeenCalledWith('/api/level-analysis/session');
      expect(result).toEqual(mockResponse.data);
    });

    it('should return exercises array', async () => {
      const mockExercises = [
        { word_id: 'w1', level_order: 1 },
        { word_id: 'w2', level_order: 2 },
        { word_id: 'w3', level_order: 3 },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        data: { exercises: mockExercises },
      });

      const result = await analysisService.getSession();

      expect(result.exercises).toHaveLength(3);
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Session not found');
      (api.get as jest.Mock).mockRejectedValue(mockError);

      await expect(analysisService.getSession()).rejects.toThrow('Session not found');
    });
  });

  describe('submit', () => {
    it('should call POST /api/level-analysis/submit with level_order', async () => {
      const mockResponse = {
        data: {
          success: true,
          current_level: {
            id: 1,
            order: 3,
            label: 'Intermediate',
          },
          current_category: {
            id: 1,
            order: 1,
            label: 'Basic',
          },
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analysisService.submit(3);

      expect(api.post).toHaveBeenCalledWith('/api/level-analysis/submit', {
        level_order: 3,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should submit level 1', async () => {
      const mockResponse = {
        data: {
          success: true,
          current_level: { id: 1, order: 1, label: 'Beginner' },
          current_category: null,
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analysisService.submit(1);

      expect(api.post).toHaveBeenCalledWith('/api/level-analysis/submit', {
        level_order: 1,
      });
      expect(result.current_level?.order).toBe(1);
    });

    it('should submit level 8', async () => {
      const mockResponse = {
        data: {
          success: true,
          current_level: { id: 8, order: 8, label: 'Advanced' },
          current_category: { id: 1, order: 1, label: 'Advanced' },
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analysisService.submit(8);

      expect(api.post).toHaveBeenCalledWith('/api/level-analysis/submit', {
        level_order: 8,
      });
      expect(result.current_level?.order).toBe(8);
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Submit failed');
      (api.post as jest.Mock).mockRejectedValue(mockError);

      await expect(analysisService.submit(3)).rejects.toThrow('Submit failed');
    });
  });
});
