import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Alert } from "../../components/ui/Alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { practiceService } from "../../services/practiceService";
import { speechService } from "../../services/speechService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { PracticeSessionResponse, AnswerSchema } from "../../types/api";
import { Volume2, Mic } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseHeader,
  ProgressBar,
  ExerciseOptions,
  ExerciseLoading,
  ExerciseComplete,
  PoolBadge,
  SpeakingResult,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";
import {
  getExerciseCategory,
  getExerciseTitle,
  checkSpeakingAnswer,
} from "../../utils/exerciseHelpers";


// 頁面階段：loading | intro | exercising | speaking | complete
// exercising = 使用 hook 管理的答題流程（閱讀/聽力題）
// speaking = 口說題（手動確認）
type PagePhase = "loading" | "intro" | "exercising" | "speaking" | "complete";

export default function PracticeScreen() {
  const router = useRouter();
  const { speak, isSpeaking } = useSpeech();
  const { width } = useWindowDimensions();

  // 語音辨識 Hook
  const speechRecognition = useSpeechRecognition({
    lang: "en-US",
    interimResults: true,
    continuous: true,
  });

  // 寬螢幕時使用較窄的內容寬度
  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
  const [answers, setAnswers] = useState<AnswerSchema[]>([]);
  const [currentExerciseType, setCurrentExerciseType] = useState<string>("");

  // 口說練習專用狀態
  const [recognizedText, setRecognizedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [speakingCorrect, setSpeakingCorrect] = useState(false);

  const exercises = session?.exercises || [];
  const currentExercise = exercises[currentIndex];
  const totalExercises = exercises.length;

  // 用來記錄當前答案
  const answersRef = useRef<AnswerSchema[]>([]);

  // 進入下一題
  const goToNextExercise = useCallback(() => {
    // 清除上一題的語音辨識結果
    speechRecognition.reset();

    if (currentIndex < totalExercises - 1) {
      const nextExercise = exercises[currentIndex + 1];
      const nextCategory = getExerciseCategory(nextExercise.type);

      setCurrentIndex((prev) => prev + 1);

      if (nextCategory !== currentExerciseType) {
        setCurrentExerciseType(nextCategory);
        setPagePhase("intro");
      } else {
        setPagePhase("exercising");
        exerciseFlow.reset();
        // 需要在下一個 tick 啟動，讓 currentExercise 更新
        // 口說題：延遲 options 倒數，等錄音準備好再開始
        const isSpeaking = nextExercise.type.startsWith("speaking");
        setTimeout(() => exerciseFlow.start(isSpeaking), 0);
      }
    } else {
      completeSession();
    }
  }, [currentIndex, totalExercises, exercises, currentExerciseType]);

  // 使用共用的答題流程 Hook（閱讀/聽力/口說題）
  const exerciseFlow = useExerciseFlow({}, () => {
    // 記錄答案
    if (currentExercise) {
      let correct = false;
      let userAnswer: string | undefined;

      // 計算回答時間（超時時也記錄實際時間）
      const responseTimeMs = exerciseFlow.getResponseTimeMs() ?? undefined;

      if (currentExercise.type.startsWith("speaking")) {
        // 口說題：使用已計算的 speakingCorrect 狀態
        correct = speakingCorrect;
        // user_answer：使用 recognizedText（包含超時時的 interim transcript）
        userAnswer = recognizedText.trim() || undefined;
      } else {
        // 閱讀/聽力題：根據選中的索引判斷
        correct = exerciseFlow.selectedIndex === currentExercise.correct_index;
        // user_answer：使用選中選項的 translation
        if (exerciseFlow.selectedIndex !== null && exerciseFlow.selectedIndex >= 0) {
          userAnswer = currentExercise.options[exerciseFlow.selectedIndex]?.translation;
        }
      }

      const newAnswer: AnswerSchema = {
        word_id: currentExercise.word_id,
        correct,
        exercise_type: currentExercise.type,
        user_answer: userAnswer,
        response_time_ms: responseTimeMs,
      };
      setAnswers((prev) => [...prev, newAnswer]);
      answersRef.current = [...answersRef.current, newAnswer];
    }

    // 清理口說狀態
    setRecognizedText("");
    setIsRecording(false);
    setSpeakingCorrect(false);

    goToNextExercise();
  });

  // 載入練習 Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await practiceService.getSession();
        if (!data.available) {
          Alert.alert("無法練習", data.reason || "目前沒有可練習的單字", [
            { text: "返回", onPress: () => router.back() },
          ]);
          return;
        }

        // 依照練習種類排序（reading → listening → speaking）
        // lv1 和 lv2 視為相同種類
        const categoryOrder: Record<string, number> = {
          reading: 0,
          listening: 1,
          speaking: 2,
        };
        const sortedExercises = [...data.exercises].sort((a, b) => {
          const categoryA = getExerciseCategory(a.type);
          const categoryB = getExerciseCategory(b.type);
          return (categoryOrder[categoryA] ?? 99) - (categoryOrder[categoryB] ?? 99);
        });

        setSession({ ...data, exercises: sortedExercises });

        // 檢查第一個題型
        if (sortedExercises.length > 0) {
          setCurrentExerciseType(getExerciseCategory(sortedExercises[0].type));
          setPagePhase("intro");
        }
      } catch (error) {
        Alert.alert("載入失敗", handleApiError(error), [
          { text: "返回", onPress: () => router.back() },
        ]);
      }
    };
    loadSession();
  }, [router]);

  // 聽力題：在 question 階段播放音檔
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      currentExercise?.type.startsWith("listening")
    ) {
      speak(currentExercise.word, getAssetUrl(currentExercise.audio_url));
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, speak]);

  // 錄音函數
  const startRecording = async () => {
    setIsPreparingRecording(true);

    if (!speechRecognition.isSupported) {
      setIsPreparingRecording(false);
      Alert.alert("不支援", "此裝置不支援語音辨識功能");
      exerciseFlow.select(-1); // 標記為錯誤/超時
      return;
    }

    const success = await speechRecognition.start({
      contextualStrings: currentExercise?.word ? [currentExercise.word] : undefined,
    });
    setIsPreparingRecording(false);

    if (success) {
      setIsRecording(true);
      // 錄音準備好後，手動開始 options 倒數
      // 使用自訂回調：超時時進入 processing 階段而非直接進入 result
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
  };

  // Whisper 後備驗證函數
  const tryWhisperFallback = useCallback(async (
    nativeTranscript: string,
    wordId: string,
    correctWord: string
  ): Promise<{ correct: boolean; transcript: string }> => {
    // 取得錄音資料（使用 ref-based getter 避免閉包問題）
    const audioData = speechRecognition.getAudioData();

    if (!audioData) {
      // 沒有錄音資料，使用原生結果
      return {
        correct: checkSpeakingAnswer(nativeTranscript, correctWord),
        transcript: nativeTranscript,
      };
    }

    try {
      const whisperTranscript = await speechService.transcribe(
        audioData,
        wordId,
        nativeTranscript
      );

      const whisperCorrect = checkSpeakingAnswer(whisperTranscript, correctWord);

      // 如果 Whisper 判斷正確，使用 Whisper 結果
      if (whisperCorrect) {
        return { correct: true, transcript: whisperTranscript };
      }

      // 兩者都失敗，使用原生結果
      return {
        correct: false,
        transcript: nativeTranscript || whisperTranscript,
      };
    } catch (error) {
      console.error("Whisper fallback error:", error);
      // Whisper 失敗，使用原生結果
      return {
        correct: checkSpeakingAnswer(nativeTranscript, correctWord),
        transcript: nativeTranscript,
      };
    }
  }, [speechRecognition.getAudioData]);

  // 處理口說結果（含 Whisper 後備）
  // 此函數應在 "processing" 階段被呼叫
  const handleSpeakingResult = useCallback(async (
    transcript: string,
    wordId: string,
    correctWord: string
  ) => {
    // console.log("[Practice] handleSpeakingResult called", { transcript, wordId, correctWord });

    const trimmedTranscript = transcript.trim();
    const nativeCorrect = trimmedTranscript !== "" && checkSpeakingAnswer(trimmedTranscript, correctWord);
    // console.log("[Practice] Native recognition result:", { nativeCorrect, hasTranscript: trimmedTranscript !== "" });

    if (nativeCorrect) {
      // 原生辨識成功，直接進入結果
      // console.log("[Practice] Native correct, entering result");
      setRecognizedText(transcript);
      setSpeakingCorrect(true);
      exerciseFlow.enterResult(0);
      return;
    }

    // 原生辨識有結果但不正確，直接標記為錯誤（不呼叫 Whisper）
    if (trimmedTranscript !== "") {
      // console.log("[Practice] Native detected speech but incorrect, skipping Whisper");
      setRecognizedText(transcript);
      setSpeakingCorrect(false);
      exerciseFlow.enterResult(-1);
      return;
    }

    // 原生辨識無結果，嘗試 Whisper 後備
    // console.log("[Practice] Native detected nothing, calling Whisper fallback...");
    const result = await tryWhisperFallback(transcript, wordId, correctWord);
    // console.log("[Practice] Whisper result:", result);

    setRecognizedText(result.transcript);
    setSpeakingCorrect(result.correct);
    exerciseFlow.enterResult(result.correct ? 0 : -1);
  }, [tryWhisperFallback, exerciseFlow]);

  const handleStopRecording = () => {
    // console.log("[Practice] handleStopRecording called", { isRecording, phase: exerciseFlow.phase });
    if (isRecording && exerciseFlow.phase === "options") {
      // 進入 processing 階段（防止其他 effect 干擾）
      exerciseFlow.enterProcessing();

      // 使用當前的 final 或 interim transcript（優先使用 final）
      const transcript = speechRecognition.finalTranscript || speechRecognition.interimTranscript;
      // console.log("[Practice] Transcript:", transcript);

      speechRecognition.abort();
      setIsRecording(false);

      if (currentExercise) {
        handleSpeakingResult(
          transcript || "",
          currentExercise.word_id,
          currentExercise.word
        );
      } else {
        exerciseFlow.enterResult(-1);
      }
    }
  };

  // 口說題：進入 options 階段自動開始錄音
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      currentExercise?.type.startsWith("speaking") &&
      !isRecording &&
      !isPreparingRecording // 避免重複觸發
    ) {
      startRecording();
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, isRecording, isPreparingRecording]);

  // 口說題：超時處理（進入 processing 階段但還在錄音中）
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "processing" &&
      currentExercise?.type.startsWith("speaking") &&
      isRecording // 還在錄音中表示是超時進入的
    ) {
      // console.log("[Practice] Timeout detected in processing phase, stopping recording");
      const transcript = speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      speechRecognition.abort();
      setIsRecording(false);

      handleSpeakingResult(
        transcript || "",
        currentExercise.word_id,
        currentExercise.word
      );
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, isRecording, speechRecognition.finalTranscript, speechRecognition.interimTranscript, handleSpeakingResult]);

  // 監聽辨識完成並自動提交答案
  // isRecording 確保是「這一題」的錄音結果，避免用上一題的 finalTranscript 判斷
  useEffect(() => {
    if (
      speechRecognition.finalTranscript &&
      currentExercise?.type.startsWith("speaking") &&
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      isRecording
    ) {
      // console.log("[Practice] Final transcript received, entering processing");
      // 進入 processing 階段
      exerciseFlow.enterProcessing();

      // 停止辨識
      speechRecognition.abort();
      setIsRecording(false);

      // 處理結果
      handleSpeakingResult(
        speechRecognition.finalTranscript,
        currentExercise.word_id,
        currentExercise.word
      );
    }
  }, [speechRecognition.finalTranscript, currentExercise, pagePhase, exerciseFlow.phase, isRecording, handleSpeakingResult, exerciseFlow]);

  // 開始練習（從 intro 進入）
  const startExercise = () => {
    setPagePhase("exercising");
    // 口說題：延遲 options 倒數，等錄音準備好再開始
    const isSpeaking = currentExercise?.type.startsWith("speaking") ?? false;
    exerciseFlow.start(isSpeaking);
  };

  // 完成練習
  const completeSession = async () => {
    setPagePhase("complete");

    try {
      await practiceService.submit(answersRef.current);
    } catch (error) {
      console.error("Submit practice error:", error);
    }
  };

  // 返回
  const handleBack = () => {
    exerciseFlow.clearTimer();
    if (isRecording) {
      speechRecognition.abort();
      setIsRecording(false);
    }
    Alert.alert("確定離開？", "練習進度將不會保存", [
      { text: "取消", style: "cancel" },
      { text: "離開", style: "destructive", onPress: () => router.back() },
    ]);
  };

  if (pagePhase === "loading") {
    return <ExerciseLoading />;
  }

  if (pagePhase === "complete") {
    const correctCount = answers.filter((a) => a.correct).length;
    return (
      <ExerciseComplete
        title="練習完成！"
        subtitle={`答對 ${correctCount} / ${totalExercises} 題`}
        onBack={() => router.replace("/(main)")}
      />
    );
  }

  if (pagePhase === "intro") {
    return (
      <SafeAreaView style={styles.introContainer}>
        <Text style={styles.introTitle}>
          {getExerciseTitle(currentExerciseType)}
        </Text>
        <Text style={styles.introSubtitle}>
          {currentExerciseType === "reading" && "看單字，選出正確的翻譯"}
          {currentExerciseType === "listening" && "聽發音，選出正確的翻譯"}
          {currentExerciseType === "speaking" && "看翻譯，說出正確的單字"}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={startExercise}
        >
          <Text style={styles.primaryButtonText}>
            開始
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      {/* Header */}
      <ExerciseHeader
        title="練習中"
        currentIndex={currentIndex}
        total={totalExercises}
        onBack={handleBack}
      />

      {/* Progress Bar */}
      <ProgressBar
        total={totalExercises}
        currentIndex={currentIndex}
        answers={answers}
      />

      {/* Content */}
      <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
        {currentExercise && (
          <View style={styles.exerciseContainer}>

            {/* 閱讀/聽力/口說練習 - 使用 exerciseFlow */}
            {pagePhase === "exercising" && (
              <>
                {/* 題目階段 */}
                {exerciseFlow.phase === "question" && (
                  <>
                    <CountdownText remainingMs={exerciseFlow.remainingMs} />
                    {currentExercise.type.startsWith("reading") && (
                      <>
                        <Text style={styles.readingWord}>
                          {currentExercise.word}
                        </Text>
                        <Text style={styles.readingInstruction}>
                          準備作答...
                        </Text>
                      </>
                    )}
                    {currentExercise.type.startsWith("listening") && (
                      <View style={styles.listeningContainer}>
                        <View style={styles.listeningButton}>
                          <Volume2
                            size={48}
                            color={isSpeaking ? colors.primary : colors.mutedForeground}
                          />
                        </View>
                        <Text style={styles.listeningText}>
                          {isSpeaking ? "播放中..." : "準備作答..."}
                        </Text>
                      </View>
                    )}
                    {currentExercise.type.startsWith("speaking") && (
                      <>
                        {currentExercise.type === "speaking_lv1" && currentExercise.image_url && (
                          <Image
                            source={{ uri: getAssetUrl(currentExercise.image_url) || undefined }}
                            style={styles.speakingImage}
                            resizeMode="contain"
                          />
                        )}
                        <Text style={styles.speakingWord}>
                          {currentExercise.translation}
                        </Text>
                        <Text style={styles.speakingInstruction}>
                          準備作答...
                        </Text>
                      </>
                    )}
                  </>
                )}

                {/* 選項階段 */}
                {exerciseFlow.phase === "options" && (
                  <>
                    {currentExercise.type.startsWith("speaking") ? (
                      isPreparingRecording ? (
                        // 準備錄音中：顯示 spinner
                        <View style={styles.preparingContainer}>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text style={styles.preparingText}>準備錄音中...</Text>
                        </View>
                      ) : (
                        // 錄音中：顯示倒數 + 錄音 UI
                        <>
                          <CountdownText remainingMs={exerciseFlow.remainingMs} />
                          {/* 錄音中圖示 */}
                          <View style={styles.recordingContainer}>
                            <View style={[styles.micButton, isRecording && styles.micButtonActive]}>
                              <Mic size={48} color={isRecording ? colors.destructive : colors.primary} />
                            </View>
                            {isRecording && (
                              <View style={styles.recordingIndicator}>
                                <View style={styles.recordingDot} />
                                <Text style={styles.recordingText}>錄音中...</Text>
                              </View>
                            )}
                          </View>

                          {/* 即時辨識結果 */}
                          {speechRecognition.interimTranscript && (
                            <View style={styles.transcriptBox}>
                              <Text style={styles.transcriptLabel}>辨識中：</Text>
                              <Text style={styles.transcriptText}>
                                "{speechRecognition.interimTranscript}"
                              </Text>
                            </View>
                          )}

                          {/* 完成按鈕 */}
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleStopRecording}
                            disabled={!isRecording}
                          >
                            <Text style={styles.primaryButtonText}>完成</Text>
                          </TouchableOpacity>
                        </>
                      )
                    ) : (
                      // 非口說題：正常顯示
                      <>
                        <CountdownText remainingMs={exerciseFlow.remainingMs} />
                        <ExerciseOptions
                          options={currentExercise.options}
                          selectedIndex={null}
                          correctIndex={currentExercise.correct_index}
                          showResult={false}
                          onSelect={exerciseFlow.select}
                          disabled={false}
                          layout={currentExercise.type === "reading_lv1" ? "grid" : "list"}
                          showImage={currentExercise.type === "reading_lv1"}
                        />
                      </>
                    )}
                  </>
                )}

                {/* 處理階段（口說題驗證中） */}
                {exerciseFlow.phase === "processing" && currentExercise.type.startsWith("speaking") && (
                  <SpeakingResult
                    isCorrect={false}
                    recognizedText=""
                    correctAnswer={currentExercise.word}
                    isVerifying={true}
                  />
                )}

                {/* 結果階段 */}
                {exerciseFlow.phase === "result" && (
                  <>
                    {currentExercise.type.startsWith("speaking") ? (
                      <SpeakingResult
                        isCorrect={speakingCorrect}
                        recognizedText={recognizedText}
                        correctAnswer={currentExercise.word}
                        isVerifying={false}
                      />
                    ) : (
                      <>
                        {exerciseFlow.selectedIndex === -1 && (
                          <Text style={styles.timeoutText}>時間到！</Text>
                        )}
                        <ExerciseOptions
                          options={currentExercise.options}
                          selectedIndex={exerciseFlow.selectedIndex}
                          correctIndex={currentExercise.correct_index}
                          showResult={true}
                          onSelect={() => { }}
                          disabled={true}
                          layout={currentExercise.type === "reading_lv1" ? "grid" : "list"}
                          showImage={currentExercise.type === "reading_lv1"}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Intro screen
  introContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  introTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 16,
  },
  introSubtitle: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 32,
  },

  // Common buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },

  // Main exercise screen
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Content
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  exerciseContainer: {
    width: "100%",
    alignItems: "center",
  },

  // Timeout text
  timeoutText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.destructive,
    marginBottom: 16,
  },

  // Reading exercise
  readingWord: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  readingInstruction: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 32,
  },

  // Listening exercise
  listeningContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  listeningButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  listeningText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },

  // 準備錄音中
  preparingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  preparingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.mutedForeground,
  },

  // Speaking exercise
  speakingImage: {
    width: 128,
    height: 128,
    borderRadius: 16,
    backgroundColor: colors.muted,
    marginBottom: 16,
  },
  speakingWord: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  speakingInstruction: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 16,
  },

  // 錄音容器
  recordingContainer: {
    alignItems: "center",
    marginVertical: 24,
  },

  // 麥克風按鈕
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: `${colors.destructive}33`,
  },

  // 錄音中指示器
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.destructive,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: colors.destructive,
    fontWeight: "500",
  },

  // 辨識結果顯示
  transcriptBox: {
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    width: "100%",
  },
  transcriptLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 18,
    color: colors.foreground,
    fontWeight: "500",
  },
});
