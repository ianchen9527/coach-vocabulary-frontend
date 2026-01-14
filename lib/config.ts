// App configuration from environment variables

// Debug mode - 預設開啟，在 preview 和 production 關閉
export const DEBUG_MODE = String(process.env.EXPO_PUBLIC_DEBUG_MODE) !== "false";
