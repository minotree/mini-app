import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'moduibeat',
  brand: { primaryColor: '#B7F1FF' },
  permissions: [{ name: 'geolocation', access: 'access' }],
  webBundleDir: 'dist',
  navigationBar: { withBackButton: true, withHomeButton: true },
  webView: { bounces: false, pullToRefreshEnabled: false },
});
