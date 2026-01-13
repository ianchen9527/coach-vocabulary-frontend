import { useState, useRef, useCallback, useEffect } from "react";

export interface ExerciseFlowConfig {
  questionDuration?: number; // 預設 1000ms
  optionsDuration?: number; // 預設 4000ms
  resultDuration?: number; // 預設 1500ms
}

export type ExercisePhase = "idle" | "question" | "options" | "result";

const DEFAULT_CONFIG: Required<ExerciseFlowConfig> = {
  questionDuration: 1000,
  optionsDuration: 4000,
  resultDuration: 1500,
};

const COUNTDOWN_INTERVAL = 50; // 更新間隔 50ms

export function useExerciseFlow(
  config: ExerciseFlowConfig = {},
  onComplete?: () => void
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<ExercisePhase>("idle");
  const [remainingMs, setRemainingMs] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const optionsStartTimeRef = useRef<number | null>(null);
  const responseTimeMsRef = useRef<number | null>(null);

  // 保持 onComplete 的最新參照
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 清理計時器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  }, []);

  // 啟動倒數計時
  const startCountdown = useCallback(
    (duration: number, onEnd: () => void) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const start = Date.now();
      setRemainingMs(duration);

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, duration - elapsed);
        setRemainingMs(remaining);

        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onEnd();
        }
      }, COUNTDOWN_INTERVAL);
    },
    []
  );

  // 進入結果階段
  const enterResult = useCallback(
    (optionIndex: number) => {
      clearTimer();
      setSelectedIndex(optionIndex);
      setPhase("result");

      // 記錄回答時間（在進入 result 階段時記錄，而非 callback 中）
      if (optionsStartTimeRef.current !== null) {
        responseTimeMsRef.current = Date.now() - optionsStartTimeRef.current;
      }

      resultTimeoutRef.current = setTimeout(() => {
        onCompleteRef.current?.();
      }, finalConfig.resultDuration);
    },
    [clearTimer, finalConfig.resultDuration]
  );

  // 開始答題（進入 question phase）
  const start = useCallback(() => {
    clearTimer();
    setSelectedIndex(null);
    setPhase("question");

    startCountdown(finalConfig.questionDuration, () => {
      setPhase("options");
      optionsStartTimeRef.current = Date.now();
      startCountdown(finalConfig.optionsDuration, () => {
        // 超時
        enterResult(-1);
      });
    });
  }, [finalConfig, startCountdown, clearTimer, enterResult]);

  // 選擇選項
  const select = useCallback(
    (index: number) => {
      if (phase !== "options" || selectedIndex !== null) return;
      enterResult(index);
    },
    [phase, selectedIndex, enterResult]
  );

  // 重置
  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setSelectedIndex(null);
    setRemainingMs(0);
    optionsStartTimeRef.current = null;
    responseTimeMsRef.current = null;
  }, [clearTimer]);

  // 取得回答時間（在進入 result 階段時已記錄）
  const getResponseTimeMs = useCallback((): number | null => {
    return responseTimeMsRef.current;
  }, []);

  // 清理
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    phase,
    remainingMs,
    selectedIndex,
    start,
    select,
    reset,
    clearTimer,
    getResponseTimeMs,
  };
}
