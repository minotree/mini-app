import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HUD',
        short_name: 'HUD',
        description: 'GPS 속도를 표시하는 참고용 스마트폰 HUD',
        display: 'standalone',
        background_color: '#050806',
        theme_color: '#050806'
      }
    })
  ]
});
