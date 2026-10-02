import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { describe, expect, it } from 'vitest'
import { PILE_TIERS, pileNode } from './stockpileTiers'

describe('stockpiles.glb contract (render--009)', () => {
  it('has one top-level, identity-transform node per tier with vertex colours and ≤ 2.5k triangles', async () => {
    await MeshoptDecoder.ready
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
    const doc = await io.read('public/assets/stockpiles.glb')
    const top = new Map(doc.getRoot().listScenes()[0]!.listChildren().map((n) => [n.getName(), n]))
    for (const [kind, tiers] of Object.entries(PILE_TIERS)) {
      for (const t of tiers) {
        const n = top.get(pileNode(kind as keyof typeof PILE_TIERS, t))
        expect(n, `${kind} ${t}`).toBeDefined()
        expect(n!.getTranslation()).toEqual([0, 0, 0])
        expect(n!.getScale()).toEqual([1, 1, 1])
        const prim = n!.listChildren()[0]!.getMesh()!.listPrimitives()[0]!
        expect(prim.getAttribute('COLOR_0')).not.toBeNull()
        expect(prim.getIndices()!.getCount() / 3).toBeLessThanOrEqual(2500)
      }
    }
  })
})
