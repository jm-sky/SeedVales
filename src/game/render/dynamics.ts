/**
 * Dynamic world bits: field crops (growth), fire flames + limited pool of point lights, ground items,
 * corpses, projectiles, GPU precipitation. Cheap per-frame sync from sim state.
 * @domain render
 * @subdomain effects
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Sim } from '../sim/sim'
import { itemDef } from '../data/items'
import { perf } from '../diag/perf'
import { groundHeight } from '../sim/collision'
import { corpsePhase } from '../sim/corpses'
import { daylight } from '../sim/time'
import { Actors } from './actors'
import { sharedColorMat } from './assets'
import { CarrionFx, type CarrionSpot } from './carrionFx'
import { TraceDecals } from './decals'
import { FireParticles } from './fireParticles'
import { collectFires, FIRE_LOOK, type FireEmitter, type FireKind, flicker, LIGHT_POOL, PLANTED_TORCH_H, selectLights } from './fireSources'
import { isSheltered, Precipitation } from './precipitation'
import { type QualityProfile } from './quality'

/** Flame cone scale per kind (step 1b replaces the cone with particles). */
const FLAME_SCALE: Record<FireKind, number> = { hearth: 1.2, campfire: 1, torchpost: 0.6, planted: 0.5, held: 0.42 }

// Scratch objects for the per-frame update.
const M = new THREE.Matrix4()
const POS = new THREE.Vector3()
const SCL = new THREE.Vector3()
const DIR = new THREE.Vector3()
const ONE = new THREE.Vector3(1, 1, 1)
const AXIS_Z = new THREE.Vector3(0, 0, 1)
const Q0 = new THREE.Quaternion()
const QR = new THREE.Quaternion()

const ITEM_COL = new THREE.Color(0xc8a060)
const STONE_COL = new THREE.Color(0x8c8a84)

export class Dynamics {
  group = new THREE.Group()
  private crops: THREE.InstancedMesh
  private flames: THREE.InstancedMesh
  private items: THREE.InstancedMesh
  private arrows: THREE.InstancedMesh
  private lights: THREE.PointLight[] = []
  private torches: THREE.InstancedMesh
  private fires: FireEmitter[] = []
  private picked: number[] = []
  private t = 0
  private particles: FireParticles
  private decals: TraceDecals
  private corpses = new Map<number, THREE.Object3D>()
  private carrion = new CarrionFx()
  private carrionSpots: CarrionSpot[] = []
  /** Spoiled-food spots from the stockpile yards (set by the renderer each frame). */
  extraCarrion: readonly CarrionSpot[] = []
  /** Shared haze (carrion) and bone-pile materials/geometry for corpse overlays. */
  private static hazeMat = new THREE.MeshBasicMaterial({ color: 0x3f5a1f, transparent: true, opacity: 0.35, depthWrite: false })
  private static boneMat = new THREE.MeshBasicMaterial({ color: 0xd9d2bd, transparent: true, opacity: 0.92 })
  private static hazeGeo = new THREE.SphereGeometry(0.7, 8, 6).scale(1.2, 0.45, 0.8)
  private precip: Precipitation
  private profile: QualityProfile
  private sim: Sim
  private cropTimer = 0
  /** Reused per-frame buffers (no allocation in the frame loop, review 009 F-04). */
  private seen = new Set<number>()
  private activeLights = 0

  constructor(sim: Sim, profile: QualityProfile = 'medium') {
    this.sim = sim
    this.profile = profile
    this.crops = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.6, 5).translate(0, 0.3, 0), sharedColorMat(0x6a9a2a), 6000)
    this.flames = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.25, 0.8, 6).translate(0, 0.4, 0),
      new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9 }),
      200,
    )
    this.items = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.15, 0.3).translate(0, 0.08, 0), sharedColorMat(0xffffff), 400)
    this.arrows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 0.7), sharedColorMat(0x3a2a1a), 64)
    // Planted torch (FIRE-03): an upright stick with a wrapped head, its flame at PLANTED_TORCH_H.
    const stick = new THREE.CylinderGeometry(0.025, 0.035, PLANTED_TORCH_H, 6).translate(0, PLANTED_TORCH_H / 2, 0)
    const head = new THREE.CylinderGeometry(0.06, 0.045, 0.2, 7).translate(0, PLANTED_TORCH_H - 0.08, 0)
    const torchGeo = mergeGeometries([stick.toNonIndexed(), head.toNonIndexed()])!
    this.torches = new THREE.InstancedMesh(torchGeo, sharedColorMat(0x4a3322), 64)
    for (const m of [this.crops, this.flames, this.items, this.arrows, this.torches]) {
      m.count = 0
      m.frustumCulled = false
      this.group.add(m)
    }
    this.particles = new FireParticles(profile)
    this.group.add(this.particles.group)
    this.decals = new TraceDecals(sim)
    this.group.add(this.decals.group)
    this.group.add(this.carrion.group)
    this.setQuality(profile)
    this.precip = new Precipitation()
    this.group.add(this.precip.group)
  }

  /**
   * Light pool per profile (D-REN-7: low 1 / medium 3 / high 4, the player's torch included). Lights are added or
   * removed only here — the light count is part of every lit program, so it never changes per frame.
   */
  setQuality(profile: QualityProfile) {
    this.profile = profile
    this.particles?.setQuality(profile)
    const want = LIGHT_POOL[profile]
    while (this.lights.length > want) this.group.remove(this.lights.pop()!)
    while (this.lights.length < want) {
      const l = new THREE.PointLight(0xffa050, 0, 18, 1.6)
      this.lights.push(l)
      this.group.add(l)
    }
  }

  /** True while the player's own torch holds a light slot this frame (the cave fill light dims then). */
  playerTorchLit = false

  get lightPool() {
    return this.lights.length
  }

  update(dt: number, camPos: THREE.Vector3) {
    this.t += dt
    const sim = this.sim
    const p = sim.player
    const m = M
    // Crops (refresh every 2 s).
    this.cropTimer -= dt
    if (this.cropTimer <= 0) {
      this.cropTimer = 2
      let n = 0
      for (const b of sim.buildingsNear(p.x, p.z, 250)) {
        if (!b.field || b.field.growth < 0.02) continue
        const s = 0.2 + b.field.growth
        const c = Math.cos(b.rot)
        const si = Math.sin(b.rot)
        SCL.set(s, s * (b.field.crop === 'grain' ? 1.6 : 1), s)
        for (let x = -b.hw + 0.8; x < b.hw; x += 1.3) {
          for (let z = -b.hd + 0.8; z < b.hd; z += 1.1) {
            if (n >= 6000) break
            const wx = b.x + x * c + z * si
            const wz = b.z - x * si + z * c
            m.compose(POS.set(wx, sim.terrain.heightAt(wx, wz), wz), Q0, SCL)
            this.crops.setMatrixAt(n++, m)
          }
        }
      }
      this.crops.count = n
      this.crops.instanceMatrix.needsUpdate = true
    }
    // Fires & lights (render--001 step 1a): emitters from spatial queries only (fireSources.ts, PERF-01).
    const fires = this.fires
    const nf = collectFires(sim, p.x, p.z, 200, fires)
    this.particles.update(fires, nf, p.x, p.z, dt, this.t)
    this.decals.update(dt, p.x, p.z)
    // Particle fire within range (step 1b); the flame cone only beyond it.
    const pr2 = this.particles.range ** 2
    let nFlames = 0
    for (let i = 0; i < nf && nFlames < 200; i++) {
      const e = fires[i]!
      if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 < pr2) continue
      const k = FLAME_SCALE[e.kind] * (e.kind === 'campfire' || e.kind === 'hearth' ? 0.35 + 0.65 * e.level : 1)
      m.compose(POS.set(e.x, e.y, e.z), Q0, SCL.set(k, k * (0.85 + 0.15 * flicker(this.t * 1.7, e.phase)), k))
      this.flames.setMatrixAt(nFlames++, m)
    }
    this.flames.count = nFlames
    this.flames.instanceMatrix.needsUpdate = true
    // Night factor: fires light the world mostly after dusk (daylight 1 → 0.25).
    // Underground there is no daylight to compete with: torches shine at full strength.
    const nightK = (sim.state.px.cave ?? 0) > 0 ? 1 : 1 - daylight(sim.state.time.cal) * 0.75
    this.playerTorchLit = false
    for (let i = 0; i < nf; i++) if (fires[i]!.player) this.playerTorchLit = true
    const picked = selectLights(fires, nf, this.lights.length, camPos.x, camPos.z, this.picked)
    let active = 0
    this.lights.forEach((l, i) => {
      const idx = picked[i]
      if (idx === undefined) {
        l.intensity = 0
        return
      }
      const e = fires[idx]!
      const look = FIRE_LOOK[e.kind]
      const fl = flicker(this.t, e.phase)
      // A few centimetres of jitter so the shadows of nearby objects breathe with the flame.
      l.position.set(e.x + Math.sin(this.t * 5.3 + e.phase) * 0.04, e.y + (e.kind === 'campfire' || e.kind === 'hearth' ? 0.6 : 0.2), e.z + Math.cos(this.t * 4.1 + e.phase) * 0.04)
      l.intensity = look.intensity * e.level * nightK * fl
      l.distance = look.range * (0.6 + 0.4 * e.level)
      active++
    })
    this.activeLights = active
    // Ground items in range, one query (review 011 #2): planted torches get the upright mesh, the rest the item box.
    let nt = 0
    let n = 0
    for (const g of sim.groundNear(p.x, p.z, 150)) {
      if (g.planted) {
        if (nt >= 64) continue
        m.compose(POS.set(g.x, g.cave ? sim.terrain.caves.grid(g.cave - 1).floorAt(g.x, g.z) : sim.terrain.heightAt(g.x, g.z), g.z), Q0, ONE)
        this.torches.setMatrixAt(nt++, m)
        continue
      }
      if (n >= 400) continue
      const s = itemDef(g.stack.id).weight > 5 ? 2.5 : 1
      m.compose(POS.set(g.x, g.cave ? sim.terrain.caves.grid(g.cave - 1).floorAt(g.x, g.z) : groundHeight(sim, g.x, g.z), g.z), Q0, SCL.set(s, s, s))
      this.items.setColorAt(n, g.stack.id === 'stone' || g.stack.id === 'rock_chunk' ? STONE_COL : ITEM_COL)
      this.items.setMatrixAt(n++, m)
    }
    this.torches.count = nt
    this.torches.instanceMatrix.needsUpdate = true
    this.items.count = n
    this.items.instanceMatrix.needsUpdate = true
    if (this.items.instanceColor) this.items.instanceColor.needsUpdate = true
    // Projectiles.
    n = 0
    for (const pr of sim.projectiles) {
      if (n >= 64) break
      DIR.set(pr.vx, pr.vy, pr.vz).normalize()
      m.compose(POS.set(pr.x, pr.y, pr.z), QR.setFromUnitVectors(AXIS_Z, DIR), ONE)
      this.arrows.setMatrixAt(n++, m)
    }
    this.arrows.count = n
    this.arrows.instanceMatrix.needsUpdate = true
    // Corpses in range.
    const seen = this.seen
    seen.clear()
    this.carrionSpots.length = 0
    for (const c of sim.corpsesNear(p.x, p.z, 200)) {
      seen.add(c.id)
      let o = this.corpses.get(c.id)
      if (!o) {
        o = Actors.corpseMesh(c.species)
        o.position.set(c.x, sim.terrain.heightAt(c.x, c.z) + 0.2, c.z)
        o.rotation.y = c.rot
        this.group.add(o)
        this.corpses.set(c.id, o)
      }
      // Phase look (render--010): a green haze over carrion, flies via CarrionFx, a flattened pale pile for bones.
      const phase = corpsePhase(c, sim.state.time.cal)
      o.scale.setScalar(phase === 'bones' ? 0.45 : c.butchered ? 0.6 : 1)
      const haze = o.getObjectByName('haze')
      // Carrion keeps its green haze on every quality (phones need the cue before "Butcher"); bones get a pale pile.
      const want = phase === 'carrion' ? 'haze' : phase === 'bones' ? 'bones' : ''
      if (haze && haze.userData.kind !== want) haze.removeFromParent()
      if (want && haze?.userData.kind !== want) {
        const h = new THREE.Mesh(Dynamics.hazeGeo, want === 'bones' ? Dynamics.boneMat : Dynamics.hazeMat)
        h.userData.kind = want
        h.name = 'haze'
        h.position.y = 0.1
        o.add(h)
      }
      if (phase === 'carrion') this.carrionSpots.push({ x: c.x, y: o.position.y, z: c.z, id: c.id })
    }
    for (const s of this.extraCarrion) this.carrionSpots.push(s)
    this.carrion.update(this.t, this.carrionSpots, p.x, p.z, this.profile)
    for (const [id, o] of this.corpses) {
      if (!seen.has(id)) {
        this.group.remove(o)
        this.corpses.delete(id)
      }
    }
    // Precipitation: GPU streaks/flakes around the camera; sheltered = inside a roofed footprint (one query).
    this.precip.update(dt, sim.weather, this.profile, camPos, p, isSheltered(p.x, p.z, sim.buildingsNear(p.x, p.z, 20)))
    perf.gauge('render.pointLights', this.activeLights)
  }
}
