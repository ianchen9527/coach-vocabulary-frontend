/**
 * Tests for useSessionLoader hook behavior
 *
 * The hook handles:
 * - Loading state management
 * - Error handling with alerts
 * - Availability check (available: false → shows alert)
 * - Generic session loading pattern for Learn/Practice/Review/Analysis
 */

// Mock the Alert module
jest.mock('../../components/ui/Alert', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock the api module
jest.mock('../../services/api', () => ({
  handleApiError: jest.fn((error) => error.message || 'Unknown error'),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSessionLoader } from '../../hooks/useSessionLoader';
import { Alert } from '../../components/ui/Alert';
import { handleApiError } from '../../services/api';

describe('useSessionLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('component contract', () => {
    it('should export useSessionLoader function', () => {
      expect(typeof useSessionLoader).toBe('function');
    });
  });

  describe('initial state', () => {
    it('should start with loading true', async () => {
      const loadFn = jest.fn().mockResolvedValue({ available: true, data: 'test' });

      const { result } = renderHook(() => useSessionLoader(loadFn));

      expect(result.current.loading).toBe(true);
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe('successful load', () => {
    it('should set session when load succeeds', async () => {
      const mockSession = { available: true, words: ['apple', 'banana'] };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.error).toBeNull();
      expect(loadFn).toHaveBeenCalledTimes(1);
    });

    it('should not show alert when load succeeds', async () => {
      const mockSession = { available: true };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('unavailable session', () => {
    it('should set error when session is unavailable', async () => {
      const mockSession = { available: false, reason: '目前沒有可學習的單字' };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBe('目前沒有可學習的單字');
    });

    it('should show alert when session is unavailable', async () => {
      const mockSession = { available: false, reason: '需要先完成練習' };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(Alert.alert).toHaveBeenCalledWith(
        '無法進行',
        '需要先完成練習',
        expect.any(Array)
      );
    });

    it('should call onUnavailable callback when unavailable', async () => {
      const mockSession = { available: false, reason: '冷卻時間未到' };
      const loadFn = jest.fn().mockResolvedValue(mockSession);
      const onUnavailable = jest.fn();

      renderHook(() =>
        useSessionLoader(loadFn, { onUnavailable })
      );

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      // Simulate pressing the alert button
      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const buttons = alertCalls[0][2];
      buttons[0].onPress();

      expect(onUnavailable).toHaveBeenCalledWith('冷卻時間未到');
    });

    it('should use default reason when reason is undefined', async () => {
      const mockSession = { available: false };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('目前無法進行此操作');
    });
  });

  describe('error handling', () => {
    it('should set error when load fails', async () => {
      const loadFn = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBe('Network error');
    });

    it('should show alert when load fails', async () => {
      const loadFn = jest.fn().mockRejectedValue(new Error('Server error'));

      renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      expect(Alert.alert).toHaveBeenCalledWith(
        '載入失敗',
        'Server error',
        expect.any(Array)
      );
    });

    it('should call onError callback when load fails', async () => {
      const loadFn = jest.fn().mockRejectedValue(new Error('API error'));
      const onError = jest.fn();

      renderHook(() => useSessionLoader(loadFn, { onError }));

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      // Simulate pressing the alert button
      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const buttons = alertCalls[0][2];
      buttons[0].onPress();

      expect(onError).toHaveBeenCalledWith('API error');
    });
  });

  describe('custom options', () => {
    it('should use custom unavailableTitle', async () => {
      const mockSession = { available: false, reason: '無法複習' };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      renderHook(() =>
        useSessionLoader(loadFn, { unavailableTitle: '無法複習' })
      );

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      expect(Alert.alert).toHaveBeenCalledWith(
        '無法複習',
        '無法複習',
        expect.any(Array)
      );
    });

    it('should use custom errorTitle', async () => {
      const loadFn = jest.fn().mockRejectedValue(new Error('Error'));

      renderHook(() =>
        useSessionLoader(loadFn, { errorTitle: '練習載入失敗' })
      );

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      expect(Alert.alert).toHaveBeenCalledWith(
        '練習載入失敗',
        'Error',
        expect.any(Array)
      );
    });
  });

  describe('reload functionality', () => {
    it('should provide reload function', async () => {
      const mockSession = { available: true };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(typeof result.current.reload).toBe('function');
    });

    it('should reload session when reload is called', async () => {
      const mockSession = { available: true, value: 1 };
      const loadFn = jest.fn().mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSessionLoader(loadFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(loadFn).toHaveBeenCalledTimes(1);

      // Call reload
      act(() => {
        result.current.reload();
      });

      await waitFor(() => expect(loadFn).toHaveBeenCalledTimes(2));
    });
  });

  describe('return value interface', () => {
    it('should return session, loading, error, and reload', async () => {
      const loadFn = jest.fn().mockResolvedValue({ available: true });

      const { result } = renderHook(() => useSessionLoader(loadFn));

      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reload');

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });
});
