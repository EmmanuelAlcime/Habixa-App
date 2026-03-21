const appJson = require('./app.json');

const googleMapsKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo?.extra,
      eas: {
        ...appJson.expo?.extra?.eas,
        projectId: 'bcb3b10f-aa7f-4b46-b61d-426470ce17a2',
      },
    },
    android: {
      googleServicesFile: './google-services.json',
      ...appJson.expo.android,
      package: 'com.habixa.app',
      config: {
        ...appJson.expo.android?.config,
        googleMaps: {
          apiKey: googleMapsKey,
        },
      },
    },
    ios: {
       googleServicesFile: './GoogleService-Info.plist',
      ...appJson.expo.ios,
      bundleIdentifier: 'com.habixa.app',
      config: {
        ...appJson.expo.ios?.config,
        googleMapsApiKey: googleMapsKey,
      },
    },
    plugins: [
      ...(appJson.expo.plugins || []),
      '@react-native-community/datetimepicker',
      'expo-localization',
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.habixa.app',
          enableGooglePay: true,
        },
      ],
    ],
  },
};
