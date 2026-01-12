import { useState, useEffect, useRef } from "react";
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
import { reviewService } from "../../services/reviewService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { ReviewSessionResponse, AnswerSchema } from "../../types/api";
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

type PagePhase = "loading" | "display" | "exercising" | "complete";

const DISPLAY_DURATION = 3000; // 展示階段 3 秒
const COUNTDOWN_INTERVAL = 50; // 更新間隔 50ms

export default function ReviewScreen() {
  const router = useRouter();
  const { speak, isSpeaking } = useSpeech();
  const { width } = useWindowDimensions();

  // 寬螢幕時使用較窄的內容寬度
  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  const [session, setSession] = useState<ReviewSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
  const [answers, setAnswers] = useState<AnswerSchema[]>([]);
  const [displayCompleted, setDisplayCompleted] = useState(false);
  const [displayRemainingMs, setDisplayRemainingMs] = useState(DISPLAY_DURATION);

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
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPagePhase("display");
      exerciseFlow.reset();
    } else {
      completeSession();
    }
  };

  // 使用共用的答題流程 Hook
  const exerciseFlow = useExerciseFlow({}, () => {
    // 記錄答案
    if (currentWord && currentExercise) {
      const correct = exerciseFlow.selectedIndex === currentExercise.correct_index;
      const newAnswer = { word_id: currentWord.id, correct };
      setAnswers((prev) => [...prev, newAnswer]);
      answersRef.current = [...answersRef.current, newAnswer];
    }
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
        setSession(data);
        setPagePhase("display");
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

  const getPoolLabel = (pool: string): string => {
    return `複習池 ${pool}`;
  };

  // 進入答題階段
  const goToExercise = async () => {
    // 如果還沒完成展示階段，先通知後端
    if (!displayCompleted) {
      try {
        const wordIds = words.map((w) => w.id);
        await reviewService.complete(wordIds);
        setDisplayCompleted(true);
      } catch (error) {
        console.error("Review complete error:", error);
      }
    }

    setPagePhase("exercising");
    exerciseFlow.start();
  };

  // 完成複習
  const completeSession = async () => {
    setPagePhase("complete");

    try {
      await reviewService.submit(answersRef.current);
    } catch (error) {
      console.error("Submit review error:", error);
    }
  };

  // 返回
  const handleBack = () => {
    clearDisplayTimer();
    exerciseFlow.clearTimer();
    Alert.alert("確定離開？", "複習進度將不會保存", [
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
          複習完成！
        </Text>
        <Text style={styles.completeSubtitle}>
          答對 {correctCount} / {totalWords} 題
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

            {/* Pool 標籤 */}
            <View style={styles.poolBadge}>
              <Text style={styles.poolBadgeText}>
                {getPoolLabel(currentWord.pool)}
              </Text>
            </View>

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
            {/* Pool 標籤 */}
            <View style={styles.poolBadge}>
              <Text style={styles.poolBadgeText}>
                {getPoolLabel(currentWord.pool)}
              </Text>
            </View>

            {/* 題目階段：顯示單字，倒數計時 */}
            {exerciseFlow.phase === "question" && (
              <>
                <CountdownText remainingMs={exerciseFlow.remainingMs} />
                <Text style={styles.exerciseWordText}>
                  {currentWord.word}
                </Text>
                <Text style={styles.exerciseHintText}>
                  準備作答...
                </Text>
              </>
            )}

            {/* 選項階段：顯示選項，倒數計時 */}
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

            {/* 結果階段：顯示正確答案 */}
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
    fontSize: 24,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  exerciseHintText: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 32,
  },
});
