import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '모두의 비트',
        short_name: '모두의 비트',
        lang: 'ko',
        description: '실내·실외 운동 리듬을 맞추는 메트로놈',
        display: 'standalone',
        background_color: '#10131b',
        theme_color: '#10131b'
      }
    })
  ]
});
