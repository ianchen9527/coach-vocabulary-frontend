import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timer, CalendarClock } from "lucide-react-native";
import { STORAGE_KEYS } from "../../services/api";
import { colors } from "../../lib/tw";

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const ICON_SIZE = 64;

const slides: Slide[] = [
  {
    icon: <Timer size={ICON_SIZE} color={colors.primary} />,
    title: "真正記住一個單字",
    body: "真正掌握一個單字，代表你能在瞬間認出它的意思。Attain在測驗中加入計時機制，幫助你訓練即時反應能力。",
  },
  {
    icon: <CalendarClock size={ICON_SIZE} color={colors.primary} />,
    title: "科學化複習排程",
    body: "根據遺忘曲線，Attain會在最佳時機安排複習，並搭配不同的練習方式: 閱讀、聽力、口說，全方位強化學習。",
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 400 : undefined;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      setActiveIndex(index);
    },
    [width]
  );

  const scrollToNext = useCallback(() => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < slides.length) {
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, width]);

  const handleComplete = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, "true");
    router.replace("/(auth)/login");
  }, [router]);

  const isLastSlide = activeIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.flex1}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          {slides.map((slide, index) => (
            <View key={index} style={[styles.slide, { width }]}>
              <View
                style={[
                  styles.slideContent,
                  contentMaxWidth
                    ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" as const }
                    : null,
                ]}
              >
                <View style={styles.iconCircle}>{slide.icon}</View>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 底部：分頁點 + 按鈕 */}
      <View
        style={[
          styles.footer,
          contentMaxWidth
            ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" as const }
            : null,
        ]}
      >
        {/* 分頁指示點 */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* 按鈕 */}
        <TouchableOpacity
          style={styles.button}
          onPress={isLastSlide ? handleComplete : scrollToNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? "開始使用" : "下一步"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex1: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: "center",
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },
});
