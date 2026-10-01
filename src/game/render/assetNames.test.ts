import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
/**
 * Asset guard (render--004 step 2): every GLB the renderer loads exists and every node name the
 * render code requests is present. A missing name would silently fall back to procedural geometry.
 */
import { describe, expect, it } from 'vitest'
import attachmentsRaw from '../../../public/assets/parked/attachments.json?raw'
import { PROFESSIONS } from '../data/professions'
import { SPECIES } from '../data/species'
import { packNodeNames } from './assetNames'

const ROOT = 'public/assets/'

async function nodeNames(file: string): Promise<Set<string>> {
  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  const doc = await io.read(ROOT + file)
  return new Set(doc.getRoot().listNodes().map((n) => n.getName()))
}

describe('render: asset guard (render--004)', () => {
  for (const [file, wanted] of Object.entries(packNodeNames())) {
    it(`${file} contains every node the renderer requests`, async () => {
      const have = await nodeNames(file)
      expect(wanted.filter((n) => !have.has(n)), `missing in ${file}`).toEqual([])
    })
  }

  it('every species model and character GLB exists and parses', async () => {
    const files = [
      ...Object.values(SPECIES).flatMap((s) => (s.model ? [`animals/${s.model}.glb`] : [])),
      ...['Male', 'Female'].flatMap((sex) => [
        ...['Peasant', 'Ranger', 'Ranger_NoHood', 'Knight', 'Knight_Helm', 'Knight_Cloth', 'Wizard', 'Peasant_Boots', 'Blacksmith', 'Herbalist'].map((o) => `${sex}_${o}`),
        `${sex}_Head`,
      ]).concat('anims').map((k) => `characters/${k}.glb`),
    ]
    const bad: string[] = []
    for (const f of files) await nodeNames(f).catch(() => bad.push(f))
    expect(bad).toEqual([])
  })

  // Parked (render--006): not loaded by the game yet, but the data contract must not drift while it waits.
  it('parked held items: attachments.json matches props_held.glb, professions and the skeleton', async () => {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
    const att = JSON.parse(attachmentsRaw) as Record<string, { node: string; bone: string; position: number[]; quaternion: number[]; scale: number[] }>
    const held = await io.read(`${ROOT}parked/props_held.glb`)
    const kitNodes = new Map(held.getRoot().listNodes().map((n) => [n.getName(), n]))
    for (const sex of ['Male', 'Female']) {
      const bones = await nodeNames(`characters/${sex}_Peasant.glb`)
      for (const [prof, a] of Object.entries(att)) {
        expect(Object.keys(PROFESSIONS), `profession id ${prof}`).toContain(prof)
        expect(bones.has(a.bone), `${sex} skeleton has bone ${a.bone}`).toBe(true)
      }
    }
    for (const [prof, a] of Object.entries(att)) {
      expect(a.position).toHaveLength(3)
      expect(a.quaternion).toHaveLength(4)
      expect(Math.hypot(...a.quaternion), `${prof} quaternion is unit`).toBeCloseTo(1, 3)
      const wrapper = kitNodes.get(a.node)
      expect(wrapper, `${a.node} in props_held.glb`).toBeDefined()
      const prims = wrapper!.listChildren().flatMap((c) => c.getMesh()?.listPrimitives() ?? [])
      expect(prims, `${a.node}: one primitive = one draw call`).toHaveLength(1)
      const tris = prims[0].getAttribute('POSITION')!.getCount() / 3
      expect(tris, `${a.node} triangles`).toBeLessThanOrEqual(1500)
    }
  })
})
