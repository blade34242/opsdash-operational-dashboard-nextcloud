import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import baseConfig from './vite.config'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      exclude: ['node_modules/**', 'tests/e2e/**'],
    },
  }),
)
