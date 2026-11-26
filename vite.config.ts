import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
import { resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// Dev-only: the review page POSTs feedback here and it lands in the repo as JSON.
function reviewFeedback(): Plugin {
  const file = resolve(__dirname, 'public/review/feedback.json')
  return {
    name: 'review-feedback',
    configureServer(server) {
      server.middlewares.use('/__review/feedback', (req, res) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          try { res.end(readFileSync(file, 'utf8')) } catch { res.end('{}') }
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            try {
              JSON.parse(body)
              writeFileSync(file, body)
              res.end('ok')
            } catch {
              res.statusCode = 400
              res.end('bad json')
            }
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), reviewFeedback()],
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), review: resolve(__dirname, 'review.html') },
    },
  },
})
