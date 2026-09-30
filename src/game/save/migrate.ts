/**
 * Save compatibility: world pairing check (seed + GEN_VERSION) and save-format migrations.
 * @domain save
 */
import type { GameState } from '../sim/types'
import type { WorldData } from '../world/types'
import { TREASURY_START } from '../config/calibration'
import { SAVE_VERSION } from '../sim/types'
import { SaveError } from './errors'

/**
 * The save only stores changes against the generated world; it is valid only for the exact
 * generator version it was created with. Mismatch → explicit rejection (no silent mount).
 */
export function checkWorldCompat(st: GameState, world: Pick<WorldData, 'version' | 'seed'>): void {
  if (st.seed !== world.seed) throw new SaveError(`Zapis dotyczy innego świata (seed ${st.seed}, wczytany ${world.seed}).`)
  if (st.genVersion !== world.version) {
    throw new SaveError(`Zapis powstał dla innej wersji generatora świata (v${st.genVersion}, gra: v${world.version}). Świata nie da się wiernie odtworzyć — zapis odrzucony.`)
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
}

export function migrate(st: GameState): GameState {
  if (st.saveVersion > SAVE_VERSION) throw new SaveError('Zapis pochodzi z nowszej wersji gry.')
  for (let v = st.saveVersion; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v]
    if (!m) throw new SaveError(`Nieobsługiwana wersja zapisu (v${st.saveVersion}).`)
    m(st)
  }
  st.saveVersion = SAVE_VERSION
  return st
}
