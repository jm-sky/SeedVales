/**
 * Visible stores (render--009): tiered piles (firewood, stone, grain sacks, food crates) drawn from the stock
 * of a household's house (woodpile) and the settlement warehouse. Read-only on the sim; refreshed every 2 s for
 * buildings near the player; one InstancedMesh per template used (piles from `stockpiles.glb`, procedural
 * placeholders if it fails to load).
 * @domain render
 * @subdomain structures
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { Building } from '../sim/types'
import type { CarrionSpot } from './carrionFx'
import { SPOILED_FRAC } from '../config/calibration'
import { hash01, hashString } from '../core/rng'
import { itemDef } from '../data/items'
import { perf } from '../diag/perf'
import { groundHeight } from '../sim/collision'
import { loadGltf, mat4, mergeTemplate, packNode, part, type TemplatePart } from './assets'
import { PILE_TIERS, pileCount, type PileKind, pileNode, tierOf } from './stockpileTiers'

type Item = { obj: THREE.Object3D; matrix: THREE.Matrix4 }

/** Tiers are recomputed within this distance of the player; the last known tier is kept up to FAR_M. */
export const PILE_NEAR_M = 120
export const PILE_FAR_M = 250
const REFRESH_S = 2

interface Slot {
  kind: PileKind
  /** Local offset: lx to the building's right, lz to its front (+Z before rotation). */
  lx: number
  lz: number
}

/** Warehouse yard: stone beside the building, grain and food in front of it. */
const WAREHOUSE_SLOTS: Slot[] = [
  { kind: 'stone', lx: -6.8, lz: 1 },
  { kind: 'grain', lx: -1, lz: 6.4 },
  { kind: 'food', lx: 3.8, lz: 6.4 },
]
const WOODPILE_SLOT: Slot = { kind: 'firewood', lx: 0, lz: 0 }

const PLACEHOLDER_COLOR: Record<PileKind, number> = { firewood: 0x8a6a45, stone: 0x77746f, grain: 0xc8b078, food: 0x8c6a42 }

/** Stacked boxes whose count grows with the tier (used until/unless the models load). */
function placeholder(kind: PileKind, tier: number): Item[] {
  const n = Math.min(tier, 12)
  const out: Item[] = []
  for (let i = 0; i < n; i++) {
    const g = new THREE.BoxGeometry(0.5, 0.3, 0.5).translate(0, 0.15, 0)
    out.push(part(g, PLACEHOLDER_COLOR[kind], mat4(((i % 3) - 1) * 0.55, Math.floor(i / 9) * 0.3, (Math.floor(i / 3) % 3 - 1) * 0.55)))
  }
  return out
}

/** Any food stack at or below the spoiled share of its shelf life (the same threshold as butchering/eating rules). */
export function hasSpoiledFood(inv: Building['inv']): boolean {
  return !!inv?.items.some((s) => s.fresh !== undefined && itemDef(s.id).food !== undefined && s.fresh <= itemDef(s.id).food!.spoilH * SPOILED_FRAC)
}

export class Stockpiles {
  group = new THREE.Group()
  enabled = true
  loaded = false
  drawCalls = 0
  /** Food slots holding spoiled food (render--010): the carrion effect plays over them. Rebuilt at the 2 s cadence, near buildings only. */
  spoiledSpots: CarrionSpot[] = []
  private templates = new Map<string, TemplatePart[]>()
  private meshes: THREE.InstancedMesh[] = []
  /** Last known tier per `buildingId:slotIndex`. */
  private tiers = new Map<string, number>()
  private signature = ''
  private since = REFRESH_S
  private sim: Sim
  private shadows: boolean

  constructor(sim: Sim, shadows: boolean) {
    this.sim = sim
    this.shadows = shadows
  }

  setShadows(on: boolean) {
    this.shadows = on
    for (const m of this.meshes) m.castShadow = on
  }

  async load() {
    try {
      const g = await loadGltf('stockpiles.glb')
      for (const [kind, tiers] of Object.entries(PILE_TIERS) as [PileKind, readonly number[]][]) {
        for (const t of tiers) {
          const node = packNode(g, pileNode(kind, t))
          if (node) this.templates.set(pileNode(kind, t), mergeTemplate([{ obj: node, matrix: new THREE.Matrix4() }]))
        }
      }
      this.loaded = true
    } catch (e) {
      console.warn('Stockpile assets failed, using procedural placeholders', e)
    }
    this.signature = ''
    this.since = REFRESH_S
  }

  private template(kind: PileKind, tier: number): TemplatePart[] {
    const key = pileNode(kind, tier)
    let t = this.templates.get(key)
    if (!t) this.templates.set(key, (t = mergeTemplate(placeholder(kind, tier))))
    return t
  }

  private slotsOf(b: Building): { slots: Slot[]; inv: Building['inv'] } | null {
    if (b.kind === 'warehouse') return { slots: WAREHOUSE_SLOTS, inv: b.inv }
    if (b.kind === 'woodpile' && b.householdId !== undefined) {
      const house = this.sim.state.buildings.find((h) => h.kind === 'house' && h.householdId === b.householdId)
      return { slots: [WOODPILE_SLOT], inv: house?.inv }
    }
    return null
  }

  /** Called every frame; does work every REFRESH_S seconds (and on `force`). */
  update(dt: number, px: number, pz: number, force = false) {
    this.group.visible = this.enabled
    if (!this.enabled) return
    this.since += dt
    if (!force && this.since < REFRESH_S) return
    this.since = 0
    const t0 = performance.now()
    const byKey = new Map<string, THREE.Matrix4[]>()
    const live = new Set<string>()
    const spoiled: CarrionSpot[] = []
    let sig = ''
    for (const b of this.sim.state.buildings) {
      const d = Math.hypot(b.x - px, b.z - pz)
      if (d > PILE_FAR_M) continue
      const s = this.slotsOf(b)
      if (!s) continue
      const c = Math.cos(b.rot)
      const sn = Math.sin(b.rot)
      s.slots.forEach((slot, i) => {
        const id = `${b.id}:${i}`
        let tier = this.tiers.get(id) ?? 0
        if (d <= PILE_NEAR_M || !this.tiers.has(id)) tier = s.inv ? tierOf(slot.kind, pileCount(slot.kind, s.inv)) : 0
        this.tiers.set(id, tier)
        live.add(id)
        if (tier === 0) return
        const wx = b.x + slot.lx * c + slot.lz * sn
        const wz = b.z - slot.lx * sn + slot.lz * c
        const yaw = b.rot + (hash01(hashString(b.id), i, 7) - 0.5) * (slot.kind === 'firewood' ? 0.2 : 0.5)
        if (slot.kind === 'food' && d <= PILE_NEAR_M && hasSpoiledFood(s.inv)) spoiled.push({ x: wx, y: groundHeight(this.sim, wx, wz), z: wz, id: hashString(id) % 100000 })
        const key = pileNode(slot.kind, tier)
        const arr = byKey.get(key) ?? []
        arr.push(mat4(wx, groundHeight(this.sim, wx, wz), wz, yaw))
        byKey.set(key, arr)
        sig += `${id}=${tier};`
      })
    }
    this.spoiledSpots = spoiled
    for (const id of this.tiers.keys()) if (!live.has(id)) this.tiers.delete(id)
    if (sig !== this.signature) {
      this.signature = sig
      this.rebuild(byKey)
    }
    perf.record('render.stockpiles', performance.now() - t0)
  }

  private rebuild(byKey: Map<string, THREE.Matrix4[]>) {
    for (const m of this.meshes) {
      this.group.remove(m)
      m.dispose()
    }
    this.meshes = []
    for (const [key, mats] of byKey) {
      const [, kind, tier] = key.split('_') as [string, PileKind, string]
      for (const p of this.template(kind, Number(tier))) {
        const im = new THREE.InstancedMesh(p.geometry, p.material, mats.length)
        mats.forEach((m, i) => im.setMatrixAt(i, m))
        im.instanceMatrix.needsUpdate = true
        im.computeBoundingSphere()
        im.castShadow = this.shadows
        im.receiveShadow = true
        this.group.add(im)
        this.meshes.push(im)
      }
    }
    this.drawCalls = this.meshes.length
    perf.gauge('render.stockpileDrawCalls', this.meshes.length)
  }
}
