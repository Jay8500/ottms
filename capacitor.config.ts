import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shareotts.app',
  appName: 'ShareOTTs',
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
      // FIT_CENTER, not CENTER_CROP. The splash art is a 1024x1024 square;
      // CENTER_CROP scales it until it covers the screen, which on a tall
      // phone means ~2.3x and only the middle of the logo is visible.
      // FIT_CENTER shows the whole logo and fills the rest with
      // backgroundColor below.
      androidScaleType: 'FIT_CENTER',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
