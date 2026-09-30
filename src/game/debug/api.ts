import type { SpeciesId } from '../data/species'
/**
 * Debug/test API on window.__sv — separate from normal player features. Used by e2e scenarios and
 * benchmarks to prepare state (time, position, equipment) and read simulation state.
 * UI interactions under test must still go through the UI.
 * @domain debug
 */
import type { Game } from '../Game'
import { perf } from '../diag/perf'
import { addItem, countItem, newStack } from '../sim/inventory'
import { makeAnimal } from '../sim/newGame'
import { hp } from '../sim/vitals'

export interface DebugApi {
  game: Game
  perf: typeof perf
  teleport(x: number, z: number): void
  teleportToSettlement(id: number, dx?: number, dz?: number): void
  setHour(h: number): void
  give(id: string, qty?: number): void
  count(id: string): number
  spawn(species: SpeciesId, dx: number, dz: number): number
  state(): Record<string, unknown>
  step(seconds: number, frame?: number): void
  /** Simulation-only fast-forward (no rendering) — test setup. */
  simStep(seconds: number): void
  setNeeds(v: Partial<{ hunger: number; thirst: number; vigor: number; stamina: number }>): void
  face(x: number, z: number): void
}

export function installDebugApi(game: Game) {
  const sim = () => game.sim
  const api: DebugApi = {
    game,
    perf,
    teleport: (x, z) => game.debugTeleport(x, z),
    teleportToSettlement: (id, dx = 0, dz = 20) => {
      const s = sim().world.settlements[id]!
      game.debugTeleport(s.x + dx, s.z + dz)
    },
    setHour: (h) => {
      const s = sim().state.time
      s.cal = Math.floor(s.cal / 86400) * 86400 + h * 3600
    },
    give: (id, qty = 1) => addItem(sim().player.inv, newStack(id, qty)),
    count: (id) => countItem(sim().player.inv, id),
    spawn: (species, dx, dz) => {
      const p = sim().player
      const a = makeAnimal(sim().nextId(), species, 'adult', p.x + dx, p.z + dz, sim().terrain.heightAt(p.x + dx, p.z + dz), sim().rng)
      sim().addAnimal(a)
      return a.id
    },
    state: () => {
      const s = sim().state
      const p = s.player
      return {
        cal: s.time.cal,
        play: s.time.play,
        x: p.x,
        z: p.z,
        hp: hp(p.vitals),
        vitals: { ...p.vitals, parts: undefined },
        money: p.money,
        inv: p.inv.items.map((i) => `${i.id}×${i.qty}`),
        main: p.eq.main?.id,
        activity: s.px.activity?.kind,
        timeScale: sim().timeScale,
        weather: s.weather.kind,
        quests: s.quests.map((q) => ({ id: q.id, status: q.status, kills: q.kills, need: q.killsNeeded })),
        rep: s.settlements.map((st) => st.rep),
        badges: Object.keys(s.px.badges),
        sites: s.sites.length,
        built: s.buildings.filter((b) => b.playerBuilt).map((b) => b.kind),
        npcGoals: s.npcs.slice(0, 40).map((n) => `${n.name}:${n.profession ?? n.age}:${n.ai.goal}`),
        target: game.target?.label,
        options: game.options.map((o) => o.id),
        panel: game.panel,
        messages: s.messages.slice(-8).map((m) => m.text),
      }
    },
    step: (seconds, frame = 0.1) => {
      for (let t = 0; t < seconds; t += frame) game.frame(frame)
    },
    simStep: (seconds) => {
      const s = sim()
      for (let t = 0; t < seconds; t += 0.1) s.step(0.1 * s.timeScale)
    },
    setNeeds: (v) => Object.assign(sim().player.vitals, v),
    face: (x, z) => {
      const p = sim().player
      p.rot = Math.atan2(x - p.x, z - p.z)
      game.renderer.rig.yaw = p.rot
    },
  }
  ;(window as unknown as { __sv: DebugApi }).__sv = api
}
