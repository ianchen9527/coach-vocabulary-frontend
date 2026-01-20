import { permissionService } from '../../services/permissionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '../../services/api';

// Mock modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  STORAGE_KEYS: {
    MIC_PERMISSION_DISMISSED_AT: 'mic_permission_dismissed_at',
    MIC_PERMISSION_GRANTED: 'mic_permission_granted',
    NOTIFICATION_PERMISSION_DISMISSED_AT: 'notification_permission_dismissed_at',
    NOTIFICATION_PERMISSION_GRANTED: 'notification_permission_granted',
  },
}));

describe('permissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  describe('Microphone/Speech Recognition', () => {
    describe('checkMicPermissionStatus', () => {
      it('should return true when permission is granted on iOS', async () => {
        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: true,
        });

        const result = await permissionService.checkMicPermissionStatus();

        expect(result).toBe(true);
        expect(ExpoSpeechRecognitionModule.getPermissionsAsync).toHaveBeenCalled();
      });

      it('should return false when permission is denied on iOS', async () => {
        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: false,
        });

        const result = await permissionService.checkMicPermissionStatus();

        expect(result).toBe(false);
      });

      it('should return false when getPermissionsAsync throws', async () => {
        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockRejectedValue(
          new Error('Permission error')
        );

        const result = await permissionService.checkMicPermissionStatus();

        expect(result).toBe(false);
      });
    });

    describe('requestMicPermission', () => {
      it('should return true when permission is granted', async () => {
        (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: true,
        });

        const result = await permissionService.requestMicPermission();

        expect(result).toBe(true);
        expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalled();
      });

      it('should return false when permission is denied', async () => {
        (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: false,
        });

        const result = await permissionService.requestMicPermission();

        expect(result).toBe(false);
      });

      it('should return false when requestPermissionsAsync throws', async () => {
        (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockRejectedValue(
          new Error('Permission error')
        );

        const result = await permissionService.requestMicPermission();

        expect(result).toBe(false);
      });
    });

    describe('recordMicPermissionDismissal', () => {
      it('should save dismissal timestamp to AsyncStorage', async () => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);

        await permissionService.recordMicPermissionDismissal();

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT,
          now.toString()
        );
      });
    });

    describe('recordMicPermissionGranted', () => {
      it('should save granted flag and clear dismissal timestamp', async () => {
        await permissionService.recordMicPermissionGranted();

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.MIC_PERMISSION_GRANTED,
          'true'
        );
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
          STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT
        );
      });
    });

    describe('shouldShowMicPermissionPrompt', () => {
      it('should return false when system permission is already granted', async () => {
        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: true,
        });

        const result = await permissionService.shouldShowMicPermissionPrompt();

        expect(result).toBe(false);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.MIC_PERMISSION_GRANTED,
          'true'
        );
      });

      it('should return false when already recorded as granted', async () => {
        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: false,
        });
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
          if (key === STORAGE_KEYS.MIC_PERMISSION_GRANTED) return Promise.resolve('true');
          return Promise.resolve(null);
        });

        const result = await permissionService.shouldShowMicPermissionPrompt();

        expect(result).toBe(false);
      });

      it('should return false when dismissed within 2 days', async () => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: false,
        });
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
          if (key === STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT) {
            return Promise.resolve(oneDayAgo.toString());
          }
          return Promise.resolve(null);
        });

        const result = await permissionService.shouldShowMicPermissionPrompt();

        expect(result).toBe(false);
      });

      it('should return true when dismissed more than 2 days ago', async () => {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: false,
        });
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
          if (key === STORAGE_KEYS.MIC_PERMISSION_DISMISSED_AT) {
            return Promise.resolve(threeDaysAgo.toString());
          }
          return Promise.resolve(null);
        });

        const result = await permissionService.shouldShowMicPermissionPrompt();

        expect(result).toBe(true);
      });

      it('should return true when never dismissed and not granted', async () => {
        (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({
          granted: false,
        });
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await permissionService.shouldShowMicPermissionPrompt();

        expect(result).toBe(true);
      });
    });
  });

  describe('Notifications', () => {
    describe('checkNotificationPermissionStatus', () => {
      it('should return true when permission is granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });

        const result = await permissionService.checkNotificationPermissionStatus();

        expect(result).toBe(true);
      });

      it('should return false when permission is denied', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });

        const result = await permissionService.checkNotificationPermissionStatus();

        expect(result).toBe(false);
      });

      it('should return true on web (disabled platform)', async () => {
        (Platform as any).OS = 'web';

        const result = await permissionService.checkNotificationPermissionStatus();

        expect(result).toBe(true);
        expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
      });

      it('should return false when getPermissionsAsync throws', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
          new Error('Permission error')
        );

        const result = await permissionService.checkNotificationPermissionStatus();

        expect(result).toBe(false);
      });
    });

    describe('requestNotificationPermission', () => {
      it('should return true when already granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });

        const result = await permissionService.requestNotificationPermission();

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

        const result = await permissionService.requestNotificationPermission();

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

        const result = await permissionService.requestNotificationPermission();

        expect(result).toBe(false);
      });

      it('should return true on web (disabled platform)', async () => {
        (Platform as any).OS = 'web';

        const result = await permissionService.requestNotificationPermission();

        expect(result).toBe(true);
      });

      it('should return false when request throws', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'undetermined',
        });
        (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValue(
          new Error('Request error')
        );

        const result = await permissionService.requestNotificationPermission();

        expect(result).toBe(false);
      });
    });

    describe('recordNotificationPermissionDismissal', () => {
      it('should save dismissal timestamp to AsyncStorage', async () => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);

        await permissionService.recordNotificationPermissionDismissal();

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT,
          now.toString()
        );
      });
    });

    describe('recordNotificationPermissionGranted', () => {
      it('should save granted flag and clear dismissal timestamp', async () => {
        await permissionService.recordNotificationPermissionGranted();

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.NOTIFICATION_PERMISSION_GRANTED,
          'true'
        );
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
          STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT
        );
      });
    });

    describe('shouldShowNotificationPermissionPrompt', () => {
      it('should return false on web (disabled platform)', async () => {
        (Platform as any).OS = 'web';

        const result = await permissionService.shouldShowNotificationPermissionPrompt();

        expect(result).toBe(false);
      });

      it('should return false when system permission is already granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });

        const result = await permissionService.shouldShowNotificationPermissionPrompt();

        expect(result).toBe(false);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.NOTIFICATION_PERMISSION_GRANTED,
          'true'
        );
      });

      it('should return false when already recorded as granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
          if (key === STORAGE_KEYS.NOTIFICATION_PERMISSION_GRANTED) return Promise.resolve('true');
          return Promise.resolve(null);
        });

        const result = await permissionService.shouldShowNotificationPermissionPrompt();

        expect(result).toBe(false);
      });

      it('should return false when dismissed within 2 days', async () => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
          if (key === STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT) {
            return Promise.resolve(oneDayAgo.toString());
          }
          return Promise.resolve(null);
        });

        const result = await permissionService.shouldShowNotificationPermissionPrompt();

        expect(result).toBe(false);
      });

      it('should return true when dismissed more than 2 days ago', async () => {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
          if (key === STORAGE_KEYS.NOTIFICATION_PERMISSION_DISMISSED_AT) {
            return Promise.resolve(threeDaysAgo.toString());
          }
          return Promise.resolve(null);
        });

        const result = await permissionService.shouldShowNotificationPermissionPrompt();

        expect(result).toBe(true);
      });

      it('should return true when never dismissed and not granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'undetermined',
        });
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await permissionService.shouldShowNotificationPermissionPrompt();

        expect(result).toBe(true);
      });
    });
  });
});
