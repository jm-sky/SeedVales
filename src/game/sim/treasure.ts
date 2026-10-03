/**
 * Treasure (LOOT-01): buried valuables beside landmarks (found by digging on the spot) and rare finds in the belly
 * of butchered predators. Spot positions and contents derive from the world seed, so only the list of
 * dug-up spots is saved (`px.lootTaken`). Player only — NPC digging never touches treasure.
 * @domain sim
 */
import type { WorldData } from '../world/types'
import type { Sim } from './sim'
import type { Corpse, Human, ItemStack } from './types'
import { hashString, Rng } from '../core/rng'
import { itemDef } from '../data/items'
import { BELLY_LOOT_CHANCE, BELLY_SPECIES, LANDMARK_RICHNESS, TREASURE_COINS, TREASURE_SPOTS_PER_LANDMARK, TREASURE_TABLE } from '../data/loot'
import { logMint } from './eventLog'
import { newStack } from './inventory'

/** Distance (m) within which a dig hits a buried treasure. */
export const TREASURE_DIG_R = 1.6

export interface TreasureSpot {
  id: string
  x: number
  z: number
  richness: number
}

const cache = new WeakMap<WorldData, TreasureSpot[]>()

/** All treasure spots of a world (deterministic, immutable). */
export function treasureSpots(world: WorldData): TreasureSpot[] {
  const hit = cache.get(world)
  if (hit) return hit
  const out: TreasureSpot[] = []
  for (const l of world.landmarks) {
    const n = TREASURE_SPOTS_PER_LANDMARK[l.kind] ?? 0
    for (let i = 0; i < n; i++) {
      const id = `${l.id}#${i}`
      const rng = new Rng(hashString(`${world.seed}:loot:${id}`))
      const ang = rng.range(0, Math.PI * 2)
      const r = l.radius * rng.range(0.3, 0.85)
      out.push({ id, x: l.x + Math.cos(ang) * r, z: l.z + Math.sin(ang) * r, richness: LANDMARK_RICHNESS[l.kind] ?? 0 })
    }
  }
  cache.set(world, out)
  return out
}

export type TreasureContent = { stack: ItemStack } | { coins: number }

/** Content of a spot/find: coins or one valuable by weight among entries the richness allows. */
export function rollTreasure(rng: Rng, richness: number, itemsOnly = false): TreasureContent {
  const entries = TREASURE_TABLE.filter((e) => e.minRichness <= richness)
  const coinW = itemsOnly ? 0 : TREASURE_COINS.weight
  let r = rng.next() * (entries.reduce((a, e) => a + e.weight, 0) + coinW)
  if (r < coinW) return { coins: Math.round(rng.range(TREASURE_COINS.min, TREASURE_COINS.max) * TREASURE_COINS.richnessMul[Math.min(2, richness)]!) }
  r -= coinW
  for (const e of entries) {
    r -= e.weight
    if (r < 0) return { stack: newStack(e.item, rng.int(e.qty[0], e.qty[1]), e.q !== undefined ? { q: e.q } : undefined) }
  }
  const e = entries[entries.length - 1]!
  return { stack: newStack(e.item, 1) }
}

function award(sim: Sim, h: Human, c: TreasureContent, source: string): string {
  if ('coins' in c) {
    h.money += c.coins
    logMint(c.coins, source)
    return `${c.coins} copper coins`
  }
  // giveOrDrop lives in actions.ts, which imports this module: late import keeps the dependency one-way at load time.
  return awardStack(sim, h, c.stack, source)
}

let giveStack: ((sim: Sim, h: Human, s: ItemStack, source: string) => void) | null = null
/** Registered by actions.ts (avoids a circular import). */
export function registerGiveStack(fn: (sim: Sim, h: Human, s: ItemStack, source: string) => void) {
  giveStack = fn
}
function awardStack(sim: Sim, h: Human, s: ItemStack, source: string): string {
  giveStack?.(sim, h, s, source)
  return `${itemDef(s.id).name}${s.qty > 1 ? ` ×${s.qty}` : ''}`
}

/** A dig at (x, z) by the player: uncovers an untouched treasure spot within reach; returns the message or null. */
export function digTreasure(sim: Sim, h: Human, x: number, z: number): string | null {
  if (h.kind !== 'player') return null
  const taken = (sim.state.px.lootTaken ??= [])
  for (const s of treasureSpots(sim.world)) {
    if (taken.includes(s.id) || Math.hypot(s.x - x, s.z - z) > TREASURE_DIG_R) continue
    taken.push(s.id)
    const what = award(sim, h, rollTreasure(new Rng(hashString(`${sim.world.seed}:content:${s.id}`)), s.richness), 'treasure')
    return `Your shovel strikes something buried: ${what}!`
  }
  return null
}

/** Butchering a large predator: rarely a gem or ring in its belly (decided from the corpse id, so it never re-rolls). */
export function bellyLoot(sim: Sim, h: Human, c: Corpse): string | null {
  if (h.kind !== 'player' || !BELLY_SPECIES.includes(c.species)) return null
  const rng = new Rng(hashString(`${sim.world.seed}:belly:${c.id}`))
  if (!rng.chance(BELLY_LOOT_CHANCE)) return null
  const what = award(sim, h, rollTreasure(rng, 0, true), 'treasure_belly')
  return `Something glints in the belly: ${what}!`
}
