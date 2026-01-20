import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Alert } from "../../components/ui/Alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { practiceService } from "../../services/practiceService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { PracticeSessionResponse, AnswerSchema } from "../../types/api";
import { Volume2, Mic } from "lucide-react-native";
import { useSpeech } from "../../hooks/useSpeech";
import { useSpeakingExercise } from "../../hooks/useSpeakingExercise";
import { colors } from "../../lib/tw";
import { CountdownText } from "../../components/ui/CountdownText";
import {
  ExerciseHeader,
  ProgressBar,
  ExerciseOptions,
  ExerciseLoading,
  ExerciseComplete,
  SpeakingResult,
} from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";
import {
  getExerciseCategory,
  getExerciseTitle,
} from "../../utils/exerciseHelpers";
import { exerciseCommonStyles as styles } from "../../styles/exerciseStyles";


// 頁面階段：loading | intro | exercising | complete
type PagePhase = "loading" | "intro" | "exercising" | "complete";

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
        // 口說題：延遲 options 倒數，等錄音準備好再開始
        const isSpeakingExercise = nextExercise.type.startsWith("speaking");
        setTimeout(() => exerciseFlow.start(isSpeakingExercise), 0);
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

  // 開始練習（從 intro 進入）
  const startExercise = () => {
    setPagePhase("exercising");
    // 口說題：延遲 options 倒數，等錄音準備好再開始
    const isSpeakingExercise = currentExercise?.type.startsWith("speaking") ?? false;
    exerciseFlow.start(isSpeakingExercise);
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
    if (speakingExercise.isRecording) {
      speakingExercise.speechRecognition.abort();
    }
    Alert.alert("確定離開？", "練習進度將不會保存", [
      { text: "取消", style: "cancel" },
      { text: "離開", style: "destructive", onPress: () => router.back() },
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
        {currentExercise && (
          <View style={styles.exerciseContainer}>

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
                        {currentExercise.type === "speaking_lv1" && currentExercise.image_url && (
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
                    {currentExercise.type.startsWith("speaking") ? (
                      speakingExercise.isPreparingRecording ? (
                        // 準備錄音中：顯示 spinner
                        <View style={styles.preparingContainer}>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text style={styles.preparingText}>準備錄音中...</Text>
                        </View>
                      ) : (
                        // 錄音中：顯示倒數 + 錄音 UI
                        <>
                          <CountdownText remainingMs={exerciseFlow.remainingMs} />
                          {/* 錄音中圖示 */}
                          <View style={styles.recordingContainer}>
                            <View style={[styles.micButton, speakingExercise.isRecording && styles.micButtonActive]}>
                              <Mic size={48} color={speakingExercise.isRecording ? colors.destructive : colors.primary} />
                            </View>
                            {speakingExercise.isRecording && (
                              <View style={styles.recordingIndicator}>
                                <View style={styles.recordingDot} />
                                <Text style={styles.recordingText}>錄音中...</Text>
                              </View>
                            )}
                          </View>

                          {/* 即時辨識結果 */}
                          {speakingExercise.speechRecognition.interimTranscript && (
                            <View style={styles.transcriptBox}>
                              <Text style={styles.transcriptLabel}>辨識中：</Text>
                              <Text style={styles.transcriptText}>
                                "{speakingExercise.speechRecognition.interimTranscript}"
                              </Text>
                            </View>
                          )}

                          {/* 完成按鈕 */}
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={speakingExercise.handleStopRecording}
                            disabled={!speakingExercise.isRecording}
                          >
                            <Text style={styles.primaryButtonText}>完成</Text>
                          </TouchableOpacity>
                        </>
                      )
                    ) : (
                      // 非口說題：正常顯示
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
                  </>
                )}

                {/* 處理階段（口說題驗證中） */}
                {exerciseFlow.phase === "processing" && currentExercise.type.startsWith("speaking") && (
                  <SpeakingResult
                    isCorrect={false}
                    recognizedText=""
                    correctAnswer={currentExercise.word}
                    isVerifying={true}
                  />
                )}

                {/* 結果階段 */}
                {exerciseFlow.phase === "result" && (
                  <>
                    {currentExercise.type.startsWith("speaking") ? (
                      <SpeakingResult
                        isCorrect={speakingExercise.isCorrect}
                        recognizedText={speakingExercise.recognizedText}
                        correctAnswer={currentExercise.word}
                        isVerifying={false}
                      />
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
                          onSelect={() => { }}
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
