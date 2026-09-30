/**
 * VISION-APPENDIX simulation rules (wave 1, plan sim--001): decision cadence (AI-01),
 * domestic animals flee home (FAUNA-06), wild animals fear people/fire/pens (FAUNA-07).
 */
import { describe, expect, it } from 'vitest'
import type { AnimalVariant, SpeciesId } from '../data/species'
import type { Sim } from './sim'
import type { Animal, Building } from './types'
import { CARRION } from '../config/calibration'
import { snapshot } from '../save/snapshot'
import { applyDamage, killAnimal } from './combat'
import { updateAnimal } from './fauna/ai'
import { makeAnimal } from './newGame'
import { playerFarAway, testSim } from './testWorld'
import { traceSystem } from './traces'

/** Isolated spot in the wild; the player stands at (x, z) (keeps actors at full LOD). */
function wild(): { sim: Sim; x: number; z: number } {
  const sim = testSim()
  playerFarAway(sim)
  sim.state.weather.kind = 'clear'
  sim.state.weather.fog = 0
  sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + 12 * 3600 // midday
  return { sim, x: sim.player.x, z: sim.player.z }
}

function spawn(sim: Sim, species: SpeciesId, x: number, z: number, variant: AnimalVariant = 'adult'): Animal {
  const a = makeAnimal(sim.nextId(), species, variant, x, z, sim.terrain.heightAt(x, z), sim.rng)
  a.thirstH = 0
  a.hungerH = 0
  sim.addAnimal(a)
  return a
}

function tick(sim: Sim, a: Animal, seconds = 0.1) {
  sim.state.time.play += seconds
  updateAnimal(sim, a, seconds, true)
}

function addBuilding(sim: Sim, b: Partial<Building> & Pick<Building, 'kind' | 'x' | 'z'>) {
  sim.state.buildings.push({ id: `test-${sim.nextId()}`, rot: 0, hw: 1, hd: 1, settlementId: -1, durability: 100, owner: 'settlement', ...b })
  sim.rebuildBuildingIndex()
}

describe('wave 1: AI cadence and animal threat behaviour', () => {
  it('AI-01: animals decide about once per second (species-specific), not every update', () => {
    const { sim, x, z } = wild()
    const count = (species: SpeciesId) => {
      const a = spawn(sim, species, x + 300, z + 300)
      sim.player.x = a.x + 400 // no humans around, but tick() runs full updates
      let n = 0
      let last = a.ai.decideAt ?? 0
      for (let i = 0; i < 600; i++) {
        tick(sim, a) // 60 s of 0.1 s updates
        if ((a.ai.decideAt ?? 0) !== last) n++
        last = a.ai.decideAt ?? 0
      }
      sim.removeAnimal(a)
      return n
    }
    const wolf = count('wolf')
    const deer = count('deer')
    const rat = count('rat')
    expect(wolf).toBeGreaterThanOrEqual(50)
    expect(wolf).toBeLessThanOrEqual(65)
    expect(deer).toBeGreaterThan(wolf) // skittish prey decides more often
    expect(rat).toBeLessThan(wolf) // weaker animal decides less often
  })

  it('AI-01: a hit nearby forces an immediate decision (critical event)', () => {
    const { sim, x, z } = wild()
    const deer = spawn(sim, 'deer', x + 15, z)
    const boar = spawn(sim, 'boar', x + 20, z)
    deer.ai.decideAt = sim.state.time.play + 100
    applyDamage(sim, boar, 5, 'pierce', sim.player)
    expect(deer.ai.decideAt).toBe(0)
  })

  it('FAUNA-07: a wolf that is not hungry keeps away from a person instead of attacking', () => {
    const { sim, x, z } = wild()
    const w = spawn(sim, 'wolf', x + 12, z)
    tick(sim, w)
    expect(w.aggroId).toBeUndefined()
    expect(w.fleeFrom).toBeDefined()
    // A hungry (bold) wolf attacks.
    const hungry = spawn(sim, 'wolf', x - 12, z)
    hungry.hungerH = 35
    tick(sim, hungry)
    expect(hungry.aggroId).toBe(sim.player.id)
  })

  it('FAUNA-07: fire scares wild animals (lit campfire, torch in hand)', () => {
    const { sim, x, z } = wild()
    sim.player.x += 500 // nobody around
    addBuilding(sim, { kind: 'campfire', x: x + 5, z, lit: true })
    const w = spawn(sim, 'wolf', x + 12, z)
    w.hungerH = 50 // even a starving wolf
    tick(sim, w)
    expect(w.fleeFrom).toBeDefined()
    expect(w.fleeFrom!.x).toBeCloseTo(x + 5)
    // A person holding a torch: a bold wolf flees instead of attacking.
    sim.player.x = x - 30
    sim.player.eq.off = { id: 'torch', qty: 1 }
    sim.actors.update(sim.player)
    const w2 = spawn(sim, 'wolf', x - 40, z)
    w2.hungerH = 35
    tick(sim, w2)
    expect(w2.aggroId).toBeUndefined()
    expect(w2.fleeFrom).toBeDefined()
  })

  it('FAUNA-07: wild animals avoid pens unless starving', () => {
    const { sim, x, z } = wild()
    sim.player.x += 500
    addBuilding(sim, { kind: 'pen', x: x + 30, z, hw: 5, hd: 5 })
    const fox = spawn(sim, 'wolf', x + 30, z + 9)
    tick(sim, fox)
    expect(fox.fleeFrom).toBeDefined()
    const starving = spawn(sim, 'wolf', x + 30, z - 9)
    starving.hungerH = 60
    tick(sim, starving)
    expect(starving.fleeFrom).toBeUndefined()
  })

  it('FAUNA-07: protective exceptions — a mother with young or a wolf at its den attacks instead of fleeing', () => {
    const { sim, x, z } = wild()
    const doe = spawn(sim, 'deer', x + 18, z)
    spawn(sim, 'deer', x + 22, z + 3, 'young')
    tick(sim, doe)
    expect(doe.aggroId).toBe(sim.player.id)
    const lone = spawn(sim, 'deer', x - 18, z)
    tick(sim, lone)
    expect(lone.aggroId).toBeUndefined()
    expect(lone.fleeFrom).toBeDefined()
    // Wolf at its own den.
    sim.state.dens.push({ id: 'den-test', species: 'wolf', x: x, z: z + 20, alive: true, maxCount: 3, nextSpawn: Infinity })
    const w = spawn(sim, 'wolf', x, z + 14)
    w.denId = 'den-test'
    tick(sim, w)
    expect(w.aggroId).toBe(sim.player.id)
  })

  it('FAUNA-06: domestic animals run to their shepherd or pen when a predator hunts nearby', () => {
    const sim = testSim()
    const sheep = sim.state.animals.find((a) => a.species === 'sheep' && a.householdId !== undefined)!
    sim.player.x = sheep.x + 3
    sim.player.z = sheep.z
    sim.actors.update(sim.player)
    const w = spawn(sim, 'wolf', sheep.x + 15, sheep.z)
    w.ai.goal = 'hunt'
    sheep.ai.decideAt = 0
    tick(sim, sheep)
    expect(sheep.ai.goal).toBe('flee_home')
    const target = sheep.ai.steps[0] as { x: number; z: number; run?: boolean }
    expect(target.run).toBe(true)
    const pen = sim.householdBuildings(sheep.householdId!).find((b) => b.kind === 'pen')
    const shepherd = sim.state.households[sheep.householdId!]!.memberIds.map((id) => sim.human(id)!).find((h) => h.age === 'adult')
    const toPen = pen ? Math.hypot(target.x - pen.x, target.z - pen.z) : Infinity
    const toShepherd = shepherd ? Math.hypot(target.x - shepherd.x, target.z - shepherd.z) : Infinity
    expect(Math.min(toPen, toShepherd)).toBeLessThan(1)
    // Hurting a domestic animal also sends it home.
    const cow = sim.state.animals.find((a) => a.species === 'cow' && a.householdId !== undefined)
    if (cow) {
      applyDamage(sim, cow, 3, 'pierce', w)
      expect(cow.ai.goal).toBe('flee_home')
    }
  })

  it('FAUNA-08: eating a corpse takes time and a person can interrupt it (meat stays)', () => {
    const { sim, x, z } = wild()
    sim.player.x += 300 // nobody near at first
    sim.actors.update(sim.player)
    const deer = spawn(sim, 'deer', x + 2, z)
    killAnimal(sim, deer)
    const corpse = sim.state.corpses.at(-1)!
    const meat0 = corpse.meat
    const w = spawn(sim, 'wolf', x + 20, z)
    w.hungerH = 25
    for (let t = 0; t < 12 && w.ai.goal !== 'scavenge'; t += 0.1) tick(sim, w)
    expect(w.ai.goal).toBe('scavenge')
    for (let t = 0; t < 30 && !w.ai.steps.some((st) => st.op === 'work' && st.act === 'eat'); t += 0.1) tick(sim, w)
    expect(corpse.meat).toBe(meat0) // arrived, nothing eaten yet
    for (let t = 0; t < CARRION.eatS + 1; t += 0.1) tick(sim, w)
    expect(corpse.meat).toBe(meat0 - 1) // one portion after eatS
    // The player walks up: the (not starving) wolf runs off and the corpse keeps its remaining meat.
    sim.player.x = w.x + 10
    sim.player.z = w.z
    sim.actors.update(sim.player)
    for (let t = 0; t < 2; t += 0.1) tick(sim, w)
    expect(w.fleeFrom).toBeDefined()
    expect(w.ai.steps.some((st) => st.op === 'work' && st.act === 'eat')).toBe(false)
    for (let t = 0; t < CARRION.eatS + 1; t += 0.1) tick(sim, w)
    expect(corpse.meat).toBe(meat0 - 1)
  })

  it('TRACE-01: hits leave blood traces that fade (faster in rain), are saved and lure predators', () => {
    const { sim, x, z } = wild()
    const boar = spawn(sim, 'boar', x + 5, z)
    applyDamage(sim, boar, 12, 'cut', sim.player)
    const tr = sim.tracesNear(boar.x, boar.z, 2)
    expect(tr.length).toBe(1)
    const trace = tr[0]!
    const i0 = trace.intensity
    expect(i0).toBeGreaterThan(0)
    // Fading: dry vs rain over 2 calendar hours each.
    sim.state.weather.kind = 'clear'
    traceSystem(sim, 300)
    const dry = i0 - trace.intensity
    const before = trace.intensity
    sim.state.weather.kind = 'rain'
    traceSystem(sim, 300)
    const wet = before - Math.max(0, trace.intensity)
    expect(dry).toBeGreaterThan(0)
    expect(wet).toBeGreaterThan(dry * 2)
    // Saved with the game state.
    applyDamage(sim, boar, 20, 'cut', sim.player)
    const saved = JSON.parse(JSON.stringify(snapshot(sim)))
    expect(saved.traces.length).toBeGreaterThan(0)
    // A hungry predator within smell range goes to investigate the blood.
    sim.player.x += 400
    sim.actors.update(sim.player)
    sim.state.weather.kind = 'clear'
    const t = sim.state.traces.at(-1)!
    t.intensity = 1
    const w = spawn(sim, 'wolf', t.x + 40, t.z)
    w.hungerH = 15
    for (let k = 0; k < 20 && w.ai.goal !== 'investigate'; k++) tick(sim, w)
    expect(w.ai.goal).toBe('investigate')
  })
})
