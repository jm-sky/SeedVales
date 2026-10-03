/**
 * Treasure clues (P-06): villagers who like the player tell an old tale about a landmark with something still buried.
 * Words only (direction and rough distance), never a map marker — the spot itself must still be found by digging
 * (fog of war, MAP-01). Hinted landmarks are remembered so the next question gives a new tale.
 * @domain sim
 */
import type { Sim } from './sim'
import type { Human } from './types'
import { treasureSpots } from './treasure'

/** Minimum opinion of the player for an NPC to share a tale. */
export const TALE_MIN_OPINION = -10

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

/** Compass word for the bearing from (ax, az) to (bx, bz); +z is south on the map. */
export function compassWord(ax: number, az: number, bx: number, bz: number): string {
  const a = Math.atan2(bx - ax, -(bz - az)) // 0 = north, clockwise
  return COMPASS[Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8]!
}

/** Asks `npc` about old tales: names the nearest landmark with an undug spot that was not mentioned yet. */
export function askAboutTales(sim: Sim, npc: Human): string {
  if (npc.opinion < TALE_MIN_OPINION) return '“I have nothing to tell you.”'
  const px = sim.state.px
  const told = (px.talesTold ??= [])
  const taken = new Set(px.lootTaken ?? [])
  const p = sim.player
  const open = new Set(treasureSpots(sim).filter((s) => !taken.has(s.id)).map((s) => s.id.split('#')[0]))
  const pick = sim.world.landmarks
    .filter((l) => open.has(l.id) && !told.includes(l.id))
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]
  if (!pick) return '“Nothing more I can tell you about the old places.”'
  told.push(pick.id)
  const km = Math.hypot(pick.x - p.x, pick.z - p.z) / 1000
  const dist = km < 0.5 ? 'close by' : `about ${km.toFixed(1)} km away`
  return `“They say something was buried at ${pick.name} — ${dist}, to the ${compassWord(p.x, p.z, pick.x, pick.z)}. Bring a shovel and dig near the stones or walls.”`
}
