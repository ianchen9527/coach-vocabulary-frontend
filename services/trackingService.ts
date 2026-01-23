import { Platform } from "react-native";
import Constants from "expo-constants";
import { api, setErrorTrackingCallback } from "./api";
import type { TrackingEvent, TrackingEventType, TrackingPlatform, SessionMode } from "../types/api";

// 追蹤狀態（由 TrackingContext 設定）
let deviceId: string | null = null;
let sessionId: string | null = null;
let userId: string | null = null;
let exerciseSessionId: string | null = null;

/**
 * 產生 UUID
 */
function generateUUID(): string {
  // 使用 crypto.randomUUID 如果可用，否則用 fallback
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: 簡易 UUID v4 實作
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 取得平台名稱
 */
function getPlatform(): TrackingPlatform {
  return Platform.OS as TrackingPlatform;
}

/**
 * 取得 App 版本
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || "1.0.0";
}

/**
 * 建立追蹤事件
 */
function createEvent(
  eventType: TrackingEventType,
  eventName: string,
  properties?: Record<string, unknown>,
  includeExerciseSessionId = false
): TrackingEvent | null {
  if (!deviceId || !sessionId) {
    if (__DEV__) {
      console.debug("Tracking not initialized, skipping event:", eventName);
    }
    return null;
  }

  return {
    device_id: deviceId,
    user_id: userId || undefined,
    session_id: sessionId,
    exercise_session_id: includeExerciseSessionId && exerciseSessionId ? exerciseSessionId : undefined,
    event_type: eventType,
    event_name: eventName,
    properties,
    timestamp: new Date().toISOString(),
    app_version: getAppVersion(),
    platform: getPlatform(),
  };
}

/**
 * 發送追蹤事件（fire-and-forget）
 */
function sendEvent(event: TrackingEvent): void {
  // API 接受 events 陣列，目前只發送單一事件
  api.post("/api/track", { events: [event] }).catch((error) => {
    if (__DEV__) {
      console.debug("Tracking failed:", error.message);
    }
  });
}

/**
 * 追蹤事件（通用方法）
 */
function track(
  eventType: TrackingEventType,
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const event = createEvent(eventType, eventName, properties);
  if (event) {
    sendEvent(event);
  }
}

/**
 * 追蹤 Exercise 事件（包含 exercise_session_id）
 */
function trackExercise(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const event = createEvent("exercise", eventName, properties, true);
  if (event) {
    sendEvent(event);
  }
}

// 註冊 API 錯誤追蹤回調
setErrorTrackingCallback((endpoint, statusCode, errorMessage) => {
  trackingService.apiError(endpoint, statusCode, errorMessage);
});

export const trackingService = {
  // === 設定方法（由 TrackingContext 呼叫）===

  /**
   * 設定裝置 ID
   */
  setDeviceId(id: string): void {
    deviceId = id;
  },

  /**
   * 設定 Session ID
   */
  setSessionId(id: string): void {
    sessionId = id;
  },

  /**
   * 連結使用者 ID（登入後呼叫）
   */
  linkUserId(id: string): void {
    userId = id;
  },

  /**
   * 清除使用者 ID（登出後呼叫）
   */
  clearUserId(): void {
    userId = null;
  },

  // === Session 事件 ===

  /**
   * Session 開始
   */
  sessionStart(isFreshInstall: boolean, gapMs?: number): void {
    track("session", "session_start", {
      is_fresh_install: isFreshInstall,
      gap_ms: gapMs,
    });
  },

  /**
   * Session 結束（App 進入背景）
   */
  sessionEnd(): void {
    track("session", "session_end");
  },

  // === Screen 事件 ===

  /**
   * 畫面瀏覽
   */
  screenView(screenName: string, properties?: Record<string, unknown>): void {
    track("screen_view", screenName, properties);
  },

  // === Action 事件 ===

  /**
   * 按鈕點擊
   */
  buttonTap(buttonName: string, screen: string, properties?: Record<string, unknown>): void {
    track("action", "button_tap", {
      button_name: buttonName,
      screen,
      ...properties,
    });
  },

  /**
   * 權限回應
   */
  permissionResponse(
    permissionType: "microphone" | "notification",
    response: "granted" | "denied" | "dismissed"
  ): void {
    track("action", "permission_response", {
      permission_type: permissionType,
      response,
    });
  },

  // === Auth 事件 ===

  /**
   * 登入
   */
  login(method: string = "email"): void {
    track("action", "login", { method });
  },

  /**
   * 註冊
   */
  register(method: string = "email"): void {
    track("action", "register", { method });
  },

  /**
   * 登出
   */
  logout(): void {
    track("action", "logout");
  },

  /**
   * 刪除帳號
   */
  deleteAccount(): void {
    track("action", "delete_account");
  },

  // === Exercise 事件 ===

  /**
   * 練習開始
   */
  exerciseStart(mode: SessionMode | "analysis", exerciseCount: number): void {
    // 產生新的 exercise session ID
    exerciseSessionId = generateUUID();
    trackExercise("exercise_start", {
      mode,
      exercise_count: exerciseCount,
    });
  },

  /**
   * 回答問題
   */
  exerciseAnswer(
    mode: SessionMode | "analysis",
    wordId: string,
    exerciseType: string,
    correct: boolean,
    responseTimeMs?: number
  ): void {
    trackExercise("exercise_answer", {
      mode,
      word_id: wordId,
      exercise_type: exerciseType,
      correct,
      response_time_ms: responseTimeMs,
    });
  },

  /**
   * 練習完成
   */
  exerciseComplete(
    mode: SessionMode | "analysis",
    exerciseCount: number,
    correctCount: number,
    durationMs: number
  ): void {
    trackExercise("exercise_complete", {
      mode,
      exercise_count: exerciseCount,
      correct_count: correctCount,
      duration_ms: durationMs,
    });
    // 清除 exercise session ID
    exerciseSessionId = null;
  },

  /**
   * 練習放棄（中途離開）
   */
  exerciseAbandon(
    mode: SessionMode | "analysis",
    currentIndex: number,
    totalCount: number,
    durationMs: number
  ): void {
    trackExercise("exercise_abandon", {
      mode,
      current_index: currentIndex,
      total_count: totalCount,
      duration_ms: durationMs,
    });
    // 清除 exercise session ID
    exerciseSessionId = null;
  },

  /**
   * 題目顯示（進入 question 階段）
   */
  questionShown(
    mode: SessionMode | "analysis",
    wordId: string,
    exerciseType: string,
    currentIndex: number
  ): void {
    trackExercise("question_shown", {
      mode,
      word_id: wordId,
      exercise_type: exerciseType,
      current_index: currentIndex,
    });
  },

  /**
   * 答題階段開始（進入 options 階段或顯示錄音 UI）
   */
  answerPhaseStarted(
    mode: SessionMode | "analysis",
    wordId: string,
    exerciseType: string
  ): void {
    trackExercise("answer_phase_started", {
      mode,
      word_id: wordId,
      exercise_type: exerciseType,
    });
  },

  /**
   * 音檔播放（聽力題、展示階段）
   */
  audioPlayed(
    mode: SessionMode | "analysis",
    wordId: string,
    trigger: "auto" | "tap"
  ): void {
    trackExercise("audio_played", {
      mode,
      word_id: wordId,
      trigger,
    });
  },

  /**
   * 錄音開始
   */
  recordingStarted(mode: SessionMode, wordId: string): void {
    trackExercise("recording_started", {
      mode,
      word_id: wordId,
    });
  },

  /**
   * 錄音結束
   */
  recordingStopped(
    mode: SessionMode,
    wordId: string,
    stopReason: "correct_match" | "timeout" | "manual"
  ): void {
    trackExercise("recording_stopped", {
      mode,
      word_id: wordId,
      stop_reason: stopReason,
    });
  },

  /**
   * 語音辨識結果
   */
  speechRecognized(
    mode: SessionMode,
    wordId: string,
    recognizedText: string,
    isMatch: boolean
  ): void {
    trackExercise("speech_recognized", {
      mode,
      word_id: wordId,
      recognized_text: recognizedText,
      is_match: isMatch,
    });
  },

  // === Error 事件 ===

  /**
   * API 錯誤
   */
  apiError(endpoint: string, statusCode: number, errorMessage?: string): void {
    track("error", "api_error", {
      endpoint,
      status_code: statusCode,
      error_message: errorMessage,
    });
  },

  /**
   * 未處理的錯誤
   */
  unhandledError(errorMessage: string, componentStack?: string): void {
    track("error", "unhandled_error", {
      error_message: errorMessage,
      component_stack: componentStack,
    });
  },
};
