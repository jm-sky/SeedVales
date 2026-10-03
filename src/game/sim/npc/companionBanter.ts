/**
 * Companion banter (P-11, text first): a travelling companion occasionally comments on the weather, the dark,
 * hunger, wounds, a buried treasure nearby or a predator close by. One remark per companion per CHAT_COOLDOWN_S
 * of calendar time; never in a panel-less fight spam. Voice clips can replace the text later (VOICE-01).
 * @domain npc
 */
import type { Sim } from '../sim'
import type { Human } from '../types'
import { SPECIES } from '../../data/species'
import { isNight } from '../time'
import { treasureSpots } from '../treasure'
import { hp } from '../vitals'
import { isBadWeather } from '../weather'

/** Calendar seconds between remarks of one companion (2 game hours ≈ 5 real minutes). */
export const CHAT_COOLDOWN_S = 7200
const TREASURE_HINT_M = 40
const DANGER_M = 25

/** The remark that fits right now, or null. Order = priority. */
export function banterLine(sim: Sim, n: Human): string | null {
  const p = sim.player
  const taken = new Set(sim.state.px.lootTaken ?? [])
  for (const a of sim.actors.query(n.x, n.z, DANGER_M)) {
    if (a.kind === 'animal' && !a.vitals.dead && ['aggressive', 'predator'].includes(SPECIES[(a as { species: keyof typeof SPECIES }).species].temperament)) return 'Easy now — something is stalking us.'
  }
  if (hp(n.vitals) < n.vitals.maxHp * 0.4) return 'I am hurt. I could use a rest.'
  if (n.vitals.hunger < 25) return 'My stomach is growling. Can we eat soon?'
  if (isBadWeather(sim.weather)) return 'This weather is miserable. Let us find shelter.'
  if (isNight(sim.state.time.cal)) return 'It is dark. Watch your step.'
  for (const s of treasureSpots(sim)) {
    if (!taken.has(s.id) && Math.hypot(s.x - p.x, s.z - p.z) < TREASURE_HINT_M) return 'Old places like this often hide something. Try your shovel around here.'
  }
  return null
}

/** Called from the companion system: speaks for at most one companion per call (rate-limited by the cooldown). */
export function companionBanter(sim: Sim, companions: readonly Human[]) {
  const cal = sim.state.time.cal
  for (const n of companions) {
    const c = n.companion
    if (!c || (c.chatAt ?? 0) + CHAT_COOLDOWN_S > cal) continue
    const line = banterLine(sim, n)
    if (!line) continue
    c.chatAt = cal
    sim.message(`${n.name}: “${line}”`)
    return
  }
}
