/**
 * verify--001 step 1: event log + conservation ledger. Off by default; ring buffer; every source/sink of items and
 * money is logged so produced - consumed - Δstock = 0 per item.
 */
import { describe, expect, it } from 'vitest'
import { consume } from './actions'
import { fireRanged, killNpc } from './combat'
import { activeLog, EventLog, ledgerBalance, logMint, logMoney, logProduce, moneyBalance, worldStock } from './eventLog'
import { addItem, countItem, equipToMain, newStack, spoilInventory } from './inventory'
import { playerFarAway, run, testSim } from './testWorld'
import { payFromTreasury, payToTreasury } from './treasury'

describe('event log + ledger (verify--001)', () => {
  it('VERIFY-01: the log is off by default and hooks are inert', () => {
    const sim = testSim()
    expect(sim.eventLog).toBeNull()
    expect(activeLog()).toBeNull()
    logProduce('log', 3, 'test') // no log → nothing happens, nothing throws
    run(sim, 30, 0.5)
    expect(sim.eventLog).toBeNull()
  })

  it('VERIFY-01: ring buffer keeps the newest entries in order and counts what wrapped', () => {
    const sim = testSim()
    try {
      const log = new EventLog(sim, 5)
      for (let i = 0; i < 12; i++) log.push('stuck', { i })
      expect(log.size).toBe(5)
      expect(log.dropped).toBe(7)
      expect(log.entries().map((e) => e.data.i)).toEqual([7, 8, 9, 10, 11])
      expect(log.entries().map((e) => e.id)).toEqual([7, 8, 9, 10, 11])
    } finally {
      sim.disableEventLog()
    }
  })

  it('VERIFY-01: a known flow is logged — eating bread consumes one bread and says why', () => {
    const sim = testSim()
    try {
      const log = sim.enableEventLog()
      const p = sim.player
      addItem(p.inv, newStack('bread', 2))
      const before = countItem(p.inv, 'bread')
      consume(sim, p, p.inv.items.find((s) => s.id === 'bread')!)
      expect(countItem(p.inv, 'bread')).toBe(before - 1)
      const e = log.find((x) => x.kind === 'consume' && x.data.item === 'bread')[0]!
      expect(e.data).toMatchObject({ item: 'bread', qty: 1, sink: 'eaten' })
      expect(log.consumed.get('bread')).toBe(1)
    } finally {
      sim.disableEventLog()
    }
  })

  it('VERIFY-01: spoilage is a logged sink', () => {
    const sim = testSim()
    try {
      const log = sim.enableEventLog()
      const inv = { items: [] as ReturnType<typeof newStack>[] }
      addItem(inv, newStack('bread', 4))
      spoilInventory(inv, 1e6)
      expect(inv.items).toHaveLength(0)
      expect(log.flows.get('consume:bread:spoilage')).toBe(4)
    } finally {
      sim.disableEventLog()
    }
  })

  it('ECON-01: the ledger balances over a simulated stretch (items and money)', () => {
    const sim = testSim()
    try {
      const log = sim.enableEventLog()
      const s0 = sim.world.settlements[0]!
      sim.player.x = s0.x + 4
      sim.player.z = s0.z + 4
      run(sim, 600, 0.5) // 10 game hours: households, spoilage, eating, felling, fuel, forging...
      const rows = ledgerBalance(sim, log)
      expect(rows.filter((r) => r.residual !== 0)).toEqual([])
      expect(rows.some((r) => r.produced > 0)).toBe(true)
      expect(rows.some((r) => r.consumed > 0)).toBe(true)
      expect(moneyBalance(sim, log).residual).toBe(0)
      expect(log.find((e) => e.kind === 'goal_start').length).toBeGreaterThan(0)
    } finally {
      sim.disableEventLog()
    }
  }, 60_000)

  it('ECON-01: an unlogged source shows up as a residual (the ledger can fail)', () => {
    const sim = testSim()
    try {
      const log = sim.enableEventLog()
      const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
      addItem(wh.inv!, newStack('stone', 7)) // item from nowhere, no hook
      const stone = ledgerBalance(sim, log).find((r) => r.item === 'stone')!
      expect(stone.residual).toBe(-7)
      logProduce('stone', 7, 'test') // the matching source entry fixes it
      expect(ledgerBalance(sim, log).find((r) => r.item === 'stone')!.residual).toBe(0)
      expect(worldStock(sim).get('stone')).toBe(log.baselineStock.get('stone')! + 7)
    } finally {
      sim.disableEventLog()
    }
  })

  it('ECON-01: money flows are logged by reason, totals stay constant, coins from nothing are the only source', () => {
    const sim = testSim()
    try {
      const log = sim.enableEventLog()
      const npc = sim.state.npcs.find((n) => n.settlementId === 0 && !n.vitals.dead)!
      payToTreasury(sim, 0, npc, 1)
      sim.state.settlements[0]!.treasury += 0
      payFromTreasury(sim, 0, npc, 1)
      expect(log.moneyFlows.get('to_treasury')).toBe(1)
      expect(log.moneyFlows.get('from_treasury')).toBe(1)
      expect(moneyBalance(sim, log).residual).toBe(0)
      sim.player.money += 5
      logMoney('player', 'player', 0, 'noop') // zero amounts are ignored
      logMint(5, 'dig_coins')
      const m = moneyBalance(sim, log)
      expect(m.minted).toBe(5)
      expect(m.residual).toBe(0)
    } finally {
      sim.disableEventLog()
    }
  })

  it('VERIFY-01: deaths are logged with a cause', () => {
    const sim = testSim()
    try {
      const log = sim.enableEventLog()
      const npc = sim.state.npcs.find((n) => !n.vitals.dead)!
      npc.vitals.thirst = 0
      killNpc(sim, npc)
      const d = log.find((e) => e.kind === 'death')[0]!
      expect(d.actorId).toBe(npc.id)
      expect(d.data.cause).toBe('thirst')
    } finally {
      sim.disableEventLog()
    }
  })

  it('ECON-01: shooting and recovering arrows balances the ledger (review 014 #4)', () => {
    const sim = testSim()
    try {
      const p = sim.player
      playerFarAway(sim)
      addItem(p.inv, newStack('short_bow', 1))
      addItem(p.inv, newStack('arrow', 40))
      equipToMain(p, p.inv.items.find((s) => s.id === 'short_bow')!)
      const log = sim.enableEventLog() // baseline after the setup items
      for (let i = 0; i < 40; i++) {
        p.attackReadyAt = 0
        fireRanged(sim, p, 0.3, 0.3, 1)
        run(sim, 6, 0.1)
      }
      const onGround = sim.state.ground.filter((g) => g.stack.id === 'arrow').reduce((n, g) => n + g.stack.qty, 0)
      expect(onGround).toBeGreaterThan(0)
      const row = ledgerBalance(sim, log).find((r) => r.item === 'arrow')!
      expect(row.residual).toBe(0)
    } finally {
      sim.disableEventLog()
    }
  })
})
