import React, { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../services/api";
import { trackingService } from "../services/trackingService";
import { getOrCreateDeviceId, generateSessionId, checkIsFreshInstall } from "../utils/deviceId";

// Session 超時時間（30 分鐘）
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface TrackingContextType {
  /** 連結使用者 ID（登入後呼叫） */
  linkUserId: (userId: string) => void;
  /** 清除使用者 ID（登出後呼叫） */
  clearUserId: () => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const isInitializedRef = useRef(false);
  const lastActiveTimeRef = useRef<number>(Date.now());

  // 初始化追蹤
  useEffect(() => {
    const initTracking = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        // 取得或建立裝置 ID
        const deviceId = await getOrCreateDeviceId();
        trackingService.setDeviceId(deviceId);

        // 檢查是否為新安裝
        const isFreshInstall = await checkIsFreshInstall();

        // 檢查是否需要建立新 session
        const lastActiveStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TIME);
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
        const now = Date.now();
        const gap = now - lastActive;

        let sessionId: string;
        const existingSessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);

        if (!existingSessionId || gap > SESSION_TIMEOUT_MS) {
          // 建立新 session
          sessionId = generateSessionId();
          await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
          trackingService.setSessionId(sessionId);

          // 發送 session_start 事件
          trackingService.sessionStart(isFreshInstall, existingSessionId ? gap : undefined);
        } else {
          // 使用既有 session
          sessionId = existingSessionId;
          trackingService.setSessionId(sessionId);
        }

        // 更新最後活動時間
        lastActiveTimeRef.current = now;
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIME, now.toString());
      } catch (error) {
        console.warn("Failed to initialize tracking:", error);
      }
    };

    initTracking();
  }, []);

  // 處理 App 狀態變化（前景/背景）
  useEffect(() => {
    const handleVisibilityChange = async (isVisible: boolean) => {
      const now = Date.now();

      if (isVisible) {
        // App 進入前景
        const lastActiveStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TIME);
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
        const gap = now - lastActive;

        if (gap > SESSION_TIMEOUT_MS) {
          // 超過 30 分鐘，建立新 session
          const sessionId = generateSessionId();
          await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
          trackingService.setSessionId(sessionId);
          trackingService.sessionStart(false, gap);
        }
      } else {
        // App 進入背景
        trackingService.sessionEnd();
      }

      // 更新最後活動時間
      lastActiveTimeRef.current = now;
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIME, now.toString());
    };

    // iOS/Android: 使用 AppState
    if (Platform.OS !== "web") {
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        handleVisibilityChange(nextAppState === "active");
      };

      const subscription = AppState.addEventListener("change", handleAppStateChange);
      return () => subscription.remove();
    }

    // Web: 使用 visibilitychange
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const handleWebVisibilityChange = () => {
        handleVisibilityChange(document.visibilityState === "visible");
      };

      document.addEventListener("visibilitychange", handleWebVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleWebVisibilityChange);
    }

    return undefined;
  }, []);

  // Context 方法
  const linkUserId = (userId: string) => {
    trackingService.linkUserId(userId);
  };

  const clearUserId = () => {
    trackingService.clearUserId();
  };

  return (
    <TrackingContext.Provider value={{ linkUserId, clearUserId }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error("useTracking must be used within a TrackingProvider");
  }
  return context;
}
