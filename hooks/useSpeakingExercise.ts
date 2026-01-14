import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { ExercisePhase } from "./useExerciseFlow";

interface UseSpeakingExerciseOptions {
  exerciseFlow: {
    phase: ExercisePhase;
    select: (index: number) => void;
    clearTimer: () => void;
  };
  currentWord: string | null;
  exerciseType: string | null;
  pagePhase: string;
}

interface UseSpeakingExerciseReturn {
  recognizedText: string;
  isRecording: boolean;
  speechRecognition: ReturnType<typeof useSpeechRecognition>;
  startRecording: () => Promise<void>;
  handleStopRecording: () => void;
  resetSpeaking: () => void;
  checkAnswer: (transcript: string, correctWord: string) => boolean;
}

export function useSpeakingExercise({
  exerciseFlow,
  currentWord,
  exerciseType,
  pagePhase,
}: UseSpeakingExerciseOptions): UseSpeakingExerciseReturn {
  const [recognizedText, setRecognizedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // 語音辨識 Hook
  const speechRecognition = useSpeechRecognition({
    lang: "en-US",
    interimResults: true,
    continuous: true,
  });

  // 比對邏輯（包含匹配）
  const checkAnswer = useCallback(
    (transcript: string, correctWord: string): boolean => {
      const normalizedTranscript = transcript.toLowerCase().trim();
      const normalizedCorrect = correctWord.toLowerCase().trim();
      return normalizedTranscript.includes(normalizedCorrect);
    },
    []
  );

  // 重置口說狀態
  const resetSpeaking = useCallback(() => {
    setRecognizedText("");
    setIsRecording(false);
    speechRecognition.reset();
  }, [speechRecognition]);

  // 錄音函數
  const startRecording = useCallback(async () => {
    if (!speechRecognition.isSupported) {
      Alert.alert("不支援", "此裝置不支援語音辨識功能");
      exerciseFlow.select(-1);
      return;
    }

    const success = await speechRecognition.start();
    if (success) {
      setIsRecording(true);
    } else {
      Alert.alert(
        "無法啟動",
        speechRecognition.error || "無法啟動語音辨識，請檢查麥克風權限"
      );
      exerciseFlow.select(-1);
    }
  }, [speechRecognition, exerciseFlow]);

  // 停止錄音
  const handleStopRecording = useCallback(() => {
    if (isRecording) {
      exerciseFlow.clearTimer();

      const transcript =
        speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      if (transcript && currentWord) {
        setRecognizedText(transcript);
        const correct = checkAnswer(transcript, currentWord);
        exerciseFlow.select(correct ? 0 : -1);
      } else {
        exerciseFlow.select(-1);
      }

      speechRecognition.abort();
      setIsRecording(false);
    }
  }, [
    isRecording,
    exerciseFlow,
    speechRecognition,
    currentWord,
    checkAnswer,
  ]);

  // 口說題：進入 options 階段自動開始錄音
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      exerciseType?.startsWith("speaking") &&
      !isRecording
    ) {
      startRecording();
    }
  }, [pagePhase, exerciseFlow.phase, exerciseType, isRecording, startRecording]);

  // 口說題：超時時檢查是否有已辨識的內容
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "result" &&
      exerciseType?.startsWith("speaking") &&
      isRecording
    ) {
      const transcript =
        speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      if (transcript) {
        setRecognizedText(transcript);
      }

      speechRecognition.abort();
      setIsRecording(false);
    }
  }, [
    pagePhase,
    exerciseFlow.phase,
    exerciseType,
    isRecording,
    speechRecognition.finalTranscript,
    speechRecognition.interimTranscript,
  ]);

  // 監聽辨識完成並自動提交答案
  useEffect(() => {
    if (
      speechRecognition.finalTranscript &&
      exerciseType?.startsWith("speaking") &&
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      currentWord &&
      isRecording
    ) {
      setIsRecording(false);
      setRecognizedText(speechRecognition.finalTranscript);

      const correct = checkAnswer(speechRecognition.finalTranscript, currentWord);
      exerciseFlow.select(correct ? 0 : -1);
    }
  }, [
    speechRecognition.finalTranscript,
    exerciseType,
    pagePhase,
    exerciseFlow.phase,
    currentWord,
    isRecording,
    checkAnswer,
  ]);

  return {
    recognizedText,
    isRecording,
    speechRecognition,
    startRecording,
    handleStopRecording,
    resetSpeaking,
    checkAnswer,
  };
}
