import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { homeService } from "../../services/homeService";
import { handleApiError } from "../../services/api";
import type { StatsResponse } from "../../types/api";
import {
  BookOpen,
  Dumbbell,
  RotateCcw,
  Clock,
  LogOut,
} from "lucide-react-native";
import { colors } from "../../lib/tw";

export default function HomeScreen() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { username, logout } = useAuth();
  const router = useRouter();

  const fetchStats = useCallback(async () => {
    try {
      const data = await homeService.getStats();
      setStats(data);
    } catch (error) {
      const message = handleApiError(error);
      Alert.alert("載入失敗", message);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchStats();
      setIsLoading(false);
    };
    loadData();
  }, [fetchStats]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("登出", "確定要登出嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const formatNextAvailableTime = (isoString: string | null): string => {
    if (!isoString) return "";

    const nextTime = new Date(isoString);
    const now = new Date();
    const diffMs = nextTime.getTime() - now.getTime();

    if (diffMs <= 0) return "現在可用";

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      return `${diffHours} 小時 ${remainingMinutes} 分鐘後`;
    }

    return `${diffMinutes} 分鐘後`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              Coach Vocabulary
            </Text>
            <Text style={styles.headerSubtitle}>
              歡迎回來，{username}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <LogOut size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>今日學習</Text>
            <Text style={styles.statValueForeground}>
              {stats?.today_learned || 0}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>可練習</Text>
            <Text style={styles.statValuePrimary}>
              {stats?.available_practice || 0}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>待複習</Text>
            <Text style={styles.statValueWarning}>
              {stats?.available_review || 0}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              24h 後可練習
            </Text>
            <Text style={styles.statValueMuted}>
              {stats?.upcoming_24h || 0}
            </Text>
          </View>
        </View>

        {/* Next Available Time */}
        {stats?.next_available_time && (
          <View style={styles.nextAvailableContainer}>
            <Clock size={20} color={colors.accent} />
            <Text style={styles.nextAvailableText}>
              下次可練習：{formatNextAvailableTime(stats.next_available_time)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Learn Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              stats?.can_learn ? styles.actionButtonPrimary : styles.actionButtonMuted,
            ]}
            onPress={() => router.push("/(main)/learn")}
            disabled={!stats?.can_learn}
            activeOpacity={0.8}
          >
            <BookOpen
              size={24}
              color={stats?.can_learn ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.actionButtonText,
                stats?.can_learn
                  ? styles.actionButtonTextPrimary
                  : styles.actionButtonTextMuted,
              ]}
            >
              學習新單字
            </Text>
          </TouchableOpacity>

          {/* Practice Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              stats?.can_practice ? styles.actionButtonSecondary : styles.actionButtonMuted,
            ]}
            onPress={() => router.push("/(main)/practice")}
            disabled={!stats?.can_practice}
            activeOpacity={0.8}
          >
            <Dumbbell
              size={24}
              color={stats?.can_practice ? colors.secondaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.actionButtonText,
                stats?.can_practice
                  ? styles.actionButtonTextSecondary
                  : styles.actionButtonTextMuted,
              ]}
            >
              練習單字
            </Text>
          </TouchableOpacity>

          {/* Review Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              stats?.can_review ? styles.actionButtonAccent : styles.actionButtonMuted,
            ]}
            onPress={() => router.push("/(main)/review")}
            disabled={!stats?.can_review}
            activeOpacity={0.8}
          >
            <RotateCcw
              size={24}
              color={stats?.can_review ? colors.accentForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.actionButtonText,
                stats?.can_review
                  ? styles.actionButtonTextAccent
                  : styles.actionButtonTextMuted,
              ]}
            >
              複習單字
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Messages */}
        {!stats?.can_learn && !stats?.can_practice && !stats?.can_review && (
          <View style={styles.statusMessageContainer}>
            <Text style={styles.statusMessageText}>
              目前沒有可用的學習任務{"\n"}
              請稍後再來查看
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  statValueForeground: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.foreground,
  },
  statValuePrimary: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.primary,
  },
  statValueWarning: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.warning,
  },
  statValueMuted: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.mutedForeground,
  },
  nextAvailableContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent}1A`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nextAvailableText: {
    fontSize: 16,
    color: colors.accent,
    marginLeft: 8,
  },
  actionButtonsContainer: {
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.secondary,
  },
  actionButtonAccent: {
    backgroundColor: colors.accent,
  },
  actionButtonMuted: {
    backgroundColor: colors.muted,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
  },
  actionButtonTextPrimary: {
    color: colors.primaryForeground,
  },
  actionButtonTextSecondary: {
    color: colors.secondaryForeground,
  },
  actionButtonTextAccent: {
    color: colors.accentForeground,
  },
  actionButtonTextMuted: {
    color: colors.mutedForeground,
  },
  statusMessageContainer: {
    marginTop: 24,
    backgroundColor: `${colors.muted}80`,
    borderRadius: 12,
    padding: 16,
  },
  statusMessageText: {
    textAlign: "center",
    color: colors.mutedForeground,
  },
});
