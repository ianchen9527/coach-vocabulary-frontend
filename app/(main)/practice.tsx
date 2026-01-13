import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { practiceService } from "../../services/practiceService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { PracticeSessionResponse, AnswerSchema } from "../../types/api";
import { Volume2, Check, Mic, X } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseHeader,
  ProgressBar,
  ExerciseOptions,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";

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
    continuous: false,
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

  const exercises = session?.exercises || [];
  const currentExercise = exercises[currentIndex];
  const totalExercises = exercises.length;

  const getExerciseCategory = (type: string): string => {
    if (type.startsWith("reading")) return "reading";
    if (type.startsWith("listening")) return "listening";
    return "speaking";
  };

  const getExerciseTitle = (category: string): string => {
    switch (category) {
      case "reading":
        return "閱讀練習";
      case "listening":
        return "聽力練習";
      case "speaking":
        return "口說練習";
      default:
        return "練習";
    }
  };

  const getPoolLabel = (pool: string): string => {
    if (pool.startsWith("P")) {
      return `練習池 ${pool}`;
    }
    return `複習池 ${pool}`;
  };

  // 比對邏輯（包含匹配）
  const checkAnswer = (transcript: string, correctWord: string): boolean => {
    // 簡化的正規化：只轉小寫和去除首尾空白
    const normalizedTranscript = transcript.toLowerCase().trim();
    const normalizedCorrect = correctWord.toLowerCase().trim();

    // 包含匹配：辨識結果包含正確單字即算對
    return normalizedTranscript.includes(normalizedCorrect);
  };

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
        setTimeout(() => exerciseFlow.start(), 0);
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

      if (currentExercise.type.startsWith("speaking")) {
        // 口說題：根據辨識結果判斷
        correct = recognizedText.trim() !== "" &&
                  checkAnswer(recognizedText, currentExercise.word);
      } else {
        // 閱讀/聽力題：根據選中的索引判斷
        correct = exerciseFlow.selectedIndex === currentExercise.correct_index;
      }

      const newAnswer: AnswerSchema = { word_id: currentExercise.word_id, correct };
      setAnswers((prev) => [...prev, newAnswer]);
      answersRef.current = [...answersRef.current, newAnswer];
    }

    // 清理口說狀態
    setRecognizedText("");
    setIsRecording(false);

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
        setSession(data);

        // 檢查第一個題型
        if (data.exercises.length > 0) {
          setCurrentExerciseType(getExerciseCategory(data.exercises[0].type));
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
    if (!speechRecognition.isSupported) {
      Alert.alert("不支援", "此裝置不支援語音辨識功能");
      exerciseFlow.select(-1); // 標記為錯誤/超時
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
  };

  const handleStopRecording = () => {
    if (isRecording) {
      // 先清除計時器，防止超時 callback 搶先執行
      exerciseFlow.clearTimer();

      // 使用當前的 final 或 interim transcript（優先使用 final）
      const transcript = speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      if (transcript && currentExercise) {
        setRecognizedText(transcript);
        const correct = checkAnswer(transcript, currentExercise.word);
        exerciseFlow.select(correct ? 0 : -1);
      } else {
        // 沒有辨識到任何內容
        exerciseFlow.select(-1);
      }

      speechRecognition.abort(); // 使用 abort 而非 stop，避免觸發額外的 result 事件
      setIsRecording(false);
    }
  };

  // 口說題：進入 options 階段自動開始錄音
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "options" &&
      currentExercise?.type.startsWith("speaking") &&
      !isRecording
    ) {
      startRecording();
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, isRecording]);

  // 口說題：超時時檢查是否有已辨識的內容
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "result" &&
      currentExercise?.type.startsWith("speaking") &&
      isRecording
    ) {
      // 超時但還在錄音中，使用已辨識的內容來判斷
      const transcript = speechRecognition.finalTranscript || speechRecognition.interimTranscript;

      if (transcript) {
        setRecognizedText(transcript);
        // 注意：這裡不能改變 exerciseFlow.selectedIndex，因為已經在 result 階段
        // 但我們可以更新 recognizedText 來顯示用戶說了什麼
      }

      speechRecognition.abort();
      setIsRecording(false);
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, isRecording, speechRecognition.finalTranscript, speechRecognition.interimTranscript]);

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
      setIsRecording(false);
      setRecognizedText(speechRecognition.finalTranscript);

      // 比對答案
      const correct = checkAnswer(
        speechRecognition.finalTranscript,
        currentExercise.word
      );

      // 使用 select 觸發 result 階段
      // 使用 0 表示正確，-1 表示錯誤
      exerciseFlow.select(correct ? 0 : -1);
    }
  }, [speechRecognition.finalTranscript, currentExercise, pagePhase, exerciseFlow.phase, isRecording]);

  // 開始練習（從 intro 進入）
  const startExercise = () => {
    setPagePhase("exercising");
    exerciseFlow.start();
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
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>載入中...</Text>
      </SafeAreaView>
    );
  }

  if (pagePhase === "complete") {
    const correctCount = answers.filter((a) => a.correct).length;
    return (
      <SafeAreaView style={styles.completeContainer}>
        <View style={styles.completeIconContainer}>
          <Check size={48} color={colors.success} />
        </View>
        <Text style={styles.completeTitle}>
          練習完成！
        </Text>
        <Text style={styles.completeSubtitle}>
          答對 {correctCount} / {totalExercises} 題
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/(main)")}
        >
          <Text style={styles.primaryButtonText}>
            返回首頁
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
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
            {/* Pool 標籤 */}
            <View style={styles.poolBadge}>
              <Text style={styles.poolBadgeText}>
                {getPoolLabel(currentExercise.pool)}
              </Text>
            </View>

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
                        {currentExercise.image_url && (
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
                    <CountdownText remainingMs={exerciseFlow.remainingMs} />
                    {currentExercise.type.startsWith("speaking") ? (
                      <>
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
                    ) : (
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
                    )}
                  </>
                )}

                {/* 結果階段 */}
                {exerciseFlow.phase === "result" && (
                  <>
                    {currentExercise.type.startsWith("speaking") ? (
                      <>
                        {/* 口說題：使用實際比對結果來判斷正確性，而非 selectedIndex */}
                        {(() => {
                          const isCorrect = recognizedText.trim() !== "" &&
                            checkAnswer(recognizedText, currentExercise.word);
                          return (
                            <>
                              {/* 結果圖示 */}
                              <View style={[
                                styles.resultIconContainer,
                                isCorrect
                                  ? styles.resultCorrect
                                  : styles.resultIncorrect
                              ]}>
                                {isCorrect ? (
                                  <Check size={64} color={colors.success} />
                                ) : (
                                  <X size={64} color={colors.destructive} />
                                )}
                              </View>

                              {/* 你說的內容 */}
                              {recognizedText && (
                                <View style={styles.transcriptBox}>
                                  <Text style={styles.transcriptLabel}>你說：</Text>
                                  <Text style={styles.transcriptText}>
                                    "{recognizedText}"
                                  </Text>
                                </View>
                              )}

                              {/* 正確答案（如果答錯） */}
                              {!isCorrect && (
                                <View style={styles.correctAnswerBox}>
                                  <Text style={styles.correctAnswerLabel}>正確答案：</Text>
                                  <Text style={styles.correctAnswerText}>
                                    {currentExercise.word}
                                  </Text>
                                </View>
                              )}
                            </>
                          );
                        })()}
                      </>
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
                          onSelect={() => {}}
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
  // Loading screen
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.mutedForeground,
    marginTop: 16,
  },

  // Complete screen
  completeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  completeIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.success}33`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 32,
  },

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
  destructiveButton: {
    backgroundColor: colors.destructive,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.destructiveForeground,
  },
  successButton: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.successForeground,
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

  // Pool badge
  poolBadge: {
    backgroundColor: `${colors.accent}1A`,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9999,
    marginBottom: 16,
  },
  poolBadgeText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
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
    fontSize: 30,
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

  // Speaking exercise
  speakingContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
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
  speakingButtonsContainer: {
    flexDirection: "row",
    gap: 16,
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

  // 結果顯示
  resultIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  resultCorrect: {
    backgroundColor: `${colors.success}33`,
  },
  resultIncorrect: {
    backgroundColor: `${colors.destructive}33`,
  },

  // 正確答案顯示
  correctAnswerBox: {
    backgroundColor: `${colors.success}1A`,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
  },
  correctAnswerLabel: {
    fontSize: 14,
    color: colors.success,
    marginBottom: 4,
    fontWeight: "600",
  },
  correctAnswerText: {
    fontSize: 20,
    color: colors.success,
    fontWeight: "bold",
  },
});
