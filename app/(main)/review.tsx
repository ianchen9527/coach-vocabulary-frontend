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
import { reviewService } from "../../services/reviewService";
import { handleApiError, getAssetUrl, STORAGE_KEYS } from "../../services/api";
import { trackingService } from "../../services/trackingService";
import { notificationService } from "../../services/notificationService";
import type { ReviewSessionResponse, AnswerSchema } from "../../types/api";
import { Volume2 } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeakingExercise } from "../../hooks/useSpeakingExercise";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseHeader,
  ProgressBar,
  ExerciseLoading,
  ExerciseComplete,
  IntroScreen,
  ReadingExercise,
  ListeningExercise,
  SpeakingExercise,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";
import {
  getExerciseCategory,
  getExerciseTitle,
} from "../../utils/exerciseHelpers";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { useCoachMark } from "../../hooks/useCoachMark";
import { CoachMarkOverlay } from "../../components/ui/CoachMark";
import type { CoachMarkStep } from "../../components/ui/CoachMark";

type PagePhase = "loading" | "intro" | "display" | "exercising" | "complete";

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
  const [displayRemainingMs, setDisplayRemainingMs] = useState(DISPLAY_DURATION);
  const [currentExerciseType, setCurrentExerciseType] = useState<string>("");

  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<AnswerSchema[]>([]);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Coach mark 教學（display 階段 2 步驟）
  const coachMark = useCoachMark(STORAGE_KEYS.COACH_MARK_REVIEW);
  const displayContentRef = useRef<View>(null);
  const displayCountdownRef = useRef<View>(null);
  const [showCoachMark, setShowCoachMark] = useState(false);
  const isFirstDisplayRef = useRef(true);
  const displayPausedRemainingRef = useRef(0);

  const displayCoachSteps: CoachMarkStep[] = [
    { targetRef: displayContentRef, text: "先回想這個單字的意思" },
    { targetRef: displayCountdownRef, text: "複習後會進入測驗" },
  ];

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
    speakingExercise.resetSpeaking();

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
  const exerciseFlow = useExerciseFlow({
    onQuestionShown: () => {
      if (currentWord && currentExercise) {
        trackingService.questionShown("review", currentWord.id, currentExercise.type, currentIndex);
      }
    },
    onAnswerPhaseStarted: () => {
      if (currentWord && currentExercise) {
        trackingService.answerPhaseStarted("review", currentWord.id, currentExercise.type);
      }
    },
  }, () => {
    // 記錄答案
    if (currentWord && currentExercise) {
      let correct = false;
      let userAnswer: string | undefined;

      // 計算回答時間（超時時也記錄實際時間）
      const responseTimeMs = exerciseFlow.getResponseTimeMs() ?? undefined;

      if (currentExercise.type.startsWith("speaking")) {
        // 口說題：使用 speakingExercise hook 的狀態
        correct = speakingExercise.isCorrect;
        userAnswer = speakingExercise.recognizedText.trim() || undefined;
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

      // 追蹤答題
      trackingService.exerciseAnswer(
        "review",
        currentWord.id,
        currentExercise.type,
        correct,
        responseTimeMs
      );
    }

    goToNext();
  });

  // 使用口說練習 Hook
  const speakingExercise = useSpeakingExercise({
    exerciseFlow,
    currentWord: currentWord?.word || null,
    wordId: currentWord?.id || null,
    exerciseType: currentExercise?.type || null,
    pagePhase,
    onRecordingStarted: () => {
      if (currentWord) {
        trackingService.recordingStarted("review", currentWord.id);
      }
    },
    onRecordingStopped: (stopReason) => {
      if (currentWord) {
        trackingService.recordingStopped("review", currentWord.id, stopReason);
      }
    },
    onSpeechRecognized: (recognizedText, isMatch) => {
      if (currentWord) {
        trackingService.speechRecognized("review", currentWord.id, recognizedText, isMatch);
      }
    },
  });

  const handleCoachMarkComplete = useCallback(async () => {
    setShowCoachMark(false);
    isFirstDisplayRef.current = false;
    coachMark.markAsSeen();
    // 播放延遲的音檔，等音檔播完後才開始倒數
    if (currentWord) {
      await speak(currentWord.word, getAssetUrl(currentWord.audio_url));
      trackingService.audioPlayed("review", currentWord.id, "auto");
    }
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
          goToExercise();
        }
      }, COUNTDOWN_INTERVAL);
    }
  }, [coachMark, currentWord, speak]);

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

        // 追蹤複習開始
        sessionStartTimeRef.current = Date.now();
        trackingService.exerciseStart("review", sortedWords.length);
      } catch (error) {
        Alert.alert("載入失敗", handleApiError(error), [
          { text: "返回", onPress: () => router.back() },
        ]);
      }
    };
    loadSession();

    return () => clearDisplayTimer();
  }, [router]);

  // 展示階段：自動播放發音 + 音檔播完後 3秒進入答題
  useEffect(() => {
    if (pagePhase === "display" && currentWord) {
      let cancelled = false;
      setDisplayRemainingMs(DISPLAY_DURATION);

      const startDisplay = async () => {
        // Coach mark 教學時延遲播放音檔（會在 handleCoachMarkComplete 中播放）
        if (!(coachMark.shouldShow && isFirstDisplayRef.current)) {
          await speak(currentWord.word, getAssetUrl(currentWord.audio_url));
          trackingService.audioPlayed("review", currentWord.id, "auto");
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
            goToExercise();
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

  // Coach mark：攔截第一次 display 階段
  // 注意：必須在 display timer effect 之後宣告，確保計時器已啟動才能清除
  useEffect(() => {
    if (!coachMark.shouldShow || !isFirstDisplayRef.current) return;
    if (pagePhase === "display" && currentWord && !showCoachMark) {
      // 暫停 display 計時器
      clearDisplayTimer();
      displayPausedRemainingRef.current = displayRemainingMs;
      setShowCoachMark(true);
    }
  }, [pagePhase, coachMark.shouldShow, currentWord, displayRemainingMs]);

  // 聽力題：在 question 階段播放音檔，播完後啟動倒數
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      currentExercise?.type.startsWith("listening") &&
      currentWord
    ) {
      let cancelled = false;
      const playAndStart = async () => {
        await speak(currentWord.word, getAssetUrl(currentWord.audio_url));
        trackingService.audioPlayed("review", currentWord.id, "auto");
        if (!cancelled) exerciseFlow.startQuestionCountdown();
      };
      playAndStart();
      return () => { cancelled = true; };
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, currentWord, speak]);

  // 從 intro 進入 display
  const startFromIntro = () => {
    setPagePhase("display");
  };

  // 進入答題階段
  const goToExercise = () => {
    setPagePhase("exercising");
    const isSpeaking = currentExercise?.type.startsWith("speaking") ?? false;
    const isListening = currentExercise?.type.startsWith("listening") ?? false;
    exerciseFlow.start({ delayOptionsCountdown: isSpeaking, delayQuestionCountdown: isListening });
  };

  // 完成複習
  const completeSession = async () => {
    setPagePhase("complete");

    // 追蹤複習完成
    const durationMs = Date.now() - sessionStartTimeRef.current;
    const correctCount = answersRef.current.filter((a) => a.correct).length;
    trackingService.exerciseComplete("review", totalWords, correctCount, durationMs);

    try {
      const wordIds = words.map((w) => w.id);
      const response = await reviewService.complete(wordIds, answersRef.current);
      notificationService.scheduleNextSessionNotification(response.next_available_time ?? null);
    } catch (error) {
      console.error("Review complete error:", error);
    }
  };

  // 返回
  const handleBack = () => {
    clearDisplayTimer();
    exerciseFlow.clearTimer();
    if (speakingExercise.isRecording) {
      speakingExercise.speechRecognition.abort();
    }
    Alert.alert("確定離開？", "複習進度將不會保存", [
      { text: "取消", style: "cancel" },
      {
        text: "離開",
        style: "destructive",
        onPress: () => {
          // 追蹤複習放棄
          const durationMs = Date.now() - sessionStartTimeRef.current;
          trackingService.exerciseAbandon("review", currentIndex, totalWords, durationMs);
          router.back();
        },
      },
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
      <IntroScreen
        title={getExerciseTitle(currentExerciseType, "review")}
        subtitle="先複習單字，再進行測驗"
        onStart={startFromIntro}
      />
    );
  }

  // Determine which exercise component to render
  const renderExercise = () => {
    if (!currentExercise || !currentWord) return null;

    const exerciseCategory = getExerciseCategory(currentExercise.type);

    if (exerciseCategory === "reading") {
      return (
        <ReadingExercise
          word={currentWord.word}
          options={currentExercise.options}
          correctIndex={currentExercise.correct_index}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          selectedIndex={exerciseFlow.selectedIndex}
          onSelect={exerciseFlow.select}
          exerciseType={currentExercise.type}
          nextReview={currentExercise.next_review}
        />
      );
    }

    if (exerciseCategory === "listening") {
      return (
        <ListeningExercise
          options={currentExercise.options}
          correctIndex={currentExercise.correct_index}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          selectedIndex={exerciseFlow.selectedIndex}
          onSelect={exerciseFlow.select}
          exerciseType={currentExercise.type}
          isSpeaking={isSpeaking}
          nextReview={currentExercise.next_review}
        />
      );
    }

    if (exerciseCategory === "speaking") {
      return (
        <SpeakingExercise
          translation={currentWord.translation}
          word={currentWord.word}
          imageUrl={currentWord.image_url}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          exerciseType={currentExercise.type}
          isPreparingRecording={speakingExercise.isPreparingRecording}
          isRecording={speakingExercise.isRecording}
          recognizedText={speakingExercise.recognizedText}
          interimTranscript={speakingExercise.speechRecognition.interimTranscript}
          isCorrect={speakingExercise.isCorrect}
          onStopRecording={speakingExercise.handleStopRecording}
          getAssetUrl={getAssetUrl}
          nextReview={currentExercise.next_review}
        />
      );
    }

    return null;
  };

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
            <View ref={displayCountdownRef} collapsable={false}>
              <CountdownText remainingMs={displayRemainingMs} />
            </View>

            <View ref={displayContentRef} collapsable={false} style={{ alignItems: "center" }}>
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
            </View>

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

        {/* 答題階段 - 使用組件化的練習 */}
        {pagePhase === "exercising" && renderExercise()}
      </View>

      {/* Coach Mark 教學覆蓋層 */}
      {showCoachMark && (
        <CoachMarkOverlay
          visible={true}
          steps={displayCoachSteps}
          onComplete={handleCoachMarkComplete}
        />
      )}
    </SafeAreaView>
  );
}
