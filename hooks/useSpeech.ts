import { useCallback, useState, useRef, useEffect } from "react";
import { Platform } from "react-native";

interface UseSpeechReturn {
  speak: (text: string, audioUrl?: string | null) => Promise<void>;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

/**
 * 使用 Web Speech API 進行 TTS 播放
 */
function createTTSPromise(
  text: string,
  setIsSpeaking: (value: boolean) => void,
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("Speech synthesis not available");
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      resolve();
    };
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
      resolve();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 語音播放 Hook
 *
 * 優先使用提供的音檔 URL，若為 null 則使用 Web Speech API TTS
 */
export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isWebPlatform = Platform.OS === "web";
  const isSupported = isWebPlatform && typeof window !== "undefined";

  const cancel = useCallback(() => {
    if (!isSupported) return;

    // 取消 TTS
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // 取消音檔播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    async (text: string, audioUrl?: string | null): Promise<void> => {
      if (!isSupported) {
        console.warn("Speech not supported on this platform");
        return;
      }

      // 取消之前的播放
      cancel();

      // 定義 TTS 備案函數
      const speakWithTTS = () => createTTSPromise(text, setIsSpeaking, utteranceRef);

      return new Promise((resolve) => {
        // 如果有音檔 URL，優先使用音檔
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            console.warn("Audio playback failed, falling back to TTS");
            audioRef.current = null;
            // 音檔播放失敗，使用 TTS 作為備案
            speakWithTTS().then(resolve);
          };

          audio.play().catch(() => {
            // 播放失敗，使用 TTS
            speakWithTTS().then(resolve);
          });
          return;
        }

        // 沒有音檔 URL，使用 TTS
        speakWithTTS().then(resolve);
      });
    },
    [isSupported, cancel]
  );

  // 組件卸載時取消播放
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return { speak, cancel, isSpeaking, isSupported };
}
