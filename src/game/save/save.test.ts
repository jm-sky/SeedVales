import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { fellTree } from '../sim/actions'
import { killAnimal } from '../sim/combat'
import { addItem, countItem, newStack } from '../sim/inventory'
import { Sim } from '../sim/sim'
import { run, testSim } from '../sim/testWorld'
import { installSystems } from '../sim/worldSystems'
import { isTree } from '../world/nodes'
import { readSave, writeSave } from './db'
import { snapshot } from './snapshot'

describe('save / load', () => {
  it('round-trips world changes: felled tree, killed animal, terrain edit, inventory', async () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('axe'))
    const tree = sim.nodes.query(p.x, p.z, 400).find((n) => isTree(n.kind))!
    expect(fellTree(sim, p, tree).ok).toBe(true)
    const wolf = sim.state.animals.find((a) => a.species === 'wolf')!
    killAnimal(sim, wolf, p)
    sim.terrain.applyEdit(p.x + 5, p.z, 2, { kind: 'add', amount: -1 })
    const hBefore = sim.terrain.heightAt(p.x + 5, p.z)
    const logs = countItem(p.inv, 'log')
    run(sim, 5)
    await writeSave('test', snapshot(sim))
    const loaded = (await readSave('test'))!
    const sim2 = new Sim(sim.world, loaded)
    installSystems(sim2)
    expect(sim2.state.nodes[tree.id]?.kind).toBe('felled')
    expect(sim2.state.animals.find((a) => a.id === wolf.id)).toBeUndefined()
    expect(sim2.state.corpses.length).toBe(sim.state.corpses.length)
    expect(countItem(sim2.player.inv, 'log')).toBe(logs)
    expect(sim2.terrain.heightAt(p.x + 5, p.z)).toBeCloseTo(hBefore, 1)
    expect(sim2.state.time.cal).toBe(sim.state.time.cal)
    // Continues to run after load.
    run(sim2, 5)
  })
})
