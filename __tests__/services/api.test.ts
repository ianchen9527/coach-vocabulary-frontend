import { getAssetUrl, handleApiError, API_BASE_URL } from '../../services/api';
import axios, { AxiosError } from 'axios';

// Mock axios
jest.mock('axios', () => ({
  isAxiosError: jest.fn(),
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

describe('api', () => {
  describe('getAssetUrl', () => {
    it('should return null when path is null', () => {
      expect(getAssetUrl(null)).toBeNull();
    });

    it('should return the original URL when path starts with http', () => {
      const httpUrl = 'http://example.com/image.png';
      expect(getAssetUrl(httpUrl)).toBe(httpUrl);
    });

    it('should return the original URL when path starts with https', () => {
      const httpsUrl = 'https://example.com/image.png';
      expect(getAssetUrl(httpsUrl)).toBe(httpsUrl);
    });

    it('should prepend API_BASE_URL when path is relative', () => {
      const relativePath = '/uploads/image.png';
      expect(getAssetUrl(relativePath)).toBe(`${API_BASE_URL}/uploads/image.png`);
    });

    it('should handle paths without leading slash', () => {
      const relativePath = 'uploads/image.png';
      expect(getAssetUrl(relativePath)).toBe(`${API_BASE_URL}uploads/image.png`);
    });
  });

  describe('handleApiError', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return "請重新登入" for 401 error', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 401,
          data: {},
        },
      };

      expect(handleApiError(error)).toBe('請重新登入');
    });

    it('should return "沒有權限執行此操作" for 403 error', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 403,
          data: {},
        },
      };

      expect(handleApiError(error)).toBe('沒有權限執行此操作');
    });

    it('should return "請求格式錯誤" for 400 error without detail', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 400,
          data: {},
        },
      };

      expect(handleApiError(error)).toBe('請求格式錯誤');
    });

    it('should return detail message for 400 error with detail', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 400,
          data: { detail: '自訂錯誤訊息' },
        },
      };

      expect(handleApiError(error)).toBe('自訂錯誤訊息');
    });

    it('should return "資源不存在" for 404 error without detail', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 404,
          data: {},
        },
      };

      expect(handleApiError(error)).toBe('資源不存在');
    });

    it('should return "伺服器錯誤，請稍後再試" for 500 error', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 500,
          data: {},
        },
      };

      expect(handleApiError(error)).toBe('伺服器錯誤，請稍後再試');
    });

    it('should return error message for unknown axios error', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = {
        response: {
          status: 999,
          data: {},
        },
        message: '未知的網路錯誤',
      };

      expect(handleApiError(error)).toBe('未知的網路錯誤');
    });

    it('should return error message for non-axios Error', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);

      const error = new Error('一般錯誤訊息');

      expect(handleApiError(error)).toBe('一般錯誤訊息');
    });

    it('should return "發生未知錯誤" for unknown error type', () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);

      const error = 'string error';

      expect(handleApiError(error)).toBe('發生未知錯誤');
    });
  });
});
