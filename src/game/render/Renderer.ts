/**
 * Renderer root: scene, lights (sun/moon/hemisphere), sky & fog by time of day and weather,
 * quality profile, CPU timing and renderer.info stats. Reads sim state only.
 * GPU time only when EXT_disjoint_timer_query_webgl2 exists (`gpuTimer.ts`, PERF-02); otherwise CPU only.
 * @domain render
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import { DAYS_PER_YEAR } from '../config/calibration'
import { perf } from '../diag/perf'
import { daylight, hourOf, seasonOf } from '../sim/time'
import { Actors } from './actors'
import { atmosphere, type Atmosphere, overcastOf } from './atmosphere'
import { CameraRig } from './cameraRig'
import { Carts } from './carts'
import { Dynamics } from './dynamics'
import { GpuTimer } from './gpuTimer'
import { Grass } from './grass'
import { grassSeasonal } from './grassPlacement'
import { Landmarks } from './landmarks'
import { QUALITY, type QualityProfile } from './quality'
import { snapShadowCenter } from './shadowSnap'
import { SkyDome } from './sky'
import { Structures } from './structures'
import { TargetMarker } from './targetMarker'
import { TerrainChunks } from './terrainChunks'
import { Vegetation } from './vegetation'
import { readVisualFlags, type VisualFlags } from './visualFlags'
import { waterUniforms } from './waterMaterial'
import { updateWind } from './wind'

export type { QualityProfile } from './quality'

const DAY_SKY = new THREE.Color(0x9cc4e4)
const DUSK_SKY = new THREE.Color(0xe0a070)
const NIGHT_SKY = new THREE.Color(0x0b1224)
const STORM_SKY = new THREE.Color(0x5a6470)
const STORM_TMP = new THREE.Color()

export class Renderer {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  rig: CameraRig
  terrain: TerrainChunks
  vegetation: Vegetation
  grass: Grass | null
  structures: Structures
  landmarks: Landmarks
  actors: Actors
  dynamics: Dynamics
  marker: TargetMarker
  carts: Carts
  /** Where to draw the interaction-target ring (set by Game), or null. */
  markerAt: { x: number; z: number } | null = null
  sun = new THREE.DirectionalLight(0xfff2dd, 2)
  hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a4a30, 1)
  quality: QualityProfile
  gpu: GpuTimer
  readonly visual: VisualFlags
  private skyDome: SkyDome | null = null
  private atmo: Atmosphere | undefined
  private sim: Sim
  private sky = new THREE.Color()
  private first = true
  private frameNo = 0
  /** Render-time seconds for shader animation (wind); advances with real frames, not the calendar. */
  private renderS = 0
  private fogFar: number
  private toLight = new THREE.Vector3(0, 1, 0)
  private snapIn = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement, sim: Sim, quality: QualityProfile = 'medium') {
    this.sim = sim
    this.quality = quality
    const q = QUALITY[quality]
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio))
    this.renderer.shadowMap.enabled = q.shadows
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.visual = readVisualFlags()
    const TONE = { none: THREE.NoToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping } as const
    this.renderer.toneMapping = TONE[this.visual.tone]
    this.renderer.toneMappingExposure = this.visual.exposure
    this.gpu = new GpuTimer(this.renderer.getContext())
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
    this.terrain = new TerrainChunks(sim.terrain, q, this.visual)
    this.vegetation = new Vegetation(sim, q)
    this.grass = this.visual.grass ? new Grass(sim, quality) : null
    this.structures = new Structures(sim)
    this.landmarks = new Landmarks(sim)
    this.actors = new Actors(sim, q)
    this.dynamics = new Dynamics(sim)
    this.marker = new TargetMarker(sim.terrain)
    this.carts = new Carts(sim)
    if (this.visual.sky === 'dome') {
      this.skyDome = new SkyDome()
      this.scene.add(this.skyDome.mesh)
    }
    this.scene.add(this.terrain.group, this.vegetation.group, ...(this.grass ? [this.grass.group] : []), this.structures.group, this.landmarks.group, this.actors.group, this.dynamics.group, this.marker.mesh, this.carts.group)
  }

  async loadAssets(onProgress?: (label: string) => void) {
    onProgress?.('Buildings…')
    await this.structures.load()
    await this.landmarks.load()
    onProgress?.('Vegetation…')
    await this.vegetation.load()
    if (this.visual.impostors) this.vegetation.bakeImpostors(this.renderer)
    onProgress?.('Characters…')
    await this.actors.load()
  }

  /** Switches the quality profile without restarting (UI-05); antialiasing stays as created. */
  setQuality(quality: QualityProfile) {
    if (quality === this.quality) return
    const q = QUALITY[quality]
    const shadowsChanged = this.renderer.shadowMap.enabled !== q.shadows
    this.quality = quality
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio))
    this.renderer.shadowMap.enabled = q.shadows
    this.sun.castShadow = q.shadows
    const ms = quality === 'high' ? 2048 : 1024
    if (this.sun.shadow.mapSize.x !== ms) {
      this.sun.shadow.mapSize.set(ms, ms)
      this.sun.shadow.map?.dispose()
      this.sun.shadow.map = null
    }
    this.fogFar = q.fogFar
    this.terrain.setQuality(q)
    this.vegetation.setQuality(q)
    this.grass?.setQuality(quality)
    this.actors.setQuality(q)
    if (shadowsChanged) {
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material
        if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true
      })
    }
  }

  /**
   * Drops the scene graph after the WebGL context was released (review 009 F-05). GPU resources go with
   * the context; geometries created per chunk are disposed explicitly. Shared asset caches (`assets.ts`)
   * are intentionally kept for the next game.
   */
  dispose() {
    this.terrain.dispose()
    this.grass?.dispose()
    this.landmarks.dispose()
    this.scene.clear()
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false)
    this.rig.camera.aspect = w / Math.max(1, h)
    this.rig.camera.updateProjectionMatrix()
  }

  private handleEvents() {
    for (const e of this.sim.events) {
      if (e.type === 'terrain') {
        this.terrain.markDirty(e.chunk)
        const [cx, cz] = e.chunk.split(',').map(Number) as [number, number]
        this.grass?.markDirty({ cx, cz })
      } else if (e.type === 'nodes') this.vegetation.markDirty()
      else if (e.type === 'buildings') {
        this.structures.rebuild()
        this.grass?.markDirty()
      }
    }
  }

  private lighting() {
    const sim = this.sim
    const cal = sim.state.time.cal
    const dl = daylight(cal)
    const w = sim.weather
    const h = hourOf(cal)
    const p = this.sim.player
    const overcast = overcastOf(w)
    const fog = this.scene.fog as THREE.Fog
    if (this.skyDome) {
      // One parameter set drives sky, fog, sun and hemisphere (render--002 step 2).
      const a = (this.atmo = atmosphere(dl, h, w, this.atmo))
      this.scene.background = a.horizon
      fog.color.copy(a.fog)
      this.toLight.copy(a.sunDir)
      this.sun.color.copy(a.sunColor)
      this.sun.intensity = a.sunIntensity
      this.hemi.color.copy(a.hemiSky)
      this.hemi.groundColor.copy(a.hemiGround)
      this.hemi.intensity = a.hemiIntensity
      this.skyDome.update(a, this.rig.camera.position)
      waterUniforms.uSkyZen.value.copy(a.zenith)
      waterUniforms.uSkyHor.value.copy(a.horizon)
      waterUniforms.uSunDirW.value.copy(a.sunDir)
      waterUniforms.uSunCol.value.copy(a.sunColor).multiplyScalar(a.sunIntensity)
    } else {
      const dusk = Math.max(0, 1 - Math.abs(dl - 0.35) * 3) * (dl > 0 && dl < 1 ? 1 : 0)
      this.sky.copy(NIGHT_SKY).lerp(DAY_SKY, dl).lerp(DUSK_SKY, dusk * 0.5)
      this.sky.lerp(STORM_TMP.copy(STORM_SKY).multiplyScalar(0.3 + dl * 0.7), overcast)
      this.scene.background = this.sky
      fog.color.copy(this.sky)
      // Sun path (east → west), moonlight at night.
      const ang = ((h - 6) / 12) * Math.PI
      this.toLight.set(Math.cos(ang) * 120, Math.max(15, Math.sin(ang) * 150), 40).normalize()
      this.sun.intensity = dl * 2.2 * (1 - overcast * 0.6) + 0.12
      this.sun.color.set(dl > 0.2 ? 0xfff2dd : 0x8899cc)
      this.hemi.intensity = 0.35 + dl * 0.9 * (1 - overcast * 0.3)
      waterUniforms.uSkyZen.value.copy(this.sky)
      waterUniforms.uSkyHor.value.copy(this.sky)
      waterUniforms.uSunDirW.value.copy(this.toLight)
      waterUniforms.uSunCol.value.copy(this.sun.color).multiplyScalar(this.sun.intensity)
    }
    const fogK = Math.max(w.fog, w.kind === 'rain' || w.kind === 'snow' ? 0.35 : 0, w.kind === 'storm' ? 0.55 : 0)
    fog.near = 120 * (1 - fogK * 0.9)
    fog.far = this.fogFar * (1 - fogK * 0.85) + 60
    // Shadow camera centre snapped to whole shadow texels in light space (no shimmer while walking).
    const sc = this.sun.shadow.camera
    snapShadowCenter(this.snapIn.set(p.x, p.y, p.z), this.toLight, (sc.right - sc.left) / this.sun.shadow.mapSize.x, this.sun.target.position)
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.toLight, 150)
    const season = seasonOf(cal)
    this.terrain.seasonTint = season === 'autumn' ? 0.6 : season === 'winter' ? 0.8 : 0
    this.terrain.snowCover = season === 'winter' && (w.kind === 'snow' || w.wetness > 0.2) ? 0.8 : 0
    const gs = grassSeasonal((cal / 86400) / DAYS_PER_YEAR)
    this.terrain.flowers = gs.flowers
    this.grass?.setSeason(this.terrain.seasonTint, this.terrain.snowCover, gs.growth, gs.flowers)
  }

  private lightCount(): number {
    let n = 0
    this.scene.traverseVisible((o) => {
      if ((o as THREE.Light).isLight) n++
    })
    return n
  }

  render(dt: number) {
    perf.begin('render.cpu')
    const t0 = performance.now()
    const p = this.sim.player
    this.handleEvents()
    this.rig.update(p.x, p.y, p.z, dt)
    this.lighting()
    this.renderS += dt
    updateWind(this.renderS, this.sim.weather, this.sim.state.time.cal)
    waterUniforms.uWTime.value = this.renderS
    perf.measure('render.terrain', () => this.terrain.update(p.x, p.z, this.first ? 4000 : 5))
    this.first = false
    perf.measure('render.vegetation', () => this.vegetation.update(p.x, p.z))
    this.grass?.update(p.x, p.z)
    perf.measure('render.actors', () => this.actors.update(dt, this.rig.camera))
    perf.measure('render.dynamics', () => this.dynamics.update(dt, this.rig.camera.position))
    this.marker.update(dt, this.markerAt)
    this.carts.update()
    perf.measure('render.landmarks', () => this.landmarks.update(p.x, p.z))
    // Render preparation = render.cpu without draw submission (D-PERF-2 headless gate metric).
    perf.record('render.prep', performance.now() - t0)
    this.gpu.poll()
    this.gpu.begin()
    perf.measure('render.draw', () => this.renderer.render(this.scene, this.rig.camera))
    this.gpu.end()
    perf.end('render.cpu')
    const info = this.renderer.info
    perf.gauge('render.programs', info.programs?.length ?? 0)
    // Scene traversal is not free: refresh the light count every 120 frames only.
    if (this.frameNo++ % 120 === 0) perf.gauge('render.lights', this.lightCount())
    perf.gauge('render.drawCalls', info.render.calls)
    perf.gauge('render.triangles', info.render.triangles)
    perf.gauge('render.geometries', info.memory.geometries)
    perf.gauge('render.textures', info.memory.textures)
  }
}
