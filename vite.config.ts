import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/arkapi': {
            target: 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/arkapi/, '')
          }
          ,
          '/api/openai': {
            target: 'https://vibecodingapi.ai/v1',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/api\/openai/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env': '{}',
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process': '({ env: { NODE_ENV: "production" } })',
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_BASE_URL': JSON.stringify(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'),
        'process.env.ARK_API_KEY': JSON.stringify(env.ARK_API_KEY),
        'process.env.ARK_BASE_URL': JSON.stringify(env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'),
        'process.env.AI_PROVIDER': JSON.stringify(env.AI_PROVIDER || 'gemini'),
        'process.env.VOLC_TTS_APP_ID': JSON.stringify(env.VOLC_TTS_APP_ID),
        'process.env.VOLC_TTS_TOKEN': JSON.stringify(env.VOLC_TTS_TOKEN),
        'process.env.VOLC_TTS_CLUSTER': JSON.stringify(env.VOLC_TTS_CLUSTER),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
