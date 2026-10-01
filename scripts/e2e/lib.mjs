/**
 * Shared Playwright helpers for scenario scripts. Uses the system Chrome (playwright-core) with
 * SwiftShader WebGL — correctness only; not representative of real GPU performance.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

export const BASE = process.env.SV_URL ?? 'http://localhost:5199/'
export const OUT = path.resolve(import.meta.dirname, '../../test-results/e2e')
fs.mkdirSync(OUT, { recursive: true })

/** CHROME_PATH → bundled Playwright chromium (/opt/pw-browsers, ~/.cache/ms-playwright) → system Chrome. */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const root of ['/opt/pw-browsers', path.join(os.homedir(), '.cache/ms-playwright')]) {
    if (!fs.existsSync(root)) continue
    const dir = fs.readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
      .find((d) => fs.existsSync(path.join(root, d, 'chrome-linux/chrome')))
    if (dir) return path.join(root, dir, 'chrome-linux/chrome')
  }
  return '/usr/bin/google-chrome'
}
const CHROME = findChrome()

export async function launch({ mobile = false } = {}) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  })
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' }
      : { viewport: { width: 1280, height: 720 } },
  )
  const page = await context.newPage()
  const logs = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`)
  })
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  return { browser, context, page, logs }
}

/** Starts a new game with the given seed through the UI and waits for the HUD. */
export async function newGame(page, seed = '1337', quality = 'low') {
  await page.goto(BASE)
  await page.evaluate((q) => localStorage.setItem('sv-quality', q), quality)
  await page.goto(BASE)
  await page.fill('[data-testid=seed-input]', String(seed))
  await page.click('[data-testid=new-game]')
  await page.waitForSelector('[data-testid=status-bars]', { timeout: 120_000 })
  await page.waitForFunction(() => !!window.__sv, null, { timeout: 30_000 })
}

export const sv = (page, fn, arg) => page.evaluate(fn, arg)

export async function shot(page, name) {
  const p = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: p })
  return p
}

export function report(name, results, logs) {
  const file = path.join(OUT, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify({ results, logs }, null, 1))
  const failed = results.filter((r) => !r.ok)
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.info ? ' — ' + r.info : ''}`)
  const errs = logs.filter((l) => l.startsWith('[pageerror]') || l.startsWith('[error]'))
  console.log(`\n${results.length - failed.length}/${results.length} passed · console errors: ${errs.length} · details: ${file}`)
  if (errs.length) console.log(errs.slice(0, 10).join('\n'))
  return failed.length === 0
}

export function check(results, name, ok, info = '') {
  results.push({ name, ok: !!ok, info: typeof info === 'string' ? info : JSON.stringify(info) })
}
