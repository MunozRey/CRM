import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Match the app's automatic JSX runtime so component tests don't need `import React`.
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    setupFiles: ['./tests/setup.dom.ts'],
  },
})
