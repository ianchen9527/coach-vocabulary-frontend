import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  useWindowDimensions,
} from "react-native";
import { Alert } from "../../components/ui/Alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { learnService } from "../../services/learnService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { LearnSessionResponse, AnswerSchema } from "../../types/api";
import { Volume2 } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseHeader,
  ProgressBar,
  ExerciseLoading,
  ExerciseComplete,
  ReadingExercise,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";

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
  const [answers, setAnswers] = useState<AnswerSchema[]>([]);

  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<AnswerSchema[]>([]);

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
  const exerciseFlow = useExerciseFlow({}, () => {
    // 記錄答案
    if (currentWord && currentExercise) {
      // 計算回答時間（超時時也記錄實際時間）
      const responseTimeMs = exerciseFlow.getResponseTimeMs() ?? undefined;

      // 判斷是否正確
      const correct = exerciseFlow.selectedIndex === currentExercise.correct_index;

      // 取得使用者選擇的答案
      let userAnswer: string | undefined;
      if (exerciseFlow.selectedIndex !== null && exerciseFlow.selectedIndex >= 0) {
        userAnswer = currentExercise.options[exerciseFlow.selectedIndex]?.translation;
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

    goToNext();
  });

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
      await learnService.complete(wordIds, answersRef.current);
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
    return <ExerciseLoading />;
  }

  if (pagePhase === "complete") {
    return (
      <ExerciseComplete
        title="學習完成！"
        subtitle={`你已學習 ${totalWords} 個新單字\n10 分鐘後可以開始練習`}
        onBack={() => router.replace("/(main)")}
      />
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
      <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
        {/* 展示階段：顯示單字和翻譯 */}
        {pagePhase === "display" && currentWord && (
          <View style={styles.displayContainer}>
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

        {/* 答題階段 - 使用 ReadingExercise 組件 */}
        {pagePhase === "exercising" && currentExercise && currentWord && (
          <ReadingExercise
            word={currentWord.word}
            options={currentExercise.options}
            correctIndex={currentExercise.correct_index}
            phase={exerciseFlow.phase}
            remainingMs={exerciseFlow.remainingMs}
            selectedIndex={exerciseFlow.selectedIndex}
            onSelect={exerciseFlow.select}
            exerciseType={currentExercise.type}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
