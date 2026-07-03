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
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
