import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// API Base URL - 可以透過環境變數覆蓋
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// 建立 Axios 實例
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 請求攔截器 - 自動加入 X-User-Id
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId && config.headers) {
        config.headers["X-User-Id"] = userId;
      }
    } catch (error) {
      // AsyncStorage 錯誤不應阻止請求
      console.warn("Failed to get userId from storage:", error);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 回應攔截器 - 錯誤處理
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;

      // 記錄錯誤詳情
      console.error(`API Error [${status}]:`, data);

      // 401/403 表示認證問題
      if (status === 401 || status === 403) {
        // 清除本地儲存的認證資訊
        AsyncStorage.removeItem("userId").catch(console.error);
        AsyncStorage.removeItem("username").catch(console.error);
      }
    } else if (error.request) {
      console.error("Network error - no response received:", error.message);
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
