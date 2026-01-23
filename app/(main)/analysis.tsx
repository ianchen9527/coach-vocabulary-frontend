import { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    useWindowDimensions,
    ScrollView,
} from "react-native";
import { Alert } from "../../components/ui/Alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { analysisService } from "../../services/analysisService";
import { handleApiError } from "../../services/api";
import { trackingService } from "../../services/trackingService";
import type { LevelAnalysisExerciseSchema } from "../../types/api";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import { colors } from "../../lib/tw";
import { LevelAnalysisLogic } from "../../utils/level-analysis-logic";
import { CountdownText } from "../../components/ui/CountdownText";
import { ExerciseOptions } from "../../components/exercise";
import { useExerciseFlow } from "../../hooks/useExerciseFlow";

type PagePhase = "loading" | "intro" | "q0" | "exercising" | "submitting";

const Q0_OPTIONS = [
    { id: 1, text: "我沒有學過", sub: "從最基礎開始" },
    { id: 2, text: "初級：我能理解最常見的生活/校園單字，但閱讀常卡字", sub: "" },
    { id: 3, text: "中級：我能理解課堂常見與一般文章不少單字，能猜部分字義", sub: "" },
    { id: 4, text: "中高級：我能理解較抽象與較難單字，閱讀多數單字可掌握", sub: "" },
];

export default function AnalysisScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWideScreen = width > 600;
    const contentMaxWidth = isWideScreen ? 480 : undefined;

    const [pagePhase, setPagePhase] = useState<PagePhase>("loading");
    const [exercises, setExercises] = useState<LevelAnalysisExerciseSchema[]>([]);
    const [currentExercise, setCurrentExercise] = useState<LevelAnalysisExerciseSchema | null>(null);
    const logicRef = useRef<LevelAnalysisLogic | null>(null);
    const sessionStartTimeRef = useRef<number>(Date.now());
    const answersRef = useRef<{ correct: boolean }[]>([]);

    // 進入下一題或完成
    const nextQuestion = useCallback(() => {
        if (!logicRef.current) return;
        const nextEx = logicRef.current.getNextQuestion();
        if (nextEx) {
            setCurrentExercise(nextEx);
            exerciseFlow.reset();
            setPagePhase("exercising");
            // 需要在下一個 tick 啟動，讓 currentExercise 更新
            setTimeout(() => exerciseFlow.start(), 0);
        } else {
            const state = logicRef.current.getState();
            if (state.finalLevel) {
                submitResult(state.finalLevel);
            }
        }
    }, []);

    // 提交結果
    const submitResult = async (levelOrder: number) => {
        setPagePhase("submitting");

        // 追蹤分析完成
        const durationMs = Date.now() - sessionStartTimeRef.current;
        const correctCount = answersRef.current.filter((a) => a.correct).length;
        trackingService.exerciseComplete("analysis", answersRef.current.length, correctCount, durationMs);

        try {
            await analysisService.submit(levelOrder);
            router.replace("/(main)");
        } catch (error) {
            Alert.alert("提交失敗", handleApiError(error), [
                { text: "返回首頁", onPress: () => router.replace("/(main)") },
            ]);
        }
    };

    // 使用共用的答題流程 Hook
    const exerciseFlow = useExerciseFlow({
        onQuestionShown: () => {
            if (currentExercise) {
                trackingService.questionShown("analysis", currentExercise.word_id, currentExercise.type, answersRef.current.length);
            }
        },
        onAnswerPhaseStarted: () => {
            if (currentExercise) {
                trackingService.answerPhaseStarted("analysis", currentExercise.word_id, currentExercise.type);
            }
        },
    }, () => {
        // 處理答案
        if (!logicRef.current || !currentExercise) return;
        const correct = exerciseFlow.selectedIndex === currentExercise.correct_index;
        const responseTimeMs = exerciseFlow.getResponseTimeMs() ?? undefined;

        // 追蹤答題
        trackingService.exerciseAnswer(
            "analysis",
            currentExercise.word_id,
            currentExercise.type,
            correct,
            responseTimeMs
        );
        answersRef.current.push({ correct });

        const finished = logicRef.current.handleAnswer(currentExercise.level_order, correct);
        if (finished) {
            const state = logicRef.current.getState();
            submitResult(state.finalLevel!);
        } else {
            nextQuestion();
        }
    });

    const loadData = useCallback(async () => {
        try {
            const data = await analysisService.getSession();
            setExercises(data.exercises);
            logicRef.current = new LevelAnalysisLogic(data.exercises);
            setPagePhase("intro");

            // 追蹤分析開始
            sessionStartTimeRef.current = Date.now();
            trackingService.exerciseStart("analysis", 10); // 最多 10 題
        } catch (error) {
            Alert.alert("載入失敗", handleApiError(error), [
                { text: "返回", onPress: () => router.back() },
            ]);
        }
    }, [router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStartQ0 = () => setPagePhase("q0");

    const handleQ0Select = (id: number) => {
        if (!logicRef.current) return;
        const { finished, level } = logicRef.current.handleQ0(id);
        if (finished) {
            submitResult(level!);
        } else {
            nextQuestion();
        }
    };

    const handleBack = () => {
        exerciseFlow.clearTimer();
        Alert.alert("確定離開？", "分析進度將不會保存", [
            { text: "取消", style: "cancel" },
            {
                text: "離開",
                style: "destructive",
                onPress: () => {
                    // 追蹤分析放棄
                    const durationMs = Date.now() - sessionStartTimeRef.current;
                    trackingService.exerciseAbandon("analysis", answersRef.current.length, 10, durationMs);
                    router.back();
                },
            },
        ]);
    };

    if (pagePhase === "loading") {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>初始化程度分析...</Text>
            </SafeAreaView>
        );
    }

    if (pagePhase === "submitting") {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Sparkles size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text style={styles.submittingTitle}>分析完成！</Text>
                <Text style={styles.loadingText}>正在為您量身打造學習計畫...</Text>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
            </SafeAreaView>
        );
    }

    if (pagePhase === "intro") {
        return (
            <SafeAreaView style={styles.introContainer}>
                <View style={styles.introIconContainer}>
                    <Sparkles size={48} color={colors.primary} />
                </View>
                <Text style={styles.introTitle}>程度分析</Text>
                <Text style={styles.introSubtitle}>
                    這是一個簡單的測驗，大約需要 3-5 分鐘。{"\n"}
                    我們將根據您的表現為您安排合適的單字。
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={handleStartQ0}>
                    <Text style={styles.primaryButtonText}>開始分析</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (pagePhase === "q0") {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>自我評估</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
                    <Text style={styles.q0Title}>請選擇最符合您目前單字程度的描述</Text>
                    <Text style={styles.q0Subtitle}>這將用來安排初始題目的難度，不影響最終成績。</Text>
                    <View style={styles.q0Options}>
                        {Q0_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={styles.q0Option}
                                onPress={() => handleQ0Select(opt.id)}
                            >
                                <Text style={styles.q0OptionText}>{opt.text}</Text>
                                {opt.sub ? <Text style={styles.q0OptionSubText}>{opt.sub}</Text> : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const state = logicRef.current?.getState();
    const currentQNumber = (state?.qCount || 0) + 1;
    const history = state?.history || [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    分析中 {currentQNumber} / 10
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Progress Bar - Aligned with review.tsx */}
            <View style={styles.progressBarContainer}>
                {history.map((answer, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressBarItem,
                            answer.correct ? styles.progressSuccess : styles.progressDestructive,
                        ]}
                    />
                ))}
                {Array.from({ length: 10 - history.length }).map((_, i) => (
                    <View
                        key={`pending-${i}`}
                        style={[
                            styles.progressBarItem,
                            i === 0 ? styles.progressPrimary : styles.progressMuted,
                        ]}
                    />
                ))}
            </View>

            <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
                {currentExercise && (
                    <View style={styles.exerciseContainer}>
                        {/* 題目階段：顯示單字，倒數計時 */}
                        {exerciseFlow.phase === "question" && (
                            <>
                                <CountdownText remainingMs={exerciseFlow.remainingMs} />
                                <Text style={styles.exerciseWordText}>
                                    {currentExercise.word}
                                </Text>
                                <Text style={styles.exerciseHintText}>準備作答...</Text>
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
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    loadingText: {
        color: colors.mutedForeground,
        marginTop: 16,
        textAlign: "center",
    },
    submittingTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.foreground,
        marginTop: 16,
    },
    introContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    introIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: `${colors.primary}33`,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    introTitle: {
        fontSize: 30,
        fontWeight: "bold",
        color: colors.foreground,
        marginBottom: 16,
    },
    introSubtitle: {
        fontSize: 18,
        color: colors.mutedForeground,
        textAlign: "center",
        lineHeight: 26,
        marginBottom: 32,
    },
    introList: {
        width: "100%",
        marginBottom: 40,
        gap: 12,
    },
    introListItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    introListDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    introListText: {
        fontSize: 16,
        color: colors.foreground,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.foreground,
    },
    headerSpacer: {
        width: 40,
    },
    // Aligned with review.tsx progress bar
    progressBarContainer: {
        flexDirection: "row",
        gap: 4,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    progressBarItem: {
        flex: 1,
        height: 8,
        borderRadius: 9999,
    },
    progressSuccess: {
        backgroundColor: colors.success,
    },
    progressDestructive: {
        backgroundColor: colors.destructive,
    },
    progressPrimary: {
        backgroundColor: colors.primary,
    },
    progressMuted: {
        backgroundColor: colors.muted,
    },
    q0Content: {
        padding: 24,
        paddingBottom: 40,
    },
    q0Title: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.foreground,
        marginBottom: 12,
    },
    q0Subtitle: {
        fontSize: 16,
        color: colors.mutedForeground,
        marginBottom: 32,
        lineHeight: 24,
    },
    q0Options: {
        gap: 16,
    },
    q0Option: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    q0OptionText: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.foreground,
    },
    q0OptionSubText: {
        fontSize: 14,
        color: colors.mutedForeground,
        marginTop: 4,
        lineHeight: 20,
    },
    contentContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    exerciseContainer: {
        width: "100%",
        alignItems: "center",
    },
    exerciseWordText: {
        fontSize: 36,
        fontWeight: "bold",
        color: colors.foreground,
        marginBottom: 12,
    },
    timeoutText: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.destructive,
        marginBottom: 16,
    },
    exerciseHintText: {
        fontSize: 18,
        color: colors.mutedForeground,
        marginBottom: 32,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: colors.primaryForeground,
        fontSize: 18,
        fontWeight: "bold",
    },
});
