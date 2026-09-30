/**
 * Structures: houses/warehouse/inn composed from Quaternius Medieval Village modules, props from
 * Fantasy Props, the rest procedural low-poly. Each template is merged per material and drawn as
 * InstancedMesh (draw calls ≈ templates × materials, independent of building count).
 * @domain render
 * @subdomain structures
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { Building, ConstructionSite } from '../sim/types'
import { hash01, hashString } from '../core/rng'
import { blueprintById } from '../data/recipes'
import { perf } from '../diag/perf'
import { groundHeight } from '../sim/collision'
import { loadGltf, mat4, mergeTemplate, packNode, part, type TemplatePart } from './assets'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Item = { obj: THREE.Object3D; matrix: THREE.Matrix4 }

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)
const cyl = (r: number, h: number, seg = 7) => new THREE.CylinderGeometry(r, r, h, seg).translate(0, h / 2, 0)

function proceduralTemplates(): Record<string, Item[]> {
  const t: Record<string, Item[]> = {}
  const stone = 0x8a8680
  const wood = 0x7a5a3a
  const darkWood = 0x5a4028
  t.well = [
    part(cyl(1.0, 0.8, 9), stone),
    part(cyl(0.12, 2.2), wood, mat4(-0.9, 0, 0)),
    part(cyl(0.12, 2.2), wood, mat4(0.9, 0, 0)),
    part(new THREE.ConeGeometry(1.4, 0.8, 4).rotateY(Math.PI / 4).translate(0, 2.4, 0), darkWood),
    part(cyl(0.9, 0.05, 9), 0x2f4a5e, mat4(0, 0.6, 0)),
  ]
  t.campfire = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    t.campfire.push(part(new THREE.DodecahedronGeometry(0.22, 0), stone, mat4(Math.cos(a) * 0.8, 0.1, Math.sin(a) * 0.8)))
  }
  for (let i = 0; i < 3; i++) t.campfire.push(part(cyl(0.07, 0.9).rotateZ(1.2).translate(0.3, 0, 0), darkWood, mat4(0, 0.1, 0, (i / 3) * Math.PI * 2)))
  t.noticeboard = [part(box(0.12, 2.2, 0.12), wood, mat4(-0.8, 0, 0)), part(box(0.12, 2.2, 0.12), wood, mat4(0.8, 0, 0)), part(box(1.9, 1.1, 0.08), 0x9a7a52, mat4(0, 0.9, 0)), part(box(0.5, 0.35, 0.02), 0xe8dfc8, mat4(-0.4, 1.35, 0.05)), part(box(0.4, 0.5, 0.02), 0xe8dfc8, mat4(0.35, 1.2, 0.05))]
  t.soil = [part(box(2, 0.12, 2), 0x5a4128, mat4(0, -0.06, 0))]
  t.herbsoil = [part(box(2, 0.14, 2), 0x4a3a24, mat4(0, -0.06, 0))]
  t.woodpile = [0, 1, 2].flatMap((row) => [0, 1, 2, 3].map((c) => part(cyl(0.18, 2.6).rotateZ(Math.PI / 2).translate(1.3, 0, 0), 0x8a6a45, mat4(-1.3, 0.18 + row * 0.33, -0.5 + c * 0.36 + (row % 2) * 0.18))))
  t.dryrack = [part(box(0.1, 1.8, 0.1), wood, mat4(-1.4, 0, 0)), part(box(0.1, 1.8, 0.1), wood, mat4(1.4, 0, 0)), part(box(3, 0.08, 0.08), wood, mat4(0, 1.6, 0)), part(box(0.4, 0.6, 0.05), 0x8a3a2a, mat4(-0.6, 0.95, 0)), part(box(0.4, 0.6, 0.05), 0x8a3a2a, mat4(0.5, 0.95, 0))]
  t.spit = [part(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 5).rotateZ(0.35).translate(-0.9, 0.55, 0), darkWood), part(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 5).rotateZ(-0.35).translate(0.9, 0.55, 0), darkWood), part(cyl(0.03, 2.2).rotateZ(Math.PI / 2).translate(1.1, 0, 0), wood, mat4(0, 1.05, 0)), part(box(1.4, 0.04, 0.5), 0x4a4a48, mat4(0, 0.6, 0))]
  t.torchpost = [part(cyl(0.07, 2.4), darkWood), part(cyl(0.12, 0.25), 0x3a3a3a, mat4(0, 2.35, 0))]
  t.trough = [part(box(2.4, 0.5, 0.8), 0x6a4a2e), part(box(2.2, 0.05, 0.6), 0x2f4a5e, mat4(0, 0.42, 0))]
  t.palisade = [-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => part(new THREE.CylinderGeometry(0.2, 0.22, 3 + (i % 2) * 0.3, 6).translate(0, 1.5, 0), 0x6a4a2e, mat4(x * 1.2, 0, 0)))
  t.bridge = [
    part(box(3.6, 0.25, 1), 0x7a5a3a),
    part(box(0.15, 0.9, 1), darkWood, mat4(-1.75, 0, 0)),
    part(box(0.15, 0.9, 1), darkWood, mat4(1.75, 0, 0)),
  ]
  t.site = [
    part(box(0.1, 1.2, 0.1), 0xb08a5a, mat4(-1, 0, -1)),
    part(box(0.1, 1.2, 0.1), 0xb08a5a, mat4(1, 0, -1)),
    part(box(0.1, 1.2, 0.1), 0xb08a5a, mat4(-1, 0, 1)),
    part(box(0.1, 1.2, 0.1), 0xb08a5a, mat4(1, 0, 1)),
    part(box(2.1, 0.03, 0.03), 0xd8c89a, mat4(0, 1, -1)),
    part(box(2.1, 0.03, 0.03), 0xd8c89a, mat4(0, 1, 1)),
  ]
  t.foundation = [part(box(2, 1.2, 2), 0x77736b, mat4(0, -1.0, 0))]
  // Fallback house (before assets load / if missing).
  t.house_fallback = [part(box(8, 3, 6), 0xd8cdb4), part(new THREE.ConeGeometry(5.8, 2.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.8).translate(0, 4.3, 0), 0x8a4a2a)]
  return t
}

/** Composes a house-like building from modular walls (2 m) and a roof. */
function composeHouse(v: GLTF, W: number, D: number, style: 'plaster' | 'brick', roof: string, roofRot: number, roofScale: number, seed: number): Item[] {
  const items: Item[] = []
  const n = (name: string) => packNode(v, name)!
  const wall = style === 'plaster' ? 'Wall_Plaster_Straight' : 'Wall_UnevenBrick_Straight'
  const door = style === 'plaster' ? 'Wall_Plaster_Door_Round' : 'Wall_UnevenBrick_Door_Flat'
  const win = style === 'plaster' ? 'Wall_Plaster_Window_Wide_Round' : 'Wall_UnevenBrick_Window_Wide_Flat'
  const nx = Math.round(W / 2)
  const nz = Math.round(D / 2)
  const pick = (i: number, count: number, front: boolean) => {
    if (front && i === Math.floor(count / 2)) return door
    return hash01(seed, i, front ? 1 : 2) < 0.45 ? win : style === 'plaster' && hash01(seed, i, 3) < 0.3 ? 'Wall_Plaster_WoodGrid' : wall
  }
  for (let i = 0; i < nx; i++) {
    const x = -W / 2 + 1 + i * 2
    items.push({ obj: n(pick(i, nx, true)), matrix: mat4(x, 0, D / 2, 0) })
    items.push({ obj: n(pick(i, nx, false)), matrix: mat4(-x, 0, -D / 2, Math.PI) })
  }
  for (let i = 0; i < nz; i++) {
    const z = -D / 2 + 1 + i * 2
    items.push({ obj: n(i === 1 ? win : wall), matrix: mat4(W / 2, 0, -z, Math.PI / 2) })
    items.push({ obj: n(wall), matrix: mat4(-W / 2, 0, z, -Math.PI / 2) })
  }
  const corner = style === 'plaster' ? 'Corner_Exterior_Wood' : 'Corner_Exterior_Wood'
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) items.push({ obj: n(corner), matrix: mat4((cx * W) / 2, 0, (cz * D) / 2) })
  items.push({ obj: n(roof), matrix: mat4(0, 3.1, 0, roofRot, roofScale, 1, roofScale) })
  items.push({ obj: n('Prop_Chimney'), matrix: mat4(W / 4, 3.4, -D / 4) })
  return items
}

interface InstanceSpec {
  key: string
  matrix: THREE.Matrix4
}

export class Structures {
  group = new THREE.Group()
  private templates = new Map<string, TemplatePart[]>()
  private meshes: THREE.InstancedMesh[] = []
  loaded = false
  drawCalls = 0
  private sim: Sim

  constructor(sim: Sim) {
    this.sim = sim
    for (const [k, items] of Object.entries(proceduralTemplates())) this.templates.set(k, mergeTemplate(items))
  }

  async load() {
    try {
      const [v, p] = await Promise.all([loadGltf('village.glb'), loadGltf('props.glb')])
      const T = (k: string, items: Item[]) => this.templates.set(k, mergeTemplate(items))
      T('house_a', composeHouse(v, 8, 6, 'plaster', 'Roof_RoundTiles_6x8', Math.PI / 2, 1, 1))
      T('house_b', composeHouse(v, 8, 6, 'brick', 'Roof_RoundTiles_6x8', Math.PI / 2, 1, 2))
      T('house_c', composeHouse(v, 8, 6, 'plaster', 'Roof_RoundTiles_6x8', Math.PI / 2, 1, 3))
      T('warehouse', composeHouse(v, 10, 8, 'brick', 'Roof_RoundTiles_8x10', Math.PI / 2, 1, 4))
      T('inn', composeHouse(v, 12, 10, 'plaster', 'Roof_RoundTiles_8x10', Math.PI / 2, 1.22, 5))
      T('shed', composeHouse(v, 4, 4, 'brick', 'Roof_RoundTiles_4x4', 0, 1, 6))
      T('market', [{ obj: packNode(p, 'Stall_Cart_Empty')!, matrix: mat4(0.6, 0, 0) }, { obj: packNode(p, 'Barrel')!, matrix: mat4(-2.4, 0, 0.4) }, { obj: packNode(p, 'FarmCrate_Carrot')!, matrix: mat4(-2.2, 0, -0.6) }])
      T('anvil', [{ obj: packNode(p, 'Anvil_Log')!, matrix: mat4() }, { obj: packNode(p, 'Workbench')!, matrix: mat4(0, 0, -1.4) }, { obj: packNode(p, 'Barrel')!, matrix: mat4(1.2, 0, 0.6) }])
      T('fence', [{ obj: packNode(v, 'Prop_WoodenFence_Single')!, matrix: mat4() }])
      T('crates', [{ obj: packNode(v, 'Prop_Crate')!, matrix: mat4(0, 0, 0) }, { obj: packNode(v, 'Prop_Crate')!, matrix: mat4(1.1, 0, 0.2, 0.3) }, { obj: packNode(p, 'Barrel')!, matrix: mat4(0.4, 0, 1.1) }])
      T('wagon', [{ obj: packNode(v, 'Prop_Wagon')!, matrix: mat4() }])
      this.loaded = true
      perf.count('assets.structuresReady')
    } catch (e) {
      console.warn('Structure assets failed, using procedural fallback', e)
    }
    this.rebuild()
  }

  private specsFor(b: Building): InstanceSpec[] {
    const y = b.kind === 'bridge' ? b.deck ?? this.sim.terrain.heightAt(b.x, b.z) : this.sim.terrain.heightAt(b.x, b.z)
    const base = (sx = 1, sy = 1, sz = 1, dy = 0) => mat4(b.x, y + dy, b.z, b.rot, sx, sy, sz)
    const L = this.loaded
    switch (b.kind) {
      case 'anvil':
        return [{ key: L ? 'anvil' : 'crates', matrix: base() }]
      case 'bridge':
        return [{ key: 'bridge', matrix: mat4(b.x, y - 0.2, b.z, b.rot, 1, 1, b.hd * 2) }]
      case 'field':
        return [{ key: 'soil', matrix: base(b.hw / 1, 1, b.hd / 1) }]
      case 'herbgarden':
        return [{ key: 'herbsoil', matrix: base(b.hw, 1, b.hd) }]
      case 'house': {
        const v = ['house_a', 'house_b', 'house_c'][hashString(b.id) % 3]!
        return [{ key: L ? v : 'house_fallback', matrix: base() }, { key: 'foundation', matrix: base(4.1, 1, 3.1) }]
      }
      case 'inn':
        return [{ key: L ? 'inn' : 'house_fallback', matrix: base(L ? 1 : 1.5) }, { key: 'foundation', matrix: base(6.1, 1, 5.1) }]
      case 'market':
        return [{ key: L ? 'market' : 'crates', matrix: base() }]
      case 'pen': {
        if (!L) return []
        const out: InstanceSpec[] = []
        const W = b.hw * 2
        const D = b.hd * 2
        const seg = (x: number, z: number, r: number) => {
          const c = Math.cos(b.rot)
          const s = Math.sin(b.rot)
          out.push({ key: 'fence', matrix: mat4(b.x + x * c + z * s, this.sim.terrain.heightAt(b.x + x * c + z * s, b.z - x * s + z * c), b.z - x * s + z * c, b.rot + r) })
        }
        for (let x = -W / 2 + 1; x < W / 2; x += 2) {
          seg(x, -D / 2, 0)
          if (Math.abs(x) > 1.5) seg(x, D / 2, 0)
        }
        for (let z = -D / 2 + 1; z < D / 2; z += 2) {
          seg(-W / 2, z, Math.PI / 2)
          seg(W / 2, z, Math.PI / 2)
        }
        return out
      }
      case 'shed':
        return [{ key: L ? 'shed' : 'house_fallback', matrix: base(L ? 1 : 0.5) }, { key: 'foundation', matrix: base(2.1, 1, 2.1) }]
      case 'warehouse':
        return [{ key: L ? 'warehouse' : 'house_fallback', matrix: base(L ? 1 : 1.25) }, { key: 'foundation', matrix: base(5.1, 1, 4.1) }, ...(L ? [{ key: 'crates', matrix: mat4(b.x + Math.sin(b.rot) * 5.2 + 3, y, b.z + Math.cos(b.rot) * 5.2, b.rot) }] : [])]
      default:
        return this.templates.has(b.kind) ? [{ key: b.kind, matrix: base() }] : []
    }
  }

  private siteSpecs(s: ConstructionSite): InstanceSpec[] {
    const bp = blueprintById(s.blueprint)
    const y = groundHeight(this.sim, s.x, s.z)
    const sx = Math.max(1, (bp?.hw ?? 1) / 1)
    const sz = Math.max(1, (bp?.hd ?? 1) / 1)
    const out: InstanceSpec[] = [{ key: 'site', matrix: mat4(s.x, y, s.z, s.rot, sx, 1, sz) }]
    // Show partial structure once work has started on the last stages.
    const stages = bp?.stages.length ?? 1
    if (bp && s.stage >= Math.max(1, stages - 1) && this.templates.has(bp.kind === 'house' ? 'house_a' : bp.kind)) {
      out.push({ key: bp.kind === 'house' ? 'house_a' : bp.kind, matrix: mat4(s.x, y - 1.5 + (s.progressH / bp.stages[s.stage]!.hours) * 1.5, s.z, s.rot) })
    }
    return out
  }

  rebuild() {
    for (const m of this.meshes) {
      this.group.remove(m)
      m.dispose()
    }
    this.meshes = []
    const byKey = new Map<string, THREE.Matrix4[]>()
    const add = (s: InstanceSpec) => {
      const arr = byKey.get(s.key) ?? []
      arr.push(s.matrix)
      byKey.set(s.key, arr)
    }
    for (const b of this.sim.state.buildings) for (const s of this.specsFor(b)) add(s)
    for (const s of this.sim.state.sites) for (const sp of this.siteSpecs(s)) add(sp)
    for (const [key, mats] of byKey) {
      const tpl = this.templates.get(key)
      if (!tpl) continue
      for (const p of tpl) {
        const im = new THREE.InstancedMesh(p.geometry, p.material, mats.length)
        mats.forEach((m, i) => im.setMatrixAt(i, m))
        im.instanceMatrix.needsUpdate = true
        im.computeBoundingSphere()
        im.castShadow = true
        im.receiveShadow = true
        this.group.add(im)
        this.meshes.push(im)
      }
    }
    this.drawCalls = this.meshes.length
    perf.gauge('render.structureDrawCalls', this.meshes.length)
  }
}
