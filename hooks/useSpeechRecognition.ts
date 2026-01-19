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
  // 錄音資料（用於 Whisper 後備方案）
  audioUri: string | null;  // Native: 錄音檔案 URI
  audioBlob: Blob | null;   // Web: 錄音 Blob

  // 方法
  start: (options?: StartOptions) => Promise<boolean>;
  stop: () => void;
  abort: () => void;
  reset: () => void;
  getAudioData: () => string | Blob | null;  // 取得當前錄音資料（同步）
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

  // 錄音資料狀態
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // 錄音資料 refs（用於同步存取，避免閉包問題）
  const audioUriRef = useRef<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // 用於等待 start 事件的 Promise resolve
  const startResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Web 平台的 MediaRecorder 相關 refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  // 事件監聽：錄音開始（Native 平台，取得錄音檔案 URI）
  // 使用 audiostart 而非 audioend，因為 URI 在開始時就可用，避免時序問題
  useSpeechRecognitionEvent("audiostart", (event) => {
    if (event.uri) {
      audioUriRef.current = event.uri;
      setAudioUri(event.uri);
    }
  });

  // 也監聽 audioend 作為備用（某些情況下 audiostart 可能沒有 URI）
  useSpeechRecognitionEvent("audioend", (event) => {
    if (event.uri && !audioUriRef.current) {
      audioUriRef.current = event.uri;
      setAudioUri(event.uri);
    }
  });

  // 停止 Web 平台的 MediaRecorder
  const stopWebRecording = useCallback(() => {
    if (Platform.OS === "web" && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        // Silently ignore stop errors
      }
    }
  }, []);

  // 清理 Web 平台的 MediaStream
  const cleanupWebRecording = useCallback(() => {
    if (Platform.OS === "web") {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  }, []);

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
    setAudioUri(null);
    setAudioBlob(null);

    try {
      // Web 平台：啟動 MediaRecorder 錄音
      if (Platform.OS === "web") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          audioChunksRef.current = [];

          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm",
          });

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            setAudioBlob(blob);
            cleanupWebRecording();
          };

          mediaRecorderRef.current = mediaRecorder;
          // 使用 timeslice 參數讓 ondataavailable 每 100ms 觸發一次
          // 這樣在 abort() 時就能取得已錄製的音訊片段
          mediaRecorder.start(100);
        } catch (webErr) {
          console.warn("Failed to start web audio recording:", webErr);
          // 繼續進行語音辨識，即使錄音失敗
        }
      }

      const options: ExpoSpeechRecognitionOptions = {
        lang: config.lang || "en-US",
        interimResults: config.interimResults ?? true,
        maxAlternatives: config.maxAlternatives || 1,
        continuous: config.continuous || false,
        contextualStrings: startOptions?.contextualStrings,
        // Native 平台：啟用錄音持久化
        ...(Platform.OS !== "web" && {
          recordingOptions: {
            persist: true,
            outputFileName: "speech_recording.wav",
          },
        }),
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
      // 停止 Web 錄音
      stopWebRecording();
    } catch (err) {
      console.error("Stop recognition error:", err);
    }
  }, [stopWebRecording]);

  // 中止辨識（不取得結果）
  const abort = useCallback(() => {
    try {
      // Web 平台：在停止前同步建立 blob，確保資料可立即使用
      if (Platform.OS === "web" && audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = blob;
        setAudioBlob(blob);
      }

      ExpoSpeechRecognitionModule.abort();
      setIsRecognizing(false);
      setInterimTranscript("");
      // 停止 Web 錄音
      stopWebRecording();
    } catch (err) {
      // Silently ignore abort errors
    }
  }, [stopWebRecording]);

  // 重置辨識狀態（清除上一題的結果）
  const reset = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
    setAudioUri(null);
    setAudioBlob(null);
    audioUriRef.current = null;
    audioBlobRef.current = null;
    cleanupWebRecording();
  }, [cleanupWebRecording]);

  // 取得當前錄音資料（同步存取 refs，避免閉包問題）
  const getAudioData = useCallback((): string | Blob | null => {
    return audioUriRef.current || audioBlobRef.current;
  }, []);

  return {
    isRecognizing,
    interimTranscript,
    finalTranscript,
    error,
    isSupported,
    hasPermission,
    audioUri,
    audioBlob,
    start,
    stop,
    abort,
    reset,
    getAudioData,
  };
}
