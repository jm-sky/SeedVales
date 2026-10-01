/**
 * VISION-APPENDIX economy rules (wave 3, plan economy--001): stumps and rock splitting (RES-07).
 */
import { describe, expect, it } from 'vitest'
import type { ResNode } from '../world/nodes'
import type { Sim } from './sim'
import { ROAST, ROCK } from '../config/calibration'
import { itemDef } from '../data/items'
import { roundTrip } from '../save/snapshot'
import { isTree } from '../world/nodes'
import { breakChunk, butcher, fellTree, isBoulder, mineRock, rockPieces } from './actions'
import { killAnimal } from './combat'
import { completeRoast, roastBatch, roastCapacity, roastSeconds } from './cooking'
import { findTargets } from './interact'
import { addItem, countItem, newStack, stackLabel } from './inventory'
import { makeAnimal } from './newGame'
import { testSim } from './testWorld'

function findNode(sim: Sim, pred: (n: ResNode) => boolean): ResNode {
  for (let i = 0; i < 2000; i++) {
    const n = sim.nodes.query(300 + ((i * 523) % 7600), 300 + ((i * 331) % 7600), 150).find(pred)
    if (n) return n
  }
  throw new Error('node not found')
}

describe('wave 3: gathering (RES-07)', () => {
  it('a felled tree leaves a stump that survives save/load and is no longer a tree target', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('axe'))
    const tree = findNode(sim, (n) => n.kind === 'tree_broad' && !sim.state.nodes[n.id])
    expect(fellTree(sim, p, tree).ok).toBe(true)
    const st = roundTrip(sim).nodes[tree.id]
    expect(st?.kind).toBe('felled')
    expect(fellTree(sim, p, tree).ok).toBe(false)
    p.x = tree.x
    p.z = tree.z - 1.5
    sim.actors.update(p)
    expect(findTargets(sim, 0).some((t) => t.ref.type === 'node' && t.ref.id === tree.id)).toBe(false)
  })

  it('a boulder splits into chunks next to it; a chunk breaks into stones with a pickaxe', () => {
    const sim = testSim()
    const p = sim.player
    const rock = findNode(sim, (n) => isBoulder(n))
    p.x = rock.x + rock.radius + 1
    p.z = rock.z
    const stones0 = countItem(p.inv, 'stone')
    addItem(p.inv, newStack('pickaxe'))
    const pieces = rockPieces(rock)
    for (let i = 0; i < pieces + 2; i++) mineRock(sim, p, rock)
    expect(sim.state.nodes[rock.id]!.kind).toBe('depleted')
    expect(countItem(p.inv, 'stone')).toBe(stones0) // no stones straight from a boulder
    const chunks = sim.groundNear(rock.x, rock.z, rock.radius + 2).filter((g) => g.stack.id === 'rock_chunk')
    expect(chunks.reduce((s, g) => s + g.stack.qty, 0)).toBe(pieces)
    // Chunks land between the rock and the player.
    for (const g of chunks) expect(g.x).toBeGreaterThan(rock.x)
    const g = chunks[0]!
    const q0 = g.stack.qty
    const pick = p.inv.items.find((s) => s.id === 'pickaxe')!
    p.inv.items.splice(p.inv.items.indexOf(pick), 1)
    expect(breakChunk(sim, p, g).ok).toBe(false)
    addItem(p.inv, newStack('pickaxe'))
    expect(breakChunk(sim, p, g).ok).toBe(true)
    expect(countItem(p.inv, 'stone')).toBe(stones0 + ROCK.chunkStones)
    expect(q0 === 1 ? !sim.state.ground.includes(g) : g.stack.qty === q0 - 1).toBe(true)
  })

  it('a smaller rock still gives stones directly', () => {
    const sim = testSim()
    const p = sim.player
    const rock = findNode(sim, (n) => n.kind === 'rock' && !isBoulder(n))
    addItem(p.inv, newStack('pickaxe'))
    const s0 = countItem(p.inv, 'stone')
    expect(mineRock(sim, p, rock).ok).toBe(true)
    expect(countItem(p.inv, 'stone')).toBe(s0 + 2)
    expect(isTree(rock.kind)).toBe(false)
  })
})

describe('wave 3: roasting at the campfire (FOOD-03)', () => {
  function atFire(): { sim: Sim; fire: { x: number; z: number } } {
    const sim = testSim()
    const p = sim.player
    const fire = sim.state.buildings.find((b) => b.kind === 'campfire')!
    fire.lit = true
    p.x = fire.x + 1.5
    p.z = fire.z
    p.inv.items = p.inv.items.filter((s) => s.id !== 'raw_meat' && s.id !== 'cooked_meat' && s.id !== 'pan' && s.id !== 'pot')
    return { sim, fire }
  }

  it('capacity: 1 on the bare fire, 2 with a pan, spit slots with a spit next to the fire', () => {
    const { sim, fire } = atFire()
    const p = sim.player
    expect(roastCapacity(sim, p)).toBe(1)
    addItem(p.inv, newStack('pan'))
    expect(roastCapacity(sim, p)).toBe(ROAST.vesselSlots)
    sim.state.buildings.push({ id: 'spit-t', kind: 'spit', x: fire.x, z: fire.z + 1.2, rot: 0, hw: 1, hd: 0.4, settlementId: -1, durability: 100, owner: 'player' })
    sim.rebuildBuildingIndex()
    expect(roastCapacity(sim, p)).toBe(ROAST.spitSlots)
    p.x += 20
    expect(roastCapacity(sim, p)).toBe(0)
  })

  it('a batch roasts at once, least fresh first; cooked meat keeps species and relative freshness', () => {
    const { sim } = atFire()
    const p = sim.player
    addItem(p.inv, newStack('pan'))
    const life = itemDef('raw_meat').food!.spoilH
    addItem(p.inv, newStack('raw_meat', 1, { sp: 'deer', fresh: life * 0.5 }))
    addItem(p.inv, newStack('raw_meat', 2, { sp: 'boar', fresh: life }))
    expect(p.inv.items.filter((s) => s.id === 'raw_meat')).toHaveLength(2) // species never merge
    expect(roastBatch(sim, p)).toBe(2)
    expect(roastSeconds()).toBeCloseTo((ROAST.calMin * 60) / 24)
    expect(completeRoast(sim, p, 2).ok).toBe(true)
    const cooked = p.inv.items.filter((s) => s.id === 'cooked_meat')
    const cookedLife = itemDef('cooked_meat').food!.spoilH
    expect(cooked.find((s) => s.sp === 'deer')!.fresh).toBeCloseTo(cookedLife * 0.5)
    expect(cooked.find((s) => s.sp === 'boar')!.fresh).toBeCloseTo(cookedLife)
    expect(countItem(p.inv, 'raw_meat')).toBe(1) // one boar piece left
    expect(stackLabel(cooked.find((s) => s.sp === 'deer')!)).toMatch(/\(deer\)|\(stag\)/i)
    // Meta survives save/load.
    expect(roundTrip(sim).player.inv.items.some((s) => s.id === 'cooked_meat' && s.sp === 'deer')).toBe(true)
  })

  it('butchering tags the meat with the species', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('knife'))
    const boar = makeAnimal(sim.nextId(), 'boar', 'adult', p.x + 1, p.z, sim.terrain.heightAt(p.x + 1, p.z), sim.rng)
    sim.addAnimal(boar)
    killAnimal(sim, boar)
    const c = sim.state.corpses.at(-1)!
    expect(butcher(sim, p, c).ok).toBe(true)
    expect(p.inv.items.find((s) => s.id === 'raw_meat' && s.sp === 'boar')).toBeDefined()
  })
})
