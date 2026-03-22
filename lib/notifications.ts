import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, Endpoints } from './api/client';

/** Android push was removed from Expo Go in SDK 53+. Avoid loading expo-notifications when true. */
export const isExpoGoAndroid = () => Platform.OS === 'android' && isRunningInExpoGo();

const NOTIF_DEBUG = __DEV__;
function logNotif(...args: unknown[]) {
  if (NOTIF_DEBUG) console.log('[Notifications]', ...args);
}

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

/** Dynamically load expo-notifications only when not in Expo Go on Android (avoids SDK 53+ error). */
async function getNotifications() {
  if (isExpoGoAndroid()) return null;
  return import('expo-notifications');
}

export function setupNotificationResponseListener(): () => void {
  if (isExpoGoAndroid()) return () => {};

  let sub: { remove: () => void } | null = null;
  let receivedSub: { remove: () => void } | null = null;
  void getNotifications().then((mod) => {
    if (!mod) return;
    logNotif('Setting up notification listeners');
    sub = mod.addNotificationResponseReceivedListener((response) => {
      logNotif('Notification TAPPED (app opened from notification)', response.notification.request.content.data);
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
    receivedSub = mod.addNotificationReceivedListener((notification) => {
      logNotif('Notification RECEIVED (app in foreground)', notification.request.content.title, notification.request.content.data);
    });
  });
  return () => {
    if (sub) sub.remove();
    if (receivedSub) receivedSub.remove();
  };
}

void getNotifications().then((mod) => {
  if (mod) {
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
});

export async function registerPushToken(): Promise<void> {
  logNotif('registerPushToken called');
  if (isExpoGoAndroid()) {
    logNotif('SKIP: Expo Go on Android (push removed in SDK 53+)');
    return;
  }
  if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
    logNotif('SKIP: Expo Go on Android - use dev build for push');
    return;
  }
  if (Constants.appOwnership === 'expo') {
    logNotif('Running in Expo Go on iOS - attempting push registration (may have limits)');
  }
  if (!Device.isDevice) {
    logNotif('SKIP: Not a physical device (push notifications require a real device)');
    return;
  }

  const mod = await getNotifications();
  if (!mod) {
    logNotif('SKIP: expo-notifications module not loaded');
    return;
  }

  const Notifications = mod;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  logNotif('Permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    logNotif('Requested permission, result:', status);
  }
  if (finalStatus !== 'granted') {
    logNotif('SKIP: Permission not granted');
    return;
  }

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
    logNotif('Project ID:', projectId ?? '(none)');

    let token: string | null = null;
    if (projectId) {
      const res = await Notifications.getExpoPushTokenAsync({ projectId });
      token = res?.data ?? null;
      logNotif('Expo push token:', token ? `${token.slice(0, 30)}...` : '(none)');
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
        logNotif('Device push token fallback:', token ? 'obtained' : '(none)');
      } catch (e) {
        logNotif('Device token fallback failed:', e);
        token = null;
      }
    }

    if (token) {
      await api.post(Endpoints.notifications.pushToken(), {
        token,
        platform: Platform.OS as 'ios' | 'android',
      });
      logNotif('Push token registered with API');
    } else {
      logNotif('SKIP: No token obtained');
    }
  } catch (e) {
    console.warn('[Notifications] Push token registration failed:', e);
  }
}
