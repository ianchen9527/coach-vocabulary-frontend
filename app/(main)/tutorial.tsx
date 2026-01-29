import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
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
  TutorialStatusResponse,
  TutorialItemType,
  AnswerSchema,
} from "../../types/api";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Headphones,
  Mic,
  Volume2,
  Check,
} from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeakingExercise } from "../../hooks/useSpeakingExercise";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseLoading,
  IntroScreen,
  ReadingExercise,
  ListeningExercise,
  SpeakingExercise,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";
import { exerciseCommonStyles } from "../../styles/exerciseStyles";
import { getExerciseCategory } from "../../utils/exerciseHelpers";

// 教學項目設定
const TUTORIAL_ITEMS_CONFIG: {
  type: TutorialItemType;
  label: string;
  description: string;
}[] = [
  { type: "learn", label: "學習", description: "認識單字、圖片和翻譯" },
  { type: "reading_lv1", label: "閱讀 Lv1", description: "看英文選中文圖片和翻譯" },
  { type: "reading_lv2", label: "閱讀 Lv2", description: "看英文選中文翻譯" },
  { type: "listening_lv1", label: "聽力 Lv1", description: "聽發音選中文圖片和翻譯" },
  { type: "speaking_lv1", label: "口說 Lv1", description: "看圖片和翻譯說出英文" },
  { type: "speaking_lv2", label: "口說 Lv2", description: "看翻譯說出英文" },
];

// 取得項目圖示
function getItemIcon(type: TutorialItemType) {
  switch (type) {
    case "learn":
      return <BookOpen size={24} color={colors.primary} />;
    case "reading_lv1":
    case "reading_lv2":
      return <Eye size={24} color={colors.primary} />;
    case "listening_lv1":
      return <Headphones size={24} color={colors.primary} />;
    case "speaking_lv1":
    case "speaking_lv2":
      return <Mic size={24} color={colors.primary} />;
  }
}

// Intro 畫面內容
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

const DISPLAY_DURATION = 3000;
const COUNTDOWN_INTERVAL = 50;

// 項目 runner 階段
type RunnerPhase = "intro" | "teaching" | "exercising";

export default function TutorialScreen() {
  const router = useRouter();
  const { speak, isSpeaking } = useSpeech();
  const { refreshUser } = useAuth();
  const { width } = useWindowDimensions();

  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  // 列表狀態
  const [statusData, setStatusData] = useState<TutorialStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 項目 runner 狀態
  const [activeTutorialType, setActiveTutorialType] = useState<TutorialItemType | null>(null);
  const [runnerPhase, setRunnerPhase] = useState<RunnerPhase>("intro");
  const [displayRemainingMs, setDisplayRemainingMs] = useState(DISPLAY_DURATION);

  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  const word = statusData?.word ?? null;
  const activeItem = statusData?.items.find((i) => i.type === activeTutorialType) ?? null;
  const activeStep = activeItem?.step ?? null;

  // 完成單項教學後返回列表
  const returnToList = useCallback(() => {
    setActiveTutorialType(null);
    setRunnerPhase("intro");
  }, []);

  // 完成單項教學
  const completeItem = useCallback(async (type: TutorialItemType) => {
    try {
      await tutorialService.completeItem(type);
      await refreshUser();
      // 更新本地狀態
      setStatusData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.type === type
              ? { ...item, completed: true, completed_at: new Date().toISOString() }
              : item
          ),
        };
      });
    } catch (error) {
      console.error("Complete tutorial item error:", error);
    }
    returnToList();
  }, [refreshUser, returnToList]);

  // 使用共用的答題流程 Hook
  const exerciseFlow = useExerciseFlow({
    onQuestionShown: () => {
      if (word && activeStep) {
        trackingService.questionShown("tutorial", word.id, activeStep.type, 0);
      }
    },
    onAnswerPhaseStarted: () => {
      if (word && activeStep) {
        trackingService.answerPhaseStarted("tutorial", word.id, activeStep.type);
      }
    },
  }, () => {
    // 練習完成 → 記錄答案並完成項目
    if (word && activeStep && activeTutorialType) {
      let correct = false;
      let userAnswer: string | undefined;
      const responseTimeMs = exerciseFlow.getResponseTimeMs() ?? undefined;

      if (activeStep.type.startsWith("speaking")) {
        correct = speakingExercise.isCorrect;
        userAnswer = speakingExercise.recognizedText.trim() || undefined;
      } else {
        correct = exerciseFlow.selectedIndex === activeStep.correct_index;
        if (exerciseFlow.selectedIndex !== null && exerciseFlow.selectedIndex >= 0) {
          userAnswer = activeStep.options[exerciseFlow.selectedIndex]?.translation;
        }
      }

      trackingService.exerciseAnswer(
        "tutorial",
        word.id,
        activeStep.type,
        correct,
        responseTimeMs
      );

      // 清除口說辨識結果
      speakingExercise.resetSpeaking();
      completeItem(activeTutorialType);
    }
  });

  // 使用口說練習 Hook
  const speakingExercise = useSpeakingExercise({
    exerciseFlow,
    currentWord: word?.word || null,
    wordId: word?.id || null,
    exerciseType: activeStep?.type || null,
    pagePhase: activeTutorialType ? (runnerPhase === "exercising" ? "exercising" : "") : "",
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

  // 載入教學狀態
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await tutorialService.getStatus();
        setStatusData(data);
      } catch (error) {
        Alert.alert("載入失敗", handleApiError(error), [
          { text: "返回", onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadStatus();

    return () => clearDisplayTimer();
  }, [router]);

  // 教學展示階段：播放音檔 + 音檔播完後 3秒倒數
  useEffect(() => {
    if (runnerPhase === "teaching" && word && activeTutorialType === "learn") {
      let cancelled = false;
      setDisplayRemainingMs(DISPLAY_DURATION);

      const startTeaching = async () => {
        await speak(word.word, getAssetUrl(word.audio_url));
        trackingService.audioPlayed("tutorial", word.id, "auto");
        if (cancelled) return;

        const start = Date.now();
        setDisplayRemainingMs(DISPLAY_DURATION);

        displayTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - start;
          const remaining = Math.max(0, DISPLAY_DURATION - elapsed);
          setDisplayRemainingMs(remaining);

          if (remaining <= 0) {
            clearDisplayTimer();
            completeItem("learn");
          }
        }, COUNTDOWN_INTERVAL);
      };
      startTeaching();

      return () => {
        cancelled = true;
        clearDisplayTimer();
      };
    }

    return () => clearDisplayTimer();
  }, [runnerPhase, word, speak, activeTutorialType, completeItem]);

  // 聽力題：在 question 階段播放音檔，播完後啟動倒數
  useEffect(() => {
    if (
      runnerPhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      activeStep?.type.startsWith("listening") &&
      word
    ) {
      let cancelled = false;
      const playAndStart = async () => {
        await speak(word.word, getAssetUrl(word.audio_url));
        trackingService.audioPlayed("tutorial", word.id, "auto");
        if (!cancelled) exerciseFlow.startQuestionCountdown();
      };
      playAndStart();
      return () => { cancelled = true; };
    }
  }, [runnerPhase, exerciseFlow.phase, activeStep, word, speak]);

  // 從 Intro 開始項目
  const startFromIntro = () => {
    if (!activeTutorialType) return;

    sessionStartTimeRef.current = Date.now();

    if (activeTutorialType === "learn") {
      setRunnerPhase("teaching");
    } else {
      setRunnerPhase("exercising");
      exerciseFlow.reset();
      const isSpeakingType = activeStep?.type.startsWith("speaking") ?? false;
      const isListeningType = activeStep?.type.startsWith("listening") ?? false;
      exerciseFlow.start({ delayOptionsCountdown: isSpeakingType, delayQuestionCountdown: isListeningType });
    }
  };

  // 返回（列表或首頁）
  const handleBack = () => {
    if (activeTutorialType) {
      // 正在進行項目，顯示確認
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
            trackingService.exerciseAbandon("tutorial", 0, 1, durationMs);
            returnToList();
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  // 點選列表項目
  const handleItemPress = (type: TutorialItemType) => {
    trackingService.buttonTap(`tutorial_item_${type}`, "tutorial_list");
    setActiveTutorialType(type);
    setRunnerPhase("intro");
  };

  // === 渲染 ===

  if (isLoading) {
    return <ExerciseLoading />;
  }

  // 列表模式
  if (activeTutorialType === null) {
    return (
      <SafeAreaView style={listStyles.container}>
        {/* Header */}
        <View style={listStyles.header}>
          <TouchableOpacity style={listStyles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={listStyles.headerTitle}>使用教學</Text>
          <View style={listStyles.headerSpacer} />
        </View>

        <ScrollView
          style={listStyles.scrollView}
          contentContainerStyle={[
            listStyles.scrollContent,
            contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" } : null,
          ]}
        >
          {TUTORIAL_ITEMS_CONFIG.map((config) => {
            const item = statusData?.items.find((i) => i.type === config.type);
            const completed = item?.completed ?? false;

            return (
              <TouchableOpacity
                key={config.type}
                style={listStyles.itemCard}
                onPress={() => handleItemPress(config.type)}
                activeOpacity={0.7}
              >
                <View style={listStyles.itemIcon}>
                  {getItemIcon(config.type)}
                </View>
                <View style={listStyles.itemContent}>
                  <Text style={listStyles.itemLabel}>{config.label}</Text>
                  <Text style={listStyles.itemDescription}>{config.description}</Text>
                </View>
                {completed && (
                  <View style={listStyles.checkBadge}>
                    <Check size={16} color={colors.successForeground} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Runner 模式：Intro 畫面
  if (runnerPhase === "intro") {
    const introKey = activeTutorialType === "learn" ? "teaching" : activeTutorialType;
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

  // Runner 模式：Learn 教學展示
  if (runnerPhase === "teaching" && activeTutorialType === "learn" && word) {
    return (
      <SafeAreaView style={exerciseCommonStyles.container}>
        {/* 簡易 Header */}
        <View style={listStyles.header}>
          <TouchableOpacity style={listStyles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={listStyles.headerTitle}>學習</Text>
          <View style={listStyles.headerSpacer} />
        </View>

        <View style={[exerciseCommonStyles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" } : null]}>
          <View style={exerciseCommonStyles.displayContainer}>
            <CountdownText remainingMs={displayRemainingMs} />

            {word.image_url && (
              <Image
                source={{ uri: getAssetUrl(word.image_url) || undefined }}
                style={exerciseCommonStyles.wordImage}
                resizeMode="contain"
              />
            )}

            <Text style={exerciseCommonStyles.wordText}>{word.word}</Text>
            <Text style={exerciseCommonStyles.translationText}>{word.translation}</Text>

            <View style={exerciseCommonStyles.audioStatus}>
              <Volume2
                size={24}
                color={isSpeaking ? colors.success : colors.mutedForeground}
              />
              <Text style={exerciseCommonStyles.audioStatusText}>
                {isSpeaking ? "播放中..." : "已播放"}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Runner 模式：練習階段
  if (runnerPhase === "exercising" && activeStep && word) {
    const exerciseCategory = getExerciseCategory(activeStep.type);

    const renderExercise = () => {
      if (exerciseCategory === "reading") {
        return (
          <ReadingExercise
            word={word.word}
            options={activeStep.options}
            correctIndex={activeStep.correct_index}
            phase={exerciseFlow.phase}
            remainingMs={exerciseFlow.remainingMs}
            selectedIndex={exerciseFlow.selectedIndex}
            onSelect={exerciseFlow.select}
            exerciseType={activeStep.type}
          />
        );
      }

      if (exerciseCategory === "listening") {
        return (
          <ListeningExercise
            options={activeStep.options}
            correctIndex={activeStep.correct_index}
            phase={exerciseFlow.phase}
            remainingMs={exerciseFlow.remainingMs}
            selectedIndex={exerciseFlow.selectedIndex}
            onSelect={exerciseFlow.select}
            exerciseType={activeStep.type}
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
            exerciseType={activeStep.type}
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
      <SafeAreaView style={exerciseCommonStyles.container}>
        {/* 簡易 Header */}
        <View style={listStyles.header}>
          <TouchableOpacity style={listStyles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={listStyles.headerTitle}>
            {TUTORIAL_ITEMS_CONFIG.find((c) => c.type === activeTutorialType)?.label ?? "教學"}
          </Text>
          <View style={listStyles.headerSpacer} />
        </View>

        <View style={[exerciseCommonStyles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" } : null]}>
          {renderExercise()}
        </View>
      </SafeAreaView>
    );
  }

  // Fallback
  return <ExerciseLoading />;
}

const listStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
