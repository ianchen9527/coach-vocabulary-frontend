import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  useWindowDimensions,
} from "react-native";
import { Alert } from "../../components/ui/Alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { practiceService } from "../../services/practiceService";
import { handleApiError, getAssetUrl, STORAGE_KEYS } from "../../services/api";
import { trackingService } from "../../services/trackingService";
import { notificationService } from "../../services/notificationService";
import type { PracticeSessionResponse, AnswerSchema } from "../../types/api";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeakingExercise } from "../../hooks/useSpeakingExercise";
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


// 頁面階段：loading | intro | exercising | complete
type PagePhase = "loading" | "intro" | "exercising" | "complete";

// Subtitle mapping for exercise types
const EXERCISE_SUBTITLES: Record<string, string> = {
  reading: "看單字，選出正確的翻譯",
  listening: "聽發音，選出正確的翻譯",
  speaking: "看翻譯，說出正確的單字",
};

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

  // 用來記錄當前答案
  const answersRef = useRef<AnswerSchema[]>([]);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Coach mark 教學（三種題型各自獨立）
  const coachMarkReading = useCoachMark(STORAGE_KEYS.COACH_MARK_PRACTICE_READING);
  const coachMarkListening = useCoachMark(STORAGE_KEYS.COACH_MARK_PRACTICE_LISTENING);
  const coachMarkSpeaking = useCoachMark(STORAGE_KEYS.COACH_MARK_PRACTICE_SPEAKING);

  // 共用 refs（因為同一時間只有一種題型顯示）
  const wordRef = useRef<View>(null);
  const countdownRef = useRef<View>(null);
  const optionsRef = useRef<View>(null);
  const speakerRef = useRef<View>(null);
  const translationRef = useRef<View>(null);
  const micRef = useRef<View>(null);

  const [coachMarkTarget, setCoachMarkTarget] = useState<"question" | "options" | null>(null);
  const [showCoachMark, setShowCoachMark] = useState(false);
  // 記錄已觸發過教學的題型類別
  const coachMarkTriggeredRef = useRef<Set<string>>(new Set());
  // 聽力題：教學時延遲播放音檔
  const coachMarkAudioPendingRef = useRef(false);

  // 判斷當前題型是否需要教學
  const getCurrentCoachMark = useCallback(() => {
    if (!currentExercise) return null;
    const category = getExerciseCategory(currentExercise.type);
    if (category === "reading" && coachMarkReading.shouldShow) return coachMarkReading;
    if (category === "listening" && coachMarkListening.shouldShow) return coachMarkListening;
    if (category === "speaking" && coachMarkSpeaking.shouldShow) return coachMarkSpeaking;
    return null;
  }, [currentExercise, coachMarkReading, coachMarkListening, coachMarkSpeaking]);

  // 取得當前題型的教學步驟
  const getQuestionSteps = useCallback((): CoachMarkStep[] => {
    if (!currentExercise) return [];
    const category = getExerciseCategory(currentExercise.type);
    if (category === "reading") {
      return [
        { targetRef: wordRef, text: "看這個英文單字" },
        { targetRef: countdownRef, text: "倒數結束後會出現選項" },
      ];
    }
    if (category === "listening") {
      return [
        { targetRef: speakerRef, text: "仔細聽單字的發音" },
        { targetRef: countdownRef, text: "倒數結束後會出現選項" },
      ];
    }
    if (category === "speaking") {
      return [
        { targetRef: translationRef, text: "看這個中文翻譯" },
        { targetRef: countdownRef, text: "倒數結束後會出現選項" },
      ];
    }
    return [];
  }, [currentExercise]);

  const getOptionsSteps = useCallback((): CoachMarkStep[] => {
    if (!currentExercise) return [];
    const category = getExerciseCategory(currentExercise.type);
    if (category === "reading") {
      return [
        { targetRef: optionsRef, text: "選出正確的中文翻譯" },
        { targetRef: countdownRef, text: "注意作答時間，倒數結束會自動跳下一題" },
      ];
    }
    if (category === "listening") {
      return [
        { targetRef: optionsRef, text: "聽完後選出正確的翻譯" },
        { targetRef: countdownRef, text: "注意作答時間" },
      ];
    }
    if (category === "speaking") {
      return [
        { targetRef: micRef, text: "麥克風會自動錄音，請說出英文單字" },
        { targetRef: countdownRef, text: "注意作答時間" },
      ];
    }
    return [];
  }, [currentExercise]);

  // 進入下一題
  const goToNextExercise = useCallback(() => {
    // 清除上一題的語音辨識結果
    speakingExercise.resetSpeaking();

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
        const isSpeaking = nextExercise.type.startsWith("speaking");
        const isListening = nextExercise.type.startsWith("listening");
        setTimeout(() => exerciseFlow.start({ delayOptionsCountdown: isSpeaking, delayQuestionCountdown: isListening }), 0);
      }
    } else {
      completeSession();
    }
  }, [currentIndex, totalExercises, exercises, currentExerciseType]);

  // 使用共用的答題流程 Hook（閱讀/聽力/口說題）
  const exerciseFlow = useExerciseFlow({
    onQuestionShown: () => {
      if (currentExercise) {
        trackingService.questionShown("practice", currentExercise.word_id, currentExercise.type, currentIndex);
      }
    },
    onAnswerPhaseStarted: () => {
      if (currentExercise) {
        trackingService.answerPhaseStarted("practice", currentExercise.word_id, currentExercise.type);
      }
    },
  }, () => {
    // 記錄答案
    if (currentExercise) {
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
        word_id: currentExercise.word_id,
        correct,
        exercise_type: currentExercise.type,
        user_answer: userAnswer,
        response_time_ms: responseTimeMs,
      };
      setAnswers((prev) => [...prev, newAnswer]);
      answersRef.current = [...answersRef.current, newAnswer];

      // 追蹤答題
      trackingService.exerciseAnswer(
        "practice",
        currentExercise.word_id,
        currentExercise.type,
        correct,
        responseTimeMs
      );
    }

    goToNextExercise();
  });

  // 使用口說練習 Hook
  const speakingExercise = useSpeakingExercise({
    exerciseFlow,
    currentWord: currentExercise?.word || null,
    wordId: currentExercise?.word_id || null,
    exerciseType: currentExercise?.type || null,
    pagePhase,
    onRecordingStarted: () => {
      if (currentExercise) {
        trackingService.recordingStarted("practice", currentExercise.word_id);
      }
    },
    onRecordingStopped: (stopReason) => {
      if (currentExercise) {
        trackingService.recordingStopped("practice", currentExercise.word_id, stopReason);
      }
    },
    onSpeechRecognized: (recognizedText, isMatch) => {
      if (currentExercise) {
        trackingService.speechRecognized("practice", currentExercise.word_id, recognizedText, isMatch);
      }
    },
  });

  // Coach mark：偵測新題型第一次出現
  useEffect(() => {
    if (pagePhase !== "exercising" || !currentExercise) return;
    const category = getExerciseCategory(currentExercise.type);
    const cm = getCurrentCoachMark();
    if (cm && !coachMarkTriggeredRef.current.has(category)) {
      coachMarkTriggeredRef.current.add(category);
      setCoachMarkTarget("question");
      // 聽力題：延遲播放音檔，等教學結束再播
      if (category === "listening") {
        coachMarkAudioPendingRef.current = true;
      }
    }
  }, [pagePhase, currentExercise, getCurrentCoachMark]);

  // Coach mark：攔截 exerciseFlow phase 轉換
  useEffect(() => {
    const cm = getCurrentCoachMark();
    if (!cm || coachMarkTarget === null) return;

    if (exerciseFlow.phase === "question" && coachMarkTarget === "question") {
      exerciseFlow.pause();
      setShowCoachMark(true);
    } else if (exerciseFlow.phase === "options" && coachMarkTarget === "options") {
      exerciseFlow.pause();
      setShowCoachMark(true);
    }
  }, [exerciseFlow.phase, coachMarkTarget, getCurrentCoachMark]);

  const handleCoachMarkComplete = useCallback(async (phase: "question" | "options") => {
    setShowCoachMark(false);
    if (phase === "question") {
      // 聽力題：播放延遲的音檔，等音檔播完後啟動倒數
      if (coachMarkAudioPendingRef.current && currentExercise?.type.startsWith("listening")) {
        coachMarkAudioPendingRef.current = false;
        await speak(currentExercise.word, getAssetUrl(currentExercise.audio_url));
        trackingService.audioPlayed("practice", currentExercise.word_id, "auto");
        // 聽力題使用 startQuestionCountdown 而非 resume
        setCoachMarkTarget("options");
        exerciseFlow.startQuestionCountdown();
      } else {
        setCoachMarkTarget("options");
        exerciseFlow.resume();
      }
    } else {
      setCoachMarkTarget(null);
      const cm = getCurrentCoachMark();
      cm?.markAsSeen();
      exerciseFlow.resume();
    }
  }, [exerciseFlow, getCurrentCoachMark, currentExercise, speak]);

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

        // 追蹤練習開始
        sessionStartTimeRef.current = Date.now();
        trackingService.exerciseStart("practice", sortedExercises.length);
      } catch (error) {
        Alert.alert("載入失敗", handleApiError(error), [
          { text: "返回", onPress: () => router.back() },
        ]);
      }
    };
    loadSession();
  }, [router]);

  // 聽力題：在 question 階段播放音檔，播完後啟動倒數
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      currentExercise?.type.startsWith("listening")
    ) {
      // Coach mark 教學時延遲播放音檔
      if (coachMarkAudioPendingRef.current) return;
      let cancelled = false;
      const playAndStart = async () => {
        await speak(currentExercise.word, getAssetUrl(currentExercise.audio_url));
        trackingService.audioPlayed("practice", currentExercise.word_id, "auto");
        if (!cancelled) exerciseFlow.startQuestionCountdown();
      };
      playAndStart();
      return () => { cancelled = true; };
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, speak]);

  // 開始練習（從 intro 進入）
  const startExercise = () => {
    setPagePhase("exercising");
    const isSpeaking = currentExercise?.type.startsWith("speaking") ?? false;
    const isListening = currentExercise?.type.startsWith("listening") ?? false;
    exerciseFlow.start({ delayOptionsCountdown: isSpeaking, delayQuestionCountdown: isListening });
  };

  // 完成練習
  const completeSession = async () => {
    setPagePhase("complete");

    // 追蹤練習完成
    const durationMs = Date.now() - sessionStartTimeRef.current;
    const correctCount = answersRef.current.filter((a) => a.correct).length;
    trackingService.exerciseComplete("practice", totalExercises, correctCount, durationMs);

    try {
      const response = await practiceService.submit(answersRef.current);
      notificationService.scheduleNextSessionNotification(response.next_available_time ?? null);
    } catch (error) {
      console.error("Submit practice error:", error);
    }
  };

  // 返回
  const handleBack = () => {
    exerciseFlow.clearTimer();
    if (speakingExercise.isRecording) {
      speakingExercise.speechRecognition.abort();
    }
    Alert.alert("確定離開？", "練習進度將不會保存", [
      { text: "取消", style: "cancel" },
      {
        text: "離開",
        style: "destructive",
        onPress: () => {
          // 追蹤練習放棄
          const durationMs = Date.now() - sessionStartTimeRef.current;
          trackingService.exerciseAbandon("practice", currentIndex, totalExercises, durationMs);
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
        title="練習完成！"
        subtitle={`答對 ${correctCount} / ${totalExercises} 題`}
        onBack={() => router.replace("/(main)")}
      />
    );
  }

  if (pagePhase === "intro") {
    return (
      <IntroScreen
        title={getExerciseTitle(currentExerciseType)}
        subtitle={EXERCISE_SUBTITLES[currentExerciseType] || ""}
        onStart={startExercise}
      />
    );
  }

  // Determine which exercise component to render
  const renderExercise = () => {
    if (!currentExercise) return null;

    const exerciseCategory = getExerciseCategory(currentExercise.type);

    if (exerciseCategory === "reading") {
      return (
        <ReadingExercise
          word={currentExercise.word}
          options={currentExercise.options}
          correctIndex={currentExercise.correct_index}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          selectedIndex={exerciseFlow.selectedIndex}
          onSelect={exerciseFlow.select}
          exerciseType={currentExercise.type}
          wordRef={wordRef}
          optionsRef={optionsRef}
          countdownRef={countdownRef}
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
          speakerRef={speakerRef}
          optionsRef={optionsRef}
          countdownRef={countdownRef}
          nextReview={currentExercise.next_review}
        />
      );
    }

    if (exerciseCategory === "speaking") {
      return (
        <SpeakingExercise
          translation={currentExercise.translation}
          word={currentExercise.word}
          imageUrl={currentExercise.image_url}
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
          translationRef={translationRef}
          micRef={micRef}
          countdownRef={countdownRef}
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
        {pagePhase === "exercising" && renderExercise()}
      </View>

      {/* Coach Mark 教學覆蓋層 */}
      {showCoachMark && coachMarkTarget === "question" && (
        <CoachMarkOverlay
          visible={true}
          steps={getQuestionSteps()}
          onComplete={() => handleCoachMarkComplete("question")}
        />
      )}
      {showCoachMark && coachMarkTarget === "options" && (
        <CoachMarkOverlay
          visible={true}
          steps={getOptionsSteps()}
          onComplete={() => handleCoachMarkComplete("options")}
        />
      )}
    </SafeAreaView>
  );
}
