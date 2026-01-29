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
import { trackingService } from "../../services/trackingService";
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
  Settings,
  ChevronLeft,
  GraduationCap,
  Check,
} from "lucide-react-native";
import { colors } from "../../lib/tw";
import { DEBUG_MODE } from "../../lib/config";
import { notificationService } from "../../services/notificationService";
import { permissionService } from "../../services/permissionService";
import { PermissionModal } from "../../components/ui/PermissionModal";
import { BottomSheet, BottomSheetItem } from "../../components/ui/BottomSheet";
import { DeleteAccountModal } from "../../components/ui/DeleteAccountModal";
import { refreshSignal } from "../../utils/refreshSignal";

const DAILY_LEARN_LIMIT = 50;

type ActionType = "review" | "practice" | "learn" | "tutorial" | null;
type BottomSheetStage = "main" | "account";

export default function HomeScreen() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetStage, setBottomSheetStage] = useState<BottomSheetStage>("main");
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

    // 追蹤權限回應
    trackingService.permissionResponse("microphone", granted ? "granted" : "denied");

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

    // 追蹤權限回應
    trackingService.permissionResponse("microphone", "dismissed");

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

    // 追蹤權限回應
    trackingService.permissionResponse("notification", granted ? "granted" : "denied");
  };

  const handleNotificationModalDismiss = async () => {
    await permissionService.recordNotificationPermissionDismissal();
    setShowNotificationModal(false);

    // 追蹤權限回應
    trackingService.permissionResponse("notification", "dismissed");
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

  // 訂閱刷新信號（通知點擊時觸發）
  useEffect(() => {
    const unsubscribe = refreshSignal.subscribe(() => {
      fetchStats();
    });
    return unsubscribe;
  }, [fetchStats]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  // 檢查教學是否已完成
  const isTutorialCompleted = !!user?.vocabulary_tutorial_completed_at;

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
      case "tutorial":
        return "進行教學";
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

  const getActionIcon = (action: ActionType | "analysis", forSecondary = false) => {
    const iconColor = forSecondary ? colors.primary : colors.primaryForeground;
    const mutedColor = forSecondary ? colors.mutedForeground : colors.mutedForeground;
    switch (action) {
      case "analysis":
        return <Zap size={24} color={iconColor} />;
      case "tutorial":
        return <GraduationCap size={24} color={iconColor} />;
      case "review":
        return <RotateCcw size={24} color={iconColor} />;
      case "practice":
        return <Dumbbell size={24} color={iconColor} />;
      case "learn":
        return <BookOpen size={24} color={iconColor} />;
      default:
        return <Play size={24} color={mutedColor} />;
    }
  };

  const navigateToAction = (action: ActionType | "analysis" | null) => {
    if (!action) return;

    trackingService.buttonTap(`start_${action}`, "home");

    switch (action) {
      case "analysis":
        router.push("/(main)/analysis");
        break;
      case "tutorial":
        router.push("/(main)/tutorial");
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

  const handleStartAction = () => {
    navigateToAction(getNextAction());
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
              <Text style={styles.statLabel}>我的等級</Text>
              <Text style={styles.statValueForeground}>
                {stats?.current_level && stats?.current_category
                  ? `${stats.current_level.order}.${stats.current_category.order}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>今日單字</Text>
              <Text style={styles.statValuePrimary}>
                {stats?.today_learned || 0}
                <Text style={styles.statValueGoal}> / {DAILY_LEARN_LIMIT}</Text>
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>今日練習次數</Text>
              <Text style={styles.statValueAccent}>
                {stats?.today_completed || 0}
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

          {/* 主要按鈕 */}
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
          {nextAction && nextAction !== "tutorial" && (
            <Text style={styles.actionHint}>
              {nextAction === "analysis" && "請先完成程度分析以開啟學習任務"}
              {nextAction === "review" && `有 ${stats?.available_review} 個單字需要複習`}
              {nextAction === "practice" && `有 ${stats?.available_practice} 個單字可以練習`}
              {nextAction === "learn" && "開始學習新單字吧！"}
            </Text>
          )}

          {/* 次要按鈕 - 程度分析完成且教學未完成時顯示 */}
          {stats?.current_level !== null && !isTutorialCompleted && (
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => navigateToAction("tutorial")}
              activeOpacity={0.8}
            >
              {getActionIcon("tutorial", true)}
              <Text style={styles.secondaryActionButtonText}>
                {getActionLabel("tutorial")}
              </Text>
            </TouchableOpacity>
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
        onClose={() => {
          setShowBottomSheet(false);
          setBottomSheetStage("main");
        }}
      >
        {bottomSheetStage === "main" ? (
          <>
            <BottomSheetItem
              icon={<GraduationCap size={22} />}
              label="使用教學"
              onPress={() => {
                setShowBottomSheet(false);
                trackingService.buttonTap("tutorial", "drawer");
                router.push("/(main)/tutorial");
              }}
              rightElement={
                isTutorialCompleted ? (
                  <View style={styles.drawerBadge}>
                    <Check size={14} color={colors.successForeground} />
                  </View>
                ) : undefined
              }
            />
            <BottomSheetItem
              icon={<Settings size={22} />}
              label="帳號管理"
              onPress={() => setBottomSheetStage("account")}
            />
            <BottomSheetItem
              icon={<LogOut size={22} />}
              label="登出"
              onPress={handleLogout}
              variant="destructive"
            />
          </>
        ) : (
          <>
            <BottomSheetItem
              icon={<ChevronLeft size={22} />}
              label="返回"
              onPress={() => setBottomSheetStage("main")}
            />
            <BottomSheetItem
              icon={<Trash2 size={22} />}
              label="刪除帳號"
              onPress={handleDeleteAccountPress}
              variant="destructive"
            />
          </>
        )}
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
  statValueGoal: {
    fontSize: 16,
    fontWeight: "normal",
    color: colors.mutedForeground,
  },
  statValueAccent: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.accent,
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
  secondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  secondaryActionButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
    color: colors.primary,
  },
  drawerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
});
