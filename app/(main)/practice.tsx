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
import { Volume2, Check } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
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

  // 寬螢幕時使用較窄的內容寬度
  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
  const [answers, setAnswers] = useState<AnswerSchema[]>([]);
  const [currentExerciseType, setCurrentExerciseType] = useState<string>("");

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

  // 用來記錄當前答案
  const answersRef = useRef<AnswerSchema[]>([]);

  // 進入下一題
  const goToNextExercise = useCallback(() => {
    if (currentIndex < totalExercises - 1) {
      const nextExercise = exercises[currentIndex + 1];
      const nextCategory = getExerciseCategory(nextExercise.type);

      setCurrentIndex((prev) => prev + 1);

      if (nextCategory !== currentExerciseType) {
        setCurrentExerciseType(nextCategory);
        setPagePhase("intro");
      } else if (nextCategory === "speaking") {
        setPagePhase("speaking");
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

  // 使用共用的答題流程 Hook（閱讀/聽力題）
  const exerciseFlow = useExerciseFlow({}, () => {
    // 記錄答案
    if (currentExercise) {
      const correct = exerciseFlow.selectedIndex === currentExercise.correct_index;
      const newAnswer = { word_id: currentExercise.word_id, correct };
      setAnswers((prev) => [...prev, newAnswer]);
      answersRef.current = [...answersRef.current, newAnswer];
    }
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

  // 處理口說練習（簡化版：手動確認）
  const handleSpeakingConfirm = (correct: boolean) => {
    setAnswers((prev) => [
      ...prev,
      { word_id: currentExercise!.word_id, correct },
    ]);

    setTimeout(() => {
      goToNextExercise();
    }, 1000);
  };

  // 開始練習（從 intro 進入）
  const startExercise = () => {
    if (currentExercise?.type.startsWith("speaking")) {
      setPagePhase("speaking");
    } else {
      setPagePhase("exercising");
      exerciseFlow.start();
    }
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

            {/* 口說練習 */}
            {pagePhase === "speaking" && currentExercise.type.startsWith("speaking") && (
              <View style={styles.speakingContainer}>
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
                  說出這個單字
                </Text>
                <View style={styles.speakingButtonsContainer}>
                  <TouchableOpacity
                    style={styles.destructiveButton}
                    onPress={() => handleSpeakingConfirm(false)}
                  >
                    <Text style={styles.destructiveButtonText}>
                      我不會
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={() => handleSpeakingConfirm(true)}
                  >
                    <Text style={styles.successButtonText}>
                      我會
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 閱讀/聽力練習 - 使用 exerciseFlow */}
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
                  </>
                )}

                {/* 選項階段 */}
                {exerciseFlow.phase === "options" && (
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

                {/* 結果階段 */}
                {exerciseFlow.phase === "result" && (
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
});
