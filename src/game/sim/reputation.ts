/**
 * Reputation per settlement (4 dimensions), spread to neighbours (30%, delayed by fast-march time),
 * badges and individual NPC sympathy.
 * @domain social
 * @subdomain reputation
 */
import type { Sim } from './sim'
import type { RepDim } from './types'
import { REP_DIMS } from './types'

/** Dimensions that travel to other settlements (not all — vision §14). */
const SPREAD_DIMS: RepDim[] = ['renown', 'courage', 'honesty']
const SPREAD_FRACTION = 0.3
const FAST_MARCH_MPS = 2.2

export const REP_NAMES: Record<RepDim, string> = {
  honesty: 'Uczciwość',
  helpfulness: 'Uczynność',
  renown: 'Rozpoznawalność',
  courage: 'Odwaga',
}

export function settlementAt(sim: Sim, x: number, z: number, margin = 250): number | null {
  let best: number | null = null
  let bd = Infinity
  for (const s of sim.world.settlements) {
    const d = Math.hypot(s.x - x, s.z - z)
    if (d < s.radius + margin && d < bd) {
      bd = d
      best = s.id
    }
  }
  return best
}

export function addRep(sim: Sim, settlementId: number, delta: Partial<Record<RepDim, number>>, reason?: string) {
  const s = sim.state.settlements[settlementId]
  if (!s) return
  for (const k of REP_DIMS) if (delta[k]) s.rep[k] = Math.max(-100, Math.min(100, s.rep[k] + delta[k]!))
  if (reason) {
    const parts = REP_DIMS.filter((k) => delta[k]).map((k) => `${REP_NAMES[k]} ${delta[k]! > 0 ? '+' : ''}${delta[k]}`)
    sim.message(`${reason} (${s.name}: ${parts.join(', ')})`, Object.values(delta).some((v) => (v ?? 0) < 0) ? 'bad' : 'good')
  }
  // Schedule spread to road-connected neighbours.
  for (const r of sim.world.roads) {
    const other = r.from === settlementId ? r.to : r.to === settlementId ? r.from : -1
    if (other < 0) continue
    const d: Partial<Record<RepDim, number>> = {}
    let any = false
    for (const k of SPREAD_DIMS) {
      if (delta[k]) {
        d[k] = delta[k]! * SPREAD_FRACTION
        any = true
      }
    }
    if (any) sim.state.settlements[other]!.pendingRep.push({ at: sim.state.time.play + r.length / FAST_MARCH_MPS, delta: d, from: settlementId })
  }
}

/** System: applies pending reputation spreads when their delay has elapsed (no re-spread). */
export function reputationSystem(sim: Sim) {
  const now = sim.state.time.play
  for (const s of sim.state.settlements) {
    for (let i = s.pendingRep.length - 1; i >= 0; i--) {
      const p = s.pendingRep[i]!
      if (p.at > now) continue
      for (const k of REP_DIMS) if (p.delta[k]) s.rep[k] = Math.max(-100, Math.min(100, s.rep[k] + p.delta[k]!))
      s.pendingRep.splice(i, 1)
    }
  }
}

export interface BadgeDef {
  id: string
  name: string
  positive: boolean
  stat: string
  threshold: number
  rep: Partial<Record<RepDim, number>>
}

export const BADGES: BadgeDef[] = [
  { id: 'rat_catcher', name: 'Tępiciel szczurów', positive: true, stat: 'ratsKilled', threshold: 8, rep: { helpfulness: 6, renown: 3 } },
  { id: 'beast_slayer', name: 'Pogromca bestii', positive: true, stat: 'dangerousKilled', threshold: 3, rep: { courage: 8, renown: 6 } },
  { id: 'gravedigger', name: 'Grabarz', positive: true, stat: 'buried', threshold: 3, rep: { helpfulness: 3 } },
  { id: 'thief', name: 'Złodziej', positive: false, stat: 'caughtStealing', threshold: 1, rep: { honesty: -15 } },
]

export function addStat(sim: Sim, stat: string, n = 1) {
  const st = sim.state.px.stats
  st[stat] = (st[stat] ?? 0) + n
  for (const b of BADGES) {
    if (b.stat !== stat || sim.state.px.badges[b.id]) continue
    if (st[stat]! >= b.threshold) {
      sim.state.px.badges[b.id] = { at: sim.state.time.cal, count: st[stat]! }
      const sid = settlementAt(sim, sim.player.x, sim.player.z, 3000) ?? 0
      addRep(sim, sid, b.rep, `Odznaka: ${b.name}`)
    }
  }
}

/** Removing a negative badge: apologise (costs money + time since badge ≥ 3 days). */
export function tryApologize(sim: Sim, badgeId: string): string {
  const b = sim.state.px.badges[badgeId]
  const def = BADGES.find((d) => d.id === badgeId)
  if (!b || !def || def.positive) return 'Nie ma za co przepraszać.'
  if (sim.state.time.cal - b.at < 3 * 86400) return 'Ludzie jeszcze pamiętają. Odczekaj kilka dni.'
  if (sim.player.money < 20) return 'Przeprosiny wymagają zadośćuczynienia (20 m).'
  sim.player.money -= 20
  delete sim.state.px.badges[badgeId]
  sim.state.px.stats[def.stat] = 0
  return 'Przeprosiny przyjęte — odznaka zdjęta.'
}
