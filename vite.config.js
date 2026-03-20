import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

let buildId = globalThis.process?.env?.VITE_BUILD_ID
if (!buildId) {
  try {
    buildId = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    buildId = 'local'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  server: {
    port: 8090,
  },
})
