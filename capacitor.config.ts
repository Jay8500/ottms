import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jay.ottmoneysaver',
  appName: 'OTT Money Saver',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};
