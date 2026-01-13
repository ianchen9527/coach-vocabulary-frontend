import { renderHook, act } from '@testing-library/react-native';
import { useExerciseFlow } from '../../hooks/useExerciseFlow';

describe('useExerciseFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useExerciseFlow());

      expect(result.current.phase).toBe('idle');
      expect(result.current.remainingMs).toBe(0);
      expect(result.current.selectedIndex).toBeNull();
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.select).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearTimer).toBe('function');
      expect(typeof result.current.getResponseTimeMs).toBe('function');
    });
  });

  describe('start', () => {
    it('should enter question phase when start is called', () => {
      const { result } = renderHook(() => useExerciseFlow());

      act(() => {
        result.current.start();
      });

      expect(result.current.phase).toBe('question');
      expect(result.current.selectedIndex).toBeNull();
    });

    it('should transition from question to options phase after questionDuration', () => {
      const { result } = renderHook(() =>
        useExerciseFlow({ questionDuration: 500 })
      );

      act(() => {
        result.current.start();
      });

      expect(result.current.phase).toBe('question');

      // Advance time past question duration
      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.phase).toBe('options');
    });
  });

  describe('select', () => {
    it('should record selection and enter result phase', () => {
      const { result } = renderHook(() =>
        useExerciseFlow({ questionDuration: 100, optionsDuration: 2000 })
      );

      // Start and get to options phase
      act(() => {
        result.current.start();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.phase).toBe('options');

      // Select an option
      act(() => {
        result.current.select(2);
      });

      expect(result.current.phase).toBe('result');
      expect(result.current.selectedIndex).toBe(2);
    });

    it('should not allow selection when not in options phase', () => {
      const { result } = renderHook(() => useExerciseFlow());

      // Try to select in idle phase
      act(() => {
        result.current.select(0);
      });

      expect(result.current.selectedIndex).toBeNull();
      expect(result.current.phase).toBe('idle');

      // Start and select in question phase
      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.select(0);
      });

      // Should still be in question phase, selection ignored
      expect(result.current.phase).toBe('question');
      expect(result.current.selectedIndex).toBeNull();
    });

    it('should not allow multiple selections', () => {
      const { result } = renderHook(() =>
        useExerciseFlow({ questionDuration: 100, optionsDuration: 2000 })
      );

      // Get to options phase
      act(() => {
        result.current.start();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // First selection
      act(() => {
        result.current.select(1);
      });

      expect(result.current.selectedIndex).toBe(1);

      // Try second selection
      act(() => {
        result.current.select(2);
      });

      // Should still be first selection
      expect(result.current.selectedIndex).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial', () => {
      const { result } = renderHook(() =>
        useExerciseFlow({ questionDuration: 100, optionsDuration: 100 })
      );

      // Start and make a selection
      act(() => {
        result.current.start();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      act(() => {
        result.current.select(0);
      });

      expect(result.current.phase).toBe('result');
      expect(result.current.selectedIndex).toBe(0);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.phase).toBe('idle');
      expect(result.current.selectedIndex).toBeNull();
      expect(result.current.remainingMs).toBe(0);
    });
  });

  describe('onComplete callback', () => {
    it('should call onComplete after result phase duration', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useExerciseFlow(
          { questionDuration: 100, optionsDuration: 100, resultDuration: 500 },
          onComplete
        )
      );

      // Get to result phase
      act(() => {
        result.current.start();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      act(() => {
        result.current.select(0);
      });

      expect(result.current.phase).toBe('result');
      expect(onComplete).not.toHaveBeenCalled();

      // Advance past result duration
      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    it('should select -1 when options timeout', () => {
      const { result } = renderHook(() =>
        useExerciseFlow({ questionDuration: 100, optionsDuration: 200 })
      );

      act(() => {
        result.current.start();
      });

      // Advance to options phase
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.phase).toBe('options');

      // Advance past options duration without selecting
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.phase).toBe('result');
      expect(result.current.selectedIndex).toBe(-1);
    });
  });

  describe('getResponseTimeMs', () => {
    it('should return null before selection', () => {
      const { result } = renderHook(() => useExerciseFlow());

      expect(result.current.getResponseTimeMs()).toBeNull();
    });

    it('should return response time after selection', () => {
      const { result } = renderHook(() =>
        useExerciseFlow({ questionDuration: 100, optionsDuration: 2000 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Wait a bit then select
      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        result.current.select(0);
      });

      const responseTime = result.current.getResponseTimeMs();
      expect(responseTime).toBeGreaterThan(0);
    });
  });
});
