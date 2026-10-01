/**
 * Asset guard (render--004 step 2): every GLB the renderer loads exists and every node name the
 * render code requests is present. A missing name would silently fall back to procedural geometry.
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { describe, expect, it } from 'vitest'
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
})
