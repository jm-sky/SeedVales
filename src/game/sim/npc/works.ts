/**
 * Work acts: effects executed when an NPC finishes a 'work' step. Return false = failure
 * (goal gets a cooldown → no infinite retry loops).
 * @domain npc
 * @subdomain duties
 */
import type { Sim } from '../sim'
import type { Animal, Human } from '../types'
import { CARAVAN_FEE, WOOL_REGROW_DAYS } from '../../config/calibration'
import { itemDef } from '../../data/items'
import { perf } from '../../diag/perf'
import { butcher, consume, drinkFromContainer, drinkFromWater, fellTree, fillContainers, fillTrough, gatherNode, giveOrDrop, repairBuilding, train } from '../actions'
import { applyDamage, weaponOf } from '../combat'
import { addItem, countItem, findFood, newStack, removeItem, wieldBest } from '../inventory'
import { forgeOrder } from '../orders'
import { growthFactor } from '../time'
import { payFromTreasury } from '../treasury'
import { drink, eat, heal, hp } from '../vitals'
import { household, houseOf } from './queries'

type Act = (sim: Sim, h: Human, ref: string | undefined, eff: number) => boolean

/** A cooked household meal is worth more than eating the raw ingredient (calibration, see DECISIONS D-SIM-8). */
const HOME_MEAL = 2.2

const storeOf = (sim: Sim, h: Human) => houseOf(sim, h)?.inv

export const WORK_ACTS: Record<string, Act> = {
  drink_well: (_sim, h) => {
    drink(h.vitals, 55)
    fillContainers(h, h.x, h.z, _sim, true)
    return true
  },
  drink_water: (sim, h, ref) => {
    const [x, z] = (ref ?? '').split(',').map(Number)
    return drinkFromWater(sim, h, x ?? h.x, z ?? h.z).ok
  },
  drink_skin: (_sim, h) => drinkFromContainer(h).ok,
  eat_store: (sim, h) => {
    const inv = storeOf(sim, h)
    const f = inv ? findFood(inv) : undefined
    if (!inv || !f) return false
    const d = itemDef(f.id)
    removeItem(inv, f.id, 1)
    eat(h.vitals, d.food!.nutrition * HOME_MEAL, d.food!.water ?? 0)
    return true
  },
  eat_inv: (sim, h) => {
    const f = findFood(h.inv)
    return !!f && consume(sim, h, f).ok
  },
  eat_warehouse: (sim, h, ref) => {
    const b = sim.building(ref)
    const f = b?.inv ? findFood(b.inv) : undefined
    if (!b?.inv || !f) return false
    removeItem(b.inv, f.id, 1)
    eat(h.vitals, itemDef(f.id).food!.nutrition * HOME_MEAL)
    return true
  },
  buy_food: (sim, h, ref) => {
    const seller = sim.human(Number(ref))
    const inv = seller ? storeOf(sim, seller) : undefined
    const f = inv ? findFood(inv) : undefined
    if (!seller || !inv || !f) return false
    const price = itemDef(f.id).price
    if (h.money < price) return false
    h.money -= price
    seller.money += price
    removeItem(inv, f.id, 1)
    eat(h.vitals, itemDef(f.id).food!.nutrition * HOME_MEAL)
    return true
  },
  sleep: () => true,
  camp: () => true,
  /** Takes provisions for a journey from the household store. */
  pack_food: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv) return true
    for (let i = 0; i < 6; i++) {
      const f = findFood(inv)
      if (!f) break
      for (const s of removeItem(inv, f.id, 1)) addItem(h.inv, s)
    }
    return true
  },
  /** Starts a caravan expedition: provisions + explicit outbound phase. */
  caravan_depart: (sim, h) => {
    WORK_ACTS.pack_food!(sim, h, undefined, 1)
    h.trip = { phase: 'outbound', since: sim.state.time.cal }
    return true
  },
  rest: () => true,
  shelter: () => true,
  socialize: (_sim, h) => {
    h.vitals.social = Math.min(100, h.vitals.social + 45)
    return true
  },
  fell: (sim, h, ref, eff) => {
    const n = ref ? sim.nodes.byId(ref) : undefined
    return !!n && fellTree(sim, h, n, eff).ok
  },
  gather: (sim, h, ref) => {
    const n = ref ? sim.nodes.byId(ref) : undefined
    return !!n && gatherNode(sim, h, n).ok
  },
  /** Moves carried goods (not tools/weapons) into the household store. */
  deposit_carry: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv) return false
    for (let i = h.inv.items.length - 1; i >= 0; i--) {
      const s = h.inv.items[i]!
      const d = itemDef(s.id)
      // Raw food (hunter's meat, crops) always goes home; keep ≤2 ready-to-eat portions for the road.
      if (d.category === 'resource' || d.category === 'herb' || (d.category === 'food' && (d.food?.raw || countItem(h.inv, s.id) > 2))) {
        h.inv.items.splice(i, 1)
        addItem(inv, s)
      }
    }
    return true
  },
  pickup_surplus: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv) return false
    let moved = 0
    for (const s of [...inv.items]) {
      const d = itemDef(s.id)
      const keep = d.category === 'food' ? 12 : d.id === 'log' ? 8 : d.id === 'branch' ? 15 : 999
      const n = countItem(inv, s.id) - keep
      if (n > 0) {
        for (const r of removeItem(inv, s.id, n)) addItem(h.inv, r)
        moved += n
      }
    }
    return moved > 0
  },
  deposit_warehouse: (sim, h, ref) => {
    const b = sim.building(ref)
    if (!b?.inv) return false
    for (let i = h.inv.items.length - 1; i >= 0; i--) {
      const s = h.inv.items[i]!
      const d = itemDef(s.id)
      if (d.category === 'resource' || d.category === 'food' || d.category === 'herb') {
        h.inv.items.splice(i, 1)
        addItem(b.inv, s)
      }
    }
    return true
  },
  tend_field: (sim, h, ref, eff) => {
    const b = sim.building(ref)
    if (!b?.field) return false
    b.field.growth = Math.min(1, b.field.growth + 0.05 * eff * growthFactor(sim.state.time.cal) * (0.5 + b.field.moisture))
    train(h, 'farming', 0.3)
    return true
  },
  water_field: (sim, h, ref) => {
    const b = sim.building(ref)
    const bucket = h.inv.items.find((s) => s.id === 'bucket' && (s.water ?? 0) > 0)
    if (!b?.field || !bucket) return false
    bucket.water = 0
    b.field.moisture = Math.min(1, b.field.moisture + 0.5)
    return true
  },
  fill_bucket: (_sim, h) => {
    const bucket = h.inv.items.find((s) => s.id === 'bucket')
    if (!bucket) return false
    bucket.water = itemDef('bucket').waterCapacity
    return true
  },
  harvest_field: (sim, h, ref, eff) => {
    const b = sim.building(ref)
    if (!b?.field || b.field.growth < 1) return false
    const qty = Math.round((20 + h.skills.farming / 5) * eff)
    giveOrDrop(sim, h, newStack(b.field.crop, qty))
    b.field.growth = 0
    train(h, 'farming', 0.6, 3)
    return true
  },
  fill_trough: (sim, h, ref) => {
    const b = sim.building(ref)
    return !!b && fillTrough(sim, h, b).ok
  },
  light_torch: (sim, _h, ref) => {
    const b = sim.building(ref)
    if (!b) return false
    b.lit = true
    return true
  },
  douse_torch: (sim, _h, ref) => {
    const b = sim.building(ref)
    if (!b) return false
    b.lit = false
    return true
  },
  look: () => true,
  trade_stand: () => true,
  herd: () => true,
  shear: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv) return false
    // Only sheep with regrown wool (per-animal cooldown).
    const cal = sim.state.time.cal
    let n = 0
    for (const a of sim.state.animals) {
      if (a.species !== 'sheep' || a.householdId !== h.householdId || cal - (a.shornAt ?? -Infinity) < WOOL_REGROW_DAYS * 86400) continue
      a.shornAt = cal
      n++
    }
    if (n > 0) addItem(inv, newStack('wool', n))
    return n > 0
  },
  herb_garden: (sim, h, _ref, eff) => {
    const inv = storeOf(sim, h)
    if (!inv || growthFactor(sim.state.time.cal) === 0) return false
    addItem(inv, newStack(sim.rng.chance(0.5) ? 'mint' : 'chamomile', Math.max(1, Math.round(2 * eff))))
    train(h, 'medicine', 0.2)
    return true
  },
  dry_meat: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv) return false
    if (countItem(inv, 'raw_meat') < 2) return true // too little to dry (e.g. a hare) — nothing to do, not a failure
    removeItem(inv, 'raw_meat', 2)
    addItem(inv, newStack('dried_meat', 1))
    return true
  },
  smith: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv) return false
    // Fulfil player orders first.
    const order = sim.state.px.orders.find((o) => o.npcId === h.id && o.status === 'waiting' && sim.state.time.cal >= o.readyAt)
    if (order && forgeOrder(sim, h, inv, order)) {
      sim.message(`${h.name}: zamówienie gotowe do odbioru.`, 'quest')
      train(h, 'blacksmith', 0.5, 2)
      return true
    }
    if (countItem(inv, 'iron_ingot') < (order ? 4 : 1)) {
      if (countItem(inv, 'iron_ore') >= 2 && countItem(inv, 'coal') >= 1) {
        removeItem(inv, 'iron_ore', 2)
        removeItem(inv, 'coal', 1)
        addItem(inv, newStack('iron_ingot', 1))
        return true
      }
      return false
    }
    const tools = ['knife', 'axe', 'shovel', 'hammer', 'pickaxe']
    const stock = tools.reduce((n, t) => n + countItem(inv, t), 0)
    if (stock >= 6) return false
    const t = sim.rng.pick(tools)
    removeItem(inv, 'iron_ingot', 1)
    const skill = h.skills.blacksmith
    const q = skill > 80 && sim.rng.chance(0.3) ? 3 : skill > 50 && sim.rng.chance(0.5) ? 2 : skill > 20 ? 1 : 0
    addItem(inv, newStack(t, 1, { q }))
    train(h, 'blacksmith', 0.5, 2)
    return true
  },
  repair: (sim, h, ref) => {
    const b = sim.building(ref)
    if (!b) return false
    return repairBuilding(sim, h, b, houseOf(sim, h)).ok
  },
  help_downed: (sim, h, ref) => {
    const t = sim.human(Number(ref))
    if (!t || !t.vitals.ko) return false
    const band = h.inv.items.find((s) => s.id === 'bandage' || s.id === 'salve')
    if (band) consume(sim, h, band, t)
    heal(t.vitals, 10)
    if (hp(t.vitals) > 0) t.vitals.ko = undefined
    t.opinion = Math.min(100, t.opinion)
    return true
  },
  shoot: (sim, h, ref) => {
    const a = sim.actor(Number(ref)) as Animal | undefined
    if (!a || a.vitals.dead) return false
    const d = Math.hypot(a.x - h.x, a.z - h.z)
    if (countItem(h.inv, 'arrow') <= 0) {
      const store = storeOf(sim, h)
      if (store && countItem(store, 'arrow') > 0) for (const s of removeItem(store, 'arrow', 10)) addItem(h.inv, s)
    }
    wieldBest(h, 'ranged') // a close fight may have left the knife in hand
    const w = weaponOf(h)
    if (w.kind !== 'ranged' || d > 45 || countItem(h.inv, 'arrow') <= 0) return false
    removeItem(h.inv, 'arrow', 1)
    h.rot = Math.atan2(a.x - h.x, a.z - h.z)
    h.action = { kind: 'shoot', at: sim.state.time.play }
    sim.emit({ type: 'shot', id: h.id })
    const chance = 0.35 + h.skills.ranged * 0.006 - d / 120
    if (sim.rng.chance(chance)) applyDamage(sim, a, w.damage * (0.9 + h.skills.ranged / 150), 'pierce', h)
    else a.fleeFrom = { x: h.x, z: h.z, until: sim.state.time.play + 15 }
    train(h, 'ranged', 0.5)
    return true
  },
  butcher: (sim, h, ref) => {
    const c = sim.state.corpses.find((cc) => cc.id === Number(ref))
    return !!c && butcher(sim, h, c).ok
  },
  idle: () => true,
  fletch: (sim, h) => {
    const inv = storeOf(sim, h)
    if (!inv || countItem(inv, 'branch') < 1) return false
    removeItem(inv, 'branch', 1)
    addItem(inv, newStack('arrow', 6))
    train(h, 'ranged', 0.3)
    return true
  },
  /** Exchange surplus between the trader's home warehouse and the visited one (goods carried by the caravan). */
  caravan_trade: (sim, h, ref) => {
    const there = sim.building(ref)
    const here = sim.building(sim.state.settlements[h.settlementId]?.warehouseId)
    if (!there?.inv || !here?.inv) return false
    const move = (from: typeof here, to: typeof here, id: string, keep: number, max: number) => {
      const n = Math.min(max, countItem(from.inv!, id) - keep)
      if (n > 0) for (const s of removeItem(from.inv!, id, n)) addItem(to.inv!, s)
      return Math.max(0, n)
    }
    let moved = 0
    for (const id of ['log', 'stone', 'iron_ingot', 'grain', 'bread', 'wool', 'hide', 'dried_meat']) {
      moved += move(here, there, id, 10, 6)
      moved += move(there, here, id, 10, 6)
    }
    // Provisions for the way back, bought from the visited settlement's stores.
    for (let i = 0; i < 4; i++) {
      const f = findFood(there.inv)
      if (!f) break
      for (const s of removeItem(there.inv, f.id, 1)) addItem(h.inv, s)
    }
    // The home settlement pays its caravan trader for the exchange (treasury → trader, D-ECON-3).
    payFromTreasury(sim, h.settlementId, h, CARAVAN_FEE.base + CARAVAN_FEE.perUnit * moved)
    h.trip = { phase: 'returning', since: h.trip?.since ?? sim.state.time.cal }
    perf.count('economy.caravanTrades')
    return true
  },
}

export function householdFoodCount(sim: Sim, h: Human): number {
  const hh = household(sim, h)
  const inv = hh ? sim.building(hh.houseId)?.inv : undefined
  if (!inv) return 0
  let n = 0
  for (const s of inv.items) {
    const d = itemDef(s.id)
    if (d.food && d.category === 'food' && !d.food.raw) n += s.qty
  }
  return n
}
