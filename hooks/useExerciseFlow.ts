import { useState, useRef, useCallback, useEffect } from "react";

export interface ExerciseFlowConfig {
  questionDuration?: number; // 預設 1000ms
  optionsDuration?: number; // 預設 4000ms
  resultDuration?: number; // 預設 1500ms
}

export type ExercisePhase = "idle" | "question" | "options" | "processing" | "result";

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

  // 進入處理階段（用於需要 async 驗證的口說題）
  const enterProcessing = useCallback(() => {
    console.log("[ExerciseFlow] enterProcessing called", { currentPhase: phase });
    clearTimer();
    setPhase("processing");

    // 記錄回答時間（在進入 processing 階段時記錄）
    if (optionsStartTimeRef.current !== null && responseTimeMsRef.current === null) {
      responseTimeMsRef.current = Date.now() - optionsStartTimeRef.current;
    }
  }, [clearTimer, phase]);

  // 進入結果階段
  const enterResult = useCallback(
    (optionIndex: number, skipResultTimeout = false) => {
      console.log("[ExerciseFlow] enterResult called", { optionIndex, currentPhase: phase, skipResultTimeout });
      clearTimer();
      setSelectedIndex(optionIndex);
      setPhase("result");
      console.log("[ExerciseFlow] Phase set to 'result'");

      // 記錄回答時間（如果還沒記錄的話，例如從 options 直接進入 result）
      if (optionsStartTimeRef.current !== null && responseTimeMsRef.current === null) {
        responseTimeMsRef.current = Date.now() - optionsStartTimeRef.current;
      }

      // 如果 skipResultTimeout 為 true，不啟動自動完成計時器（用於需要等待 async 驗證的情況）
      if (!skipResultTimeout) {
        console.log("[ExerciseFlow] Starting result timeout", { duration: finalConfig.resultDuration });
        resultTimeoutRef.current = setTimeout(() => {
          console.log("[ExerciseFlow] Result timeout fired, calling onComplete");
          onCompleteRef.current?.();
        }, finalConfig.resultDuration);
      } else {
        console.log("[ExerciseFlow] Result timeout SKIPPED (async verification pending)");
      }
    },
    [clearTimer, finalConfig.resultDuration, phase]
  );

  // 啟動結果階段計時器（用於 async 驗證完成後）
  const startResultTimeout = useCallback(() => {
    console.log("[ExerciseFlow] startResultTimeout called", { phase });
    if (phase !== "result") {
      console.log("[ExerciseFlow] startResultTimeout IGNORED - not in result phase");
      return;
    }

    // 清除任何現有的計時器
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }

    console.log("[ExerciseFlow] Starting result timeout (manual)", { duration: finalConfig.resultDuration });
    resultTimeoutRef.current = setTimeout(() => {
      console.log("[ExerciseFlow] Result timeout fired, calling onComplete");
      onCompleteRef.current?.();
    }, finalConfig.resultDuration);
  }, [phase, finalConfig.resultDuration]);

  // 開始答題（進入 question phase）
  // delayOptionsCountdown: 如果為 true，進入 options 階段時不自動開始倒數（用於口說題等待錄音準備好）
  const start = useCallback((delayOptionsCountdown = false) => {
    clearTimer();
    setSelectedIndex(null);
    setPhase("question");

    startCountdown(finalConfig.questionDuration, () => {
      setPhase("options");
      optionsStartTimeRef.current = Date.now();

      // 只有在不延遲的情況下才自動開始倒數
      if (!delayOptionsCountdown) {
        startCountdown(finalConfig.optionsDuration, () => {
          // 超時
          enterResult(-1);
        });
      }
    });
  }, [finalConfig, startCountdown, clearTimer, enterResult]);

  // 手動開始 options 倒數（用於口說題錄音準備好後）
  // onTimeout: 可選的自訂超時回調（用於口說題進入 processing 而非直接進入 result）
  const startOptionsCountdown = useCallback((onTimeout?: () => void) => {
    if (phase === "options") {
      optionsStartTimeRef.current = Date.now(); // 重設開始時間
      startCountdown(finalConfig.optionsDuration, onTimeout ?? (() => {
        enterResult(-1);
      }));
    }
  }, [phase, finalConfig.optionsDuration, startCountdown, enterResult]);

  // 選擇選項
  const select = useCallback(
    (index: number, skipResultTimeout = false) => {
      console.log("[ExerciseFlow] select() called", { index, phase, selectedIndex, skipResultTimeout });
      if (phase !== "options" || selectedIndex !== null) {
        console.log("[ExerciseFlow] select() BLOCKED - phase is not 'options' or already selected", { phase, selectedIndex });
        return;
      }
      enterResult(index, skipResultTimeout);
    },
    [phase, selectedIndex, enterResult]
  );

  // 更新已選擇的索引（用於 async 驗證完成後更新結果）
  const updateSelectedIndex = useCallback((index: number) => {
    console.log("[ExerciseFlow] updateSelectedIndex called", { index, phase });
    if (phase === "result") {
      setSelectedIndex(index);
    }
  }, [phase]);

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
    startOptionsCountdown,
    select,
    reset,
    clearTimer,
    getResponseTimeMs,
    enterProcessing,
    enterResult,
    startResultTimeout,
    updateSelectedIndex,
  };
}
