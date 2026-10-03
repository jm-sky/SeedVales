/**
 * Self-contained e2e runner: starts Vite (no HMR, no file watching) on a free port, runs the suites
 * sequentially and prints one summary line. Usage: node scripts/e2e/run.mjs [smoke] [acceptance] [mobile]
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { createServer } from 'vite'

const ALL = ['smoke', 'acceptance', 'mobile']
const args = process.argv.slice(2)
/** `--fast`: development mode — no screenshots. Final verification (before merge/review/plan close) runs without it. */
const fast = args.includes('--fast')
const suites = args.filter((a) => !a.startsWith('--')).length ? args.filter((a) => !a.startsWith('--')) : ALL
const unknown = suites.filter((s) => !ALL.includes(s))
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(', ')}. Available: ${ALL.join(', ')}`)
  process.exit(2)
}

const root = path.resolve(import.meta.dirname, '../..')
const server = await createServer({
  root,
  logLevel: 'warn',
  server: { port: 0, strictPort: false, hmr: false, watch: null },
})
let closed = false
async function shutdown(code) {
  if (!closed) {
    closed = true
    await server.close().catch(() => {})
  }
  process.exit(code)
}
process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

function runSuite(name, url) {
  return new Promise((resolve) => {
    let out = ''
    const child = spawn(process.execPath, [path.join(import.meta.dirname, `${name}.mjs`)], {
      cwd: root,
      env: { ...process.env, SV_URL: url, ...(fast ? { SV_E2E_SHOTS: '0' } : {}) },
    })
    const onData = (d) => {
      out += d
      process.stdout.write(d)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('close', (code) => {
      const m = out.match(/(\d+)\/(\d+) passed · console errors: (\d+)/)
      resolve({ name, code, pass: m ? +m[1] : 0, total: m ? +m[2] : 0, errors: m ? +m[3] : 0, parsed: !!m })
    })
  })
}

try {
  await server.listen()
  const url = `http://localhost:${server.config.server.port ?? server.httpServer.address().port}/`
  const addr = server.httpServer?.address()
  const real = addr && typeof addr === 'object' ? `http://localhost:${addr.port}/` : url
  console.log(`vite ready at ${real}`)
  const results = []
  for (const name of suites) {
    console.log(`\n=== ${name} ===`)
    results.push(await runSuite(name, real))
  }
  const ok = results.every((r) => r.code === 0 && r.parsed)
  const errs = results.reduce((a, r) => a + r.errors, 0)
  console.log(`\n${results.map((r) => `${r.name} ${r.pass}/${r.total}`).join(' · ')} · console errors ${errs}${ok ? '' : ' · FAILED'}`)
  await shutdown(ok ? 0 : 1)
} catch (e) {
  console.error(e)
  await shutdown(1)
}
