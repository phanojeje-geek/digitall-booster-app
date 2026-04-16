import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.digitall.booster.crm',
  appName: 'Digitall Booster CRM',
  webDir: 'www',
  server: {
    url: 'https://digitall-booster-app.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;
