/**
 * Builds the initial mutable GameState from the deterministic world (same seed → same start).
 * @domain sim
 * @subdomain population
 */
import type { AnimalVariant, SpeciesId } from '../data/species'
import type { ProfessionId, WorldData } from '../world/types'
import type { AgeGroup, AiState, Animal, Building, GameState, Household, Human, SettlementState } from './types'
import { START_CALENDAR_S, TREASURY_START } from '../config/calibration'
import { Rng } from '../core/rng'
import { NAMES, PROFESSIONS } from '../data/professions'
import { emptySkills } from '../data/skills'
import { SPECIES, VARIANT_MULT } from '../data/species'
import { sampleGrid } from '../world/grid'
import { addItem, newStack } from './inventory'
import { SAVE_VERSION } from './types'
import { newVitals } from './vitals'
import { initialWeather } from './weather'

export const newAi = (): AiState => ({ goal: null, label: '', steps: [], stepIdx: 0, stepT: 0, replanAt: 0, cooldowns: {}, stuckT: 0 })

function makeHuman(rng: Rng, id: number, x: number, z: number, y: number, male: boolean, age: AgeGroup): Human {
  const attr = () => rng.int(3, 7)
  const attrs = { str: attr(), per: attr(), end: attr(), cha: attr(), int: attr(), agi: attr() }
  if (age === 'child') attrs.str = Math.max(1, attrs.str - 3)
  if (age === 'elder') attrs.end = Math.max(1, attrs.end - 2)
  const names = male ? NAMES.male : NAMES.female
  const b5 = () => Math.min(1, Math.max(0, 0.5 + (rng.next() + rng.next() - 1) * 0.6))
  return {
    id, kind: 'npc', x, y, z, rot: rng.range(0, Math.PI * 2), vx: 0, vz: 0,
    vitals: newVitals(80 + attrs.end * 4),
    lastUpdate: 0, nextUpdate: 0, moving: 'idle', attackReadyAt: 0,
    name: rng.pick(names), male, age, attrs, skills: emptySkills(),
    big5: { o: b5(), c: b5(), e: b5(), a: b5(), n: b5() },
    money: 0, inv: { items: [] }, eq: { armor: {} }, settlementId: 0, householdId: 0,
    ai: newAi(), opinion: 0, combat: false, strTrain: 0,
  }
}

export function makeAnimal(id: number, species: SpeciesId, variant: AnimalVariant, x: number, z: number, y: number, rng: Rng): Animal {
  const sp = SPECIES[species]
  const vm = VARIANT_MULT[variant]
  const v = newVitals(Math.round(sp.hp * vm.hp))
  return {
    id, kind: 'animal', species, variant, x, y, z, rot: rng.range(0, Math.PI * 2), vx: 0, vz: 0,
    vitals: v, lastUpdate: 0, nextUpdate: 0, moving: 'idle', attackReadyAt: 0,
    homeX: x, homeZ: z, ai: newAi(), thirstH: rng.range(0, 6), hungerH: rng.range(0, 6),
  }
}

export function rollVariant(rng: Rng, allowAlbino = true): AnimalVariant {
  const r = rng.next()
  if (allowAlbino && r < 0.015) return 'albino'
  if (r < 0.2) return 'young'
  if (r < 0.26) return 'alpha'
  if (r < 0.29) return 'strong'
  return 'adult'
}

export function createNewGame(world: WorldData): GameState {
  const rng = new Rng(world.seed ^ 0x51a7e)
  let nextId = 1
  const h = (x: number, z: number) => sampleGrid(world.height, x, z)

  // Buildings from generated structures.
  const buildings: Building[] = world.structures.map((s) => ({
    id: s.id, kind: s.kind, x: s.x, z: s.z, rot: s.rot, hw: s.hw, hd: s.hd, settlementId: s.settlementId,
    durability: rng.range(65, 100), owner: 'settlement',
  }))
  const byId = new Map(buildings.map((b) => [b.id, b]))
  for (const b of buildings) {
    if (b.kind === 'bridge') {
      const road = world.roads.find((r) => r.crossings.some((c) => Math.abs(c.x - b.x) < 1 && Math.abs(c.z - b.z) < 1))
      const ends = [
        h(b.x + Math.sin(b.rot) * b.hd, b.z + Math.cos(b.rot) * b.hd),
        h(b.x - Math.sin(b.rot) * b.hd, b.z - Math.cos(b.rot) * b.hd),
      ]
      b.deck = Math.max(...ends, (world.water[Math.round(b.z / world.cell) * world.n + Math.round(b.x / world.cell)] ?? 0) + 0.8) + 0.2
      void road
      b.durability = 100
    }
    if (b.kind === 'warehouse') {
      b.inv = { items: [] }
      // Neglected common buildings (nobody's duty to repair) → source of the rat quest.
      b.durability = rng.range(28, 38)
      for (const [it, q] of [['bread', 6], ['grain', 20], ['carrot', 10], ['log', 6], ['branch', 20], ['stone', 20], ['rope', 2], ['cloth', 3]] as const) {
        addItem(b.inv, newStack(it, q))
      }
    }
    if (b.kind === 'field') b.field = { crop: rng.pick(['carrot', 'cabbage', 'grain', 'tomato'] as const), growth: rng.range(0.1, 0.6), moisture: 0.5 }
    if (b.kind === 'trough') b.water = 10
    if (b.kind === 'torchpost') b.lit = false
    if (b.kind === 'campfire') b.lit = true
    if (b.kind === 'house' || b.kind === 'inn') b.inv = { items: [] }
  }

  const settlements: SettlementState[] = world.settlements.map((s) => ({
    id: s.id, name: s.name,
    rep: { honesty: 0, helpfulness: 0, renown: 0, courage: 0 },
    warehouseId: buildings.find((b) => b.settlementId === s.id && b.kind === 'warehouse')?.id,
    treasury: TREASURY_START[s.size],
    pendingRep: [],
  }))

  const npcs: Human[] = []
  const households: Household[] = []
  const animals: Animal[] = []
  for (const s of world.settlements) {
    for (const gh of s.households) {
      const house = byId.get(gh.houseId)!
      const hid = households.length
      const prof = PROFESSIONS[gh.profession]
      house.owner = `household:${hid}`
      house.householdId = hid
      for (const b of buildings) if (b.settlementId === s.id && (b as { id: string }).id && world.structures.find((st) => st.id === b.id)?.householdIdx === gh.idx && b !== house) {
        b.owner = `household:${hid}`
        b.householdId = hid
      }
      for (const st of prof.store) addItem(house.inv!, newStack(st.item, st.qty))
      addItem(house.inv!, newStack('bread', 2))
      addItem(house.inv!, newStack('branch', 4))
      const hh: Household = { id: hid, settlementId: s.id, profession: gh.profession, houseId: house.id, memberIds: [] }
      households.push(hh)
      const roles: { male: boolean; age: AgeGroup; main: boolean }[] = [{ male: rng.chance(0.75), age: 'adult', main: true }]
      if (gh.members >= 2) roles.push({ male: !roles[0]!.male, age: 'adult', main: false })
      if (gh.members >= 3) roles.push({ male: rng.chance(0.5), age: 'child', main: false })
      if (gh.members >= 4) roles.push({ male: rng.chance(0.5), age: 'elder', main: false })
      for (const r of roles) {
        const ang = rng.range(0, Math.PI * 2)
        const px = house.x + Math.cos(ang) * 6
        const pz = house.z + Math.sin(ang) * 6
        const npc = makeHuman(rng, nextId++, px, pz, h(px, pz), r.male, r.age)
        npc.settlementId = s.id
        npc.householdId = hid
        if (r.main) {
          npc.profession = gh.profession
          for (const [k, v] of Object.entries(prof.skills)) npc.skills[k as keyof typeof npc.skills] = v! + rng.range(-8, 8)
          for (const it of prof.kit) addItem(npc.inv, newStack(it.item, it.qty))
          npc.eq.main = newStack(prof.weapon, 1, { q: rng.int(0, 2) })
          npc.money = rng.int(prof.money[0], prof.money[1])
          if (gh.profession === 'guard') {
            npc.eq.armor.torso_outer = newStack('leather_jerkin')
            npc.eq.armor.head_outer = newStack('leather_cap')
          }
        } else {
          npc.money = rng.int(2, 15)
          if (r.age === 'adult') addItem(npc.inv, newStack('knife'))
        }
        addItem(npc.inv, newStack('bread', 1))
        // Varied starting needs so the settlement doesn't act in lock-step.
        npc.vitals.thirst = rng.range(35, 95)
        npc.vitals.hunger = rng.range(40, 95)
        npc.vitals.social = rng.range(30, 90)
        npcs.push(npc)
        hh.memberIds.push(npc.id)
      }
      // Livestock and dogs per profession.
      const livestock: [SpeciesId, number][] =
        gh.profession === 'farmer' ? [['cow', 1], ['chicken', 3], ['dog', 1]] :
        gh.profession === 'shepherd' ? [['sheep', rng.int(3, 5)], ['dog', 1]] :
        gh.profession === 'hunter' ? [['dog', 1]] :
        gh.profession === 'trader' && s.size !== 'SM' ? [['horse', 1], ['donkey', 1]] : []
      const pen = buildings.find((b) => b.householdId === hid && b.kind === 'pen')
      for (const [sp, count] of livestock) {
        for (let i = 0; i < count; i++) {
          const base = pen && sp !== 'dog' ? pen : house
          const x = base.x + rng.range(-3, 3)
          const z = base.z + rng.range(-3, 3)
          const a = makeAnimal(nextId++, sp, rng.chance(0.2) ? 'young' : 'adult', x, z, h(x, z), rng)
          a.householdId = hid
          animals.push(a)
        }
      }
    }
  }

  // Wildlife from dens/herd areas.
  const dens = world.dens.map((d) => ({ id: d.id, species: d.species, x: d.x, z: d.z, alive: true, maxCount: d.count, nextSpawn: 0 }))
  for (const d of world.dens) {
    for (let i = 0; i < d.count; i++) {
      const x = d.x + rng.range(-15, 15)
      const z = d.z + rng.range(-15, 15)
      const sp: SpeciesId = d.species === 'deer' ? (rng.chance(0.3) ? 'stag' : 'deer') : d.species === 'rat' ? 'rat' : d.species
      const a = makeAnimal(nextId++, sp, i === 0 && d.species === 'wolf' ? 'alpha' : rollVariant(rng), x, z, h(x, z), rng)
      a.denId = d.id
      if (rng.chance(0.03) && (sp === 'fox' || sp === 'wolf')) a.rabid = true
      animals.push(a)
    }
  }
  // A few moose in swamps/conifer (herd-less wanderers) near bear dens.
  for (const d of world.dens.filter((dd) => dd.species === 'bear')) {
    const a = makeAnimal(nextId++, 'moose', 'adult', d.x + 200, d.z + 120, h(d.x + 200, d.z + 120), rng)
    animals.push(a)
  }

  const home = world.settlements[world.homeSettlement]!
  const sx = world.spawn.x
  const sz = world.spawn.z
  const player = makeHuman(rng, nextId++, sx, sz, h(sx, sz), true, 'adult')
  player.kind = 'player'
  player.name = 'Wanderer'
  player.attrs = { str: 5, per: 5, end: 5, cha: 5, int: 5, agi: 5 }
  player.vitals = newVitals(100)
  player.money = 150
  player.settlementId = home.id
  player.householdId = -1
  for (const [it, q] of [['knife', 1], ['waterskin_m', 1], ['bread', 2], ['apple', 3], ['bandage', 2], ['flint', 1], ['torch', 2], ['blanket', 1]] as const) {
    addItem(player.inv, newStack(it, q))
  }
  player.eq.main = newStack('club')

  const state: GameState = {
    saveVersion: SAVE_VERSION,
    genVersion: world.version,
    seed: world.seed,
    time: { cal: START_CALENDAR_S, play: 0 },
    weather: initialWeather(START_CALENDAR_S),
    player,
    px: { stats: {}, badges: {}, sneaking: false, orders: [], bowDraw: 0 },
    npcs,
    animals,
    households,
    settlements,
    buildings,
    sites: [],
    ground: [],
    corpses: [],
    traces: [],
    carts: [],
    nodes: {},
    dens,
    quests: [],
    terrainEdits: {},
    messages: [{ t: START_CALENDAR_S, text: `You arrive in ${home.name}.`, kind: 'info' }],
    nextId,
    rng: rng.state,
  }
  return state
}

export const professionName = (p?: ProfessionId) => (p ? PROFESSIONS[p].name : '')
