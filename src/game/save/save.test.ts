import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { fellTree } from '../sim/actions'
import { killAnimal } from '../sim/combat'
import { addItem, countItem, newStack } from '../sim/inventory'
import { Sim } from '../sim/sim'
import { run, testSim } from '../sim/testWorld'
import { SAVE_VERSION } from '../sim/types'
import { installSystems } from '../sim/worldSystems'
import { isTree } from '../world/nodes'
import { checkWorldCompat, deleteSave, listSaves, migrate, newSlotId, readSave, readSaveMeta, SaveError, writeSave } from './db'
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

  it('SAVE-01: save from a different generator version is rejected with a message (no silent mount)', () => {
    const sim = testSim()
    const st = JSON.parse(JSON.stringify(snapshot(sim)))
    expect(() => checkWorldCompat(st, sim.world)).not.toThrow()
    st.genVersion = sim.world.version - 1
    expect(() => checkWorldCompat(st, sim.world)).toThrow(SaveError)
    expect(() => checkWorldCompat(st, sim.world)).toThrow(/generatora/)
    expect(() => checkWorldCompat({ ...st, genVersion: sim.world.version, seed: 7 }, sim.world)).toThrow(/innego świata/)
  })

  it('SAVE-01: migrate backfills v1 saves and rejects newer/unknown versions', () => {
    const sim = testSim()
    const st = JSON.parse(JSON.stringify(snapshot(sim)))
    st.saveVersion = 1
    for (const s of st.settlements) delete s.treasury // a real v1 save has no treasuries
    st.px.orders = [{ id: 'o1', npcId: 1, recipe: 'knife', paid: 5, price: 10, readyAt: 0, status: 'ready' }, { id: 'o2', npcId: 1, recipe: 'axe', paid: 5, price: 10, readyAt: 0, status: 'collected' }]
    st.npcs[0].ai.cooldowns.caravan_back = 123
    const m = migrate(st)
    expect(m.saveVersion).toBe(SAVE_VERSION)
    expect(m.px.orders[0]!.status).toBe('waiting')
    expect(m.px.orders.length).toBe(1) // collected dropped
    expect(m.px.orders[0]!.recipeId).toBe('knife')
    expect(m.px.orders[0]!.itemId).toBe('knife')
    expect(m.settlements.every((s) => s.treasury > 0)).toBe(true)
    expect(m.npcs[0]!.ai.cooldowns.caravan_back).toBeUndefined()
    expect(() => migrate({ ...st, saveVersion: SAVE_VERSION + 1 })).toThrow(SaveError)
    expect(() => migrate({ ...st, saveVersion: 0 })).toThrow(SaveError)
  })

  it('SAVE-01: v4 → v5 migration ties old rats to the nearest rat nest (review 003 #6)', () => {
    const sim = testSim()
    const st = JSON.parse(JSON.stringify(snapshot(sim)))
    st.saveVersion = 4
    delete st.traces
    const b = st.buildings.find((x: { kind: string }) => x.kind === 'warehouse')
    b.ratNest = { strength: 1, since: 0 }
    const rat = { ...st.animals[0], id: 999_999, species: 'rat', x: b.x + 10, z: b.z, denId: undefined }
    const far = { ...rat, id: 999_998, x: b.x + 300 }
    st.animals.push(rat, far)
    const m = migrate(st)
    expect(m.traces).toEqual([])
    expect(m.animals.find((a) => a.id === 999_999)!.denId).toBe(`nest:${b.id}`)
    expect(m.animals.find((a) => a.id === 999_998)!.denId).toBeUndefined()
  })

  it('SAVE-01: missing or corrupt slot → SaveError, not a silent new game', async () => {
    await expect(readSave('does-not-exist')).rejects.toThrow(SaveError)
    const db = await new Promise<IDBDatabase>((res) => {
      const r = indexedDB.open('seedvales')
      r.onsuccess = () => res(r.result)
    })
    await new Promise<void>((res) => {
      const t = db.transaction('saves', 'readwrite')
      t.objectStore('saves').put({ meta: { slot: 'bad', seed: 1, savedAt: 0, cal: 0, bytes: 3 }, json: '{x' }, 'bad')
      t.oncomplete = () => res()
    })
    db.close()
    await expect(readSave('bad')).rejects.toThrow(/uszkodzony/)
  })

  it('SAVE-01: a new game with the same seed gets a new slot and keeps the existing save', async () => {
    const sim = testSim()
    const a = newSlotId(1337, 1000)
    const b = newSlotId(1337, 2000)
    expect(a).not.toBe(b)
    await writeSave(a, snapshot(sim))
    await writeSave(b, snapshot(testSim()))
    const slots = (await listSaves()).map((m) => m.slot)
    expect(slots).toContain(a)
    expect(slots).toContain(b)
    expect((await listSaves()).find((m) => m.slot === a)!.genVersion).toBe(sim.world.version)
  })

  it('SAVE-01: save list comes from the meta store; delete removes save and meta', async () => {
    const sim = testSim()
    await writeSave('meta-test', snapshot(sim))
    const m = (await listSaves()).find((x) => x.slot === 'meta-test')!
    expect(m.seed).toBe(sim.state.seed)
    expect(m.bytes).toBeGreaterThan(1000)
    await deleteSave('meta-test')
    expect((await listSaves()).some((x) => x.slot === 'meta-test')).toBe(false)
    await expect(readSave('meta-test')).rejects.toThrow(SaveError)
  })

  it('UI-05: named saves keep their name and place in the save list (trimmed, max 40 chars)', async () => {
    const sim = testSim()
    await writeSave('named', snapshot(sim), { name: '  Wyprawa na północ  ', place: 'Jaworzno' })
    await writeSave('long', snapshot(sim), { name: 'x'.repeat(60) })
    await writeSave('blank', snapshot(sim), { name: '   ' })
    const list = await listSaves()
    expect(list.find((m) => m.slot === 'named')).toMatchObject({ name: 'Wyprawa na północ', place: 'Jaworzno' })
    expect(list.find((m) => m.slot === 'long')!.name).toHaveLength(40)
    expect(list.find((m) => m.slot === 'blank')!.name).toBeUndefined()
    expect((await readSaveMeta('named'))?.name).toBe('Wyprawa na północ')
    for (const s of ['named', 'long', 'blank']) await deleteSave(s)
  })

  it('SAVE-01: quota exceeded → SaveError with a message, nothing pretends to be saved', async () => {
    const sim = testSim()
    const orig = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('full', 'QuotaExceededError')
    }
    try {
      await expect(writeSave('quota', snapshot(sim))).rejects.toThrow(/Brak miejsca/)
    } finally {
      IDBObjectStore.prototype.put = orig
    }
    expect((await listSaves()).some((x) => x.slot === 'quota')).toBe(false)
  })

  it('SAVE-01: snapshot is a detached copy — saving does not mutate live state', () => {
    const sim = testSim()
    sim.terrain.applyEdit(sim.player.x + 5, sim.player.z, 2, { kind: 'add', amount: -1 })
    const live = sim.state.terrainEdits
    const snap = snapshot(sim)
    expect(snap).not.toBe(sim.state)
    expect(sim.state.terrainEdits).toBe(live)
    expect(Object.keys(snap.terrainEdits).length).toBeGreaterThan(0)
  })
})
