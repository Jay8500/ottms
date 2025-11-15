import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'OTTix',
  webDir: 'www',
  plugins :{
    App : {
      icon : './src/assets/icon.png'
    }
  }
};

export default config;
