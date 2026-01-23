import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { trackingService } from "../services/trackingService";

/**
 * 自動追蹤畫面瀏覽
 * 使用 Expo Router 的 usePathname 來偵測路由變化
 */
export function useScreenTracking(): void {
  const pathname = usePathname();
  const lastPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // 避免重複追蹤相同路徑
    if (pathname === lastPathnameRef.current) {
      return;
    }

    lastPathnameRef.current = pathname;

    // 將路徑轉換為畫面名稱
    const screenName = getScreenName(pathname);
    trackingService.screenView(screenName);
  }, [pathname]);
}

/**
 * 將路徑轉換為畫面名稱
 */
function getScreenName(pathname: string): string {
  // 移除開頭的斜線和括號群組
  // 例如: "/(main)/learn" -> "learn"
  // 例如: "/(auth)/login" -> "login"
  const cleaned = pathname
    .replace(/^\//, "")        // 移除開頭斜線
    .replace(/\([^)]+\)\//g, ""); // 移除括號群組（如 (main)/）

  // 如果是根路徑，回傳 "home"
  if (!cleaned || cleaned === "index") {
    return "home";
  }

  return cleaned;
}
