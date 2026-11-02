import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '운동 메트로놈',
        short_name: '메트로놈',
        description: '러닝과 사이클의 리듬을 맞추는 운동용 메트로놈',
        display: 'standalone',
        background_color: '#10131b',
        theme_color: '#10131b'
      }
    })
  ]
});
