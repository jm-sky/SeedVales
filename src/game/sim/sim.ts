/**
 * Simulation root: owns mutable GameState + read-only world foundation and runs systems with
 * distance-based update frequency (LOD). No rendering/UI imports here.
 * @domain sim
 */
import type { WorldData } from '../world/types'
import type { Actor, Animal, Building, GameState, Human, Projectile, WeatherState } from './types'
import { CALENDAR_SPEED, SIM_LOD } from '../config/calibration'
import { Rng } from '../core/rng'
import { perf } from '../diag/perf'
import { NodeCache } from '../world/nodes'
import { SpatialHash } from '../world/spatial'
import { Terrain, TerrainEdits } from '../world/terrain'
import { CHUNK_M } from '../world/types'

export type SimEvent =
  | { type: 'hit'; x: number; y: number; z: number; targetId: number; dmg: number }
  | { type: 'death'; id: number }
  | { type: 'sound'; kind: string; x: number; z: number }
  | { type: 'nodes'; chunk: string }
  | { type: 'buildings' }
  | { type: 'terrain'; chunk: string }
  | { type: 'shot'; id: number }
  | { type: 'swing'; id: number }

export interface SimSystem {
  name: string
  /** Gameplay-second interval (0 = every step). */
  interval: number
  run(sim: Sim, dt: number): void
}

export class Sim {
  terrain: Terrain
  nodes: NodeCache
  actors = new SpatialHash<Actor>(32)
  rng: Rng
  events: SimEvent[] = []
  /** Transient (not saved): arrows in flight. */
  projectiles: Projectile[] = []
  systems: SimSystem[] = []
  private sysAcc = new Map<string, number>()
  private byId = new Map<number, Actor>()
  private buildingGrid = new Map<string, Building[]>()
  bridges: (Building & { deck?: number })[] = []
  /** Time multiplier (sleep/long work). Whole simulation is accelerated. */
  timeScale = 1
  /** Set by threats to interrupt acceleration. */
  interruptReason: string | null = null
  paused = false

  world: WorldData
  state: GameState

  constructor(world: WorldData, state: GameState) {
    this.world = world
    this.state = state
    this.terrain = new Terrain(world, TerrainEdits.fromJSON(state.terrainEdits))
    this.nodes = new NodeCache(this.terrain)
    this.rng = new Rng(state.rng)
    this.reindex()
  }

  get player() {
    return this.state.player
  }

  get weather(): WeatherState {
    return this.state.weather
  }

  /** Rebuild lookups after load. */
  reindex() {
    this.actors.clear()
    this.byId.clear()
    const all: Actor[] = [this.state.player, ...this.state.npcs, ...this.state.animals]
    for (const a of all) {
      this.actors.insert(a)
      this.byId.set(a.id, a)
    }
    this.rebuildBuildingIndex()
  }

  rebuildBuildingIndex() {
    this.buildingGrid.clear()
    for (const b of this.state.buildings) {
      const k = `${Math.floor(b.x / 64)},${Math.floor(b.z / 64)}`
      let arr = this.buildingGrid.get(k)
      if (!arr) this.buildingGrid.set(k, (arr = []))
      arr.push(b)
    }
    this.bridges = this.state.buildings.filter((b) => b.kind === 'bridge')
    this.events.push({ type: 'buildings' })
  }

  buildingsNear(x: number, z: number, r: number): Building[] {
    const out: Building[] = []
    for (let i = Math.floor((x - r) / 64); i <= Math.floor((x + r) / 64); i++) {
      for (let j = Math.floor((z - r) / 64); j <= Math.floor((z + r) / 64); j++) {
        const arr = this.buildingGrid.get(`${i},${j}`)
        if (arr) for (const b of arr) if (Math.abs(b.x - x) < r + b.hw + b.hd && Math.abs(b.z - z) < r + b.hw + b.hd) out.push(b)
      }
    }
    return out
  }

  building(id: string | undefined): Building | undefined {
    if (!id) return undefined
    return this.state.buildings.find((b) => b.id === id)
  }

  actor(id: number | undefined): Actor | undefined {
    return id === undefined ? undefined : this.byId.get(id)
  }

  human(id: number | undefined): Human | undefined {
    const a = this.actor(id)
    return a && a.kind !== 'animal' ? (a as Human) : undefined
  }

  addAnimal(a: Animal) {
    this.state.animals.push(a)
    this.actors.insert(a)
    this.byId.set(a.id, a)
  }

  removeAnimal(a: Animal) {
    const i = this.state.animals.indexOf(a)
    if (i >= 0) this.state.animals.splice(i, 1)
    this.actors.remove(a)
    this.byId.delete(a.id)
  }

  nextId() {
    return this.state.nextId++
  }

  message(text: string, kind: 'info' | 'good' | 'bad' | 'quest' = 'info') {
    this.state.messages.push({ t: this.state.time.cal, text, kind })
    if (this.state.messages.length > 60) this.state.messages.splice(0, this.state.messages.length - 60)
  }

  emit(e: SimEvent) {
    if (this.events.length < 500) this.events.push(e)
  }

  markNodeChunk(id: string) {
    this.emit({ type: 'nodes', chunk: id.split(':')[0]! })
  }

  markTerrain(x: number, z: number, r: number) {
    for (let cx = Math.floor((x - r) / CHUNK_M); cx <= Math.floor((x + r) / CHUNK_M); cx++) {
      for (let cz = Math.floor((z - r) / CHUNK_M); cz <= Math.floor((z + r) / CHUNK_M); cz++) {
        this.emit({ type: 'terrain', chunk: `${cx},${cz}` })
      }
    }
  }

  /** LOD update interval for an actor at distance d from player. */
  lodInterval(d: number): number {
    for (const l of SIM_LOD) if (d <= l.maxDist) return l.interval
    return SIM_LOD[SIM_LOD.length - 1]!.interval
  }

  /**
   * Advance by dt gameplay seconds (already multiplied by timeScale). Internally sub-stepped.
   * Calendar advances dt × CALENDAR_SPEED.
   */
  step(dt: number) {
    if (this.paused) return
    perf.begin('sim.tick')
    const maxSub = 0.1 * Math.max(1, this.timeScale / 4)
    let left = dt
    let guard = 0
    while (left > 1e-6 && guard++ < 400) {
      const d = Math.min(maxSub, left)
      left -= d
      this.state.time.play += d
      this.state.time.cal += d * CALENDAR_SPEED
      for (const s of this.systems) {
        if (s.interval <= 0) {
          perf.detail(`sim.${s.name}`, () => s.run(this, d))
          continue
        }
        const acc = (this.sysAcc.get(s.name) ?? 0) + d
        if (acc >= s.interval) {
          this.sysAcc.set(s.name, 0)
          perf.measure(`sim.${s.name}`, () => s.run(this, acc))
        } else this.sysAcc.set(s.name, acc)
      }
      if (this.interruptReason && this.timeScale > 1) break
    }
    this.state.rng = this.rng.state
    perf.end('sim.tick')
  }
}
