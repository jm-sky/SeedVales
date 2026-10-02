// Prints the recipe economy table (review 013 M-10, audit B): input value vs output value per recipe,
// economy class and documented exceptions. Run: `pnpm audit:recipes`.
import { EXCEPTIONS, RATIO_BANDS, recipeEconomy } from '../../src/game/data/recipeEconomy'
import { isOrderable, recipeById } from '../../src/game/data/recipes'
import { orderPrice } from '../../src/game/sim/orders'

const lines = ['| recipe | class | input c | output c | ratio | band | order price | note |', '|---|---|---:|---:|---:|---|---:|---|']
for (const e of recipeEconomy()) {
  const [lo, hi] = RATIO_BANDS[e.cls!]
  const r = recipeById(e.id)!
  lines.push(`| ${e.id} | ${e.cls} | ${e.input} | ${e.output} | ${e.ratio.toFixed(2)} | ${lo}–${hi} | ${isOrderable(r) ? orderPrice(e.id) : ''} | ${EXCEPTIONS[e.id] ? 'exception: ' + EXCEPTIONS[e.id] : ''} |`)
}
console.log(lines.join('\n'))
