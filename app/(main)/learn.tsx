import { useState, useEffect, useRef, useCallback } from "react";
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
import { handleApiError, getAssetUrl, STORAGE_KEYS } from "../../services/api";
import { trackingService } from "../../services/trackingService";
import { notificationService } from "../../services/notificationService";
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
import { useCoachMark } from "../../hooks/useCoachMark";
import { CoachMarkOverlay } from "../../components/ui/CoachMark";
import type { CoachMarkStep } from "../../components/ui/CoachMark";

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
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Coach mark 教學
  const coachMark = useCoachMark(STORAGE_KEYS.COACH_MARK_LEARN);
  const displayContentRef = useRef<View>(null);
  const displayCountdownRef = useRef<View>(null);
  const exerciseWordRef = useRef<View>(null);
  const exerciseCountdownRef = useRef<View>(null);
  const exerciseOptionsRef = useRef<View>(null);
  // 教學目標階段：display | question | options | null
  const [coachMarkTarget, setCoachMarkTarget] = useState<"display" | "question" | "options" | null>(null);
  const [showCoachMark, setShowCoachMark] = useState(false);
  const isFirstWordRef = useRef(true);
  // display 計時器暫停用
  const displayPausedRemainingRef = useRef(0);
  const displayPausedRef = useRef(false);

  // Coach mark 步驟
  const displaySteps: CoachMarkStep[] = [
    { targetRef: displayContentRef, text: "記住這個單字、圖片和翻譯" },
    { targetRef: displayCountdownRef, text: "時間到會自動進入練習" },
  ];
  const questionSteps: CoachMarkStep[] = [
    { targetRef: exerciseWordRef, text: "看到單字後，準備選出翻譯" },
    { targetRef: exerciseCountdownRef, text: "倒數結束後會出現選項" },
  ];
  const optionsSteps: CoachMarkStep[] = [
    { targetRef: exerciseOptionsRef, text: "選出正確的中文翻譯" },
    { targetRef: exerciseCountdownRef, text: "注意作答時間" },
  ];

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
  const exerciseFlow = useExerciseFlow({
    onQuestionShown: () => {
      if (currentWord && currentExercise) {
        trackingService.questionShown("learn", currentWord.id, currentExercise.type, currentIndex);
      }
    },
    onAnswerPhaseStarted: () => {
      if (currentWord && currentExercise) {
        trackingService.answerPhaseStarted("learn", currentWord.id, currentExercise.type);
      }
    },
  }, () => {
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

      // 追蹤答題
      trackingService.exerciseAnswer(
        "learn",
        currentWord.id,
        currentExercise.type,
        correct,
        responseTimeMs
      );
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

  // Coach mark：攔截 exerciseFlow phase 轉換
  useEffect(() => {
    if (!coachMark.shouldShow || !isFirstWordRef.current) return;

    if (exerciseFlow.phase === "question" && coachMarkTarget === "question") {
      exerciseFlow.pause();
      setShowCoachMark(true);
    } else if (exerciseFlow.phase === "options" && coachMarkTarget === "options") {
      exerciseFlow.pause();
      setShowCoachMark(true);
    }
  }, [exerciseFlow.phase, coachMarkTarget, coachMark.shouldShow]);

  const handleCoachMarkComplete = useCallback(async (phase: "display" | "question" | "options") => {
    setShowCoachMark(false);
    if (phase === "display") {
      // 播放延遲的音檔，等音檔播完後才開始倒數
      if (currentWord) {
        await speak(currentWord.word, getAssetUrl(currentWord.audio_url));
        trackingService.audioPlayed("learn", currentWord.id, "auto");
      }
      // display 步驟完成，恢復 display 計時器，等待 question
      setCoachMarkTarget("question");
      displayPausedRef.current = false;
      // 恢復 display 倒數
      const remaining = displayPausedRemainingRef.current;
      if (remaining > 0) {
        const start = Date.now();
        setDisplayRemainingMs(remaining);
        displayTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - start;
          const r = Math.max(0, remaining - elapsed);
          setDisplayRemainingMs(r);
          if (r <= 0) {
            clearDisplayTimer();
            setPagePhase("exercising");
            exerciseFlow.start();
          }
        }, COUNTDOWN_INTERVAL);
      }
    } else if (phase === "question") {
      setCoachMarkTarget("options");
      exerciseFlow.resume();
    } else {
      // options 步驟完成，教學結束
      setCoachMarkTarget(null);
      isFirstWordRef.current = false;
      coachMark.markAsSeen();
      exerciseFlow.resume();
    }
  }, [exerciseFlow, coachMark, currentWord, speak]);

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

        // 追蹤練習開始
        sessionStartTimeRef.current = Date.now();
        trackingService.exerciseStart("learn", data.words.length);
      } catch (error) {
        Alert.alert("載入失敗", handleApiError(error), [
          { text: "返回", onPress: () => router.back() },
        ]);
      }
    };
    loadSession();

    return () => clearDisplayTimer();
  }, [router]);

  // 展示階段：自動播放音檔 + 音檔播完後 3秒進入答題
  useEffect(() => {
    if (pagePhase === "display" && currentWord) {
      let cancelled = false;
      setDisplayRemainingMs(DISPLAY_DURATION);

      const startDisplay = async () => {
        // Coach mark 教學時延遲播放音檔（會在 handleCoachMarkComplete 中播放）
        if (!(coachMark.shouldShow && isFirstWordRef.current)) {
          await speak(currentWord.word, getAssetUrl(currentWord.audio_url));
          trackingService.audioPlayed("learn", currentWord.id, "auto");
        }
        if (cancelled) return;

        // 音檔播完後開始倒數
        const start = Date.now();
        setDisplayRemainingMs(DISPLAY_DURATION);

        displayTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - start;
          const remaining = Math.max(0, DISPLAY_DURATION - elapsed);
          setDisplayRemainingMs(remaining);

          if (remaining <= 0) {
            clearDisplayTimer();
            setPagePhase("exercising");
            exerciseFlow.start();
          }
        }, COUNTDOWN_INTERVAL);
      };
      startDisplay();

      return () => {
        cancelled = true;
        clearDisplayTimer();
      };
    }

    return () => clearDisplayTimer();
  }, [pagePhase, currentIndex, currentWord, speak]);

  // Coach mark：攔截 display 階段
  // 注意：必須在 display timer effect 之後宣告，確保計時器已啟動才能清除
  useEffect(() => {
    if (!coachMark.shouldShow || !isFirstWordRef.current) return;

    if (pagePhase === "display" && coachMarkTarget === null && currentWord) {
      // 第一次進入 display 階段，設定為等待 display
      setCoachMarkTarget("display");
    }
  }, [pagePhase, coachMark.shouldShow, coachMarkTarget, currentWord]);

  // Coach mark：display 階段暫停計時器
  useEffect(() => {
    if (coachMarkTarget === "display" && pagePhase === "display" && !showCoachMark && coachMark.shouldShow && isFirstWordRef.current) {
      // 暫停 display 計時器
      clearDisplayTimer();
      displayPausedRemainingRef.current = displayRemainingMs;
      displayPausedRef.current = true;
      setShowCoachMark(true);
    }
  }, [coachMarkTarget, pagePhase, coachMark.shouldShow, displayRemainingMs]);

  // 完成學習
  const completeSession = async () => {
    if (!session) return;

    // 追蹤練習完成
    const durationMs = Date.now() - sessionStartTimeRef.current;
    const correctCount = answersRef.current.filter((a) => a.correct).length;
    trackingService.exerciseComplete("learn", session.words.length, correctCount, durationMs);

    try {
      const wordIds = session.words.map((w) => w.id);
      const response = await learnService.complete(wordIds, answersRef.current);
      notificationService.scheduleNextSessionNotification(response.next_available_time ?? null);
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
      {
        text: "離開",
        style: "destructive",
        onPress: () => {
          // 追蹤練習放棄
          const durationMs = Date.now() - sessionStartTimeRef.current;
          trackingService.exerciseAbandon("learn", currentIndex, totalWords, durationMs);
          router.back();
        },
      },
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
            <View ref={displayCountdownRef} collapsable={false}>
              <CountdownText remainingMs={displayRemainingMs} />
            </View>

            {/* 單字 + 圖片 + 翻譯（coach mark 高亮區域） */}
            <View ref={displayContentRef} collapsable={false} style={{ alignItems: "center" }}>
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
            </View>

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
            wordRef={exerciseWordRef}
            optionsRef={exerciseOptionsRef}
            countdownRef={exerciseCountdownRef}
            nextReview={currentExercise.next_review}
          />
        )}
      </View>

      {/* Coach Mark 教學覆蓋層 */}
      {showCoachMark && coachMarkTarget === "display" && (
        <CoachMarkOverlay
          visible={true}
          steps={displaySteps}
          onComplete={() => handleCoachMarkComplete("display")}
        />
      )}
      {showCoachMark && coachMarkTarget === "question" && (
        <CoachMarkOverlay
          visible={true}
          steps={questionSteps}
          onComplete={() => handleCoachMarkComplete("question")}
        />
      )}
      {showCoachMark && coachMarkTarget === "options" && (
        <CoachMarkOverlay
          visible={true}
          steps={optionsSteps}
          onComplete={() => handleCoachMarkComplete("options")}
        />
      )}
    </SafeAreaView>
  );
}
