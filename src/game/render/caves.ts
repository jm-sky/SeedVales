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
const LIP_M = 0.1

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
        if (nf === CELL_CLOSED) {
          ya = fy(i + a, j + b)
          yb = fy(i + c, j + d)
          ta = f === CELL_SKY ? surfaceAt(ax, az) + LIP_M : cy(i + a, j + b)
          tb = f === CELL_SKY ? surfaceAt(bx, bz) + LIP_M : cy(i + c, j + d)
        } else {
          // Lintel: from the ceiling edge up to the ground.
          ya = cy(i + a, j + b)
          yb = cy(i + c, j + d)
          ta = surfaceAt(ax, az) + LIP_M
          tb = surfaceAt(bx, bz) + LIP_M
        }
        if (ta <= ya && tb <= yb) continue
        const along = (p: THREE.Vector3): [number, number] => [(di === 0 ? p.x : p.z) * k, p.y * k]
        shell.quad(V(ax, ya, az), V(bx, yb, bz), V(bx, Math.max(tb, yb), bz), V(ax, Math.max(ta, ya), az), along, shade * 0.85)
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
