import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './__tests__/setup.ts')],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
})
