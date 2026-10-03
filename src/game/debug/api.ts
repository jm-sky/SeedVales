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
import { forceOfferQuest } from '../sim/questEngine'
import { hp } from '../sim/vitals'
import { openSpot } from './openSpot'

export interface DebugApi {
  game: Game
  perf: typeof perf
  teleport(x: number, z: number): void
  /** Open flat spot ≥ minR m from a settlement centre (layout-independent test setup). */
  openSpot(minR?: number, settlementId?: number): { x: number; z: number }
  teleportToSettlement(id: number, dx?: number, dz?: number): void
  /** WORLD-05: surface spot `back` m in front of cave `index`'s mouth, facing it (default 4 m). */
  teleportToCave(index: number, back?: number): void
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
  pause(on: boolean): void
  /** Draw calls per render subsystem for one extra frame (render--003 attribution). */
  drawAttribution(): ReturnType<Game['renderer']['drawAttribution']>
  /** Authored quests (quests--001): offers the quest now, ignoring its start conditions; false when the cast does not resolve. */
  forceQuest(id: string): boolean
  /** Teleport next to a point and face it (distance d). */
  approach(x: number, z: number, d?: number): void
  /**
   * Frame pacing for device measurements (PERF-02, D-PERF-2): RAF interval quantiles and share of slow
   * frames since the last `perf.reset()`, plus GPU frame time when the timer extension exists (else null).
   */
  pacing(): PacingReport
}

export interface PacingReport {
  raf: { samples: number; p50: number; p95: number; p99: number; over16: number; over33: number; over50: number }
  frameCpu: { p50: number; p95: number; p99: number }
  gpu: { available: boolean; samples: number; p50: number; p95: number; p99: number; dropped: number } | null
}

export function installDebugApi(game: Game) {
  const sim = () => game.sim
  const api: DebugApi = {
    game,
    perf,
    teleport: (x, z) => game.debugTeleport(x, z),
    pacing: () => {
      const timers = perf.report().timers
      const t = (k: string) => timers.find((x) => x.name === k)
      const raf = t('raf.interval')
      const fr = t('frame')
      const g = t('gpu.frame')
      const gpu = game.renderer.gpu
      const r2 = (v = 0) => Math.round(v * 100) / 100
      return {
        raf: { samples: raf?.samples ?? 0, p50: r2(raf?.median), p95: r2(raf?.p95), p99: r2(raf?.p99), over16: r2(perf.shareAbove('raf.interval', 16.7)), over33: r2(perf.shareAbove('raf.interval', 33.3)), over50: r2(perf.shareAbove('raf.interval', 50)) },
        frameCpu: { p50: r2(fr?.median), p95: r2(fr?.p95), p99: r2(fr?.p99) },
        gpu: gpu.available ? { available: true, samples: g?.samples ?? 0, p50: r2(g?.median), p95: r2(g?.p95), p99: r2(g?.p99), dropped: gpu.dropped } : null,
      }
    },
    drawAttribution: () => game.renderer.drawAttribution(),
    openSpot: (minR, sid) => openSpot(sim(), minR, sid),
    forceQuest: (id) => forceOfferQuest(sim(), id),
    teleportToSettlement: (id, dx = 0, dz = 20) => {
      const s = sim().world.settlements[id]!
      game.debugTeleport(s.x + dx, s.z + dz)
    },
    teleportToCave: (index, back = 4) => {
      const c = sim().world.caves[index]
      if (!c) return
      game.debugTeleport(c.x - Math.sin(c.yaw) * back, c.z - Math.cos(c.yaw) * back)
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
        authored: Object.fromEntries(Object.entries(s.authoredQuests).map(([id, q]) => [id, { status: q.status, stage: q.stage, ending: q.ending, choice: q.choice }])),
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
    pause: (on) => {
      sim().paused = on
    },
    approach: (x, z, d = 1.6) => {
      const p = sim().player
      const a = Math.atan2(p.x - x, p.z - z)
      game.debugTeleport(x + Math.sin(a) * d, z + Math.cos(a) * d)
      p.rot = Math.atan2(x - p.x, z - p.z)
      game.renderer.rig.yaw = p.rot
    },
    face: (x, z) => {
      const p = sim().player
      p.rot = Math.atan2(x - p.x, z - p.z)
      game.renderer.rig.yaw = p.rot
    },
  }
  const w = window as unknown as { __sv?: DebugApi }
  w.__sv = api
  // Uninstall on unmount so a stopped game is not kept alive by the global (review 009 F-05).
  return () => {
    if (w.__sv === api) delete w.__sv
  }
}
