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
import { tutorialService } from "../../services/tutorialService";
import { handleApiError, getAssetUrl } from "../../services/api";
import { trackingService } from "../../services/trackingService";
import { useAuth } from "../../contexts/AuthContext";
import type {
  TutorialSessionResponse,
  AnswerSchema,
} from "../../types/api";
import { Volume2 } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeakingExercise } from "../../hooks/useSpeakingExercise";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseHeader,
  ProgressBar,
  ExerciseLoading,
  IntroScreen,
  ReadingExercise,
  ListeningExercise,
  SpeakingExercise,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";
import { TutorialSummary } from "../../components/tutorial/TutorialSummary";
import { getExerciseCategory } from "../../utils/exerciseHelpers";

// 頁面階段
type PagePhase = "loading" | "intro" | "teaching" | "exercising" | "complete";

// Intro 畫面內容：每個步驟的標題、副標題、步驟、時間提示
interface IntroContent {
  title: string;
  subtitle: string;
  steps: string[];
  timeWarning: string;
}

const TUTORIAL_INTRO_CONTENT: Record<string, IntroContent> = {
  teaching: {
    title: "教學",
    subtitle: "",
    steps: ["您會看到看單字、圖片、中文翻譯", "請記住這個單字"],
    timeWarning: "",
  },
  reading_lv1: {
    title: "閱讀練習",
    subtitle: "",
    steps: ["看英文單字，並回想圖片和中文翻譯", "在下一頁選擇正確的中文圖片和翻譯"],
    timeWarning: "你有 1 秒看題目和回想，4 秒選擇答案",
  },
  reading_lv2: {
    title: "閱讀練習",
    subtitle: "",
    steps: ["看英文單字，並回想中文翻譯", "在下一頁選擇正確的中文翻譯"],
    timeWarning: "你有 1 秒看題目和回想，4 秒選擇答案",
  },
  listening_lv1: {
    title: "聽力練習",
    subtitle: "",
    steps: ["聆聽單字發音，並回想圖片和中文翻譯", "在下一頁選擇正確的中文圖片和翻譯"],
    timeWarning: "你有 1 秒聆聽發音，4 秒選擇答案",
  },
  speaking_lv1: {
    title: "口說練習",
    subtitle: "",
    steps: ["看圖片和中文翻譯，並回想英文單字", "在下一頁說出英文單字"],
    timeWarning: "你有 1 秒準備，4 秒說出答案",
  },
  speaking_lv2: {
    title: "口說練習",
    subtitle: "",
    steps: ["看中文翻譯，並回想英文單字", "在下一頁說出英文單字"],
    timeWarning: "你有 1 秒準備，4 秒說出答案",
  },
};

const DISPLAY_DURATION = 3000; // 教學展示 3 秒
const COUNTDOWN_INTERVAL = 50;

export default function TutorialScreen() {
  const router = useRouter();
  const { speak, isSpeaking } = useSpeech();
  const { refreshUser } = useAuth();
  const { width } = useWindowDimensions();

  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  const [session, setSession] = useState<TutorialSessionResponse | null>(null);
  const [teachingCompleted, setTeachingCompleted] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0); // 0-based index for exercises
  const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
  const [displayRemainingMs, setDisplayRemainingMs] = useState(DISPLAY_DURATION);
  const [answers, setAnswers] = useState<AnswerSchema[]>([]);

  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<AnswerSchema[]>([]);
  const sessionStartTimeRef = useRef<number>(Date.now());

  const steps = session?.steps || [];
  const currentStep = teachingCompleted ? steps[exerciseIndex] : null;
  const word = session?.word;

  // 總步驟數：教學 (1) + 練習 (steps.length)
  const totalSteps = steps.length + 1;
  // 當前進度索引：教學為 0，練習為 1+
  const progressIndex = teachingCompleted ? exerciseIndex + 1 : 0;

  // 前往下一個步驟
  const goToNextStep = useCallback(() => {
    // 清除口說辨識結果
    speakingExercise.resetSpeaking();

    if (!teachingCompleted) {
      // 教學完成，進入第一個練習
      setTeachingCompleted(true);
      if (steps.length > 0) {
        // 顯示第一個練習的 Intro
        setPagePhase("intro");
      } else {
        completeSession();
      }
    } else if (exerciseIndex < steps.length - 1) {
      // 進入下一個練習的 Intro
      setExerciseIndex((prev) => prev + 1);
      setPagePhase("intro");
    } else {
      // 所有練習完成
      completeSession();
    }
  }, [teachingCompleted, exerciseIndex, steps]);

  // 使用共用的答題流程 Hook
  const exerciseFlow = useExerciseFlow({
    onQuestionShown: () => {
      if (word && currentStep) {
        trackingService.questionShown("tutorial", word.id, currentStep.type, progressIndex);
      }
    },
    onAnswerPhaseStarted: () => {
      if (word && currentStep) {
        trackingService.answerPhaseStarted("tutorial", word.id, currentStep.type);
      }
    },
  }, () => {
    // 記錄答案
    if (word && currentStep) {
      let correct = false;
      let userAnswer: string | undefined;
      const responseTimeMs = exerciseFlow.getResponseTimeMs() ?? undefined;

      if (currentStep.type.startsWith("speaking")) {
        correct = speakingExercise.isCorrect;
        userAnswer = speakingExercise.recognizedText.trim() || undefined;
      } else {
        correct = exerciseFlow.selectedIndex === currentStep.correct_index;
        if (exerciseFlow.selectedIndex !== null && exerciseFlow.selectedIndex >= 0) {
          userAnswer = currentStep.options[exerciseFlow.selectedIndex]?.translation;
        }
      }

      const newAnswer: AnswerSchema = {
        word_id: word.id,
        correct,
        exercise_type: currentStep.type,
        user_answer: userAnswer,
        response_time_ms: responseTimeMs,
      };
      setAnswers((prev) => [...prev, newAnswer]);
      answersRef.current = [...answersRef.current, newAnswer];

      trackingService.exerciseAnswer(
        "tutorial",
        word.id,
        currentStep.type,
        correct,
        responseTimeMs
      );
    }

    goToNextStep();
  });

  // 使用口說練習 Hook
  const speakingExercise = useSpeakingExercise({
    exerciseFlow,
    currentWord: word?.word || null,
    wordId: word?.id || null,
    exerciseType: currentStep?.type || null,
    pagePhase,
    onRecordingStarted: () => {
      if (word) {
        trackingService.recordingStarted("tutorial", word.id);
      }
    },
    onRecordingStopped: (stopReason) => {
      if (word) {
        trackingService.recordingStopped("tutorial", word.id, stopReason);
      }
    },
    onSpeechRecognized: (recognizedText, isMatch) => {
      if (word) {
        trackingService.speechRecognized("tutorial", word.id, recognizedText, isMatch);
      }
    },
  });

  // 清理展示階段計時器
  const clearDisplayTimer = () => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  };

  // 載入教學 Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await tutorialService.getSession();
        setSession(data);

        // 先顯示教學 Intro
        setPagePhase("intro");

        sessionStartTimeRef.current = Date.now();
        // 總步驟數 = 教學 (1) + 練習 (steps.length)
        trackingService.exerciseStart("tutorial", data.steps.length + 1);
      } catch (error) {
        Alert.alert("載入失敗", handleApiError(error), [
          { text: "返回", onPress: () => router.back() },
        ]);
      }
    };
    loadSession();

    return () => clearDisplayTimer();
  }, [router]);

  // 教學展示階段：播放音檔 + 3秒倒數
  useEffect(() => {
    if (pagePhase === "teaching" && word) {
      speak(word.word, getAssetUrl(word.audio_url));
      trackingService.audioPlayed("tutorial", word.id, "auto");

      const start = Date.now();
      setDisplayRemainingMs(DISPLAY_DURATION);

      displayTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, DISPLAY_DURATION - elapsed);
        setDisplayRemainingMs(remaining);

        if (remaining <= 0) {
          clearDisplayTimer();
          goToNextStep();
        }
      }, COUNTDOWN_INTERVAL);
    }

    return () => clearDisplayTimer();
  }, [pagePhase, word, speak]);

  // 聽力題：在 question 階段播放音檔
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      currentStep?.type.startsWith("listening") &&
      word
    ) {
      speak(word.word, getAssetUrl(word.audio_url));
      trackingService.audioPlayed("tutorial", word.id, "auto");
    }
  }, [pagePhase, exerciseFlow.phase, currentStep, word, speak]);

  // 從 Intro 開始
  const startFromIntro = () => {
    if (!teachingCompleted) {
      // 進入教學展示階段
      setPagePhase("teaching");
      // teaching 階段的計時在 useEffect 中自動開始
    } else {
      // 進入練習階段並開始計時
      setPagePhase("exercising");
      exerciseFlow.reset();
      const isSpeakingExercise = currentStep?.type.startsWith("speaking") ?? false;
      exerciseFlow.start(isSpeakingExercise);
    }
  };

  // 完成教學
  const completeSession = async () => {
    setPagePhase("complete");

    const durationMs = Date.now() - sessionStartTimeRef.current;
    const correctCount = answersRef.current.filter((a) => a.correct).length;
    trackingService.exerciseComplete("tutorial", totalSteps, correctCount, durationMs);

    try {
      await tutorialService.complete();
      await refreshUser();
    } catch (error) {
      console.error("Complete tutorial error:", error);
    }
  };

  // 返回
  const handleBack = () => {
    clearDisplayTimer();
    exerciseFlow.clearTimer();
    if (speakingExercise.isRecording) {
      speakingExercise.speechRecognition.abort();
    }
    Alert.alert("確定離開？", "教學進度將不會保存", [
      { text: "取消", style: "cancel" },
      {
        text: "離開",
        style: "destructive",
        onPress: () => {
          const durationMs = Date.now() - sessionStartTimeRef.current;
          trackingService.exerciseAbandon("tutorial", progressIndex, totalSteps, durationMs);
          router.back();
        },
      },
    ]);
  };

  // 完成後返回首頁
  const handleComplete = () => {
    router.replace("/(main)");
  };

  if (pagePhase === "loading") {
    return <ExerciseLoading />;
  }

  if (pagePhase === "complete") {
    return <TutorialSummary onStart={handleComplete} />;
  }

  if (pagePhase === "intro") {
    // 取得當前步驟的 intro 內容
    const introKey = !teachingCompleted ? "teaching" : (currentStep?.type || "teaching");
    const introContent = TUTORIAL_INTRO_CONTENT[introKey] || TUTORIAL_INTRO_CONTENT.teaching;

    return (
      <IntroScreen
        title={introContent.title}
        subtitle={introContent.subtitle}
        steps={introContent.steps}
        timeWarning={introContent.timeWarning}
        onStart={startFromIntro}
      />
    );
  }

  // 渲染練習組件
  const renderExercise = () => {
    if (!currentStep || !word) return null;

    const exerciseCategory = getExerciseCategory(currentStep.type);

    if (exerciseCategory === "reading") {
      return (
        <ReadingExercise
          word={word.word}
          options={currentStep.options}
          correctIndex={currentStep.correct_index}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          selectedIndex={exerciseFlow.selectedIndex}
          onSelect={exerciseFlow.select}
          exerciseType={currentStep.type}
        />
      );
    }

    if (exerciseCategory === "listening") {
      return (
        <ListeningExercise
          options={currentStep.options}
          correctIndex={currentStep.correct_index}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          selectedIndex={exerciseFlow.selectedIndex}
          onSelect={exerciseFlow.select}
          exerciseType={currentStep.type}
          isSpeaking={isSpeaking}
        />
      );
    }

    if (exerciseCategory === "speaking") {
      return (
        <SpeakingExercise
          translation={word.translation}
          word={word.word}
          imageUrl={word.image_url}
          phase={exerciseFlow.phase}
          remainingMs={exerciseFlow.remainingMs}
          exerciseType={currentStep.type}
          isPreparingRecording={speakingExercise.isPreparingRecording}
          isRecording={speakingExercise.isRecording}
          recognizedText={speakingExercise.recognizedText}
          interimTranscript={speakingExercise.speechRecognition.interimTranscript}
          isCorrect={speakingExercise.isCorrect}
          onStopRecording={speakingExercise.handleStopRecording}
          getAssetUrl={getAssetUrl}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ExerciseHeader
        title="使用教學"
        currentIndex={progressIndex}
        total={totalSteps}
        onBack={handleBack}
      />

      {/* Progress Bar */}
      <ProgressBar
        total={totalSteps}
        currentIndex={progressIndex}
        answers={answers}
      />

      {/* Content */}
      <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
        {/* 教學展示階段 */}
        {pagePhase === "teaching" && word && (
          <View style={styles.displayContainer}>
            <CountdownText remainingMs={displayRemainingMs} />

            {word.image_url && (
              <Image
                source={{ uri: getAssetUrl(word.image_url) || undefined }}
                style={styles.wordImage}
                resizeMode="contain"
              />
            )}

            <Text style={styles.wordText}>{word.word}</Text>
            <Text style={styles.translationText}>{word.translation}</Text>

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

        {/* 練習階段 */}
        {pagePhase === "exercising" && renderExercise()}
      </View>
    </SafeAreaView>
  );
}
