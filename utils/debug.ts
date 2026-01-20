/**
 * Debug logging utility
 * Controlled by EXPO_PUBLIC_DEBUG_MODE environment variable
 */

import { DEBUG_MODE } from "../lib/config";

export const DEBUG_LOG_ENABLED = DEBUG_MODE;

type LogLevel = "log" | "warn" | "error";

/**
 * Create a debug logger for a specific module
 * @param moduleName - Name of the module (e.g., "SpeechService", "useSpeakingExercise")
 * @returns Object with log, warn, error methods that respect DEBUG_LOG_ENABLED flag
 */
export function createDebugLogger(moduleName: string) {
  const formatMessage = (message: string) => `[${moduleName}] ${message}`;

  const logWithLevel = (level: LogLevel, message: string, data?: unknown) => {
    if (!DEBUG_LOG_ENABLED) return;

    const formattedMessage = formatMessage(message);
    if (data !== undefined) {
      console[level](formattedMessage, data);
    } else {
      console[level](formattedMessage);
    }
  };

  return {
    log: (message: string, data?: unknown) => logWithLevel("log", message, data),
    warn: (message: string, data?: unknown) => logWithLevel("warn", message, data),
    error: (message: string, data?: unknown) => logWithLevel("error", message, data),
  };
}
