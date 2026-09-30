/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    watch: {
      ignored: [
        'docs/**',
        'scripts/**',
        '*.test.ts',
        'dist/**',
        '_temp/**',
        'public/assets/**',
      ]
    }
  }
})
