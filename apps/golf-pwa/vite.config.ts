import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Golf Launch',
        short_name: 'Golf',
        description: '타구 영상 기반 골프 런치 분석 준비 도구',
        display: 'standalone',
        theme_color: '#10251a',
        background_color: '#f3f8f2'
      }
    })
  ]
});
