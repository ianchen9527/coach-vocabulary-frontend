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
import { reviewService } from "../../services/reviewService";
import { speechService } from "../../services/speechService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { ReviewSessionResponse, AnswerSchema } from "../../types/api";
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

type PagePhase = "loading" | "intro" | "display" | "exercising" | "complete";

const DISPLAY_DURATION = 3000; // 展示階段 3 秒
const COUNTDOWN_INTERVAL = 50; // 更新間隔 50ms

export default function ReviewScreen() {
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

  const [session, setSession] = useState<ReviewSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
  const [answers, setAnswers] = useState<AnswerSchema[]>([]);
  const [displayRemainingMs, setDisplayRemainingMs] = useState(DISPLAY_DURATION);
  const [currentExerciseType, setCurrentExerciseType] = useState<string>("");

  // 口說練習專用狀態
  const [recognizedText, setRecognizedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [speakingCorrect, setSpeakingCorrect] = useState(false);

  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<AnswerSchema[]>([]);

  const words = session?.words || [];
  const exercises = session?.exercises || [];
  const currentWord = words[currentIndex];
  const currentExercise = exercises[currentIndex];
  const totalWords = words.length;

  // 清理展示階段計時器
  const clearDisplayTimer = () => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  };

  // 進入下一題
  const goToNext = () => {
    // 清除上一題的語音辨識結果
    speechRecognition.reset();

    if (currentIndex < totalWords - 1) {
      const nextExercise = exercises[currentIndex + 1];
      const nextCategory = getExerciseCategory(nextExercise.type);

      setCurrentIndex((prev) => prev + 1);

      // 檢查是否切換到不同類型的練習
      if (nextCategory !== currentExerciseType) {
        setCurrentExerciseType(nextCategory);
        setPagePhase("intro");
      } else {
        setPagePhase("display");
      }
      exerciseFlow.reset();
    } else {
      completeSession();
    }
  };

  // 使用共用的答題流程 Hook
  const exerciseFlow = useExerciseFlow({}, () => {
    // 記錄答案
    if (currentWord && currentExercise) {
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
        word_id: currentWord.id,
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

    goToNext();
  });

  // 載入複習 Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await reviewService.getSession();
        if (!data.available) {
          Alert.alert("無法複習", data.reason || "目前沒有需要複習的單字", [
            { text: "返回", onPress: () => router.back() },
          ]);
          return;
        }

        // 依照練習種類排序（reading → listening → speaking）
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

        // 同時排序 words（保持與 exercises 對應）
        const sortedWords = sortedExercises.map(exercise =>
          data.words.find(w => w.id === exercise.word_id)!
        );

        setSession({ ...data, words: sortedWords, exercises: sortedExercises });

        // 設定第一個練習類型並顯示 intro
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

    return () => clearDisplayTimer();
  }, [router]);

  // 展示階段：自動播放發音 + 3秒後自動進入答題
  useEffect(() => {
    if (pagePhase === "display" && currentWord) {
      // 播放音檔
      speak(currentWord.word, getAssetUrl(currentWord.audio_url));

      // 重置倒數
      const start = Date.now();
      setDisplayRemainingMs(DISPLAY_DURATION);

      // 設定倒數計時器
      displayTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, DISPLAY_DURATION - elapsed);
        setDisplayRemainingMs(remaining);

        if (remaining <= 0) {
          clearDisplayTimer();
          goToExercise();
        }
      }, COUNTDOWN_INTERVAL);
    }

    return () => clearDisplayTimer();
  }, [pagePhase, currentIndex, currentWord, speak]);

  // 錄音函數
  const startRecording = async () => {
    setIsPreparingRecording(true);

    if (!speechRecognition.isSupported) {
      setIsPreparingRecording(false);
      Alert.alert("不支援", "此裝置不支援語音辨識功能");
      exerciseFlow.select(-1);
      return;
    }

    const success = await speechRecognition.start({
      contextualStrings: currentWord?.word ? [currentWord.word] : undefined,
    });
    setIsPreparingRecording(false);

    if (success) {
      setIsRecording(true);
      // 錄音準備好後，手動開始 options 倒數
      exerciseFlow.startOptionsCountdown();
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

    setIsVerifying(true);
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
    } finally {
      setIsVerifying(false);
    }
  }, [speechRecognition.getAudioData]);

  // 處理口說結果（含 Whisper 後備）
  const handleSpeakingResult = useCallback(async (
    transcript: string,
    wordId: string,
    correctWord: string
  ) => {
    const nativeCorrect = transcript.trim() !== "" && checkSpeakingAnswer(transcript, correctWord);

    if (nativeCorrect) {
      // 原生辨識成功，直接使用
      setRecognizedText(transcript);
      setSpeakingCorrect(true);

      // 如果已經在 result phase（從 timeout 進入），更新 index 並啟動計時器
      if (exerciseFlow.phase === "result") {
        exerciseFlow.updateSelectedIndex(0);
        exerciseFlow.startResultTimeout();
      } else {
        exerciseFlow.select(0);
      }
      return;
    }

    // 原生辨識失敗，嘗試 Whisper 後備
    const result = await tryWhisperFallback(transcript, wordId, correctWord);
    setRecognizedText(result.transcript);
    setSpeakingCorrect(result.correct);

    // 如果已經在 result phase（從 timeout 進入），更新 index 並啟動計時器
    if (exerciseFlow.phase === "result") {
      exerciseFlow.updateSelectedIndex(result.correct ? 0 : -1);
      exerciseFlow.startResultTimeout();
    } else {
      exerciseFlow.select(result.correct ? 0 : -1);
    }
  }, [tryWhisperFallback, exerciseFlow]);

  const handleStopRecording = () => {
    if (isRecording) {
      exerciseFlow.clearTimer();

      const transcript = speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      speechRecognition.abort();
      setIsRecording(false);

      if (currentWord) {
        handleSpeakingResult(
          transcript || "",
          currentWord.id,
          currentWord.word
        );
      } else {
        exerciseFlow.select(-1);
      }
    }
  };

  // 聽力題：在 question 階段播放音檔
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      currentExercise?.type.startsWith("listening") &&
      currentWord
    ) {
      speak(currentWord.word, getAssetUrl(currentWord.audio_url));
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, currentWord, speak]);

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

  // 口說題：超時時檢查是否有已辨識的內容
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "result" &&
      currentExercise?.type.startsWith("speaking") &&
      isRecording &&
      !isVerifying // 防止重複呼叫（如果已經在驗證中，不要再觸發）
    ) {
      // 超時但還在錄音中，先清除 result timeout（因為需要等待 async 驗證）
      exerciseFlow.clearTimer();

      const transcript = speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      speechRecognition.abort();
      setIsRecording(false);

      // 使用 handleSpeakingResult 處理（含 Whisper 後備）
      if (currentWord) {
        handleSpeakingResult(
          transcript || "",
          currentWord.id,
          currentWord.word
        );
      }
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, isRecording, isVerifying, speechRecognition.finalTranscript, speechRecognition.interimTranscript, currentWord, handleSpeakingResult, exerciseFlow]);

  // 監聽辨識完成並自動提交答案
  // isRecording 確保是「這一題」的錄音結果，避免用上一題的 finalTranscript 判斷
  useEffect(() => {
    if (
      speechRecognition.finalTranscript &&
      currentExercise?.type.startsWith("speaking") &&
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      currentWord &&
      isRecording
    ) {
      // 先停止辨識，避免 continuous 模式下連線持續佔用
      speechRecognition.abort();
      setIsRecording(false);

      // 使用 handleSpeakingResult 處理（含 Whisper 後備）
      handleSpeakingResult(
        speechRecognition.finalTranscript,
        currentWord.id,
        currentWord.word
      );
    }
  }, [speechRecognition.finalTranscript, currentExercise, pagePhase, exerciseFlow.phase, currentWord, isRecording, handleSpeakingResult]);

  // 從 intro 進入 display
  const startFromIntro = () => {
    setPagePhase("display");
  };

  // 進入答題階段
  const goToExercise = () => {
    setPagePhase("exercising");
    // 口說題：延遲 options 倒數，等錄音準備好再開始
    const isSpeaking = currentExercise?.type.startsWith("speaking") ?? false;
    exerciseFlow.start(isSpeaking);
  };

  // 完成複習
  const completeSession = async () => {
    setPagePhase("complete");

    try {
      const wordIds = words.map((w) => w.id);
      await reviewService.complete(wordIds, answersRef.current);
    } catch (error) {
      console.error("Review complete error:", error);
    }
  };

  // 返回
  const handleBack = () => {
    clearDisplayTimer();
    exerciseFlow.clearTimer();
    if (isRecording) {
      speechRecognition.abort();
      setIsRecording(false);
    }
    Alert.alert("確定離開？", "複習進度將不會保存", [
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
        title="複習完成！"
        subtitle={`答對 ${correctCount} / ${totalWords} 題`}
        onBack={() => router.replace("/(main)")}
      />
    );
  }

  if (pagePhase === "intro") {
    return (
      <SafeAreaView style={styles.introContainer}>
        <Text style={styles.introTitle}>
          {getExerciseTitle(currentExerciseType, "review")}
        </Text>
        <Text style={styles.introSubtitle}>
          先複習單字，再進行測驗
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={startFromIntro}
        >
          <Text style={styles.primaryButtonText}>
            開始
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ExerciseHeader
        title="複習中"
        currentIndex={currentIndex}
        total={totalWords}
        onBack={handleBack}
      />

      {/* Progress Bar */}
      <ProgressBar
        total={totalWords}
        currentIndex={currentIndex}
        answers={answers}
      />

      {/* Content */}
      <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
        {/* 展示階段：顯示單字和翻譯 */}
        {pagePhase === "display" && currentWord && (
          <View style={styles.displayContainer}>
            {/* 倒數計時 */}
            <CountdownText remainingMs={displayRemainingMs} />
            {currentWord.image_url && (
              <Image
                source={{ uri: getAssetUrl(currentWord.image_url) || undefined }}
                style={styles.wordImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.wordText}>
              {currentWord.word}
            </Text>
            <Text style={styles.translationText}>
              {currentWord.translation}
            </Text>

            <View style={styles.speakerContainer}>
              <Volume2
                size={24}
                color={isSpeaking ? colors.primary : colors.mutedForeground}
              />
              <Text style={styles.speakerText}>
                {isSpeaking ? "播放中..." : "已播放"}
              </Text>
            </View>
          </View>
        )}

        {/* 答題階段 */}
        {pagePhase === "exercising" && currentExercise && currentWord && (
          <View style={styles.exerciseContainer}>

            {/* 題目階段：顯示單字，倒數計時 */}
            {exerciseFlow.phase === "question" && (
              <>
                <CountdownText remainingMs={exerciseFlow.remainingMs} />
                {currentExercise.type.startsWith("reading") && (
                  <>
                    <Text style={styles.exerciseWordText}>
                      {currentWord.word}
                    </Text>
                    <Text style={styles.exerciseHintText}>
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
                    {currentExercise.type === "speaking_lv1" && currentWord.image_url && (
                      <Image
                        source={{ uri: getAssetUrl(currentWord.image_url) || undefined }}
                        style={styles.speakingImage}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.speakingWord}>
                      {currentWord.translation}
                    </Text>
                    <Text style={styles.speakingInstruction}>
                      準備作答...
                    </Text>
                  </>
                )}
              </>
            )}

            {/* 選項階段：顯示選項，倒數計時 */}
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

            {/* 結果階段：顯示正確答案 */}
            {exerciseFlow.phase === "result" && (
              <>
                {currentExercise.type.startsWith("speaking") ? (
                  <SpeakingResult
                    isCorrect={speakingCorrect}
                    recognizedText={recognizedText}
                    correctAnswer={currentWord.word}
                    isVerifying={isVerifying}
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

  // Main container
  container: {
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

  // Timeout text
  timeoutText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.destructive,
    marginBottom: 16,
  },

  // Display phase
  displayContainer: {
    alignItems: "center",
  },
  wordImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.muted,
    marginBottom: 24,
  },
  wordText: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  translationText: {
    fontSize: 24,
    color: colors.mutedForeground,
    marginBottom: 16,
  },
  speakerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  speakerText: {
    color: colors.mutedForeground,
    marginLeft: 8,
  },

  // Primary button
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

  // Exercise phase
  exerciseContainer: {
    width: "100%",
    alignItems: "center",
  },
  exerciseWordText: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  exerciseHintText: {
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

  // Recording
  recordingContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
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

  // Transcript display
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

  // Preparing recording
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
});
