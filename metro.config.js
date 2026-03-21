const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@teovilla/react-native-web-maps/src/index.web.tsx'
      ),
      type: 'sourceFile',
    };
  }
  // @stripe/stripe-react-native uses native-only modules; stub on web
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return {
      filePath: path.resolve(__dirname, 'lib/stripe-web-stub.tsx'),
      type: 'sourceFile',
    };
  }
  // react-native-persona uses requireNativeComponent; stub on web
  if (platform === 'web' && moduleName === 'react-native-persona') {
    return {
      filePath: path.resolve(__dirname, 'lib/persona-web-stub.ts'),
      type: 'sourceFile',
    };
  }
  return originalResolve
    ? originalResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
