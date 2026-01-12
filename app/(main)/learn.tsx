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
import { learnService } from "../../services/learnService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { LearnSessionResponse } from "../../types/api";
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

export default function LearnScreen() {
  const router = useRouter();
  const { speak, isSpeaking } = useSpeech();
  const { width } = useWindowDimensions();

  // 寬螢幕時使用較窄的內容寬度
  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  const [session, setSession] = useState<LearnSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
  const [displayRemainingMs, setDisplayRemainingMs] = useState(DISPLAY_DURATION);

  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentWord = session?.words[currentIndex];
  const currentExercise = session?.exercises[currentIndex];
  const totalWords = session?.words.length || 0;

  // 前往下一個單字
  const goToNext = () => {
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPagePhase("display");
      exerciseFlow.reset();
    } else {
      setPagePhase("complete");
      completeSession();
    }
  };

  // 使用共用的答題流程 Hook
  const exerciseFlow = useExerciseFlow({}, goToNext);

  // 清理展示階段計時器
  const clearDisplayTimer = () => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  };

  // 載入學習 Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await learnService.getSession();
        if (!data.available) {
          Alert.alert("無法學習", data.reason || "目前無法學習新單字", [
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

  // 展示階段：自動播放音檔 + 3秒後自動進入答題
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
          // 進入答題流程
          setPagePhase("exercising");
          exerciseFlow.start();
        }
      }, COUNTDOWN_INTERVAL);
    }

    return () => clearDisplayTimer();
  }, [pagePhase, currentIndex, currentWord, speak]);

  // 完成學習
  const completeSession = async () => {
    if (!session) return;

    try {
      const wordIds = session.words.map((w) => w.id);
      await learnService.complete(wordIds);
    } catch (error) {
      console.error("Complete session error:", error);
    }
  };

  // 返回首頁
  const handleBack = () => {
    clearDisplayTimer();
    exerciseFlow.clearTimer();
    Alert.alert("確定離開？", "學習進度將不會保存", [
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
    return (
      <SafeAreaView style={styles.completeContainer}>
        <View style={styles.successIconContainer}>
          <Check size={48} color={colors.success} />
        </View>
        <Text style={styles.completeTitle}>
          學習完成！
        </Text>
        <Text style={styles.completeSubtitle}>
          你已學習 {totalWords} 個新單字{"\n"}
          10 分鐘後可以開始練習
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
        title="學習中"
        currentIndex={currentIndex}
        total={totalWords}
        onBack={handleBack}
      />

      {/* Progress Bar */}
      <ProgressBar
        total={totalWords}
        currentIndex={currentIndex}
      />

      {/* Content */}
      <View style={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
        {/* 展示階段：顯示單字和翻譯 */}
        {pagePhase === "display" && currentWord && (
          <View style={styles.displayContent}>
            {/* 倒數計時 */}
            <CountdownText remainingMs={displayRemainingMs} />

            {/* 圖片 */}
            {currentWord.image_url && (
              <Image
                source={{ uri: getAssetUrl(currentWord.image_url) || undefined }}
                style={styles.wordImage}
                resizeMode="contain"
              />
            )}

            {/* 單字 */}
            <Text style={styles.wordText}>
              {currentWord.word}
            </Text>

            {/* 翻譯 */}
            <Text style={styles.translationText}>
              {currentWord.translation}
            </Text>

            {/* 音檔狀態 */}
            <View style={styles.audioStatus}>
              <Volume2
                size={24}
                color={isSpeaking ? colors.success : colors.mutedForeground}
              />
              <Text style={styles.audioStatusText}>
                {isSpeaking ? "播放中..." : "已播放"}
              </Text>
            </View>
          </View>
        )}

        {/* 答題階段 */}
        {pagePhase === "exercising" && currentExercise && currentWord && (
          <View style={styles.exerciseContent}>
            {/* 題目階段：顯示單字，倒數計時 */}
            {exerciseFlow.phase === "question" && (
              <>
                <CountdownText remainingMs={exerciseFlow.remainingMs} />
                <Text style={styles.exerciseWordText}>
                  {currentWord.word}
                </Text>
                <Text style={styles.exerciseInstructions}>
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
  successIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 9999,
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

  // Main container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Content
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Display phase
  displayContent: {
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
  audioStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  audioStatusText: {
    color: colors.mutedForeground,
    marginLeft: 8,
  },

  // Exercise phase
  exerciseContent: {
    width: "100%",
    alignItems: "center",
  },
  exerciseWordText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: 8,
  },
  exerciseInstructions: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 32,
  },
  timeoutText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.destructive,
    marginTop: 16,
  },
});
