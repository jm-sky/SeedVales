/**
 * Starts Vite for scripts (no HMR, no file watching) on a free port. Returns { url, close }.
 */
import path from 'node:path'
import { createServer } from 'vite'

export async function startServer() {
  const root = path.resolve(import.meta.dirname, '../..')
  const server = await createServer({ root, logLevel: 'warn', server: { port: 0, strictPort: false, hmr: false, watch: null } })
  await server.listen()
  const addr = server.httpServer?.address()
  const url = addr && typeof addr === 'object' ? `http://localhost:${addr.port}/` : 'http://localhost:5199/'
  return { url, close: () => server.close() }
}
