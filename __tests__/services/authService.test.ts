import { authService } from '../../services/authService';
import { api } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call POST /api/auth/register with correct payload', async () => {
      const mockResponse = {
        data: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          access_token: 'token-abc',
          token_type: 'bearer',
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.register('test@example.com', 'testuser', 'password123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Registration failed');
      (api.post as jest.Mock).mockRejectedValue(mockError);

      await expect(authService.register('test@example.com', 'testuser', 'password')).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should call POST /api/auth/login with correct payload', async () => {
      const mockResponse = {
        data: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          access_token: 'token-abc',
          token_type: 'bearer',
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Invalid credentials');
      (api.post as jest.Mock).mockRejectedValue(mockError);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getMe', () => {
    it('should call GET /api/auth/me', async () => {
      const mockResponse = {
        data: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.getMe();

      expect(api.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate errors for unauthorized access', async () => {
      const mockError = new Error('Unauthorized');
      (api.get as jest.Mock).mockRejectedValue(mockError);

      await expect(authService.getMe()).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteAccount', () => {
    it('should call DELETE /api/auth/me with email confirmation', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Account deleted',
          deleted_at: '2024-01-01T00:00:00Z',
        },
      };

      (api.delete as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.deleteAccount('test@example.com');

      expect(api.delete).toHaveBeenCalledWith('/api/auth/me', {
        data: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate errors from api', async () => {
      const mockError = new Error('Delete failed');
      (api.delete as jest.Mock).mockRejectedValue(mockError);

      await expect(authService.deleteAccount('test@example.com')).rejects.toThrow('Delete failed');
    });
  });
});
