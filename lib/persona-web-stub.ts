/**
 * Web stub for react-native-persona.
 * The native Persona SDK uses requireNativeComponent which is not available
 * in react-native-web. This module is used when Metro resolves
 * react-native-persona on platform === 'web'.
 */
import { View } from 'react-native';

const WEB_MESSAGE =
  'Persona identity verification is only available in the Habixa iOS and Android app. Please use the mobile app.';

/** Stub for Persona.start() - calls onFail with web message */
function start(options: {
  templateId: string;
  onSuccess?: () => void;
  onFail?: () => void;
  onExit?: () => void;
}) {
  if (options.onFail) options.onFail();
  else if (options.onExit) options.onExit();
}

/** Default export matching background-check.tsx usage: Persona.start(...) */
export default { start };

/** Stub for PersonaInquiryView - renders nothing on web */
export const PersonaInquiryView = View;

/** Stub enums for Inquiry API (used by verification.tsx dynamic import) */
export const Environment = { SANDBOX: 'sandbox', PRODUCTION: 'production' } as const;

/** Stub Inquiry class - never actually used on web due to Platform check */
export class Inquiry {
  static fromTemplate() {
    return {
      environment: () => this,
      onComplete: () => this,
      onCanceled: () => this,
      onError: () => this,
      build: () => ({ start: () => {} }),
    };
  }
}
