/**
 * Dynamic world bits: field crops (growth), fire flames + limited pool of point lights, ground items,
 * corpses, projectiles, precipitation particles. Cheap per-frame sync from sim state.
 * @domain render
 * @subdomain effects
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import { itemDef } from '../data/items'
import { perf } from '../diag/perf'
import { groundHeight } from '../sim/collision'
import { daylight, isNight } from '../sim/time'
import { Actors } from './actors'
import { sharedColorMat } from './assets'

const MAX_LIGHTS = 6

const ITEM_COL = new THREE.Color(0xc8a060)
const STONE_COL = new THREE.Color(0x8c8a84)

export class Dynamics {
  group = new THREE.Group()
  private crops: THREE.InstancedMesh
  private flames: THREE.InstancedMesh
  private items: THREE.InstancedMesh
  private arrows: THREE.InstancedMesh
  private lights: THREE.PointLight[] = []
  private corpses = new Map<number, THREE.Object3D>()
  private rain: THREE.Points
  private rainPos: Float32Array
  private sim: Sim
  private cropTimer = 0
  playerLight: THREE.PointLight

  constructor(sim: Sim) {
    this.sim = sim
    this.crops = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.6, 5).translate(0, 0.3, 0), sharedColorMat(0x6a9a2a), 6000)
    this.flames = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.25, 0.8, 6).translate(0, 0.4, 0),
      new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9 }),
      200,
    )
    this.items = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.15, 0.3).translate(0, 0.08, 0), sharedColorMat(0xffffff), 400)
    this.arrows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 0.7), sharedColorMat(0x3a2a1a), 64)
    for (const m of [this.crops, this.flames, this.items, this.arrows]) {
      m.count = 0
      m.frustumCulled = false
      this.group.add(m)
    }
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight(0xffa050, 0, 18, 1.6)
      this.lights.push(l)
      this.group.add(l)
    }
    this.playerLight = new THREE.PointLight(0xffb060, 0, 16, 1.6)
    this.group.add(this.playerLight)
    const N = 2500
    this.rainPos = new Float32Array(N * 3)
    for (let i = 0; i < N * 3; i++) this.rainPos[i] = (Math.random() - 0.5) * 60
    const rg = new THREE.BufferGeometry()
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3))
    this.rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.08, transparent: true, opacity: 0.6 }))
    this.rain.frustumCulled = false
    this.group.add(this.rain)
  }

  update(dt: number, camPos: THREE.Vector3) {
    const sim = this.sim
    const p = sim.player
    const m = new THREE.Matrix4()
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
        for (let x = -b.hw + 0.8; x < b.hw; x += 1.3) {
          for (let z = -b.hd + 0.8; z < b.hd; z += 1.1) {
            if (n >= 6000) break
            const wx = b.x + x * c + z * si
            const wz = b.z - x * si + z * c
            m.compose(new THREE.Vector3(wx, sim.terrain.heightAt(wx, wz), wz), new THREE.Quaternion(), new THREE.Vector3(s, s * (b.field.crop === 'grain' ? 1.6 : 1), s))
            this.crops.setMatrixAt(n++, m)
          }
        }
      }
      this.crops.count = n
      this.crops.instanceMatrix.needsUpdate = true
    }
    // Fires & lights.
    const fires: THREE.Vector3[] = []
    for (const b of sim.buildingsNear(p.x, p.z, 200)) {
      if ((b.kind === 'campfire' || b.kind === 'torchpost') && b.lit) fires.push(new THREE.Vector3(b.x, sim.terrain.heightAt(b.x, b.z) + (b.kind === 'torchpost' ? 2.5 : 0.1), b.z))
    }
    for (const g of sim.state.ground) if (g.lit) fires.push(new THREE.Vector3(g.x, sim.terrain.heightAt(g.x, g.z) + 0.1, g.z))
    const flick = 0.85 + Math.sin(performance.now() / 90) * 0.1
    fires.forEach((f, i) => {
      if (i >= 200) return
      m.compose(f, new THREE.Quaternion(), new THREE.Vector3(1, flick, 1).multiplyScalar(f.y > 1 && fires.length ? 0.6 : 1))
      this.flames.setMatrixAt(i, m)
    })
    this.flames.count = Math.min(200, fires.length)
    this.flames.instanceMatrix.needsUpdate = true
    const night = isNight(sim.state.time.cal) ? 1 : 0.25
    fires.sort((a, b) => a.distanceToSquared(camPos) - b.distanceToSquared(camPos))
    this.lights.forEach((l, i) => {
      const f = fires[i]
      if (f) {
        l.position.copy(f).add(new THREE.Vector3(0, 0.6, 0))
        l.intensity = 14 * night * flick
      } else l.intensity = 0
    })
    // Player torch.
    const torch = p.eq.off?.id === 'torch' || p.eq.main?.id === 'torch'
    this.playerLight.intensity = torch ? 16 * flick * (1 - daylight(sim.state.time.cal) * 0.85) : 0
    this.playerLight.position.set(p.x, p.y + 1.8, p.z)
    // Ground items.
    let n = 0
    for (const g of sim.state.ground) {
      if (n >= 400 || Math.abs(g.x - p.x) > 150 || Math.abs(g.z - p.z) > 150) continue
      const s = itemDef(g.stack.id).weight > 5 ? 2.5 : 1
      m.compose(new THREE.Vector3(g.x, groundHeight(sim, g.x, g.z), g.z), new THREE.Quaternion(), new THREE.Vector3(s, s, s))
      this.items.setColorAt(n, g.stack.id === 'stone' || g.stack.id === 'rock_chunk' ? STONE_COL : ITEM_COL)
      this.items.setMatrixAt(n++, m)
    }
    this.items.count = n
    this.items.instanceMatrix.needsUpdate = true
    if (this.items.instanceColor) this.items.instanceColor.needsUpdate = true
    // Projectiles.
    n = 0
    for (const pr of sim.projectiles) {
      if (n >= 64) break
      const dir = new THREE.Vector3(pr.vx, pr.vy, pr.vz).normalize()
      m.compose(new THREE.Vector3(pr.x, pr.y, pr.z), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir), new THREE.Vector3(1, 1, 1))
      this.arrows.setMatrixAt(n++, m)
    }
    this.arrows.count = n
    this.arrows.instanceMatrix.needsUpdate = true
    // Corpses.
    const seen = new Set<number>()
    for (const c of sim.state.corpses) {
      if (Math.abs(c.x - p.x) > 200 || Math.abs(c.z - p.z) > 200) continue
      seen.add(c.id)
      let o = this.corpses.get(c.id)
      if (!o) {
        o = Actors.corpseMesh(c.species)
        o.position.set(c.x, sim.terrain.heightAt(c.x, c.z) + 0.2, c.z)
        o.rotation.y = c.rot
        this.group.add(o)
        this.corpses.set(c.id, o)
      }
      o.scale.setScalar(c.butchered ? 0.6 : 1)
    }
    for (const [id, o] of this.corpses) {
      if (!seen.has(id)) {
        this.group.remove(o)
        this.corpses.delete(id)
      }
    }
    // Precipitation around camera.
    const w = sim.weather
    const wet = w.kind === 'rain' || w.kind === 'storm' || w.kind === 'snow'
    this.rain.visible = wet
    if (wet) {
      const snow = w.kind === 'snow'
      const mat = this.rain.material as THREE.PointsMaterial
      mat.color.set(snow ? 0xffffff : 0x9aaabb)
      mat.size = snow ? 0.18 : 0.07
      const fall = (snow ? 1.5 : 14) * dt
      const arr = this.rainPos
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1]! -= fall * (0.8 + (i % 7) * 0.05)
        if (snow) arr[i]! += Math.sin(performance.now() / 700 + i) * 0.01
        if (arr[i + 1]! < -20) arr[i + 1] = 20
      }
      this.rain.position.set(camPos.x, camPos.y, camPos.z)
      ;(this.rain.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
    perf.gauge('render.pointLights', this.lights.filter((l) => l.intensity > 0).length)
  }
}
