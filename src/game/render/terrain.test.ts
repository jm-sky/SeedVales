/**
 * Terrain shader path (render--002 step 3, behind `sv-visual` flags): season/snow no longer rebuild chunks,
 * normals do not depend on the LOD.
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { perf } from '../diag/perf'
import { testSim } from '../sim/testWorld'
import { QUALITY } from './quality'
import { TerrainChunks } from './terrainChunks'
import { VISUAL_DEFAULTS } from './visualFlags'

const builds = () => perf.report().timers.find((t) => t.name === 'chunks.build')?.samples ?? 0

function settle(tc: TerrainChunks, x: number, z: number) {
  for (let i = 0; i < 400 && (i === 0 || (tc as unknown as { pending: number }).pending > 0); i++) tc.update(x, z, 1e6)
}

describe('render: terrain shading (RENDER-04)', () => {
  const ON = { tintUniforms: true, smooth: true, detail: true }

  it('RENDER-04: with tint uniforms a season/snow change rebuilds no chunk; the legacy path rebuilds them', () => {
    const sim = testSim()
    const p = sim.player
    const count = (flags: typeof ON | undefined) => {
      const tc = new TerrainChunks(sim.terrain, QUALITY.low, flags)
      settle(tc, p.x, p.z)
      const before = builds()
      tc.seasonTint = 0.8
      tc.snowCover = 0.8
      tc.update(p.x, p.z, 1e6)
      settle(tc, p.x, p.z)
      const n = builds() - before
      tc.dispose()
      return n
    }
    expect(count(ON)).toBe(0)
    expect(count(undefined)).toBeGreaterThan(0)
  })

  it('RENDER-04: smooth normals are LOD-independent and unit length; chunks carry tint masks and skirts copy edge normals', () => {
    const sim = testSim()
    const p = sim.player
    const tc = new TerrainChunks(sim.terrain, QUALITY.low, ON)
    type Build = (cx: number, cz: number, lod: number, span: number) => { mesh: { geometry: { attributes: Record<string, { array: Float32Array; count: number }> } } }
    const build = (lod: number) => (tc as unknown as { build: Build }).build.call(tc, Math.floor(p.x / 128), Math.floor(p.z / 128), lod, 1)
    const fine = build(0).mesh.geometry.attributes
    const coarse = build(1).mesh.geometry.attributes
    const nF = 128 / 2 + 1
    const nC = 128 / 4 + 1
    // Shared vertices: every 2nd fine vertex is a coarse vertex (interior, both use the 2 m central difference).
    let checked = 0
    for (let j = 2; j < nC - 2; j += 3) {
      for (let i = 2; i < nC - 2; i += 3) {
        const a = (j * 2 * nF + i * 2) * 3
        const b = (j * nC + i) * 3
        for (let k = 0; k < 3; k++) expect(coarse.normal!.array[b + k]).toBeCloseTo(fine.normal!.array[a + k]!, 4)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(10)
    const len = Math.hypot(fine.normal!.array[0]!, fine.normal!.array[1]!, fine.normal!.array[2]!)
    expect(len).toBeCloseTo(1, 4)
    expect(fine.aTint!.count).toBe(fine.position!.count)
    // Skirt vertex = copy of its edge vertex.
    const sk = nF * nF
    expect(Array.from(fine.normal!.array.slice(sk * 3, sk * 3 + 3))).toEqual(Array.from(fine.normal!.array.slice(0, 3)))
    tc.dispose()
  })

  it('RENDER-04 (D-REN-13): the defaults use the shader path; a quality switch toggles the detail texture without rebuilding chunks', () => {
    expect(VISUAL_DEFAULTS).toMatchObject({ tintUniforms: true, smooth: true, detail: true })
    const sim = testSim()
    const p = sim.player
    const tc = new TerrainChunks(sim.terrain, QUALITY.medium, VISUAL_DEFAULTS)
    expect(tc.detailActive).toBe(true)
    settle(tc, p.x, p.z)
    const before = builds()
    tc.setQuality(QUALITY.low)
    expect(tc.detailActive).toBe(false)
    const meshes = tc.group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && o !== tc.ocean && o.material !== tc.waterMat)
    expect(meshes.length).toBeGreaterThan(0)
    const mat = meshes[0]!.material
    expect(meshes.every((m) => m.material === mat)).toBe(true)
    tc.setQuality(QUALITY.medium)
    expect(tc.detailActive).toBe(true)
    expect(builds() - before).toBe(0)
    tc.dispose()
  })

  it('RENDER-05: water meshes carry depth = surface − ground (≥ 0, shore fades to 0); glint follows the profile', () => {
    const sim = testSim()
    const w = sim.world
    let at: { x: number; z: number } | null = null
    for (let k = 0; k < w.n * w.n && !at; k += 7) if (w.waterKind[k] === 2 && sim.terrain.waterDepthAt((k % w.n) * w.cell, Math.floor(k / w.n) * w.cell) > 1) at = { x: (k % w.n) * w.cell, z: Math.floor(k / w.n) * w.cell }
    expect(at).not.toBeNull()
    const tc = new TerrainChunks(sim.terrain, QUALITY.low, VISUAL_DEFAULTS)
    settle(tc, at!.x, at!.z)
    const meshes = [...(tc as unknown as { chunks: Map<string, { water?: THREE.Mesh }> }).chunks.values()].flatMap((c) => (c.water ? [c.water] : []))
    expect(meshes.length).toBeGreaterThan(0)
    let deep = 0
    let shore = 0
    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position')
      const d = m.geometry.getAttribute('aDepth')
      expect(d.count).toBe(pos.count)
      for (let i = 0; i < d.count; i += 5) {
        const expected = Math.max(0, pos.getY(i) - sim.terrain.heightAt(pos.getX(i), pos.getZ(i)))
        expect(d.getX(i)).toBeCloseTo(expected, 3)
        if (d.getX(i) > 1) deep++
        if (d.getX(i) === 0) shore++
      }
    }
    expect(deep).toBeGreaterThan(0)
    expect(shore).toBeGreaterThan(0)
    const detail = (tc as unknown as { waterDetail: { value: number } }).waterDetail
    expect(detail.value).toBe(0) // low: no glint
    tc.setQuality(QUALITY.medium)
    expect(detail.value).toBe(1)
  })
})
