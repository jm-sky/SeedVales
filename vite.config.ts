import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    testTimeout: 60_000,
    exclude: [...configDefaults.exclude, '.claude/**'],
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
        '.claude/**',
        '_temp/**',
        'public/assets/**',
      ]
    }
  }
})
