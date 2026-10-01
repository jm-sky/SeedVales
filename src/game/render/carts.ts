/**
 * Wheelbarrows and handcarts (TRANS-01): parked ones where they stand, the pushed one in front of the
 * player. Few objects → small pool of procedural low-poly meshes.
 * @domain render
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { Cart } from '../sim/types'
import { cartDef, cartLoad } from '../sim/cart'
import { groundHeight } from '../sim/collision'
import { sharedColorMat } from './assets'

const WOOD = 0x7a5a3a
const DARK = 0x3a2a1a
const LOAD = 0x8c8a84

function build(kind: string): THREE.Group {
  const g = new THREE.Group()
  const big = kind === 'handcart'
  const w = big ? 1.1 : 0.7
  const l = big ? 1.5 : 1.0
  const tray = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, l), sharedColorMat(WOOD))
  tray.position.set(0, 0.55, big ? 0 : 0.1)
  g.add(tray)
  const wheelGeo = new THREE.CylinderGeometry(big ? 0.38 : 0.22, big ? 0.38 : 0.22, 0.08, 10).rotateZ(Math.PI / 2)
  for (const x of big ? [-w / 2 - 0.05, w / 2 + 0.05] : [0]) {
    const wheel = new THREE.Mesh(wheelGeo, sharedColorMat(DARK))
    wheel.position.set(x, big ? 0.38 : 0.22, big ? 0 : l / 2 + 0.05)
    g.add(wheel)
  }
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), sharedColorMat(WOOD))
    handle.position.set(x, 0.7, -l / 2 - 0.35)
    handle.rotation.x = -0.25
    g.add(handle)
  }
  const load = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.3, l * 0.8), sharedColorMat(LOAD))
  load.name = 'load'
  load.position.set(0, 0.8, tray.position.z)
  g.add(load)
  return g
}

export class Carts {
  group = new THREE.Group()
  private pool = new Map<string, THREE.Group[]>()
  private sim: Sim

  constructor(sim: Sim) {
    this.sim = sim
  }

  update() {
    const sim = this.sim
    const p = sim.player
    const used = new Map<string, number>()
    const place = (c: Cart, x: number, z: number, rot: number) => {
      const n = used.get(c.item) ?? 0
      used.set(c.item, n + 1)
      let list = this.pool.get(c.item)
      if (!list) this.pool.set(c.item, (list = []))
      let g = list[n]
      if (!g) {
        g = build(c.item)
        list.push(g)
        this.group.add(g)
      }
      g.visible = true
      g.position.set(x, groundHeight(sim, x, z), z)
      g.rotation.y = rot
      const fill = Math.min(1, cartLoad(c) / cartDef(c).capacity)
      const load = g.getObjectByName('load')!
      load.visible = fill > 0.02
      load.scale.y = Math.max(0.1, fill)
      const logs = c.inv.items.filter((s) => s.id === 'log').reduce((n, s) => n + s.qty * 18, 0)
      ;(load as THREE.Mesh).material = sharedColorMat(logs * 2 > cartLoad(c) ? WOOD : LOAD)
    }
    const pushed = sim.state.px.cart
    if (pushed) place(pushed, p.x + Math.sin(p.rot) * 1.1, p.z + Math.cos(p.rot) * 1.1, p.rot)
    for (const c of sim.state.carts) if (Math.abs(c.x - p.x) < 200 && Math.abs(c.z - p.z) < 200) place(c, c.x, c.z, c.rot)
    for (const [kind, list] of this.pool) list.forEach((g, i) => (g.visible = i < (used.get(kind) ?? 0)))
  }
}
