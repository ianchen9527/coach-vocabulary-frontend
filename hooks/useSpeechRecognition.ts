import { useState, useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionOptions,
} from "expo-speech-recognition";

export interface UseSpeechRecognitionConfig {
  lang?: string;
  interimResults?: boolean;
  maxAlternatives?: number;
  continuous?: boolean;
}

export interface StartOptions {
  contextualStrings?: string[];
}

export interface UseSpeechRecognitionReturn {
  // 狀態
  isRecognizing: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  isSupported: boolean;
  hasPermission: boolean | null;

  // 方法
  start: (options?: StartOptions) => Promise<boolean>;
  stop: () => void;
  abort: () => void;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "麥克風權限被拒絕，請至設定中開啟",
  "no-speech": "未偵測到語音，請重試",
  "audio-capture": "無法存取麥克風",
  "network": "網路連線錯誤",
  "aborted": "辨識已取消",
  "service-not-allowed": "語音辨識服務不可用",
};

function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || `辨識錯誤: ${errorCode}`;
}

export function useSpeechRecognition(
  config: UseSpeechRecognitionConfig = {}
): UseSpeechRecognitionReturn {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // 用於等待 start 事件的 Promise resolve
  const startResolveRef = useRef<((value: boolean) => void) | null>(null);

  // 檢查平台支援
  const isSupported =
    Platform.OS !== "web" ||
    (typeof window !== "undefined" && "webkitSpeechRecognition" in window);

  // 事件監聽：開始
  useSpeechRecognitionEvent("start", () => {
    setIsRecognizing(true);
    setError(null);
    // 通知 start() 函數辨識已真正開始
    if (startResolveRef.current) {
      startResolveRef.current(true);
      startResolveRef.current = null;
    }
  });

  // 事件監聽：結束
  useSpeechRecognitionEvent("end", () => {
    setIsRecognizing(false);
  });

  // 事件監聽：辨識結果
  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[event.results.length - 1];
    if (event.isFinal) {
      setFinalTranscript(result.transcript);
      setInterimTranscript("");
    } else {
      setInterimTranscript(result.transcript);
    }
  });

  // 事件監聽：錯誤
  useSpeechRecognitionEvent("error", (event) => {
    // "aborted" 是我們主動呼叫 abort() 的結果，不算真正的錯誤
    if (event.error !== "aborted") {
      setError(getErrorMessage(event.error));
      // 如果在等待 start，通知失敗
      if (startResolveRef.current) {
        startResolveRef.current(false);
        startResolveRef.current = null;
      }
    }
    setIsRecognizing(false);
  });

  // 請求權限
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setHasPermission(result.granted);
      return result.granted;
    } catch (err) {
      setError("無法請求麥克風權限");
      return false;
    }
  }, []);

  // 開始辨識
  const start = useCallback(async (startOptions?: StartOptions): Promise<boolean> => {
    if (!isSupported) {
      setError("此裝置不支援語音辨識");
      return false;
    }

    // 檢查並請求權限
    if (hasPermission === null || !hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        setError("麥克風權限被拒絕，請至設定中開啟");
        return false;
      }
    }

    // 重置狀態
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);

    try {
      const options: ExpoSpeechRecognitionOptions = {
        lang: config.lang || "en-US",
        interimResults: config.interimResults ?? true,
        maxAlternatives: config.maxAlternatives || 1,
        continuous: config.continuous || false,
        contextualStrings: startOptions?.contextualStrings,
      };

      // 建立 Promise 等待 start 事件
      const startPromise = new Promise<boolean>((resolve) => {
        startResolveRef.current = resolve;
        // 設定 timeout，避免無限等待
        setTimeout(() => {
          if (startResolveRef.current) {
            startResolveRef.current(false);
            startResolveRef.current = null;
          }
        }, 3000);
      });

      ExpoSpeechRecognitionModule.start(options);

      // 等待 start 事件觸發
      const started = await startPromise;
      return started;
    } catch (err) {
      setError("無法啟動語音辨識");
      return false;
    }
  }, [isSupported, hasPermission, config, requestPermissions]);

  // 停止辨識（取得最終結果）
  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.error("Stop recognition error:", err);
    }
  }, []);

  // 中止辨識（不取得結果）
  const abort = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.abort();
      setIsRecognizing(false);
      setInterimTranscript("");
    } catch (err) {
      // Silently ignore abort errors
    }
  }, []);

  // 重置辨識狀態（清除上一題的結果）
  const reset = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
  }, []);

  return {
    isRecognizing,
    interimTranscript,
    finalTranscript,
    error,
    isSupported,
    hasPermission,
    start,
    stop,
    abort,
    reset,
  };
}
