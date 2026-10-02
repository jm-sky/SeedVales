/**
 * Simulation root: owns mutable GameState + read-only world foundation and runs systems with
 * distance-based update frequency (LOD). No rendering/UI imports here.
 * @domain sim
 */
import type { WorldData } from '../world/types'
import type { EventLog } from './eventLog'
import type { Actor, Animal, Building, Corpse, GameState, GroundItem, Human, Projectile, Trace, WeatherState } from './types'
import { CALENDAR_SPEED, SIM_LOD } from '../config/calibration'
import { Rng } from '../core/rng'
import { perf } from '../diag/perf'
import { NodeCache } from '../world/nodes'
import { SpatialHash } from '../world/spatial'
import { Terrain, TerrainEdits } from '../world/terrain'
import { CHUNK_M } from '../world/types'
import { startEventLog, stopEventLog } from './eventLog'
import { LandmarkSolids } from './landmarkSolids'

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
  /** WORLD-11 landmark colliders (immutable with the world). */
  readonly landmarkSolids: LandmarkSolids
  actors = new SpatialHash<Actor>(32)
  rng: Rng
  events: SimEvent[] = []
  /** Transient (not saved): arrows in flight. */
  projectiles: Projectile[] = []
  systems: SimSystem[] = []
  private sysAcc = new Map<string, number>()
  private byId = new Map<number, Actor>()
  private buildingGrid = new Map<string, Building[]>()
  private buildingById = new Map<string, Building>()
  private buildingsByHousehold = new Map<number, Building[]>()
  private buildingsBySettlementKind = new Map<string, Building[]>()
  private npcsBySettlement = new Map<number, Human[]>()
  /** Spatial indices for items on the ground and corpses (PERF-01: no full scans per actor). */
  private groundIdx = new SpatialHash<GroundItem>(16)
  private corpseIdx = new SpatialHash<Corpse>(32)
  private traceIdx = new SpatialHash<Trace>(16)
  bridges: Building[] = []
  /** Time multiplier (sleep/long work). Whole simulation is accelerated. */
  timeScale = 1
  /** Set by threats to interrupt acceleration. */
  interruptReason: string | null = null
  paused = false
  /** verify--001: event log + conservation ledger (null = off, zero cost; never saved). */
  eventLog: EventLog | null = null

  world: WorldData
  state: GameState

  constructor(world: WorldData, state: GameState) {
    this.world = world
    this.state = state
    this.terrain = new Terrain(world, TerrainEdits.fromJSON(state.terrainEdits))
    this.nodes = new NodeCache(this.terrain)
    this.landmarkSolids = new LandmarkSolids(world.landmarks)
    this.rng = new Rng(state.rng)
    this.reindex()
  }

  enableEventLog(cap?: number): EventLog {
    return (this.eventLog = startEventLog(this, cap))
  }

  disableEventLog() {
    this.eventLog = null
    stopEventLog()
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
    this.npcsBySettlement.clear()
    for (const n of this.state.npcs) {
      let arr = this.npcsBySettlement.get(n.settlementId)
      if (!arr) this.npcsBySettlement.set(n.settlementId, (arr = []))
      arr.push(n)
    }
    this.groundIdx.clear()
    for (const g of this.state.ground) this.groundIdx.insert(g)
    this.corpseIdx.clear()
    for (const c of this.state.corpses) this.corpseIdx.insert(c)
    this.traceIdx.clear()
    for (const t of this.state.traces) this.traceIdx.insert(t)
    this.rebuildBuildingIndex()
  }

  rebuildBuildingIndex() {
    this.buildingGrid.clear()
    this.buildingById.clear()
    this.buildingsByHousehold.clear()
    this.buildingsBySettlementKind.clear()
    const push = <K>(m: Map<K, Building[]>, k: K, b: Building) => {
      const arr = m.get(k)
      if (arr) arr.push(b)
      else m.set(k, [b])
    }
    for (const b of this.state.buildings) {
      this.buildingById.set(b.id, b)
      if (b.householdId !== undefined) push(this.buildingsByHousehold, b.householdId, b)
      push(this.buildingsBySettlementKind, `${b.settlementId}:${b.kind}`, b)
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
    return id ? this.buildingById.get(id) : undefined
  }

  householdBuildings(householdId: number): readonly Building[] {
    return this.buildingsByHousehold.get(householdId) ?? []
  }

  settlementBuildings(settlementId: number, kind: Building['kind']): readonly Building[] {
    return this.buildingsBySettlementKind.get(`${settlementId}:${kind}`) ?? []
  }

  /** NPCs of a settlement (population is fixed per playthrough in v1). */
  npcsOf(settlementId: number): readonly Human[] {
    return this.npcsBySettlement.get(settlementId) ?? []
  }

  addGround(g: GroundItem) {
    this.state.ground.push(g)
    this.groundIdx.insert(g)
  }

  removeGround(g: GroundItem) {
    const i = this.state.ground.indexOf(g)
    if (i >= 0) this.state.ground.splice(i, 1)
    this.groundIdx.remove(g)
  }

  groundNear(x: number, z: number, r: number): GroundItem[] {
    return this.groundIdx.query(x, z, r)
  }

  addCorpse(c: Corpse) {
    this.state.corpses.push(c)
    this.corpseIdx.insert(c)
  }

  removeCorpse(c: Corpse) {
    const i = this.state.corpses.indexOf(c)
    if (i >= 0) this.state.corpses.splice(i, 1)
    this.corpseIdx.remove(c)
  }

  corpsesNear(x: number, z: number, r: number): Corpse[] {
    return this.corpseIdx.query(x, z, r)
  }

  addTrace(t: Trace) {
    this.state.traces.push(t)
    this.traceIdx.insert(t)
  }

  removeTrace(t: Trace) {
    const i = this.state.traces.indexOf(t)
    if (i >= 0) this.state.traces.splice(i, 1)
    this.traceIdx.remove(t)
  }

  tracesNear(x: number, z: number, r: number): Trace[] {
    return this.traceIdx.query(x, z, r)
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
