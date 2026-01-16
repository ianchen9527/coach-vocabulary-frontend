import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Alert } from "../../components/ui/Alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { homeService } from "../../services/homeService";
import { adminService } from "../../services/adminService";
import { handleApiError } from "../../services/api";
import type { StatsResponse } from "../../types/api";
import {
  BookOpen,
  Dumbbell,
  RotateCcw,
  Clock,
  LogOut,
  Play,
  Zap,
  Mic,
  Bell,
  User,
  Trash2,
} from "lucide-react-native";
import { colors } from "../../lib/tw";
import { DEBUG_MODE } from "../../lib/config";
import { notificationService } from "../../services/notificationService";
import { permissionService } from "../../services/permissionService";
import { PermissionModal } from "../../components/ui/PermissionModal";
import { BottomSheet, BottomSheetItem } from "../../components/ui/BottomSheet";
import { DeleteAccountModal } from "../../components/ui/DeleteAccountModal";

type ActionType = "review" | "practice" | "learn" | null;

export default function HomeScreen() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // 寬螢幕時使用較窄的內容寬度
  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 480 : undefined;

  // 檢查是否需要顯示權限提示
  useEffect(() => {
    const checkPermissions = async () => {
      // Check microphone first
      const shouldShowMic =
        await permissionService.shouldShowMicPermissionPrompt();
      if (shouldShowMic) {
        setShowMicModal(true);
        return; // Show one at a time
      }

      // Then check notifications
      const shouldShowNotif =
        await permissionService.shouldShowNotificationPermissionPrompt();
      if (shouldShowNotif) {
        setShowNotificationModal(true);
      }
    };
    checkPermissions();
  }, []);

  // 麥克風權限 Modal 處理
  const handleMicModalAllow = async () => {
    const granted = await permissionService.requestMicPermission();
    if (granted) {
      await permissionService.recordMicPermissionGranted();
    }
    setShowMicModal(false);

    // Check if we should show notification modal next
    const shouldShowNotif =
      await permissionService.shouldShowNotificationPermissionPrompt();
    if (shouldShowNotif) {
      setShowNotificationModal(true);
    }
  };

  const handleMicModalDismiss = async () => {
    await permissionService.recordMicPermissionDismissal();
    setShowMicModal(false);

    // Still check notification modal
    const shouldShowNotif =
      await permissionService.shouldShowNotificationPermissionPrompt();
    if (shouldShowNotif) {
      setShowNotificationModal(true);
    }
  };

  // 通知權限 Modal 處理
  const handleNotificationModalAllow = async () => {
    const granted = await permissionService.requestNotificationPermission();
    if (granted) {
      await permissionService.recordNotificationPermissionGranted();
    }
    setShowNotificationModal(false);
  };

  const handleNotificationModalDismiss = async () => {
    await permissionService.recordNotificationPermissionDismissal();
    setShowNotificationModal(false);
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await homeService.getStats();
      setStats(data);

      // 自動預約或更新通知
      if (data.next_available_time) {
        notificationService.scheduleNextSessionNotification(data.next_available_time);
      } else {
        // 如果目前沒有等待中的任務，且也沒有下次時間，則取消現有通知
        notificationService.cancelAllNotifications();
      }
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

  // 決定主要按鈕的動作（優先順序：程度分析 > 複習 > 練習 > 學習）
  const getNextAction = (): ActionType | "analysis" => {
    if (!stats) return null;
    if (stats.current_level === null) return "analysis";
    if (stats.can_review) return "review";
    if (stats.can_practice) return "practice";
    if (stats.can_learn) return "learn";
    return null;
  };

  const getActionLabel = (action: ActionType | "analysis"): string => {
    switch (action) {
      case "analysis":
        return "分析程度";
      case "review":
        return "開始複習";
      case "practice":
        return "開始練習";
      case "learn":
        return "學習新單字";
      default:
        return "暫無可用任務";
    }
  };

  const getActionIcon = (action: ActionType | "analysis") => {
    switch (action) {
      case "analysis":
        return <Zap size={24} color={colors.primaryForeground} />;
      case "review":
        return <RotateCcw size={24} color={colors.primaryForeground} />;
      case "practice":
        return <Dumbbell size={24} color={colors.primaryForeground} />;
      case "learn":
        return <BookOpen size={24} color={colors.primaryForeground} />;
      default:
        return <Play size={24} color={colors.mutedForeground} />;
    }
  };

  const handleStartAction = () => {
    const action = getNextAction();
    switch (action) {
      case "analysis":
        router.push("/(main)/analysis");
        break;
      case "review":
        router.push("/(main)/review");
        break;
      case "practice":
        router.push("/(main)/practice");
        break;
      case "learn":
        router.push("/(main)/learn");
        break;
    }
  };

  const handleResetCooldown = async () => {
    setIsResetting(true);
    try {
      const result = await adminService.resetCooldown();

      // 重置成功後立即取消通知
      await notificationService.cancelAllNotifications();

      await fetchStats();
      Alert.alert(
        "重置成功",
        `已解除 ${result.words_affected} 個單字的冷卻時間`
      );
    } catch (error) {
      const message = handleApiError(error);
      Alert.alert("重置失敗", message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    setShowBottomSheet(false);
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

  const handleDeleteAccountPress = () => {
    setShowBottomSheet(false);
    setShowDeleteModal(true);
  };

  const handleDeleteModalCancel = () => {
    setShowDeleteModal(false);
  };

  const handleDeleteModalConfirm = () => {
    setShowDeleteModal(false);
    Alert.alert(
      "確認刪除？",
      "刪除後無法復原，確定要刪除帳號嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "確認刪除",
          style: "destructive",
          onPress: async () => {
            if (!user?.email) return;
            setIsDeleting(true);
            try {
              await deleteAccount(user.email);
              router.replace("/(auth)/login");
            } catch (error) {
              const message = handleApiError(error);
              Alert.alert("刪除失敗", message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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

  const nextAction = getNextAction();

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
        contentContainerStyle={[
          styles.scrollViewContent,
          isWideScreen && styles.scrollViewContentWide,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* 內容容器 - 在寬螢幕上居中且有最大寬度 */}
        <View style={[styles.contentWrapper, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                Attain
              </Text>
              <Text style={styles.headerSubtitle}>
                歡迎回來，{user?.username}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowBottomSheet(true)}
              style={styles.profileButton}
            >
              <User size={20} color={colors.mutedForeground} />
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
          </View>

          {/* Next Available Time */}
          {stats?.next_available_time && !nextAction && (
            <View style={styles.nextAvailableContainer}>
              <Clock size={20} color={colors.accent} />
              <Text style={styles.nextAvailableText}>
                下次可練習：{formatNextAvailableTime(stats.next_available_time)}
              </Text>
            </View>
          )}

          {/* 主要按鈕 - 開始練習 */}
          <TouchableOpacity
            style={[
              styles.mainActionButton,
              nextAction ? styles.mainActionButtonActive : styles.mainActionButtonDisabled,
            ]}
            onPress={handleStartAction}
            disabled={!nextAction}
            activeOpacity={0.8}
          >
            {getActionIcon(nextAction)}
            <Text
              style={[
                styles.mainActionButtonText,
                nextAction
                  ? styles.mainActionButtonTextActive
                  : styles.mainActionButtonTextDisabled,
              ]}
            >
              {getActionLabel(nextAction)}
            </Text>
          </TouchableOpacity>

          {/* 狀態提示 */}
          {nextAction && (
            <Text style={styles.actionHint}>
              {nextAction === "analysis" && "請先完成程度分析以開啟學習任務"}
              {nextAction === "review" && `有 ${stats?.available_review} 個單字需要複習`}
              {nextAction === "practice" && `有 ${stats?.available_practice} 個單字可以練習`}
              {nextAction === "learn" && "開始學習新單字吧！"}
            </Text>
          )}

          {/* Status Messages */}
          {!nextAction && (
            <View style={styles.statusMessageContainer}>
              <Text style={styles.statusMessageText}>
                目前沒有可用的學習任務{"\n"}
                請稍後再來查看
              </Text>
            </View>
          )}

          {/* 測試工具區（僅 debug 模式顯示） */}
          {DEBUG_MODE && (
            <View style={styles.devToolsContainer}>
              <Text style={styles.devToolsTitle}>測試工具</Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetCooldown}
                disabled={isResetting}
                activeOpacity={0.8}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color={colors.destructiveForeground} />
                ) : (
                  <Zap size={18} color={colors.destructiveForeground} />
                )}
                <Text style={styles.resetButtonText}>
                  {isResetting ? "重置中..." : "重置冷卻時間"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 語音權限 Modal */}
      <PermissionModal
        visible={showMicModal}
        icon={<Mic size={40} color={colors.primary} />}
        title="開啟語音權限"
        description="為了讓你練習口說發音，我們需要使用麥克風與語音辨識功能來聆聽並即時比對你說的單字是否正確。"
        benefit="這能幫助你更有效地練習英文口說！"
        onAllow={handleMicModalAllow}
        onDismiss={handleMicModalDismiss}
      />

      {/* 通知權限 Modal */}
      <PermissionModal
        visible={showNotificationModal}
        icon={<Bell size={40} color={colors.primary} />}
        title="開啟通知權限"
        description="開啟通知讓我們在你的學習任務準備好時提醒你。"
        benefit="根據科學記憶法，在最佳時間複習能大幅提升記憶效果，別錯過最佳學習時機！"
        onAllow={handleNotificationModalAllow}
        onDismiss={handleNotificationModalDismiss}
      />

      {/* 帳號選單 Bottom Sheet */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
      >
        <BottomSheetItem
          icon={<LogOut size={22} />}
          label="登出"
          onPress={handleLogout}
          variant="destructive"
        />
        <BottomSheetItem
          icon={<Trash2 size={22} />}
          label="刪除帳號"
          onPress={handleDeleteAccountPress}
        />
      </BottomSheet>

      {/* 刪除帳號確認 Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        userEmail={user?.email || ""}
        onCancel={handleDeleteModalCancel}
        onConfirm={handleDeleteModalConfirm}
        isLoading={isDeleting}
      />
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
  scrollViewContentWide: {
    paddingHorizontal: 32,
  },
  contentWrapper: {
    flex: 1,
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
  profileButton: {
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
    minWidth: "30%",
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
  mainActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 12,
  },
  mainActionButtonActive: {
    backgroundColor: colors.primary,
  },
  mainActionButtonDisabled: {
    backgroundColor: colors.muted,
  },
  mainActionButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
  },
  mainActionButtonTextActive: {
    color: colors.primaryForeground,
  },
  mainActionButtonTextDisabled: {
    color: colors.mutedForeground,
  },
  actionHint: {
    textAlign: "center",
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 24,
  },
  statusMessageContainer: {
    marginTop: 8,
    backgroundColor: `${colors.muted}80`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusMessageText: {
    textAlign: "center",
    color: colors.mutedForeground,
  },
  devToolsContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  devToolsTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.destructive,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.destructiveForeground,
    marginLeft: 8,
  },
});
