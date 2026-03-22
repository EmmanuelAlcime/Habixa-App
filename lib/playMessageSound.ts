/**
 * Chat message sounds (WhatsApp-style).
 * - playMessageSentSound: subtle sound when you send a message
 * - playMessageReceivedSound: notification sound when you receive a message
 */
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let receivedSoundRef: { unloadAsync: () => Promise<void> } | null = null;
let sentSoundRef: { unloadAsync: () => Promise<void> } | null = null;

const RECEIVED_SOUND_URL =
  'https://assets.mixkit.co/active_storage/sfx/2869-pop-up-notification-alert-2869.wav';
const SENT_SOUND_URL =
  'https://assets.mixkit.co/active_storage/sfx/2571-message-sent-2571.wav';

export async function playMessageSentSound(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics may fail on some devices
  }
  try {
    if (sentSoundRef) {
      await sentSoundRef.unloadAsync().catch(() => {});
      sentSoundRef = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: SENT_SOUND_URL },
      { shouldPlay: true, volume: 0.6 }
    );
    sentSoundRef = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinishAndNotReset) {
        sound.unloadAsync().catch(() => {});
        sentSoundRef = null;
      }
    });
  } catch {
    // Sound may fail (e.g. network)
  }
}

export async function playMessageReceivedSound(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics may fail on some devices
  }
  try {
    if (receivedSoundRef) {
      await receivedSoundRef.unloadAsync().catch(() => {});
      receivedSoundRef = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: RECEIVED_SOUND_URL },
      { shouldPlay: true, volume: 0.8 }
    );
    receivedSoundRef = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinishAndNotReset) {
        sound.unloadAsync().catch(() => {});
        receivedSoundRef = null;
      }
    });
  } catch {
    // Sound may fail (e.g. network); haptics already fired
  }
}
