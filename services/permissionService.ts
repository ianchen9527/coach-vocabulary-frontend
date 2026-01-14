import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import * as Notifications from "expo-notifications";
import { STORAGE_KEYS } from "./api";

// 2 days in milliseconds
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// Platforms where notifications are disabled
const NOTIFICATION_DISABLED_PLATFORMS: string[] = ["web"];

const isNotificationDisabled = () =>
  NOTIFICATION_DISABLED_PLATFORMS.includes(Platform.OS);

const isWeb = () => Platform.OS === "web";

/**
 * Check microphone permission on web using browser Permission API
 */
async function checkWebMicPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.permissions) {
    return false;
  }
  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state === "granted";
  } catch {
    // Permission API might not support 'microphone' query in some browsers
    return false;
  }
}

/**
 * Request microphone permission on web by requesting user media
 */
async function requestWebMicPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks immediately after getting permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export const permissionService = {
  // ========== Microphone/Speech Recognition ==========

  /**
   * Check if microphone permission is granted at system level
   */
  async checkMicPermissionStatus(): Promise<boolean> {
    if (isWeb()) {
      return checkWebMicPermission();
    }

    try {
      const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      return result.granted;
    } catch {
      return false;
    }
  },

  /**
   * Request microphone permission from system
   */
  async requestMicPermission(): Promise<boolean> {
    if (isWeb()) {
      return requestWebMicPermission();
    }

    try {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch {
      return false;
    }
  },

  /**
   * Record that user dismissed mic permission prompt
   */
  async recordMicPermissionDismissal(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT,
      Date.now().toString()
    );
  },

  /**
   * Record that mic permission was granted
   */
  async recordMicPermissionGranted(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MIC_PERMISSION_GRANTED, "true");
    // Clear dismissal timestamp if any
    await AsyncStorage.removeItem(STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT);
  },

  /**
   * Check if we should show mic permission prompt
   */
  async shouldShowMicPermissionPrompt(): Promise<boolean> {
    // First check if system already has permission granted
    const systemGranted = await this.checkMicPermissionStatus();
    if (systemGranted) {
      // Already granted at system level, record it and don't show
      await AsyncStorage.setItem(STORAGE_KEYS.MIC_PERMISSION_GRANTED, "true");
      return false;
    }

    // Check if we've recorded it as granted
    const granted = await AsyncStorage.getItem(
      STORAGE_KEYS.MIC_PERMISSION_GRANTED
    );
    if (granted === "true") {
      return false;
    }

    // Check if dismissed within 2 days
    const dismissedAt = await AsyncStorage.getItem(
      STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT
    );
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < TWO_DAYS_MS) {
        return false;
      }
    }

    return true;
  },

  // ========== Notifications ==========

  /**
   * Check if notification permission is granted at system level
   */
  async checkNotificationPermissionStatus(): Promise<boolean> {
    if (isNotificationDisabled()) {
      return true; // Treat as granted on disabled platforms to skip modal
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  },

  /**
   * Request notification permission from system
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (isNotificationDisabled()) {
      return true;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      if (existingStatus === "granted") {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  },

  /**
   * Record that user dismissed notification permission prompt
   */
  async recordNotificationPermissionDismissal(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT,
      Date.now().toString()
    );
  },

  /**
   * Record that notification permission was granted
   */
  async recordNotificationPermissionGranted(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_GRANTED,
      "true"
    );
    // Clear dismissal timestamp if any
    await AsyncStorage.removeItem(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT
    );
  },

  /**
   * Check if we should show notification permission prompt
   */
  async shouldShowNotificationPermissionPrompt(): Promise<boolean> {
    // Skip on platforms where notifications are disabled
    if (isNotificationDisabled()) {
      return false;
    }

    // First check if system already has permission granted
    const systemGranted = await this.checkNotificationPermissionStatus();
    if (systemGranted) {
      // Already granted at system level, record it and don't show
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PERMISSION_GRANTED,
        "true"
      );
      return false;
    }

    // Check if we've recorded it as granted
    const granted = await AsyncStorage.getItem(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_GRANTED
    );
    if (granted === "true") {
      return false;
    }

    // Check if dismissed within 2 days
    const dismissedAt = await AsyncStorage.getItem(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT
    );
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < TWO_DAYS_MS) {
        return false;
      }
    }

    return true;
  },
};
