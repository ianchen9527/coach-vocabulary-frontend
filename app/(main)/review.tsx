import { useState, useEffect, useRef } from "react";
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
import { reviewService } from "../../services/reviewService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { ReviewSessionResponse, AnswerSchema } from "../../types/api";
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
  const exerciseFlow = useExerciseFlow({}, () => {
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

  // 聽力題：在 question 階段播放音檔
  useEffect(() => {
    if (
      pagePhase === "exercising" &&
      exerciseFlow.phase === "question" &&
      currentExercise?.type.startsWith("listening") &&
      currentWord
    ) {
      speak(currentWord.word, getAssetUrl(currentWord.audio_url));
    }
  }, [pagePhase, exerciseFlow.phase, currentExercise, currentWord, speak]);

  // 從 intro 進入 display
  const startFromIntro = () => {
    setPagePhase("display");
  };

  // 進入答題階段
  const goToExercise = () => {
    setPagePhase("exercising");
    // 口說題：延遲 options 倒數，等錄音準備好再開始
    const isSpeakingExercise = currentExercise?.type.startsWith("speaking") ?? false;
    exerciseFlow.start(isSpeakingExercise);
  };

  // 完成複習
  const completeSession = async () => {
    setPagePhase("complete");

    try {
      const wordIds = words.map((w) => w.id);
      await reviewService.complete(wordIds, answersRef.current);
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
        title="複習完成！"
        subtitle={`答對 ${correctCount} / ${totalWords} 題`}
        onBack={() => router.replace("/(main)")}
      />
    );
  }

  if (pagePhase === "intro") {
    return (
      <SafeAreaView style={styles.introContainer}>
        <Text style={styles.introTitle}>
          {getExerciseTitle(currentExerciseType, "review")}
        </Text>
        <Text style={styles.introSubtitle}>
          先複習單字，再進行測驗
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={startFromIntro}
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

            {/* 題目階段：顯示單字，倒數計時 */}
            {exerciseFlow.phase === "question" && (
              <>
                <CountdownText remainingMs={exerciseFlow.remainingMs} />
                {currentExercise.type.startsWith("reading") && (
                  <>
                    <Text style={styles.exerciseWordText}>
                      {currentWord.word}
                    </Text>
                    <Text style={styles.exerciseHintText}>
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
                    {currentExercise.type === "speaking_lv1" && currentWord.image_url && (
                      <Image
                        source={{ uri: getAssetUrl(currentWord.image_url) || undefined }}
                        style={styles.speakingImage}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.speakingWord}>
                      {currentWord.translation}
                    </Text>
                    <Text style={styles.speakingInstruction}>
                      準備作答...
                    </Text>
                  </>
                )}
              </>
            )}

            {/* 選項階段：顯示選項，倒數計時 */}
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
                correctAnswer={currentWord.word}
                isVerifying={true}
              />
            )}

            {/* 結果階段：顯示正確答案 */}
            {exerciseFlow.phase === "result" && (
              <>
                {currentExercise.type.startsWith("speaking") ? (
                  <SpeakingResult
                    isCorrect={speakingExercise.isCorrect}
                    recognizedText={speakingExercise.recognizedText}
                    correctAnswer={currentWord.word}
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
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
