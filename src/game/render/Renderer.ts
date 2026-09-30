/**
 * Renderer root: scene, lights (sun/moon/hemisphere), sky & fog by time of day and weather,
 * quality profile, CPU timing and renderer.info stats. Reads sim state only.
 * GPU time is not measured (WebGL timer queries unavailable in many browsers) — see DECISIONS.
 * @domain render
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import { perf } from '../diag/perf'
import { daylight, hourOf, seasonOf } from '../sim/time'
import { Actors } from './actors'
import { CameraRig } from './cameraRig'
import { Dynamics } from './dynamics'
import { QUALITY, type QualityProfile } from './quality'
import { Structures } from './structures'
import { TargetMarker } from './targetMarker'
import { TerrainChunks } from './terrainChunks'
import { Vegetation } from './vegetation'

export type { QualityProfile } from './quality'

const DAY_SKY = new THREE.Color(0x9cc4e4)
const DUSK_SKY = new THREE.Color(0xe0a070)
const NIGHT_SKY = new THREE.Color(0x0b1224)
const STORM_SKY = new THREE.Color(0x5a6470)

export class Renderer {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  rig: CameraRig
  terrain: TerrainChunks
  vegetation: Vegetation
  structures: Structures
  actors: Actors
  dynamics: Dynamics
  marker: TargetMarker
  /** Where to draw the interaction-target ring (set by Game), or null. */
  markerAt: { x: number; z: number } | null = null
  sun = new THREE.DirectionalLight(0xfff2dd, 2)
  hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a4a30, 1)
  quality: QualityProfile
  private sim: Sim
  private sky = new THREE.Color()
  private first = true
  private fogFar: number

  constructor(canvas: HTMLCanvasElement, sim: Sim, quality: QualityProfile = 'medium') {
    this.sim = sim
    this.quality = quality
    const q = QUALITY[quality]
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio))
    this.renderer.shadowMap.enabled = q.shadows
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.rig = new CameraRig(sim.terrain, canvas.clientWidth / Math.max(1, canvas.clientHeight))
    this.scene.fog = new THREE.Fog(0x9cc4e4, 150, q.fogFar)
    this.fogFar = q.fogFar
    this.sun.castShadow = q.shadows
    this.sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024)
    const sc = this.sun.shadow.camera
    sc.left = sc.bottom = -45
    sc.right = sc.top = 45
    sc.near = 1
    sc.far = 300
    this.scene.add(this.sun, this.sun.target, this.hemi)
    this.terrain = new TerrainChunks(sim.terrain, q)
    this.vegetation = new Vegetation(sim, q)
    this.structures = new Structures(sim)
    this.actors = new Actors(sim, q)
    this.dynamics = new Dynamics(sim)
    this.marker = new TargetMarker(sim.terrain)
    this.scene.add(this.terrain.group, this.vegetation.group, this.structures.group, this.actors.group, this.dynamics.group, this.marker.mesh)
  }

  async loadAssets(onProgress?: (label: string) => void) {
    onProgress?.('Budynki…')
    await this.structures.load()
    onProgress?.('Roślinność…')
    await this.vegetation.load()
    onProgress?.('Postacie…')
    await this.actors.load()
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false)
    this.rig.camera.aspect = w / Math.max(1, h)
    this.rig.camera.updateProjectionMatrix()
  }

  private handleEvents() {
    for (const e of this.sim.events) {
      if (e.type === 'terrain') this.terrain.markDirty(e.chunk)
      else if (e.type === 'nodes') this.vegetation.markDirty()
      else if (e.type === 'buildings') this.structures.rebuild()
    }
  }

  private lighting() {
    const sim = this.sim
    const cal = sim.state.time.cal
    const dl = daylight(cal)
    const w = sim.weather
    const h = hourOf(cal)
    const dusk = Math.max(0, 1 - Math.abs(dl - 0.35) * 3) * (dl > 0 && dl < 1 ? 1 : 0)
    this.sky.copy(NIGHT_SKY).lerp(DAY_SKY, dl).lerp(DUSK_SKY, dusk * 0.5)
    const overcast = w.kind === 'clear' ? 0 : w.kind === 'overcast' ? 0.4 : 0.7
    this.sky.lerp(STORM_SKY.clone().multiplyScalar(0.3 + dl * 0.7), overcast)
    this.scene.background = this.sky
    const fog = this.scene.fog as THREE.Fog
    fog.color.copy(this.sky)
    const fogK = Math.max(w.fog, w.kind === 'rain' || w.kind === 'snow' ? 0.35 : 0, w.kind === 'storm' ? 0.55 : 0)
    fog.near = 120 * (1 - fogK * 0.9)
    fog.far = this.fogFar * (1 - fogK * 0.85) + 60
    // Sun path (east → west), moonlight at night.
    const ang = ((h - 6) / 12) * Math.PI
    const p = this.sim.player
    this.sun.position.set(p.x + Math.cos(ang) * 120, p.y + Math.max(15, Math.sin(ang) * 150), p.z + 40)
    this.sun.target.position.set(p.x, p.y, p.z)
    this.sun.intensity = dl * 2.2 * (1 - overcast * 0.6) + 0.12
    this.sun.color.set(dl > 0.2 ? 0xfff2dd : 0x8899cc)
    this.hemi.intensity = 0.35 + dl * 0.9 * (1 - overcast * 0.3)
    const season = seasonOf(cal)
    this.terrain.seasonTint = season === 'autumn' ? 0.6 : season === 'winter' ? 0.8 : 0
    this.terrain.snowCover = season === 'winter' && (w.kind === 'snow' || w.wetness > 0.2) ? 0.8 : 0
  }

  render(dt: number) {
    perf.begin('render.cpu')
    const p = this.sim.player
    this.handleEvents()
    this.lighting()
    this.rig.update(p.x, p.y, p.z, dt)
    perf.measure('render.terrain', () => this.terrain.update(p.x, p.z, this.first ? 4000 : 5))
    this.first = false
    perf.measure('render.vegetation', () => this.vegetation.update(p.x, p.z))
    perf.measure('render.actors', () => this.actors.update(dt, this.rig.camera))
    perf.measure('render.dynamics', () => this.dynamics.update(dt, this.rig.camera.position))
    this.marker.update(dt, this.markerAt)
    perf.measure('render.draw', () => this.renderer.render(this.scene, this.rig.camera))
    perf.end('render.cpu')
    const info = this.renderer.info
    perf.gauge('render.drawCalls', info.render.calls)
    perf.gauge('render.triangles', info.render.triangles)
    perf.gauge('render.geometries', info.memory.geometries)
    perf.gauge('render.textures', info.memory.textures)
  }
}
