import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@library': path.resolve(__dirname, './src/modules/library/core'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@features': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './assets')
    }
  },
  test: {
    include: [
      'src/app/command/**/*.test.ts',
      'src/app/transaction/**/*.test.ts',
      'src/modules/library/diagrams/app/**/*.test.ts',
      'electron/**/*.test.ts'
    ],
    environment: 'node'
  }
})
