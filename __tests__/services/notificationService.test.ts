import { notificationService } from '../../services/notificationService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Mock modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestPermissions', () => {
    it('should return false on web (disabled platform)', async () => {
      (Platform as any).OS = 'web';

      const result = await notificationService.requestPermissions();

      expect(result).toBe(false);
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should return true when already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await notificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request and return true when granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await notificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when request is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await notificationService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('scheduleNextSessionNotification', () => {
    it('should do nothing on web (disabled platform)', async () => {
      (Platform as any).OS = 'web';

      await notificationService.scheduleNextSessionNotification('2024-01-01T12:00:00Z');

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should cancel all notifications when nextAvailableTime is null', async () => {
      await notificationService.scheduleNextSessionNotification(null);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should not schedule notification if time is in the past', async () => {
      const pastTime = new Date(Date.now() - 10000).toISOString();

      await notificationService.scheduleNextSessionNotification(pastTime);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should schedule notification for future time', async () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();

      await notificationService.scheduleNextSessionNotification(futureTime);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: '單字教練提醒',
          body: '新的學習任務已經準備好了，趕快回來練習吧！',
          data: { url: '/(main)' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: expect.any(Date),
        },
      });
    });

    it('should handle scheduling error gracefully', async () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Schedule failed')
      );

      // Should not throw
      await notificationService.scheduleNextSessionNotification(futureTime);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('cancelAllNotifications', () => {
    it('should do nothing on web (disabled platform)', async () => {
      (Platform as any).OS = 'web';

      await notificationService.cancelAllNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });

    it('should cancel all scheduled notifications', async () => {
      await notificationService.cancelAllNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });
});
