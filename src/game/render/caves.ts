/**
 * Cave meshes (WORLD-05): floor, walls and ceiling built from the derived cave grid when the player comes
 * within range, released again when they leave. Rock textures are Poly Haven CC0 diffuse maps (world-space
 * UVs, no UV unwrapping needed). The terrain mesh is cut out over the cutting by `TerrainChunks`; the wall
 * strips here reach up to the ground so the cut has a rock face instead of a void.
 * @domain render
 * @subdomain caves
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import { CAVE } from '../config/calibration'
import { hash01 } from '../core/rng'
import { perf } from '../diag/perf'
import { type CaveGrid, CELL_CLOSED, CELL_SKY, CELL_UNDER } from '../world/caveShape'

const HYSTERESIS_M = 60
const BUILD_PER_FRAME = 1
/** Texture repeat: one tile per this many metres. */
const TILE_M = 4
/** How far above the terrain the wall tops reach (hides sub-quad detail differences at the cut). */
const LIP_M = 0.4

interface Built {
  group: THREE.Group
  geometries: THREE.BufferGeometry[]
}

class Buf {
  pos: number[] = []
  uv: number[] = []
  col: number[] = []
  /** Quad from four corners (counter-clockwise), flat colour `c`, UVs from the supplied function. */
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, uvOf: (p: THREE.Vector3) => [number, number], shade: number) {
    for (const p of [a, b, c, a, c, d]) {
      this.pos.push(p.x, p.y, p.z)
      const [u, v] = uvOf(p)
      this.uv.push(u, v)
      this.col.push(shade, shade, shade)
    }
  }

  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, uvOf: (p: THREE.Vector3) => [number, number], shade: number) {
    for (const p of [a, b, c]) {
      this.pos.push(p.x, p.y, p.z)
      const [u, v] = uvOf(p)
      this.uv.push(u, v)
      this.col.push(shade, shade, shade)
    }
  }

  geometry(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** How far a cutting bank leans back from the wall foot to the ground (m, max) and what fraction of its height. */
const BANK_LEAN_MAX_M = 4
const BANK_LEAN_FRAC = 0.9
/** Chance that a rim vertex carries a rock, and the rock size range (m). */
const RIM_ROCK_CHANCE = 0.55
const RIM_ROCK_M: [number, number] = [0.45, 1.25]

/** Low-poly rock (icosahedron, flat shaded) with per-vertex jitter, appended to a buffer. */
function addRock(buf: Buf, cx: number, cy: number, cz: number, r: number, seed: number) {
  const t = (1 + Math.sqrt(5)) / 2
  const base = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  const pts = base.map(([x, y, z], i) => {
    const len = Math.hypot(x!, y!, z!)
    const j = 0.75 + 0.5 * hash01(seed, i, 7)
    // Flattened and sunk: the lower third is buried in the ground.
    return V(cx + (x! / len) * r * j * 1.15, cy + (y! / len) * r * j * 0.7 - r * 0.2, cz + (z! / len) * r * j * 1.15)
  })
  const uvOf = (p: THREE.Vector3): [number, number] => [(p.x + p.y) / TILE_M, (p.z + p.y) / TILE_M]
  for (const [a, b, c] of faces) buf.tri(pts[a!]!, pts[b!]!, pts[c!]!, uvOf, 0.8 + 0.2 * hash01(seed, a!, b!))
}

/** Builds the floor and shell (walls + ceiling + lintels) geometries of one cave grid. Exported for tests. */
export function buildCaveGeometry(g: CaveGrid, surfaceAt: (x: number, z: number) => number, seed: number): { floor: THREE.BufferGeometry | null; shell: THREE.BufferGeometry | null } {
  const floor = new Buf()
  const shell = new Buf()
  const w = g.nx + 1
  const fy = (vi: number, vj: number) => g.floor[vj * w + vi]!
  const cy = (vi: number, vj: number) => g.ceil[vj * w + vi]!
  const k = 1 / TILE_M
  const uvFloor = (p: THREE.Vector3): [number, number] => [p.x * k, p.z * k]
  const shadeAt = (i: number, j: number) => 0.78 + 0.22 * hash01(seed, i, j)
  const flagAt = (i: number, j: number) => (i < 0 || j < 0 || i >= g.nx || j >= g.nz ? CELL_CLOSED : g.flag[j * g.nx + i]!)
  // Cutting banks lean back: the top of a wall over a sky cell moves away from the opening, along a per-vertex
  // direction (so neighbouring walls and lintels share their corners) and lands on the ground there.
  const rockAt = (vi: number, vj: number) => flagAt(vi, vj) === CELL_CLOSED
  const leanCache = new Map<number, THREE.Vector3>()
  const rimDone = new Set<number>()
  const lean = (vi: number, vj: number): THREE.Vector3 => {
    const key = vj * w + vi
    const got = leanCache.get(key)
    if (got) return got
    // Direction into the rock: closed cells around the vertex pull, open ones push.
    let ox = 0
    let oz = 0
    let roofed = false
    for (const [di, dj] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) {
      if (flagAt(vi + di, vj + dj) === CELL_UNDER) roofed = true
      const sgn = rockAt(vi + di, vj + dj) ? 1 : -1
      ox += sgn * (di + 0.5)
      oz += sgn * (dj + 0.5)
    }
    const len = Math.hypot(ox, oz) || 1
    // Vertices touching a roofed cell stay put: the tunnel walls and the lintel meet the bank there without a slit.
    const reach = roofed ? 0 : Math.min(BANK_LEAN_MAX_M, Math.max(0, (surfaceAt(g.ox + vi, g.oz + vj) - fy(vi, vj)) * BANK_LEAN_FRAC))
    const jitter = 0.75 + 0.5 * hash01(seed, vi, vj)
    const tx = g.ox + vi + (ox / len) * reach * jitter
    const tz = g.oz + vj + (oz / len) * reach * jitter
    const out = V(tx, surfaceAt(tx, tz) + LIP_M, tz)
    leanCache.set(key, out)
    return out
  }
  // Edge walls: neighbour direction → the two vertices (in cell-vertex coordinates) of the shared edge, ordered
  // so the quad winds consistently; DoubleSide + computed normals make the exact order irrelevant to lighting.
  const edges: [number, number, number, number, number, number][] = [
    // di, dj, v0i, v0j, v1i, v1j (vertex offsets from the cell origin)
    [0, -1, 0, 0, 1, 0],
    [0, 1, 0, 1, 1, 1],
    [-1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1],
  ]
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      const f: number = flagAt(i, j)
      if (f === CELL_CLOSED) continue
      const x0 = g.ox + i
      const z0 = g.oz + j
      const shade = shadeAt(i, j)
      floor.quad(V(x0, fy(i, j), z0), V(x0, fy(i, j + 1), z0 + 1), V(x0 + 1, fy(i + 1, j + 1), z0 + 1), V(x0 + 1, fy(i + 1, j), z0), uvFloor, shade)
      if (f === CELL_UNDER) {
        shell.quad(V(x0, cy(i, j), z0), V(x0 + 1, cy(i + 1, j), z0), V(x0 + 1, cy(i + 1, j + 1), z0 + 1), V(x0, cy(i, j + 1), z0 + 1), uvFloor, shade * 0.9)
      }
      for (const [di, dj, a, b, c, d] of edges) {
        const nf: number = flagAt(i + di, j + dj)
        // Walls where rock meets the cell; a lintel (rock face above the opening) where a roofed cell meets a cutting.
        if (nf !== CELL_CLOSED && !(f === CELL_UNDER && nf === CELL_SKY)) continue
        const ax = x0 + a
        const az = z0 + b
        const bx = x0 + c
        const bz = z0 + d
        let ya: number
        let yb: number
        let ta: number
        let tb: number
        // Tops over a cutting lean back (see `lean`); roofed walls stop at the ceiling.
        const topA = nf === CELL_CLOSED && f === CELL_UNDER ? null : lean(i + a, j + b)
        const topB = nf === CELL_CLOSED && f === CELL_UNDER ? null : lean(i + c, j + d)
        if (nf === CELL_CLOSED) {
          ya = fy(i + a, j + b)
          yb = fy(i + c, j + d)
          ta = topA ? topA.y : cy(i + a, j + b)
          tb = topB ? topB.y : cy(i + c, j + d)
        } else {
          // Lintel: from the ceiling edge up to the ground.
          ya = cy(i + a, j + b)
          yb = cy(i + c, j + d)
          ta = topA!.y
          tb = topB!.y
        }
        // A cutting floor that stands above the ground outside leaves a void under its lip (the terrain hole shows the sky): a rock skirt closes it.
        if (nf === CELL_CLOSED && f === CELL_SKY) {
          const sa = surfaceAt(ax, az)
          const sb = surfaceAt(bx, bz)
          if (sa < ya || sb < yb) {
            const alongSkirt = (p: THREE.Vector3): [number, number] => [(di === 0 ? p.x : p.z) * k, p.y * k]
            shell.quad(V(ax, Math.min(sa, ya) - 1.5, az), V(bx, Math.min(sb, yb) - 1.5, bz), V(bx, yb, bz), V(ax, ya, az), alongSkirt, shade * 0.8)
          }
        }
        if (ta <= ya && tb <= yb) continue
        const along = (p: THREE.Vector3): [number, number] => [(di === 0 ? p.x : p.z) * k, p.y * k]
        const topPos = (top: THREE.Vector3 | null, x: number, z: number, y: number) => (top ? top : V(x, y, z))
        const tA = topPos(topA, ax, az, ta)
        const tB = topPos(topB, bx, bz, tb)
        if (topA && topB && nf === CELL_CLOSED) {
          // Bank: foot → knuckle (halfway, pushed out a little more and jittered) → ground, two quads.
          const mid = (foot: THREE.Vector3, top: THREE.Vector3, vi: number, vj: number) => {
            const h = 0.35 + 0.3 * hash01(seed, vi + 31, vj + 17)
            return V(foot.x + (top.x - foot.x) * (h * 0.6), foot.y + (Math.max(top.y, foot.y) - foot.y) * h, foot.z + (top.z - foot.z) * (h * 0.6))
          }
          const mA = mid(V(ax, ya, az), tA, i + a, j + b)
          const mB = mid(V(bx, yb, bz), tB, i + c, j + d)
          shell.quad(V(ax, ya, az), V(bx, yb, bz), mB, mA, along, shade * 0.85)
          shell.quad(mA, mB, tB, tA, along, shade * 0.9)
          // Rocks sit on the rim where the bank meets the ground.
          for (const [top, vi, vj] of [[tA, i + a, j + b], [tB, i + c, j + d]] as const) {
            if (hash01(seed, vi + 53, vj + 5) < RIM_ROCK_CHANCE && !rimDone.has(vj * w + vi)) {
              rimDone.add(vj * w + vi)
              const rr = RIM_ROCK_M[0] + (RIM_ROCK_M[1] - RIM_ROCK_M[0]) * hash01(seed, vi + 97, vj + 3)
              addRock(shell, top.x, top.y - LIP_M, top.z, rr, seed + vi * 31 + vj)
            }
          }
        } else {
          shell.quad(V(ax, ya, az), V(bx, yb, bz), tB, tA, along, shade * 0.85)
        }
      }
    }
  }
  return { floor: floor.geometry(), shell: shell.geometry() }
}

export class Caves {
  group = new THREE.Group()
  private built = new Map<number, Built>()
  private sim: Sim
  private floorMat: THREE.MeshLambertMaterial
  private shellMat: THREE.MeshLambertMaterial
  private textures: THREE.Texture[] = []

  constructor(sim: Sim) {
    this.sim = sim
    this.floorMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 0x9a948c })
    this.shellMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 0x8a847c })
  }

  /** Loads the rock textures; the caves still render (flat colour) if a texture is missing. */
  async load() {
    const base = `${import.meta.env.BASE_URL}images/textures/`
    const loader = new THREE.TextureLoader()
    const get = async (file: string) => {
      try {
        const t = await loader.loadAsync(base + file)
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        this.textures.push(t)
        return t
      } catch {
        return null
      }
    }
    const [floor, wall] = await Promise.all([get('cave_floor_diff_1k.jpg'), get('cave_wall_diff_1k.jpg')])
    if (floor) this.floorMat.map = floor
    if (wall) this.shellMat.map = wall
    this.floorMat.needsUpdate = true
    this.shellMat.needsUpdate = true
  }

  get builtCount() {
    return this.built.size
  }

  update(px: number, pz: number) {
    const field = this.sim.terrain.caves
    if (!field.count) return
    let built = 0
    field.caves.forEach((c, i) => {
      const g = field.grid(i)
      const cx = g.ox + g.nx / 2
      const cz = g.oz + g.nz / 2
      const d = Math.hypot(cx - px, cz - pz) - Math.hypot(g.nx, g.nz) / 2
      const have = this.built.get(i)
      if (have) {
        if (d > CAVE.showM + HYSTERESIS_M) this.drop(i, have)
        return
      }
      if (d > CAVE.showM || built >= BUILD_PER_FRAME) return
      perf.measure('render.caveBuild', () => this.build(i, g, c.id))
      built++
    })
  }

  private build(i: number, g: CaveGrid, id: string) {
    const seed = id.length * 7919 + i
    const { floor, shell } = buildCaveGeometry(g, (x, z) => this.sim.terrain.heightAt(x, z), seed)
    const group = new THREE.Group()
    const geometries: THREE.BufferGeometry[] = []
    for (const [geo, mat] of [[floor, this.floorMat], [shell, this.shellMat]] as const) {
      if (!geo) continue
      const m = new THREE.Mesh(geo, mat)
      m.matrixAutoUpdate = false
      geometries.push(geo)
      group.add(m)
    }
    this.group.add(group)
    this.built.set(i, { group, geometries })
  }

  private drop(i: number, b: Built) {
    this.group.remove(b.group)
    b.geometries.forEach((g) => g.dispose())
    this.built.delete(i)
  }

  dispose() {
    this.built.forEach((b, i) => this.drop(i, b))
    this.floorMat.dispose()
    this.shellMat.dispose()
    this.textures.forEach((t) => t.dispose())
  }
}
