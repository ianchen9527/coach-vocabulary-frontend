import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "../components/ui/Alert";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { speechService } from "../services/speechService";
import { checkSpeakingAnswer } from "../utils/exerciseHelpers";
import { createDebugLogger } from "../utils/debug";
import type { ExercisePhase } from "./useExerciseFlow";

const debug = createDebugLogger("useSpeakingExercise");

interface ExerciseFlowInterface {
  phase: ExercisePhase;
  select: (index: number) => void;
  clearTimer: () => void;
  enterProcessing: () => void;
  enterResult: (selectedIndex: number) => void;
  startOptionsCountdown: (onTimeout?: () => void) => void;
}

interface UseSpeakingExerciseOptions {
  exerciseFlow: ExerciseFlowInterface;
  currentWord: string | null;
  wordId: string | null;
  exerciseType: string | null;
  pagePhase: string;
  // 追蹤用回調
  onRecordingStarted?: () => void;
  onRecordingStopped?: (stopReason: "correct_match" | "timeout" | "manual") => void;
  onSpeechRecognized?: (recognizedText: string, isMatch: boolean) => void;
}

interface UseSpeakingExerciseReturn {
  recognizedText: string;
  isRecording: boolean;
  isPreparingRecording: boolean;
  isCorrect: boolean;
  speechRecognition: ReturnType<typeof useSpeechRecognition>;
  startRecording: () => Promise<void>;
  handleStopRecording: () => void;
  resetSpeaking: () => void;
}

/**
 * Hook for managing speaking exercise flow including:
 * - Speech recognition (native + Whisper fallback)
 * - Recording state management
 * - Answer verification
 */
export function useSpeakingExercise({
  exerciseFlow,
  currentWord,
  wordId,
  exerciseType,
  pagePhase,
  onRecordingStarted,
  onRecordingStopped,
  onSpeechRecognized,
}: UseSpeakingExerciseOptions): UseSpeakingExerciseReturn {
  const [recognizedText, setRecognizedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // 語音辨識 Hook
  const speechRecognition = useSpeechRecognition({
    lang: "en-US",
    interimResults: true,
    continuous: true,
  });

  // Refs to avoid stale closures
  const currentWordRef = useRef(currentWord);
  const wordIdRef = useRef(wordId);

  useEffect(() => {
    currentWordRef.current = currentWord;
    wordIdRef.current = wordId;
  }, [currentWord, wordId]);

  // Whisper fallback verification
  const tryWhisperFallback = useCallback(
    async (
      nativeTranscript: string,
      wId: string,
      correctWord: string
    ): Promise<{ correct: boolean; transcript: string }> => {
      debug.log("tryWhisperFallback called:", {
        nativeTranscript,
        wordId: wId,
        correctWord,
      });

      const audioData = speechRecognition.getAudioData();

      debug.log("Audio data available:", !!audioData);
      if (audioData) {
        if (typeof audioData === "string") {
          debug.log("Audio data is URI:", audioData);
        } else {
          debug.log("Audio data is Blob:", {
            size: audioData.size,
            type: audioData.type,
          });
        }
      }

      if (!audioData) {
        debug.log("No audio data - using native transcript only");
        return {
          correct: checkSpeakingAnswer(nativeTranscript, correctWord),
          transcript: nativeTranscript,
        };
      }

      try {
        debug.log("Calling speechService.transcribe...");
        const whisperTranscript = await speechService.transcribe(
          audioData,
          wId,
          nativeTranscript
        );

        debug.log("Whisper transcript received:", whisperTranscript);

        const whisperCorrect = checkSpeakingAnswer(whisperTranscript, correctWord);
        debug.log("Whisper answer correct:", whisperCorrect);

        if (whisperCorrect) {
          return { correct: true, transcript: whisperTranscript };
        }

        return {
          correct: false,
          transcript: nativeTranscript || whisperTranscript,
        };
      } catch (error) {
        debug.error("Whisper fallback error:", error);
        const fallbackCorrect = checkSpeakingAnswer(nativeTranscript, correctWord);
        debug.log("Falling back to native transcript, correct:", fallbackCorrect);
        return {
          correct: fallbackCorrect,
          transcript: nativeTranscript,
        };
      }
    },
    [speechRecognition.getAudioData]
  );

  // Handle speaking result with optional Whisper fallback
  const handleSpeakingResult = useCallback(
    async (
      transcript: string,
      wId: string,
      correctWord: string,
      stopReason: "correct_match" | "timeout" | "manual"
    ) => {
      const trimmedTranscript = transcript.trim();
      const nativeCorrect =
        trimmedTranscript !== "" &&
        checkSpeakingAnswer(trimmedTranscript, correctWord);

      if (nativeCorrect) {
        setRecognizedText(transcript);
        setIsCorrect(true);
        // 追蹤：語音辨識結果
        onSpeechRecognized?.(transcript, true);
        // 追蹤：錄音結束（正確配對）
        onRecordingStopped?.("correct_match");
        exerciseFlow.enterResult(0);
        return;
      }

      // Native has result but incorrect - skip Whisper
      if (trimmedTranscript !== "") {
        setRecognizedText(transcript);
        setIsCorrect(false);
        // 追蹤：語音辨識結果
        onSpeechRecognized?.(transcript, false);
        // 追蹤：錄音結束
        onRecordingStopped?.(stopReason);
        exerciseFlow.enterResult(-1);
        return;
      }

      // Native has no result - try Whisper fallback
      const result = await tryWhisperFallback(transcript, wId, correctWord);
      setRecognizedText(result.transcript);
      setIsCorrect(result.correct);
      // 追蹤：語音辨識結果
      onSpeechRecognized?.(result.transcript, result.correct);
      // 追蹤：錄音結束
      onRecordingStopped?.(result.correct ? "correct_match" : stopReason);
      exerciseFlow.enterResult(result.correct ? 0 : -1);
    },
    [tryWhisperFallback, exerciseFlow, onSpeechRecognized, onRecordingStopped]
  );

  // 重置口說狀態
  const resetSpeaking = useCallback(() => {
    setRecognizedText("");
    setIsRecording(false);
    setIsPreparingRecording(false);
    setIsCorrect(false);
    speechRecognition.reset();
  }, [speechRecognition]);

  // 錄音函數
  const startRecording = useCallback(async () => {
    setIsPreparingRecording(true);

    if (!speechRecognition.isSupported) {
      setIsPreparingRecording(false);
      Alert.alert("不支援", "此裝置不支援語音辨識功能");
      exerciseFlow.select(-1);
      return;
    }

    const success = await speechRecognition.start({
      contextualStrings: currentWord ? [currentWord] : undefined,
    });
    setIsPreparingRecording(false);

    if (success) {
      setIsRecording(true);
      // 追蹤：錄音開始
      onRecordingStarted?.();
      // Start options countdown with custom timeout handler
      exerciseFlow.startOptionsCountdown(() => {
        exerciseFlow.enterProcessing();
      });
    } else {
      Alert.alert(
        "無法啟動",
        speechRecognition.error || "無法啟動語音辨識，請檢查麥克風權限"
      );
      exerciseFlow.select(-1);
    }
  }, [speechRecognition, currentWord, exerciseFlow]);

  // 停止錄音
  const handleStopRecording = useCallback(() => {
    if (isRecording && exerciseFlow.phase === "options") {
      exerciseFlow.enterProcessing();

      const transcript =
        speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      speechRecognition.abort();
      setIsRecording(false);

      if (currentWordRef.current && wordIdRef.current) {
        handleSpeakingResult(
          transcript || "",
          wordIdRef.current,
          currentWordRef.current,
          "manual"
        );
      } else {
        exerciseFlow.enterResult(-1);
      }
    }
  }, [isRecording, exerciseFlow, speechRecognition, handleSpeakingResult]);

  // 口說題：進入 options 階段自動開始錄音
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      exerciseType?.startsWith("speaking") &&
      !isRecording &&
      !isPreparingRecording
    ) {
      startRecording();
    }
  }, [pagePhase, exerciseFlow.phase, exerciseType, isRecording, isPreparingRecording, startRecording]);

  // 口說題：超時處理（進入 processing 階段但還在錄音中）
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "processing" &&
      exerciseType?.startsWith("speaking") &&
      isRecording
    ) {
      const transcript =
        speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      speechRecognition.abort();
      setIsRecording(false);

      if (currentWordRef.current && wordIdRef.current) {
        handleSpeakingResult(
          transcript || "",
          wordIdRef.current,
          currentWordRef.current,
          "timeout"
        );
      }
    }
  }, [
    pagePhase,
    exerciseFlow.phase,
    exerciseType,
    isRecording,
    speechRecognition,
    handleSpeakingResult,
  ]);

  // 監聽辨識完成並自動提交答案
  useEffect(() => {
    if (
      speechRecognition.finalTranscript &&
      exerciseType?.startsWith("speaking") &&
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      currentWord &&
      wordId &&
      isRecording
    ) {
      exerciseFlow.enterProcessing();

      speechRecognition.abort();
      setIsRecording(false);

      // stopReason 會在 handleSpeakingResult 中根據結果決定
      // 如果正確會是 "correct_match"，否則是 "manual"（因為是自動提交）
      handleSpeakingResult(
        speechRecognition.finalTranscript,
        wordId,
        currentWord,
        "correct_match" // 自動提交時預設為 correct_match，實際會在 handleSpeakingResult 中判斷
      );
    }
  }, [
    speechRecognition.finalTranscript,
    exerciseType,
    pagePhase,
    exerciseFlow,
    currentWord,
    wordId,
    isRecording,
    handleSpeakingResult,
  ]);

  return {
    recognizedText,
    isRecording,
    isPreparingRecording,
    isCorrect,
    speechRecognition,
    startRecording,
    handleStopRecording,
    resetSpeaking,
  };
}
