/**
 * render--003 (draw-call attribution): actors outside the camera frustum are not drawn or animated, and only
 * near actors cast shadows; `cull = false` restores the old always-drawn behaviour (A/B flag `actorCull`).
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { testSim } from '../sim/testWorld'
import { Actors } from './actors'
import { QUALITY } from './quality'

type Vis = { root: THREE.Object3D }

describe('render: actor culling', () => {
  it('an NPC behind the camera is hidden, one in front is shown; cull = false shows both', () => {
    const sim = testSim()
    const p = sim.player
    const [front, back] = sim.state.npcs.filter((n) => n.age !== 'child')
    for (const [n, dz] of [[front!, 12], [back!, -12]] as const) {
      n.x = p.x
      n.z = p.z + dz
      n.ai.steps = []
      sim.actors.update(n)
    }
    const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000)
    cam.position.set(p.x, p.y + 2, p.z - 3)
    cam.lookAt(p.x, p.y + 1, p.z + 10)
    const actors = new Actors(sim, QUALITY.medium)
    actors.update(0.016, cam)
    const vis = (actors as unknown as { visuals: Map<number, Vis> }).visuals
    expect(vis.get(front!.id)!.root.visible).toBe(true)
    expect(vis.get(back!.id)!.root.visible).toBe(false)
    actors.cull = false
    actors.update(0.016, cam)
    expect(vis.get(back!.id)!.root.visible).toBe(true)
  })
})
