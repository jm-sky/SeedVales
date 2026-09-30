/**
 * Completion handlers for player activities (progress-bar actions). Resources change only here,
 * so an interrupted activity leaves the world consistent.
 * @domain player
 */
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { PlayerActivity } from './types'
import { recipeById } from '../data/recipes'
import { breakChunk, burnDen, buryCorpse, butcher, dig, drinkFromWater, fellTree, fillContainers, gatherNode, levelTerrain, mineRock, raiseTerrain, repairBuilding } from './actions'
import { applyBuildProgress } from './build'
import { completeRoast } from './cooking'
import { completeCraft } from './craft'

type Done = (sim: Sim, a: PlayerActivity) => ActionResult | null

const node = (sim: Sim, a: PlayerActivity) => (a.ref ? sim.nodes.byId(a.ref) : undefined)
const xz = (a: PlayerActivity) => (a.data ?? '0,0').split(',').map(Number) as [number, number, number?]

export const ACTIVITY_DONE: Record<string, Done> = {
  chop: (sim, a) => {
    const n = node(sim, a)
    return n ? fellTree(sim, sim.player, n) : null
  },
  mine: (sim, a) => {
    const n = node(sim, a)
    return n ? mineRock(sim, sim.player, n) : null
  },
  roast: (sim, a) => completeRoast(sim, sim.player, Number(a.data) || 1),
  break_chunk: (sim, a) => {
    const g = sim.state.ground.find((gg) => gg.id === Number(a.ref))
    return g ? breakChunk(sim, sim.player, g) : { ok: false, msg: 'Odłamek zniknął.' }
  },
  gather: (sim, a) => {
    const n = node(sim, a)
    return n ? gatherNode(sim, sim.player, n) : null
  },
  butcher: (sim, a) => {
    const c = sim.state.corpses.find((cc) => cc.id === Number(a.ref))
    return c ? butcher(sim, sim.player, c) : { ok: false, msg: 'Zwłoki zniknęły.' }
  },
  bury: (sim, a) => {
    const c = sim.state.corpses.find((cc) => cc.id === Number(a.ref))
    return c ? buryCorpse(sim, sim.player, c) : null
  },
  dig: (sim, a) => {
    const [x, z] = xz(a)
    return dig(sim, sim.player, x, z)
  },
  level: (sim, a) => {
    const [x, z, t] = xz(a)
    return levelTerrain(sim, sim.player, x, z, t ?? sim.terrain.heightAt(x, z))
  },
  raise: (sim, a) => {
    const [x, z] = xz(a)
    return raiseTerrain(sim, sim.player, x, z)
  },
  drink: (sim, a) => {
    const [x, z] = xz(a)
    return drinkFromWater(sim, sim.player, x, z, a.ref === 'well')
  },
  fill: (sim, a) => {
    const [x, z] = xz(a)
    return fillContainers(sim.player, x, z, sim, a.ref === 'well')
  },
  craft: (sim, a) => {
    const r = recipeById(a.data ?? '')
    return r ? completeCraft(sim, sim.player, r) : null
  },
  build: (sim, a) => applyBuildProgress(sim, a.ref ?? '', a.total),
  build_partial: (sim, a) => (a.elapsed > 1 ? applyBuildProgress(sim, a.ref ?? '', a.elapsed) : null),
  repair: (sim, a) => {
    const b = sim.building(a.ref)
    return b ? repairBuilding(sim, sim.player, b) : null
  },
  burn_den: (sim, a) => {
    const d = sim.state.dens.find((dd) => dd.id === a.ref)
    return d ? burnDen(sim, sim.player, d) : null
  },
  sleep: (sim) => ({ ok: true, msg: `Budzisz się. Wigor: ${Math.round(sim.player.vitals.vigor)}%` }),
  rest: () => ({ ok: true, msg: 'Odpocząłeś.' }),
  heal_self: () => ({ ok: true, msg: 'Opatrzono rany.' }),
}
