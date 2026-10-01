/**
 * Construction: sites from blueprints, material delivery (inventory + items lying within 6 m),
 * staged work (calendar hours; long stages accelerate time), completion → player-owned building.
 * @domain build
 */
import type { Blueprint } from '../data/recipes'
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Building, ConstructionSite } from './types'
import { ACCEL, CALENDAR_SPEED } from '../config/calibration'
import { distToSegment } from '../core/math'
import { CAPABILITY_NAMES, itemDef } from '../data/items'
import { blueprintById } from '../data/recipes'
import { train } from './actions'
import { countItem, findTool, removeItem } from './inventory'
import { startActivity } from './player'
import { addRep, settlementAt } from './reputation'

export function canPlace(sim: Sim, bp: Blueprint, x: number, z: number): { ok: boolean; reason?: string } {
  const t = sim.terrain
  if (t.waterDepthAt(x, z) > 0.1) return { ok: false, reason: 'You cannot build in water.' }
  const r = Math.max(bp.hw, bp.hd)
  let hmin = Infinity
  let hmax = -Infinity
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
    const h = t.heightAt(x + dx! * bp.hw, z + dz! * bp.hd)
    hmin = Math.min(hmin, h)
    hmax = Math.max(hmax, h)
  }
  if (bp.kind !== 'campfire' && hmax - hmin > 0.6 + r * 0.05) return { ok: false, reason: 'The ground is uneven — level it with a shovel (Terrain → Level).' }
  for (const b of sim.buildingsNear(x, z, r + 10)) {
    if (b.kind === 'field' || b.kind === 'bridge') continue
    if (Math.hypot(b.x - x, b.z - z) < Math.max(b.hw, b.hd) + r + 0.5) return { ok: false, reason: 'Too close to another building.' }
  }
  if (sim.state.sites.some((s) => Math.hypot(s.x - x, s.z - z) < r + 2)) return { ok: false, reason: 'There is already a building site here.' }
  return { ok: true }
}

export function placeSite(sim: Sim, bpId: string, x: number, z: number, rot: number): ActionResult {
  const bp = blueprintById(bpId)
  if (!bp) return { ok: false, msg: 'Unknown blueprint.' }
  const c = canPlace(sim, bp, x, z)
  if (!c.ok) return { ok: false, msg: c.reason! }
  const sid = settlementAt(sim, x, z, 60)
  const site: ConstructionSite = { id: `site-${sim.nextId()}`, blueprint: bpId, x, z, rot, stage: 0, progressH: 0, delivered: {}, settlementId: sid ?? -1 }
  sim.state.sites.push(site)
  // Building on a road or in the plaza isn't forbidden — but the guard will complain (vision §24).
  const onRoad = sim.world.roads.some((rd) => rd.points.some((p, i) => i > 0 && distToSegment(x, z, rd.points[i - 1]!.x, rd.points[i - 1]!.z, p.x, p.z) < 4))
  const nearPlaza = sid !== null && Math.hypot(sim.world.settlements[sid]!.x - x, sim.world.settlements[sid]!.z - z) < 14
  if ((onRoad || nearPlaza) && bp.kind !== 'campfire') {
    const guard = sid !== null ? sim.npcsOf(sid).find((n) => n.profession === 'guard') : undefined
    sim.message(`${guard?.name ?? 'Guard'}: "Building on the ${onRoad ? 'road' : 'square'}? Nobody will like that!"`, 'bad')
    if (sid !== null) addRep(sim, sid, { honesty: -3, helpfulness: -2 })
  }
  return { ok: true, msg: `Building site: ${bp.name}. Deliver the materials and work (E).` }
}

/** Deliver from inventory and items lying on the ground within 6 m. Returns missing list. */
export function deliverMaterials(sim: Sim, site: ConstructionSite): { item: string; qty: number }[] {
  const bp = blueprintById(site.blueprint)!
  const p = sim.player
  const missing: { item: string; qty: number }[] = []
  for (const m of bp.materials) {
    let need = m.qty - (site.delivered[m.item] ?? 0)
    if (need <= 0) continue
    // Ground items nearby are counted automatically (vision §24).
    for (let i = sim.state.ground.length - 1; i >= 0 && need > 0; i--) {
      const g = sim.state.ground[i]!
      if (g.stack.id !== m.item || Math.hypot(g.x - site.x, g.z - site.z) > 6) continue
      const take = Math.min(need, g.stack.qty)
      g.stack.qty -= take
      need -= take
      site.delivered[m.item] = (site.delivered[m.item] ?? 0) + take
      if (g.stack.qty <= 0) sim.removeGround(g)
    }
    const have = Math.min(need, countItem(p.inv, m.item))
    if (have > 0) {
      removeItem(p.inv, m.item, have)
      site.delivered[m.item] = (site.delivered[m.item] ?? 0) + have
      need -= have
    }
    if (need > 0) missing.push({ item: m.item, qty: need })
  }
  return missing
}

export function startBuildWork(sim: Sim, site: ConstructionSite): ActionResult {
  const bp = blueprintById(site.blueprint)!
  const missing = deliverMaterials(sim, site)
  if (missing.length) return { ok: false, msg: 'Missing: ' + missing.map((m) => `${itemDef(m.item).name} ×${m.qty}`).join(', ') }
  const stage = bp.stages[site.stage]!
  if (!findTool(sim.player, stage.tool)) return { ok: false, msg: `The "${stage.name}" stage needs a tool: ${CAPABILITY_NAMES[stage.tool]}` }
  const speed = 1 + sim.player.skills.construction / 100
  const remainingH = Math.max(0, stage.hours - site.progressH) / speed
  const playS = (remainingH * 3600) / CALENDAR_SPEED
  startActivity(sim, { kind: 'build', ref: site.id, label: `${bp.name}: ${stage.name}`, total: playS, accel: playS > 60 ? ACCEL.longWork : 1 })
  return { ok: true, msg: `Working: ${stage.name}` }
}

/** Adds progress (called on completion or cancellation of a build activity). */
export function applyBuildProgress(sim: Sim, siteId: string, playS: number): ActionResult {
  const site = sim.state.sites.find((s) => s.id === siteId)
  if (!site) return { ok: false, msg: 'The building site is gone.' }
  const bp = blueprintById(site.blueprint)!
  const speed = 1 + sim.player.skills.construction / 100
  site.progressH += ((playS * CALENDAR_SPEED) / 3600) * speed
  train(sim.player, 'construction', 0.5, Math.max(1, playS / 60))
  const stage = bp.stages[site.stage]!
  const tool = findTool(sim.player, stage.tool)
  if (tool?.dur !== undefined) tool.dur = Math.max(0, tool.dur - playS / 60)
  if (site.progressH + 1e-6 < stage.hours) return { ok: true, msg: `Progress: ${Math.round((site.progressH / stage.hours) * 100)}%` }
  site.stage++
  site.progressH = 0
  if (site.stage < bp.stages.length) return { ok: true, msg: `Stage complete. Next: ${bp.stages[site.stage]!.name}` }
  // Completed.
  sim.state.sites.splice(sim.state.sites.indexOf(site), 1)
  const b: Building = {
    id: `pb-${sim.nextId()}`, kind: bp.kind, x: site.x, z: site.z, rot: site.rot, hw: bp.hw, hd: bp.hd,
    settlementId: site.settlementId, durability: 100, owner: 'player', playerBuilt: true,
  }
  if (bp.kind === 'campfire') b.lit = true
  if (bp.kind === 'trough') b.water = 0
  if (bp.kind === 'house' || bp.kind === 'shed') b.inv = { items: [] }
  sim.state.buildings.push(b)
  sim.rebuildBuildingIndex()
  sim.state.px.stats.built = (sim.state.px.stats.built ?? 0) + 1
  if (site.settlementId >= 0 && bp.kind !== 'campfire') addRep(sim, site.settlementId, { renown: 2 })
  return { ok: true, msg: `Construction complete: ${bp.name}!` }
}
