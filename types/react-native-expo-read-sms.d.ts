declare module '@maniac-tech/react-native-expo-read-sms' {
  export function startReadSMS(
    callback: (status: string, sms: string, error: unknown) => void
  ): Promise<void>;
  export function stopReadSMS(): void;
  export function requestReadSMSPermission(): Promise<boolean>;
  export function checkIfHasSMSPermission(): Promise<{
    hasReceiveSmsPermission: boolean;
    hasReadSmsPermission: boolean;
  }>;
}
