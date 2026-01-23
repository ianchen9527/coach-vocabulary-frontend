import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../services/api";

/**
 * 產生 UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 取得或建立裝置 ID
 * 首次呼叫時會產生新的 UUID 並儲存到 AsyncStorage
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existingId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existingId) {
      return existingId;
    }

    const newId = generateUUID();
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, newId);
    return newId;
  } catch (error) {
    // 若儲存失敗，仍回傳新產生的 ID（但不會被持久化）
    console.warn("Failed to persist device ID:", error);
    return generateUUID();
  }
}

/**
 * 產生新的 Session ID
 */
export function generateSessionId(): string {
  return generateUUID();
}

/**
 * 檢查是否為首次安裝
 */
export async function checkIsFreshInstall(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(STORAGE_KEYS.IS_FRESH_INSTALL);
    if (flag === null) {
      // 首次安裝，設定標記
      await AsyncStorage.setItem(STORAGE_KEYS.IS_FRESH_INSTALL, "false");
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Failed to check fresh install:", error);
    return false;
  }
}
