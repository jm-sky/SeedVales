/**
 * Dev-server only (`apply: 'serve'`): `GET /__sv-world/<seed>` returns the serialized world from the on-disk
 * cache, generating it once through Vite SSR when missing. `loadWorld` (Game.ts) asks for it in dev builds
 * before generating in the browser, so e2e / A/B / bench runs (fresh browser profiles) skip generation.
 * The production build never contains or calls it.
 */
import { readWorldCache, writeWorldCache } from './world-cache.mjs'

export function worldCachePlugin() {
  return {
    name: 'sv-world-cache',
    apply: 'serve',
    configureServer(server) {
      const pending = new Map()
      server.middlewares.use('/__sv-world/', async (req, res) => {
        const seed = Number(req.url?.replace(/^\//, '').split('?')[0])
        if (!Number.isInteger(seed)) {
          res.statusCode = 400
          return res.end()
        }
        // Disabled (e.g. bench:startup measures the true cold start): "no world" without an error status.
        if (process.env.SV_WORLD_CACHE === '0') {
          res.statusCode = 204
          return res.end()
        }
        try {
          let bytes = readWorldCache(seed)
          if (!bytes) {
            if (!pending.has(seed)) {
              pending.set(seed, (async () => {
                const { generateWorld } = await server.ssrLoadModule('/src/game/world/gen/generate.ts')
                const { serializeWorld } = await server.ssrLoadModule('/src/game/world/serialize.ts')
                const b = serializeWorld(generateWorld(seed))
                writeWorldCache(seed, b)
                return b
              })().finally(() => pending.delete(seed)))
            }
            bytes = await pending.get(seed)
          }
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Cache-Control', 'no-store')
          res.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
        } catch (e) {
          server.config.logger.warn(`sv-world-cache: ${e?.message ?? e}`)
          res.statusCode = 500
          res.end()
        }
      })
    },
  }
}
