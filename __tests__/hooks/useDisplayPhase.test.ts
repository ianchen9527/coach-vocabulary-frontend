import { renderHook, act } from '@testing-library/react-native';
import { useDisplayPhase } from '../../hooks/useDisplayPhase';

describe('useDisplayPhase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial remaining time equal to duration', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useDisplayPhase({
          isActive: false,
          onComplete,
          duration: 3000,
        })
      );

      expect(result.current.remainingMs).toBe(3000);
    });

    it('should use default duration of 3000ms when not specified', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useDisplayPhase({
          isActive: false,
          onComplete,
        })
      );

      expect(result.current.remainingMs).toBe(3000);
    });

    it('should provide clearTimer function', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useDisplayPhase({
          isActive: false,
          onComplete,
        })
      );

      expect(typeof result.current.clearTimer).toBe('function');
    });
  });

  describe('when isActive becomes true', () => {
    it('should start countdown', () => {
      const onComplete = jest.fn();
      const { result, rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 1000,
          }),
        { initialProps: { isActive: false } }
      );

      expect(result.current.remainingMs).toBe(1000);

      // Activate the phase
      rerender({ isActive: true });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.remainingMs).toBeLessThan(1000);
      expect(result.current.remainingMs).toBeGreaterThanOrEqual(0);
    });

    it('should call onStart when provided', () => {
      const onComplete = jest.fn();
      const onStart = jest.fn();

      const { rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            onStart,
            duration: 1000,
          }),
        { initialProps: { isActive: false } }
      );

      expect(onStart).not.toHaveBeenCalled();

      // Activate the phase
      rerender({ isActive: true });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete when timer reaches 0', () => {
      const onComplete = jest.fn();
      const { rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 500,
          }),
        { initialProps: { isActive: false } }
      );

      rerender({ isActive: true });

      expect(onComplete).not.toHaveBeenCalled();

      // Advance past the duration
      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should set remainingMs to 0 when complete', () => {
      const onComplete = jest.fn();
      const { result, rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 500,
          }),
        { initialProps: { isActive: false } }
      );

      rerender({ isActive: true });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.remainingMs).toBe(0);
    });
  });

  describe('clearTimer', () => {
    it('should stop the countdown when called', () => {
      const onComplete = jest.fn();
      const { result, rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 1000,
          }),
        { initialProps: { isActive: false } }
      );

      rerender({ isActive: true });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const remainingBefore = result.current.remainingMs;

      // Clear the timer
      act(() => {
        result.current.clearTimer();
      });

      // Advance more time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not have called onComplete and remaining should not change
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up timer on unmount', () => {
      const onComplete = jest.fn();
      const { unmount, rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 1000,
          }),
        { initialProps: { isActive: false } }
      );

      rerender({ isActive: true });

      // Advance a bit
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Unmount
      unmount();

      // Advance past duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // onComplete should not have been called after unmount
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should clean up timer when isActive becomes false', () => {
      const onComplete = jest.fn();
      const { rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 1000,
          }),
        { initialProps: { isActive: false } }
      );

      rerender({ isActive: true });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Deactivate
      rerender({ isActive: false });

      // Advance past duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // onComplete should not have been called
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('reactivation', () => {
    it('should reset countdown when reactivated', () => {
      const onComplete = jest.fn();
      const { result, rerender } = renderHook(
        ({ isActive }) =>
          useDisplayPhase({
            isActive,
            onComplete,
            duration: 1000,
          }),
        { initialProps: { isActive: false } }
      );

      // First activation
      rerender({ isActive: true });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Deactivate
      rerender({ isActive: false });

      // Reactivate - should reset
      rerender({ isActive: true });

      // Should start at full duration again
      expect(result.current.remainingMs).toBe(1000);
    });
  });
});
