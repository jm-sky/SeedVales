#!/usr/bin/env node
/** Prints bounds (m) and triangle counts of each top-level node in a packed GLB. Usage: node inspect-pack.mjs <file.glb> */
import { NodeIO } from '@gltf-transform/core'
import { getBounds } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(process.argv[2])
for (const n of doc.getRoot().getDefaultScene()?.listChildren() ?? doc.getRoot().listScenes()[0].listChildren()) {
  const b = getBounds(n)
  let tris = 0
  n.traverse((c) => c.getMesh()?.listPrimitives().forEach((p) => (tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3)))
  console.log(n.getName().padEnd(34), 'min', b.min.map((v) => v.toFixed(2)).join(','), 'max', b.max.map((v) => v.toFixed(2)).join(','), 'tris', tris)
}
