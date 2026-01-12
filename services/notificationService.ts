import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 設定通知處理方式（當 App 在前台時）
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    /**
     * 請求推播通知權限
     */
    async requestPermissions() {
        if (Platform.OS === "web") {
            console.log("[Web] Notification permissions are always granted or handled by browser.");
            return false;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            return false;
        }

        return true;
    },

    /**
     * 預約下次練習的通知（會先取消所有已預約的通知）
     * @param nextAvailableTime ISO 時間字串
     */
    async scheduleNextSessionNotification(nextAvailableTime: string | null) {
        if (!nextAvailableTime) {
            await this.cancelAllNotifications();
            return;
        }

        // 1. 先取消所有舊的通知，確保只有一個提醒
        await this.cancelAllNotifications();

        const triggerDate = new Date(nextAvailableTime);
        const now = new Date();
        const secondsUntilTrigger = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);

        // 如果時間已經過了，就不預約
        if (secondsUntilTrigger <= 0) {
            return;
        }

        // 2. 預約新的通知
        try {
            if (Platform.OS === "web") {
                console.log(`[Web] Notification would be scheduled for: ${new Date(triggerDate).toLocaleString()}`);
                return;
            } else {

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "單字教練提醒",
                        body: "新的學習任務已經準備好了，趕快回來練習吧！",
                        data: { url: "/(main)" },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: triggerDate,
                    },
                });
                console.log(`Notification scheduled for: ${triggerDate.toLocaleString()}`);
            }
        } catch (error) {
            console.error("Failed to schedule notification:", error);
        }
    },

    /**
     * 取消所有已預約的通知
     */
    async cancelAllNotifications() {
        if (Platform.OS === "web") {
            console.log("[Web] All notifications would be cancelled.");
            return;
        }
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log("All scheduled notifications cancelled.");
    },
};
