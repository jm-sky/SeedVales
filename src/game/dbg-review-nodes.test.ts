import { it } from 'vitest'
import { roundTrip } from './save/snapshot'
import { Sim } from './sim/sim'
import { testSim } from './sim/testWorld'
import { installSystems } from './sim/worldSystems'
import { CHUNK_M } from './world/types'

it('node ids after dig', () => {
  const sim = testSim(1337)
  // find a chunk near settlement 0 with water and nodes
  const s = sim.world.settlements[0]!
  let found = false
  for (let r = 0; r < 1500 && !found; r += CHUNK_M) {
    for (let a = 0; a < 16 && !found; a++) {
      const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r
      const cx = Math.floor(x / CHUNK_M), cz = Math.floor(z / CHUNK_M)
      const nodes = sim.nodes.getChunk(cx, cz)
      // node with depth 0 adjacent to water (within 6m)
      const idx = nodes.findIndex((n) => n.kind !== 'reed' && sim.terrain.waterDepthAt(n.x, n.z) === 0 && sim.terrain.waterSurfaceAt(n.x, n.z) > -Infinity && sim.terrain.waterSurfaceAt(n.x, n.z) > sim.terrain.heightAt(n.x, n.z) - 2)
      if (idx < 0 || idx === nodes.length - 1) continue
      const n = nodes[idx]!
      const after = nodes[idx + 1]!
      sim.state.nodes[after.id] = { kind: 'felled', at: 0 }
      console.log('target', n.id, n.kind, 'next', after.id, after.kind)
      for (let k = 0; k < 6; k++) sim.terrain.applyEdit(n.x, n.z, 1.4, { kind: 'add', amount: -0.35 })
      const sim2 = new Sim(sim.world, roundTrip(sim))
      installSystems(sim2)
      const nodes2 = sim2.nodes.getChunk(cx, cz)
      const same = nodes2.find((m) => m.id === after.id)
      console.log('count before', nodes.length, 'after', nodes2.length, 'id', after.id, 'now refers to', same?.kind, same && Math.hypot(same.x - after.x, same.z - after.z).toFixed(1), 'm away')
      found = true
    }
  }
  console.log('found', found)
}, 120000)
