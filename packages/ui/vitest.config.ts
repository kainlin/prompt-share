import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    },
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
