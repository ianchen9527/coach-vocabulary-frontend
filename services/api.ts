import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// API Base URL - 可以透過環境變數覆蓋
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
// Staging
// const API_BASE_URL = "https://coach-vocab-api-dmui4j7mda-de.a.run.app";
// Prod
// const API_BASE_URL = "https://coach-vocab-api-prod-1068204580938.asia-east1.run.app";
// Local
// const API_BASE_URL = "http://192.168.0.214:8000";

// AsyncStorage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  USER: "user",
  // Microphone permission tracking
  MIC_PERMISSION_DISMISSED_AT: "micPermissionDismissedAt",
  MIC_PERMISSION_GRANTED: "micPermissionGranted",
  // Notification permission tracking
  NOTIFICATION_PERMISSION_DISMISSED_AT: "notificationPermissionDismissedAt",
  NOTIFICATION_PERMISSION_GRANTED: "notificationPermissionGranted",
  // Coach mark tutorials
  COACH_MARK_ANALYSIS: "coachMarkAnalysisSeen",
  COACH_MARK_LEARN: "coachMarkLearnSeen",
  COACH_MARK_PRACTICE_READING: "coachMarkPracticeReadingSeen",
  COACH_MARK_PRACTICE_LISTENING: "coachMarkPracticeListeningSeen",
  COACH_MARK_PRACTICE_SPEAKING: "coachMarkPracticeSpeakingSeen",
  COACH_MARK_REVIEW: "coachMarkReviewSeen",
  // Onboarding
  ONBOARDING_COMPLETED: "onboardingCompleted",
  // Tracking
  DEVICE_ID: "trackingDeviceId",
  SESSION_ID: "trackingSessionId",
  LAST_ACTIVE_TIME: "trackingLastActiveTime",
  IS_FRESH_INSTALL: "trackingIsFreshInstall",
} as const;

// 建立 Axios 實例
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 請求攔截器 - 自動加入 Bearer Token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      // AsyncStorage 錯誤不應阻止請求
      console.warn("Failed to get token from storage:", error);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 錯誤追蹤回調（由 trackingService 設定，避免循環依賴）
let errorTrackingCallback: ((endpoint: string, statusCode: number, errorMessage?: string) => void) | null = null;

export function setErrorTrackingCallback(
  callback: (endpoint: string, statusCode: number, errorMessage?: string) => void
): void {
  errorTrackingCallback = callback;
}

// 回應攔截器 - 錯誤處理
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url || "";

    if (error.response) {
      const { status, data } = error.response;

      // 記錄錯誤詳情
      console.error(`API Error [${status}]:`, data);

      // 401 表示認證問題（token 無效或過期）
      if (status === 401) {
        // 清除本地儲存的認證資訊
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN).catch(console.error);
        AsyncStorage.removeItem(STORAGE_KEYS.USER).catch(console.error);
      }

      // 追蹤 API 錯誤（排除 /api/track 以避免無限循環）
      if (errorTrackingCallback && !requestUrl.includes("/api/track")) {
        const errorDetail = (data as { detail?: string })?.detail;
        errorTrackingCallback(requestUrl, status, errorDetail);
      }
    } else if (error.request) {
      console.error("Network error - no response received:", error.message);

      // 追蹤網路錯誤
      if (errorTrackingCallback && !requestUrl.includes("/api/track")) {
        errorTrackingCallback(requestUrl, 0, "Network error");
      }
    } else {
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

// API 錯誤類型
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// 錯誤處理輔助函式
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string } | undefined;

    switch (error.response?.status) {
      case 400:
        return data?.detail || "請求格式錯誤";
      case 401:
        return "請重新登入";
      case 403:
        return "沒有權限執行此操作";
      case 404:
        return data?.detail || "資源不存在";
      case 500:
        return "伺服器錯誤，請稍後再試";
      default:
        return error.message || "網路連線錯誤";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "發生未知錯誤";
}

// 取得完整的資源 URL（圖片、音檔）
export function getAssetUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

export { API_BASE_URL };
