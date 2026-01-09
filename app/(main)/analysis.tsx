import { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet,
    useWindowDimensions,
    ScrollView,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { analysisService } from "../../services/analysisService";
import { handleApiError, getAssetUrl } from "../../services/api";
import type { LevelAnalysisExerciseSchema } from "../../types/api";
import { ArrowLeft, Check, X, Sparkles } from "lucide-react-native";
import { colors } from "../../lib/tw";
import { LevelAnalysisLogic } from "../../utils/level-analysis-logic";
import { CountdownText } from "../../components/ui/CountdownText";

type Phase = "loading" | "intro" | "q0" | "exercise" | "result" | "submitting";

const Q0_OPTIONS = [
    { id: 1, text: "我沒有學過", sub: "從最基礎開始" },
    { id: 2, text: "初級：我能理解最常見的生活/校園單字，但閱讀常卡字", sub: "" },
    { id: 3, text: "中級：我能理解課堂常見與一般文章不少單字，能猜部分字義", sub: "" },
    { id: 4, text: "中高級：我能理解較抽象與較難單字，閱讀多數單字可掌握", sub: "" },
];

const EXERCISE_DURATION = 5000; // 答題時間 5 秒
const COUNTDOWN_INTERVAL = 50; // 更新間隔 50ms

export default function AnalysisScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWideScreen = width > 600;
    const contentMaxWidth = isWideScreen ? 480 : undefined;

    const [phase, setPhase] = useState<Phase>("loading");
    const [exercises, setExercises] = useState<LevelAnalysisExerciseSchema[]>([]);
    const [currentExercise, setCurrentExercise] = useState<LevelAnalysisExerciseSchema | null>(null);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [remainingMs, setRemainingMs] = useState(EXERCISE_DURATION);
    const logicRef = useRef<LevelAnalysisLogic | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const loadData = useCallback(async () => {
        try {
            const data = await analysisService.getSession();
            setExercises(data.exercises);
            logicRef.current = new LevelAnalysisLogic(data.exercises);
            setPhase("intro");
        } catch (error) {
            Alert.alert("載入失敗", handleApiError(error), [
                { text: "返回", onPress: () => router.back() },
            ]);
        }
    }, [router]);

    useEffect(() => {
        loadData();
        return () => clearTimers();
    }, [loadData]);

    // 練習階段倒數計時
    useEffect(() => {
        if (phase === "exercise" && currentExercise) {
            const start = Date.now();
            setRemainingMs(EXERCISE_DURATION);

            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - start;
                const remaining = Math.max(0, EXERCISE_DURATION - elapsed);
                setRemainingMs(remaining);

                if (remaining <= 0) {
                    clearTimers();
                    handleTimeout();
                }
            }, COUNTDOWN_INTERVAL);
        }

        return () => clearTimers();
    }, [phase, currentExercise]);

    const handleTimeout = () => {
        if (selectedOptionIndex !== null || !logicRef.current || !currentExercise) return;

        setSelectedOptionIndex(-1);
        setPhase("result");

        setTimeout(async () => {
            if (!logicRef.current || !currentExercise) return;
            const finished = logicRef.current.handleAnswer(currentExercise.level_order, false);
            if (finished) {
                const state = logicRef.current.getState();
                submitResult(state.finalLevel!);
            } else {
                nextQuestion();
            }
        }, 1500);
    };

    const handleStartQ0 = () => setPhase("q0");

    const handleQ0Select = (id: number) => {
        if (!logicRef.current) return;
        const { finished, level } = logicRef.current.handleQ0(id);
        if (finished) {
            submitResult(level!);
        } else {
            nextQuestion();
        }
    };

    const nextQuestion = () => {
        if (!logicRef.current) return;
        const nextEx = logicRef.current.getNextQuestion();
        if (nextEx) {
            setCurrentExercise(nextEx);
            setSelectedOptionIndex(null);
            setPhase("exercise");
        } else {
            const state = logicRef.current.getState();
            if (state.finalLevel) {
                submitResult(state.finalLevel);
            }
        }
    };

    const handleOptionSelect = (index: number) => {
        if (selectedOptionIndex !== null || !logicRef.current || !currentExercise) return;

        clearTimers();
        setSelectedOptionIndex(index);
        const correct = index === currentExercise.correct_index;

        setPhase("result");

        setTimeout(async () => {
            if (!logicRef.current || !currentExercise) return;
            const finished = logicRef.current.handleAnswer(currentExercise.level_order, correct);
            if (finished) {
                const state = logicRef.current.getState();
                submitResult(state.finalLevel!);
            } else {
                nextQuestion();
            }
        }, 1500);
    };

    const submitResult = async (levelOrder: number) => {
        setPhase("submitting");
        try {
            await analysisService.submit(levelOrder);
            router.replace("/(main)");
        } catch (error) {
            Alert.alert("提交失敗", handleApiError(error), [
                { text: "返回首頁", onPress: () => router.replace("/(main)") },
            ]);
        }
    };

    const handleBack = () => {
        clearTimers();
        Alert.alert("確定離開？", "分析進度將不會保存", [
            { text: "取消", style: "cancel" },
            { text: "離開", style: "destructive", onPress: () => router.back() },
        ]);
    };

    if (phase === "loading") {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>初始化程度分析...</Text>
            </SafeAreaView>
        );
    }

    if (phase === "submitting") {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Sparkles size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text style={styles.submittingTitle}>分析完成！</Text>
                <Text style={styles.loadingText}>正在為您量身打造學習計畫...</Text>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
            </SafeAreaView>
        );
    }

    if (phase === "intro") {
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

    if (phase === "q0") {
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
                        {/* 倒數計時 */}
                        {phase === "exercise" && (
                            <CountdownText remainingMs={remainingMs} />
                        )}

                        {/* 超時提示 */}
                        {phase === "result" && selectedOptionIndex === -1 && (
                            <Text style={styles.timeoutText}>時間到！</Text>
                        )}

                        {/* Question Word */}
                        <Text style={styles.exerciseWordText}>
                            {currentExercise.word}
                        </Text>

                        <Text style={styles.exerciseHintText}>選出正確的翻譯</Text>

                        <View style={styles.optionsContainer}>
                            {currentExercise.options.map((option, index) => {
                                const isSelected = selectedOptionIndex === index;
                                const isCorrectOption = index === currentExercise.correct_index;
                                const showResult = phase === "result";

                                let optionStyle = [styles.optionButton, styles.optionDefault];
                                if (showResult) {
                                    if (isCorrectOption) {
                                        optionStyle = [styles.optionButton, styles.optionCorrect];
                                    } else if (isSelected && !isCorrectOption) {
                                        optionStyle = [styles.optionButton, styles.optionWrong];
                                    }
                                } else if (isSelected) {
                                    optionStyle = [styles.optionButton, styles.optionSelected];
                                }

                                return (
                                    <TouchableOpacity
                                        key={option.word_id}
                                        style={optionStyle}
                                        onPress={() => handleOptionSelect(index)}
                                        disabled={showResult}
                                    >
                                        {option.image_url && (
                                            <Image
                                                source={{ uri: getAssetUrl(option.image_url) || undefined }}
                                                style={styles.optionImage}
                                                resizeMode="contain"
                                            />
                                        )}
                                        <Text style={styles.optionText}>{option.translation}</Text>
                                        {showResult && isCorrectOption && <Check size={24} color={colors.success} />}
                                        {showResult && isSelected && !isCorrectOption && <X size={24} color={colors.destructive} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
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
    optionsContainer: {
        width: "100%",
        gap: 12,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    optionDefault: {
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    optionSelected: {
        backgroundColor: `${colors.primary}1A`,
        borderColor: colors.primary,
    },
    optionCorrect: {
        backgroundColor: `${colors.success}33`,
        borderColor: colors.success,
    },
    optionWrong: {
        backgroundColor: `${colors.destructive}33`,
        borderColor: colors.destructive,
    },
    optionImage: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: colors.muted,
        marginRight: 16,
    },
    optionText: {
        fontSize: 18,
        color: colors.foreground,
        flex: 1,
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
