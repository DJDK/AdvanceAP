import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const { API_PORT = '3001' } = loadEnv(mode, process.cwd(), '')
  return {
    esbuild: { jsx: 'automatic' },
    server: {
      host: 'localhost',
      fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**'] },
      proxy: { '/api': `http://127.0.0.1:${API_PORT}` },
    },
  }
})
