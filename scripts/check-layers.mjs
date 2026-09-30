#!/usr/bin/env node
/** Architecture guard: simulation/world/data layers must not import rendering, Vue or Three.js. */
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve(import.meta.dirname, '../src/game')
const LAYERS = ['sim', 'world', 'data', 'config', 'core', 'save']
const FORBIDDEN = [/from ['"]three/, /from ['"]vue/, /from ['"].*\/render\//, /from ['"]@\/ui/, /from ['"].*\/audio\//]
let bad = 0
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
for (const layer of LAYERS) {
  for (const f of walk(path.join(ROOT, layer)).filter((x) => x.endsWith('.ts'))) {
    const src = fs.readFileSync(f, 'utf8')
    for (const re of FORBIDDEN) if (re.test(src)) {
      console.log(`✗ ${path.relative(ROOT, f)} matches ${re}`)
      bad++
    }
  }
}
console.log(bad ? `${bad} layer violations` : `OK: ${LAYERS.join(', ')} are free of three/vue/render/ui/audio imports`)
process.exit(bad ? 1 : 0)
