import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api, Endpoints } from './api/client';

/** Android push was removed from Expo Go in SDK 53+. Avoid all push APIs when true. */
export const isExpoGoAndroid = () => Platform.OS === 'android' && isRunningInExpoGo();

export type NotificationTapHandler = (data: {
  conversation_id?: string;
  url?: string;
  listing_id?: string;
  type?: string;
  lease_id?: number;
  amount?: number;
  currency?: string;
  landlordName?: string;
  landlordCountry?: string;
}) => void;

let notificationTapHandler: NotificationTapHandler | null = null;

export function setNotificationTapHandler(handler: NotificationTapHandler | null) {
  notificationTapHandler = handler;
}

export function setupNotificationResponseListener(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      conversation_id?: string;
      url?: string;
      listing_id?: string;
      type?: string;
      lease_id?: number;
      amount?: number;
      currency?: string;
      landlordName?: string;
      landlordCountry?: string;
    };
    if (notificationTapHandler && data) {
      notificationTapHandler(data);
    }
  });
  return () => sub.remove();
}

if (!isExpoGoAndroid()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPushToken(): Promise<void> {
  // Push notifications (remote) were removed from Expo Go on Android in SDK 53+
  if (isExpoGoAndroid() || Constants.appOwnership === 'expo') return;
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      (Constants?.expoConfig as { extra?: { eas?: { projectId?: string } } })?.extra?.eas
        ?.projectId ??
      (Constants?.easConfig as { projectId?: string })?.projectId ??
      null;

    let token: string | null = null;
    if (projectId) {
      const res = await Notifications.getExpoPushTokenAsync({ projectId });
      token = res?.data ?? null;
    }
    if (!token) {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token =
          typeof deviceToken?.data === 'string'
            ? deviceToken.data
            : (deviceToken as { data?: string })?.data
              ? String((deviceToken as { data: unknown }).data)
              : null;
      } catch {
        token = null;
      }
    }

    if (token) {
      await api.post(Endpoints.notifications.pushToken(), {
        token,
        platform: Platform.OS as 'ios' | 'android',
      });
    }
  } catch (e) {
    console.warn('Push token registration failed:', e);
  }
}
