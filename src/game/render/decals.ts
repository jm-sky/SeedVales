/**
 * Trace decals (render--001 step 8, TRACE-01 render side): blood splats and the ash a burnt-out campfire leaves,
 * as two instanced ground-aligned quad sets fed by `sim.tracesNear` (spatial query, PERF-01) every 0.5 s.
 * Alpha = trace intensity (it fades over calendar time in the sim), size grows with intensity; each decal is
 * tilted to the terrain normal and drawn with a polygon offset (no z-fighting). Procedural textures, no asset.
 * Tracking-relevant traces are never hidden by the quality profile.
 * @domain render
 * @subdomain effects
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { Trace } from '../sim/types'

export const DECAL_RANGE = 60
export const DECAL_CAP = 128
const REFRESH_S = 0.5

type DecalKind = 'blood' | 'ash'

/** Deterministic small PRNG for the procedural textures. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Irregular dark-red splat (blood) or grey-black disc with charcoal bits (ash), RGBA. */
export function decalTexture(kind: DecalKind, n = 64): THREE.DataTexture {
  const d = new Uint8Array(n * n * 4)
  const r = rng(kind === 'blood' ? 7 : 11)
  const blobs = Array.from({ length: kind === 'blood' ? 9 : 4 }, (_, i) => ({ x: 0.5 + (r() - 0.5) * (i ? 0.6 : 0), y: 0.5 + (r() - 0.5) * (i ? 0.6 : 0), s: i ? 0.05 + r() * 0.12 : kind === 'blood' ? 0.22 : 0.4 }))
  const bits = Array.from({ length: kind === 'ash' ? 14 : 0 }, () => ({ x: 0.2 + r() * 0.6, y: 0.2 + r() * 0.6, s: 0.015 + r() * 0.03 }))
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n
      const v = (y + 0.5) / n
      let a = 0
      for (const b of blobs) a = Math.max(a, 1 - Math.hypot(u - b.x, v - b.y) / b.s)
      a = Math.min(1, Math.max(0, a) * 2.2)
      let c = kind === 'blood' ? [0.35, 0.03, 0.03] : [0.22, 0.21, 0.2]
      if (kind === 'ash') {
        // Paler rim, a few black charcoal bits.
        c = c.map((k) => k + (1 - a) * 0.18)
        for (const b of bits) if (Math.hypot(u - b.x, v - b.y) < b.s) c = [0.05, 0.04, 0.04]
      }
      const k = (y * n + x) * 4
      d[k] = Math.round(c[0]! * 255)
      d[k + 1] = Math.round(c[1]! * 255)
      d[k + 2] = Math.round(c[2]! * 255)
      d[k + 3] = Math.round(a * 255)
    }
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

const M = new THREE.Matrix4()
const P = new THREE.Vector3()
const Q = new THREE.Quaternion()
const QR = new THREE.Quaternion()
const S = new THREE.Vector3()
const N = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

export class TraceDecals {
  group = new THREE.Group()
  private meshes: Record<DecalKind, { mesh: THREE.InstancedMesh; alpha: THREE.InstancedBufferAttribute }>
  private since = REFRESH_S
  private sim: Sim
  /** Instances per kind after the last refresh (tests, gauges). */
  counts: Record<DecalKind, number> = { blood: 0, ash: 0 }

  constructor(sim: Sim) {
    this.sim = sim
    const mk = (kind: DecalKind) => {
      const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
      const alpha = new THREE.InstancedBufferAttribute(new Float32Array(DECAL_CAP), 1)
      alpha.setUsage(THREE.DynamicDrawUsage)
      geo.setAttribute('aDecalA', alpha)
      const mat = new THREE.MeshLambertMaterial({ map: decalTexture(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aDecalA;\nvarying float vDecalA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDecalA = aDecalA;')
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vDecalA;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vDecalA;')
      }
      mat.customProgramCacheKey = () => 'trace-decal'
      const mesh = new THREE.InstancedMesh(geo, mat, DECAL_CAP)
      mesh.count = 0
      mesh.frustumCulled = false
      mesh.renderOrder = 1
      this.group.add(mesh)
      return { mesh, alpha }
    }
    this.meshes = { blood: mk('blood'), ash: mk('ash') }
  }

  /** Refreshes the decals around (x, z) every REFRESH_S seconds of render time (immediately when `force`). */
  update(dt: number, x: number, z: number, force = false) {
    this.since += dt
    if (!force && this.since < REFRESH_S) return
    this.since = 0
    const t = this.sim.terrain
    const n: Record<DecalKind, number> = { blood: 0, ash: 0 }
    const list = this.sim.tracesNear(x, z, DECAL_RANGE)
      .sort((a, b) => (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2))
    let total = 0
    for (const tr of list as Trace[]) {
      if (total >= DECAL_CAP || tr.intensity <= 0.02) continue
      const kind: DecalKind = tr.kind === 'ash' ? 'ash' : 'blood'
      const { mesh, alpha } = this.meshes[kind]
      const i = n[kind]++
      total++
      // Tilt to the terrain normal (finite differences over ±0.5 m), random but stable spin per trace id.
      const h = t.heightAt(tr.x, tr.z)
      N.set(t.heightAt(tr.x - 0.5, tr.z) - t.heightAt(tr.x + 0.5, tr.z), 1, t.heightAt(tr.x, tr.z - 0.5) - t.heightAt(tr.x, tr.z + 0.5)).normalize()
      Q.setFromUnitVectors(UP, N).multiply(QR.setFromAxisAngle(UP, (tr.id * 2.399) % (Math.PI * 2)))
      const size = kind === 'ash' ? 1.3 * (0.75 + 0.25 * tr.intensity) : 0.45 + 0.65 * tr.intensity
      M.compose(P.set(tr.x, h + 0.02, tr.z), Q, S.set(size, 1, size))
      mesh.setMatrixAt(i, M)
      ;(alpha.array as Float32Array)[i] = Math.min(1, tr.intensity * 1.2)
    }
    for (const kind of ['blood', 'ash'] as const) {
      const { mesh, alpha } = this.meshes[kind]
      mesh.count = n[kind]
      mesh.instanceMatrix.needsUpdate = true
      alpha.needsUpdate = true
      this.counts[kind] = n[kind]
    }
  }
}
