/**
 * Web stub for @stripe/stripe-react-native.
 * The native Stripe SDK does not support web; this module is used when
 * Metro resolves @stripe/stripe-react-native on platform === 'web'.
 */
import React, { type ReactNode } from 'react';

const WEB_MESSAGE =
  'In-app payments are only available in the Habixa iOS and Android app. Please use the mobile app.';

export function initPaymentSheet(): Promise<{ error: { message: string } | null }> {
  return Promise.resolve({
    error: { message: WEB_MESSAGE, code: 'WebNotSupported' },
  });
}

export function presentPaymentSheet(): Promise<{ error: { message: string; code: string } | null }> {
  return Promise.resolve({
    error: { message: WEB_MESSAGE, code: 'WebNotSupported' },
  });
}

export function StripeProvider({
  children,
}: {
  children: ReactNode;
  publishableKey: string;
}) {
  return React.createElement(React.Fragment, null, children);
}
