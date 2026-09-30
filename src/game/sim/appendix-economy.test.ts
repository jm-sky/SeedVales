/**
 * VISION-APPENDIX economy rules (wave 3, plan economy--001): stumps and rock splitting (RES-07).
 */
import { describe, expect, it } from 'vitest'
import type { ResNode } from '../world/nodes'
import type { Sim } from './sim'
import { ROCK } from '../config/calibration'
import { roundTrip } from '../save/snapshot'
import { isTree } from '../world/nodes'
import { breakChunk, fellTree, isBoulder, mineRock, rockPieces } from './actions'
import { findTargets } from './interact'
import { addItem, countItem, newStack } from './inventory'
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
