import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function faviconFallback() {
  return {
    name: 'favicon-fallback',
    configureServer: {
      order: 'pre',
      handler(server) {
        server.middlewares.use((request, response, next) => {
        if (request.url !== '/favicon.ico') {
          next()
          return
        }
        response.statusCode = 200
        response.setHeader('Content-Type', 'image/svg+xml')
        response.end(readFileSync(resolve(process.cwd(), 'public/favicon.svg')))
        })
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [faviconFallback(), react()],
})
