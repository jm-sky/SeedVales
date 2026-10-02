/**
 * Simulation event log + conservation ledger (verify--001 step 1). OFF by default: every hook is a single
 * `active` check, so a normal game pays nothing. Enabled by `sim.enableEventLog()` (soak, tests). Not saved.
 *
 * The ledger counts only real SOURCES and SINKS of items (a node yielding logs, a meal eaten, spoilage, a
 * campfire burning wood, ...) and of money (coins dug up). Moves between inventories are not flows and are not
 * counted; the world stock is measured independently by scanning every holder (`worldStock`), so a missing hook
 * shows up as a non-zero residual `produced - consumed - (stock now - stock at start)`.
 *
 * Only one log is active at a time (module-level `active`); hooks have no `sim` parameter on purpose.
 * @domain sim
 * @subdomain diag
 */
import type { Sim } from './sim'
import type { Human, Inventory, ItemStack } from './types'
import { totalMoney } from './treasury'

export type LogKind = 'consume' | 'death' | 'goal_end' | 'goal_start' | 'money' | 'move' | 'produce' | 'quest' | 'stuck' | 'trade'

export type LogData = Record<string, boolean | number | string | undefined>

export interface LogEntry {
  /** Sequence number (monotonic, survives ring wrap: cite it as an "event id"). */
  id: number
  /** Calendar seconds. */
  cal: number
  kind: LogKind
  actorId?: number
  settlementId?: number
  data: LogData
}

/** Days are gameplay hours (1 game day = 3600 play s, REAL_SECONDS_PER_DAY). */
const DAY_PLAY_S = 3600

export const LOG_CAP = 50_000

export class EventLog {
  readonly cap: number
  private buf: LogEntry[] = []
  private head = 0
  private seq = 0
  /** Entries dropped by ring wrap. */
  dropped = 0
  /** Ledger: item id → units produced / consumed since the log was enabled. */
  readonly produced = new Map<string, number>()
  readonly consumed = new Map<string, number>()
  /** `produce:<item>:<source>` / `consume:<item>:<sink>` → units (attribution of a residual). */
  readonly flows = new Map<string, number>()
  /** Money: reason → coins moved (`moneyFlows`), coins created from nothing (`minted`). */
  readonly moneyFlows = new Map<string, number>()
  minted = 0
  /** Per game day: `<profession>|<item>|<source>` → units (output metric; work acts have item ''). */
  readonly dayOutput = new Map<number, Map<string, number>>()
  readonly baselineStock: Map<string, number>
  readonly baselineMoney: number
  readonly startCal: number

  private readonly sim: Sim

  constructor(sim: Sim, cap = LOG_CAP) {
    this.sim = sim
    this.cap = cap
    this.baselineStock = worldStock(sim)
    this.baselineMoney = totalMoney(sim)
    this.startCal = sim.state.time.cal
  }

  push(kind: LogKind, data: LogData, actorId?: number, settlementId?: number): LogEntry {
    const e: LogEntry = { id: this.seq++, cal: this.sim.state.time.cal, kind, actorId, settlementId, data }
    if (this.buf.length < this.cap) this.buf.push(e)
    else {
      this.buf[this.head] = e
      this.head = (this.head + 1) % this.cap
      this.dropped++
    }
    return e
  }

  get size() {
    return this.buf.length
  }

  /** Oldest → newest. */
  entries(): LogEntry[] {
    return this.buf.length < this.cap ? this.buf.slice() : [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)]
  }

  /** First entries matching a filter (for "first event ids" in reports). */
  find(pred: (e: LogEntry) => boolean, limit = 5): LogEntry[] {
    const out: LogEntry[] = []
    for (const e of this.entries()) if (pred(e) && out.push(e) >= limit) break
    return out
  }

  tally(actor: Human | undefined, item: string, source: string, qty: number) {
    if (!actor?.profession) return
    const day = Math.floor(this.sim.state.time.play / DAY_PLAY_S)
    let m = this.dayOutput.get(day)
    if (!m) this.dayOutput.set(day, (m = new Map()))
    const k = `${actor.profession}|${item}|${source}`
    m.set(k, (m.get(k) ?? 0) + qty)
  }

  /** Output units per day for a profession, counting only (item, source) pairs accepted by `pred`. */
  outputPerDay(day: number, profession: string, pred: (item: string, source: string) => boolean): number {
    let n = 0
    for (const [k, q] of this.dayOutput.get(day) ?? []) {
      const [p, item, source] = k.split('|') as [string, string, string]
      if (p === profession && pred(item, source)) n += q
    }
    return n
  }
}

let active: EventLog | null = null

/** The log currently collecting (null = off). */
export const activeLog = () => active

export function startEventLog(sim: Sim, cap = LOG_CAP): EventLog {
  active = new EventLog(sim, cap)
  return active
}

export function stopEventLog() {
  active = null
}

const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n)

/** An item (or `qty` of it) enters the world: node yield, crop harvest, household production, loot, craft output... */
export function logProduce(item: string, qty: number, source: string, actor?: Human) {
  if (!active || qty <= 0) return
  add(active.produced, item, qty)
  add(active.flows, `produce:${item}:${source}`, qty)
  active.tally(actor, item, source, qty)
  active.push('produce', { item, qty, source }, actor?.id, actor?.settlementId)
}

/** An item leaves the world: eaten, spoiled, burnt, used as material or ammunition, input of a craft... */
export function logConsume(item: string, qty: number, sink: string, actor?: Human) {
  if (!active || qty <= 0) return
  add(active.consumed, item, qty)
  add(active.flows, `consume:${item}:${sink}`, qty)
  active.push('consume', { item, qty, sink }, actor?.id, actor?.settlementId)
}

/** A profession's non-item output (torch lit, fire fed, patrol done, field tended): counted for the working metric only. */
export function logWork(actor: Human, act: string) {
  if (!active) return
  active.tally(actor, '', act, 1)
}

/** Goods change hands or place without being created/destroyed (informational; not part of the balance). */
export function logMove(actor: Human | undefined, item: string, qty: number, from: string, to: string) {
  if (!active || qty <= 0) return
  active.push('move', { item, qty, from, to }, actor?.id, actor?.settlementId)
}

export function logTrade(actor: Human | undefined, data: LogData) {
  if (!active) return
  active.push('trade', data, actor?.id, actor?.settlementId)
}

/** Money moves `from` → `to` (names such as `player`, `npc:12`, `treasury:0`). Not a creation: totals stay constant. */
export function logMoney(from: string, to: string, amount: number, reason: string, actorId?: number, settlementId?: number) {
  if (!active || amount <= 0) return
  add(active.moneyFlows, reason, amount)
  active.push('money', { from, to, amount, reason }, actorId, settlementId)
}

/** Coins appear from nothing (digging up a coin): the only money source. */
export function logMint(amount: number, reason: string, actor?: Human) {
  if (!active || amount <= 0) return
  active.minted += amount
  active.push('money', { from: 'world', to: actor ? `npc:${actor.id}` : 'player', amount, reason }, actor?.id)
}

/** Generic event (goal changes, deaths, quest transitions, stuck detection). */
export function logEvent(kind: LogKind, data: LogData, actorId?: number, settlementId?: number) {
  if (!active) return
  active.push(kind, data, actorId, settlementId)
}

/** True while a log is collecting — lets hot call sites skip building their payload. */
export const logging = () => active !== null

// --- world stock -------------------------------------------------------------------------------------------

function addStack(m: Map<string, number>, s: ItemStack | undefined) {
  if (s && s.qty > 0) m.set(s.id, (m.get(s.id) ?? 0) + s.qty)
}

function addInv(m: Map<string, number>, inv: Inventory | undefined) {
  if (inv) for (const s of inv.items) addStack(m, s)
}

function addHuman(m: Map<string, number>, h: Human) {
  addInv(m, h.inv)
  addStack(m, h.eq.main)
  addStack(m, h.eq.off)
  for (const a of Object.values(h.eq.armor)) addStack(m, a)
}

/** Every item in the world: player and NPCs (dead included: they keep their pack), buildings, ground, carts, forge orders. */
export function worldStock(sim: Sim): Map<string, number> {
  const m = new Map<string, number>()
  const st = sim.state
  addHuman(m, st.player)
  for (const n of st.npcs) addHuman(m, n)
  for (const b of st.buildings) addInv(m, b.inv)
  for (const g of st.ground) addStack(m, g.stack)
  const cartIn = (c: { item: string; inv: Inventory }) => {
    m.set(c.item, (m.get(c.item) ?? 0) + 1)
    addInv(m, c.inv)
  }
  for (const c of st.carts) cartIn(c)
  if (st.px.cart) cartIn(st.px.cart)
  for (const o of st.px.orders) {
    for (const s of o.reserved ?? []) addStack(m, s)
    addStack(m, o.item)
  }
  return m
}

/** Stock of one item inside the warehouse/house stores of a settlement (economy-health checks). */
export function settlementStock(sim: Sim, settlementId: number, item: string): number {
  let n = 0
  for (const b of sim.state.buildings) {
    if (b.settlementId !== settlementId || !b.inv) continue
    for (const s of b.inv.items) if (s.id === item) n += s.qty
  }
  return n
}

export interface LedgerRow {
  item: string
  produced: number
  consumed: number
  stock0: number
  stock1: number
  /** produced - consumed - (stock1 - stock0); 0 when every source/sink is hooked. */
  residual: number
}

/** Per item balance since the log was enabled (rows with all-zero columns are omitted). */
export function ledgerBalance(sim: Sim, log: EventLog): LedgerRow[] {
  const now = worldStock(sim)
  const ids = new Set([...log.baselineStock.keys(), ...log.consumed.keys(), ...log.produced.keys(), ...now.keys()])
  const rows: LedgerRow[] = []
  for (const item of [...ids].sort()) {
    const produced = log.produced.get(item) ?? 0
    const consumed = log.consumed.get(item) ?? 0
    const stock0 = log.baselineStock.get(item) ?? 0
    const stock1 = now.get(item) ?? 0
    if (!produced && !consumed && !stock0 && !stock1) continue
    rows.push({ item, produced, consumed, stock0, stock1, residual: produced - consumed - (stock1 - stock0) })
  }
  return rows
}

export interface MoneyBalance {
  start: number
  now: number
  minted: number
  /** now - start - minted; 0 when money is only ever moved. */
  residual: number
}

export function moneyBalance(sim: Sim, log: EventLog): MoneyBalance {
  const now = totalMoney(sim)
  return { start: log.baselineMoney, now, minted: log.minted, residual: now - log.baselineMoney - log.minted }
}
