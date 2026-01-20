import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "../components/ui/Alert";
import { handleApiError } from "../services/api";

interface SessionWithAvailable {
  available: boolean;
  reason?: string;
}

export interface UseSessionLoaderOptions {
  /** Callback when session is unavailable */
  onUnavailable?: (reason: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Custom unavailable message */
  unavailableTitle?: string;
  /** Custom error message */
  errorTitle?: string;
}

export interface UseSessionLoaderReturn<T> {
  /** The loaded session data (null if not loaded yet) */
  session: T | null;
  /** Whether the session is currently loading */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Reload the session */
  reload: () => void;
}

/**
 * Generic hook for loading exercise sessions (Learn, Practice, Review, Analysis)
 *
 * Handles:
 * - Loading state management
 * - Error handling with alerts
 * - Availability check (available: false → shows alert)
 *
 * @param loadFn - Async function that returns session data
 * @param options - Configuration options
 * @returns Session data, loading state, and error state
 */
export function useSessionLoader<T extends SessionWithAvailable>(
  loadFn: () => Promise<T>,
  options: UseSessionLoaderOptions = {}
): UseSessionLoaderReturn<T> {
  const {
    onUnavailable,
    onError,
    unavailableTitle = "無法進行",
    errorTitle = "載入失敗",
  } = options;

  const [session, setSession] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to keep options callbacks stable
  const onUnavailableRef = useRef(onUnavailable);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
    onErrorRef.current = onError;
  }, [onUnavailable, onError]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await loadFn();

      if (!data.available) {
        const reason = data.reason || "目前無法進行此操作";
        setError(reason);
        Alert.alert(unavailableTitle, reason, [
          { text: "返回", onPress: () => onUnavailableRef.current?.(reason) },
        ]);
        setLoading(false);
        return;
      }

      setSession(data);
      setLoading(false);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      Alert.alert(errorTitle, errorMessage, [
        { text: "返回", onPress: () => onErrorRef.current?.(errorMessage) },
      ]);
      setLoading(false);
    }
  }, [loadFn, unavailableTitle, errorTitle]);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    loading,
    error,
    reload: loadSession,
  };
}
