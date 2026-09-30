#!/usr/bin/env node
/** Measures frame timings in headless SwiftShader (correctness-grade only). */
import { launch, newGame, sv } from './lib.mjs'
const { browser, page } = await launch()
await newGame(page)
await page.waitForTimeout(4000)
await sv(page, () => window.__sv.perf.reset())
await page.waitForTimeout(5000)
const r = await sv(page, () => { const r = window.__sv.perf.report(); return { t: r.timers.filter((t) => /^(frame|sim|render)/.test(t.name)).map((t) => `${t.name} med ${t.median.toFixed(1)} p95 ${t.p95.toFixed(1)} n ${t.samples}`), g: r.gauges } })
console.log(r.t.join('\n'))
console.log(JSON.stringify(r.g))
await browser.close()
