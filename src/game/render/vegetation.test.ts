/**
 * Vegetation streaming (render--002 step 1, review 009 F-01): the rebuild after crossing a half-chunk is
 * spread over frames within a budget, the previous instances stay visible until the new set is complete,
 * and node chunks around the view ring are prefetched one per frame.
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { testSim } from '../sim/testWorld'
import { CHUNK_M } from '../world/types'
import { QUALITY } from './quality'
import { TREE_FADE_M } from './treeImpostors'
import { TREE_VARIANTS } from './treeModels'
import { Vegetation } from './vegetation'

const visibleCounts = (v: Vegetation) => v.meshes.filter((m) => m.visible).map((m) => m.count).join(',')

describe('render: vegetation streaming (PERF-02)', () => {
  it('PERF-02: a rebuild is time-sliced, keeps the old instances until it commits, and ends equal to a full rebuild', () => {
    const sim = testSim()
    const q = QUALITY.medium
    const p = sim.player
    const v = new Vegetation(sim, q)
    v.update(p.x, p.z) // first build: complete at once
    expect(v.instances).toBeGreaterThan(0)
    const before = visibleCounts(v)
    // Cross a half-chunk boundary; budget 0 → one small step per frame.
    const x2 = p.x + CHUNK_M
    v.update(x2, p.z, 0)
    expect(v.rebuilding).toBe(true)
    expect(visibleCounts(v)).toBe(before)
    let frames = 1
    while (v.rebuilding && frames < 5000) {
      v.update(x2, p.z, 0)
      frames++
    }
    expect(v.rebuilding).toBe(false)
    expect(frames).toBeGreaterThan(3)
    // Same result as a fresh synchronous build at the new position.
    const ref = new Vegetation(sim, q)
    ref.update(x2, p.z)
    expect(v.instances).toBe(ref.instances)
  })

  it('PERF-02: node chunks ahead of the view ring are prefetched, at most one per frame', () => {
    const sim = testSim()
    const q = QUALITY.medium
    const p = sim.player
    const v = new Vegetation(sim, q)
    v.update(p.x, p.z)
    const r = q.vegFar + CHUNK_M
    const ring = () => {
      let missing = 0
      for (let cz = Math.floor((p.z - r) / CHUNK_M); cz <= Math.floor((p.z + r) / CHUNK_M); cz++) {
        for (let cx = Math.floor((p.x - r) / CHUNK_M); cx <= Math.floor((p.x + r) / CHUNK_M); cx++) if (!sim.nodes.has(cx, cz)) missing++
      }
      return missing
    }
    const m0 = ring()
    expect(m0).toBeGreaterThan(0)
    v.update(p.x, p.z)
    expect(ring()).toBe(m0 - 1)
    for (let i = 0; i < 400; i++) v.update(p.x, p.z)
    expect(ring()).toBe(0)
  })

  it('RENDER-07: with a baked atlas, trees beyond the model ring are impostors, never procedural cones; models stay near', () => {
    const sim = testSim()
    const q = QUALITY.medium
    // Stand next to a tree so the model ring is not empty.
    let p = { x: sim.player.x, z: sim.player.z }
    for (let r = 0; r < 4 && p.x === sim.player.x; r++) {
      for (let cz = -r; cz <= r; cz++) for (let cx = -r; cx <= r; cx++) {
        const t = sim.nodes.getChunk(Math.floor(sim.player.x / CHUNK_M) + cx, Math.floor(sim.player.z / CHUNK_M) + cz).find((n) => n.kind.startsWith('tree_'))
        if (t && p.x === sim.player.x) p = { x: t.x + 4, z: t.z }
      }
    }
    const plain = new Vegetation(sim, q)
    plain.update(p.x, p.z)
    expect(plain.visibleSets().some((k) => k.startsWith('far:tree_'))).toBe(true) // before baking: the old cones
    const v = new Vegetation(sim, q)
    // Baking needs WebGL: a fake atlas with one row per (procedural fallback) tree template.
    const rows = new Map(['tree_broad#0', 'tree_apple#0', 'tree_pine#0', 'tree_dead#0'].map((k, i) => [k, i]))
    ;(v as unknown as { atlas: unknown }).atlas = { texture: new THREE.Texture(), rows, bounds: [...rows.keys()].map(() => new THREE.Vector4(1, 0, 1, 0)), dispose() {} }
    v.update(p.x, p.z)
    expect(v.impostorInstances).toBeGreaterThan(0)
    expect(v.visibleSets().some((k) => k.startsWith('far:tree_'))).toBe(false)
    // Every standing tree inside the model ring is a model; impostors start inside the overlap band only.
    let inner = 0
    for (let cz = Math.floor((p.z - q.treeModel) / CHUNK_M); cz <= Math.floor((p.z + q.treeModel) / CHUNK_M); cz++) {
      for (let cx = Math.floor((p.x - q.treeModel) / CHUNK_M); cx <= Math.floor((p.x + q.treeModel) / CHUNK_M); cx++) {
        for (const n of sim.nodes.getChunk(cx, cz)) if (n.kind.startsWith('tree_') && Math.hypot(n.x - p.x, n.z - p.z) < q.treeModel - TREE_FADE_M) inner++
      }
    }
    expect(inner).toBeGreaterThan(0)
    expect(v.visibleSets().some((k) => k.startsWith('near:tree_'))).toBe(true)
  })

  it('RENDER-07: offline trees use LOD0 near, LOD1 to the model ring, impostors beyond; every standing tree is in a band', () => {
    const sim = testSim()
    const q = QUALITY.medium
    const p = { x: sim.player.x, z: sim.player.z }
    const v = new Vegetation(sim, q)
    // Fake assets (loading needs fetch/GL): one tiny template per variant and LOD, unit bounds.
    const templates = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material }[]>()
    const maxY = new Map<string, number>()
    const rows = new Map<string, number>()
    let row = 0
    for (const vars of Object.values(TREE_VARIANTS)) for (const name of vars) {
      for (const lod of [0, 1]) templates.set(`${name}#${lod}`, [{ geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshLambertMaterial() }])
      maxY.set(name, 10)
      rows.set(name, row++)
    }
    v.useTreeAssets({ templates, maxY, atlas: { texture: new THREE.Texture(), rows, bounds: [...rows.keys()].map(() => new THREE.Vector4(1, 0, 1, 0)), dispose() {} } })
    expect(v.treeAssetsActive).toBe(true)
    v.update(p.x, p.z)
    const sets = v.visibleSets()
    expect(sets.some((k) => k.startsWith('near:tree:') && k.endsWith('#1'))).toBe(true)
    expect(sets.some((k) => k.startsWith('far:tree_') || k.startsWith('near:tree_'))).toBe(false) // no kit trees or cones
    expect(v.impostorInstances).toBeGreaterThan(0)
  })
})
