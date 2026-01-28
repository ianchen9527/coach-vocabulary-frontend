import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter, Href } from "expo-router";

export interface UseNotificationResponseConfig {
  /** 當通知被點擊時的回調 */
  onResponse?: () => void;
}

/**
 * Hook 處理通知點擊回應
 * - 監聽背景狀態的通知點擊
 * - 處理冷啟動時的通知點擊
 * - 導航到通知中的 URL
 */
export function useNotificationResponse(config: UseNotificationResponseConfig = {}) {
  const router = useRouter();
  const lastResponseIdRef = useRef<string | null>(null);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    // 防止重複處理同一個通知
    if (response.notification.request.identifier === lastResponseIdRef.current) {
      return;
    }
    lastResponseIdRef.current = response.notification.request.identifier;

    // 取得通知中的 URL
    const url = response.notification.request.content.data?.url as string | undefined;

    if (url) {
      // 使用 replace 避免在導航堆疊中產生重複頁面
      router.replace(url as Href);
    }

    // 觸發回調（用於刷新資料）
    config.onResponse?.();
  };

  useEffect(() => {
    // 通知功能僅在原生平台上運作
    if (Platform.OS === "web") {
      return;
    }

    // 處理冷啟動：檢查 App 是否由通知啟動
    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        handleNotificationResponse(response);
      }
    };
    checkInitialNotification();

    // 監聽背景狀態的通知點擊
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
