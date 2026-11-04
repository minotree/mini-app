import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔에서 HUD 앱을 등록한 뒤 발급된 appName으로 교체한다.
  appName: 'moduihud',
  brand: { primaryColor: '#7CFF8A' },
  permissions: [{ name: 'geolocation', access: 'access' }],
  webBundleDir: 'dist',
  navigationBar: { withBackButton: true, withHomeButton: true },
  webView: { bounces: false, pullToRefreshEnabled: false },
});
