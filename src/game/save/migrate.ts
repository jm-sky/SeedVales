/**
 * Save compatibility: world pairing check (seed + GEN_VERSION) and save-format migrations.
 * @domain save
 */
import type { GameState, Order } from '../sim/types'
import type { WorldData } from '../world/types'
import { TREASURY_START } from '../config/calibration'
import { nestTag } from '../sim/queries'
import { SAVE_VERSION } from '../sim/types'
import { SaveError } from './errors'

/**
 * The save only stores changes against the generated world; it is valid only for the exact
 * generator version it was created with. Mismatch → explicit rejection (no silent mount).
 */
export function checkWorldCompat(st: GameState, world: Pick<WorldData, 'version' | 'seed'>): void {
  if (st.seed !== world.seed) throw new SaveError(`The save belongs to a different world (seed ${st.seed}, loaded ${world.seed}).`)
  if (st.genVersion !== world.version) {
    throw new SaveError(`The save was made with a different world generator version (v${st.genVersion}, game: v${world.version}). The world cannot be faithfully recreated — save rejected.`)
  }
}

type Migration = (st: GameState) => void

/** Save format migrations: MIGRATIONS[n] upgrades saveVersion n → n+1. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: orders buffer the forged item (materials consumed at forging); caravan uses h.trip.
  1: (st) => {
    for (const o of st.px.orders ?? []) if (o.status === 'ready' && !o.item) o.status = 'waiting'
    for (const n of st.npcs) delete n.ai.cooldowns.caravan_back
  },
  // v2 → v3: settlement treasuries (fixed start amounts by position in the chain: SM, MD, LG).
  2: (st) => {
    const start = [TREASURY_START.SM, TREASURY_START.MD, TREASURY_START.LG]
    st.settlements.forEach((s, i) => (s.treasury ??= start[i] ?? TREASURY_START.SM))
  },
  // v3 → v4: orders get explicit recipeId/itemId (was `recipe` = item id); collected orders dropped.
  3: (st) => {
    type OldOrder = Omit<Order, 'status' | 'recipeId' | 'itemId'> & { recipe?: string; recipeId?: string; itemId?: string; status: string }
    const orders = (st.px.orders ?? []) as unknown as OldOrder[]
    st.px.orders = orders
      .filter((o) => o.status !== 'collected')
      .map(({ recipe, ...o }) => ({ ...o, status: o.status as Order['status'], recipeId: o.recipeId ?? recipe!, itemId: o.itemId ?? recipe! }))
  },
  // v4 → v5: blood traces (TRACE-01).
  // Rats get tied to their nest (denId = nest tag) so nest respawn and the rat quest count them.
  4: (st) => {
    st.traces ??= []
    const nests = st.buildings.filter((b) => b.ratNest)
    for (const a of st.animals) {
      if (a.species !== 'rat' || a.denId) continue
      const b = nests.find((n) => Math.hypot(n.x - a.x, n.z - a.z) < 40)
      if (b) a.denId = nestTag(b.id)
    }
  },
  // v5 → v6: parked carts (TRANS-01).
  5: (st) => {
    st.carts ??= []
  },
}

export function migrate(st: GameState): GameState {
  if (st.saveVersion > SAVE_VERSION) throw new SaveError('The save comes from a newer version of the game.')
  for (let v = st.saveVersion; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v]
    if (!m) throw new SaveError(`Unsupported save version (v${st.saveVersion}).`)
    m(st)
  }
  st.saveVersion = SAVE_VERSION
  return st
}
