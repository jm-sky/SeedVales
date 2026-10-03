/**
 * review-ui: opens every panel (inventory, character, craft, build, quick actions, map, journal/quests, trade, storage, dialog,
 * hire, gift, orders, interact menu, settings, game menu) on desktop 1280x720 and on the mobile viewport (as mobile.mjs), in an
 * empty and a filled state where the panel has one. One screenshot per panel x viewport x state, plus ui-checks.json
 * (text overflow, elements outside the viewport, buttons < 32 px on mobile, panels without a close control, non-English text).
 * Panels on mobile are opened through the touch menu where it has an entry, otherwise through the same Game calls the UI uses.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runUiChecks } from './uiChecks.mjs'

/** Panels reachable from the touch menu (MobileControls MENU). */
const TOUCH_MENU = new Set(['build', 'character', 'craft', 'inventory', 'map', 'menu', 'quests', 'quick'])

/** @type {{ panel: string, state: 'empty' | 'filled' | 'default', prepare?: string, open: string, note?: string }[]} */
const PLAN = [
  { panel: 'inventory', state: 'empty', prepare: 'empty-pack', open: 'inventory' },
  { panel: 'inventory', state: 'filled', prepare: 'full-pack', open: 'inventory' },
  { panel: 'character', state: 'empty', prepare: 'healthy', open: 'character' },
  { panel: 'character', state: 'filled', prepare: 'injured', open: 'character' },
  { panel: 'craft', state: 'empty', prepare: 'empty-pack', open: 'craft' },
  { panel: 'craft', state: 'filled', prepare: 'full-pack', open: 'craft' },
  { panel: 'build', state: 'empty', prepare: 'empty-pack', open: 'build' },
  { panel: 'build', state: 'filled', prepare: 'full-pack', open: 'build' },
  { panel: 'quick', state: 'default', open: 'quick' },
  { panel: 'map', state: 'empty', prepare: 'fresh-map', open: 'map' },
  { panel: 'map', state: 'filled', prepare: 'explored-map', open: 'map' },
  { panel: 'quests', state: 'empty', prepare: 'no-quests', open: 'quests', note: 'journal / notice board' },
  { panel: 'quests', state: 'filled', prepare: 'many-quests', open: 'quests', note: 'journal / notice board' },
  { panel: 'trade', state: 'empty', prepare: 'empty-pack', open: 'npc:trader:trade' },
  { panel: 'trade', state: 'filled', prepare: 'full-pack', open: 'npc:trader:trade' },
  { panel: 'storage', state: 'empty', prepare: 'empty-warehouse', open: 'building:warehouse:storage' },
  { panel: 'storage', state: 'filled', prepare: 'full-pack', open: 'building:warehouse:storage' },
  { panel: 'dialog', state: 'default', prepare: 'full-pack', open: 'npc:plain:dialog' },
  { panel: 'dialog', state: 'filled', prepare: 'quest-giver', open: 'npc:guard:dialog', note: 'guard with an open board quest' },
  { panel: 'hire', state: 'default', prepare: 'full-pack', open: 'npc:plain:hire' },
  { panel: 'gift', state: 'empty', prepare: 'empty-pack', open: 'npc:plain:gift' },
  { panel: 'gift', state: 'filled', prepare: 'full-pack', open: 'npc:plain:gift' },
  { panel: 'orders', state: 'empty', prepare: 'no-orders', open: 'npc:blacksmith:orders' },
  { panel: 'orders', state: 'filled', prepare: 'orders-placed', open: 'npc:blacksmith:orders' },
  { panel: 'interact', state: 'default', prepare: 'full-pack', open: 'interact:well' },
  { panel: 'menu', state: 'default', open: 'menu' },
  { panel: 'settings', state: 'default', open: 'settings' },
]

/** In-page: state preparation. Returns a short description. */
async function prepare(s, what) {
  return s.S(async (w) => {
    const rv = window.__rv
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    switch (w) {
      case 'empty-pack':
        p.inv.items = []
        p.eq.main = undefined
        p.eq.off = undefined
        return 'inventory and hands emptied'
      case 'empty-warehouse': {
        const b = rv.bld('warehouse') ?? rv.findBld('warehouse')
        window.__rv.savedWh = b.inv.items
        b.inv.items = []
        return 'warehouse stock removed for the empty view (restored afterwards)'
      }
      case 'explored-map': {
        const { revealAround } = await rv.mod('sim/navigation')
        const home = { x: p.x, z: p.z }
        for (const st of sim.world.settlements) {
          sv.teleport(st.x, st.z + 20)
          revealAround(sim)
        }
        sv.teleport(home.x, home.z)
        revealAround(sim)
        sv.game.setWaypoint(sim.world.settlements[1].x, sim.world.settlements[1].z, 'Test goal')
        return 'all settlements visited (revealAround), waypoint set'
      }
      case 'fresh-map':
        return 'new game, only the start area explored'
      case 'full-pack': {
        if (p.inv.items.length > 14) return 'pack already full'
        for (const [id, q] of [['bread', 4], ['apple', 3], ['cooked_meat', 2], ['bandage', 3], ['flint', 1], ['torch', 2], ['knife', 1], ['club', 1], ['short_bow', 1], ['arrow', 20], ['log', 6], ['branch', 12], ['stone', 8], ['rope', 2], ['hammer', 1], ['shovel', 1], ['pickaxe', 1], ['cloth', 3], ['iron_ingot', 2], ['waterskin_m', 1], ['leather_jerkin', 1]]) sv.give(id, q)
        p.money = 237
        return 'pack filled with ~20 item types, 237 c'
      }
      case 'healthy':
        rv.heal()
        p.vitals.illness = undefined
        return 'healed'
      case 'injured':
        p.vitals.parts.torso = 25
        p.vitals.parts.larm = 14
        p.vitals.parts.lleg = 18
        p.vitals.bleeding = 1.5
        p.vitals.hunger = 22
        p.vitals.thirst = 15
        p.vitals.vigor = 18
        // IllnessKind is stomach | poison | rabies; severity is 0..100 (sim/vitals.ts).
        p.vitals.illness = { kind: 'stomach', severity: 40, hoursLeft: 30 }
        return 'injuries, bleeding, low needs and an illness (food poisoning)'
      case 'many-quests': {
        const base = { settlementId: 0, giverId: sim.npcsOf(0)[0].id, reward: 40, createdAt: sim.state.time.cal, killsNeeded: 3, kills: 1 }
        sim.state.quests.length = 0
        const mk = (kind, status, title) => sim.state.quests.push({ id: `ui-${status}-${kind}`, kind, status, title, desc: `${sim.npcsOf(0)[0].name} (guard): "A long description line that has to wrap somewhere inside the panel without breaking the layout, even on a narrow phone screen."`, ...base })
        mk('rats', 'available', 'Rats in Maplewick')
        mk('wolves', 'active', 'Wolves near Maplewick')
        mk('rats', 'done', 'Rats in Hollowgate')
        mk('wolves', 'expired', 'Wolves near Heatherby')
        return 'four quests (available, active, done, expired) pushed into state.quests for the check'
      }
      case 'no-orders':
        sim.state.px.orders.length = 0
        return 'orders cleared'
      case 'no-quests':
        sim.state.quests.length = 0
        return 'quest list emptied'
      case 'orders-placed': {
        const smith = rv.npc('blacksmith') ?? rv.findNpc((n) => n.profession === 'blacksmith')
        const { placeOrder } = await rv.mod('sim/orders')
        const msg = smith ? placeOrder(sim, smith, 'knife') : 'no smith'
        return `order placed: ${msg}`
      }
      case 'quest-giver': {
        sim.state.quests.length = 0
        const g = rv.npc('guard') ?? rv.findNpc((n) => n.profession === 'guard')
        if (g) sim.state.quests.push({ id: 'ui-giver', kind: 'wolves', status: 'available', title: 'Wolves near Maplewick', desc: `${g.name}: "A wolf pack is prowling around the pens."`, settlementId: g.settlementId, giverId: g.id, reward: 60, createdAt: sim.state.time.cal, killsNeeded: 3, kills: 0 })
        return g ? 'a wolves quest from the guard pushed into state.quests' : 'no guard found'
      }
    }
    return 'unknown prepare ' + w
  }, what)
}

/** In-page: resolve the open spec to something the Game can open, and stand next to the target. */
async function openPanel(s, spec, mobile) {
  const [kind, which, panel] = spec.split(':')
  if (!which) {
    if (mobile && TOUCH_MENU.has(kind)) {
      await s.page.tap(`[data-testid="touch-menu-${kind}"]`, { timeout: 8000 })
      return { how: `tap touch-menu-${kind}` }
    }
    if (kind === 'settings') {
      await s.S(() => window.__sv.game.togglePanel('menu'))
      await s.page.waitForTimeout(300)
      if (mobile) await s.page.tap('[data-testid=menu-settings]')
      else await s.page.click('[data-testid=menu-settings]')
      return { how: 'menu -> settings' }
    }
    await s.S((k) => window.__sv.game.togglePanel(k), kind)
    return { how: `Game.togglePanel(${kind})` }
  }
  if (kind === 'interact') {
    const r = await s.S(() => {
      const rv = window.__rv
      const b = rv.bld('well') ?? rv.findBld('well')
      rv.stand(b.x, b.z, 1.8)
      return { id: b.id }
    })
    await s.page.waitForTimeout(900)
    const opened = await s.S(() => {
      window.__sv.game.interact()
      return { panel: window.__sv.game.panel, target: window.__sv.game.target?.label ?? null }
    })
    return { how: 'stand at well + Game.interact()', ...r, ...opened }
  }
  const r = await s.S(([k, w, pn]) => {
    const rv = window.__rv
    let ref = null
    if (k === 'npc') {
      const pick = {
        trader: () => rv.npc('trader') ?? rv.findNpc((n) => n.profession === 'trader'),
        blacksmith: () => rv.npc('blacksmith') ?? rv.findNpc((n) => n.profession === 'blacksmith'),
        guard: () => rv.npc('guard') ?? rv.findNpc((n) => n.profession === 'guard'),
        plain: () => rv.findNpc((n) => n.settlementId === 0 && n.age === 'adult' && !['blacksmith', 'guard', 'herbalist', 'hunter', 'trader'].includes(n.profession)),
      }[w]()
      if (!pick) return { ok: false, reason: `no ${w} NPC` }
      rv.stand(pick.x, pick.z, 1.6)
      ref = { type: 'npc', id: pick.id }
    } else {
      const b = rv.bld(w) ?? rv.findBld(w)
      if (!b) return { ok: false, reason: `no ${w} building` }
      rv.stand(b.x, b.z, 2.2)
      ref = { type: 'building', id: b.id }
    }
    const g = window.__sv.game
    g.panel = null
    g.panelRef = ref
    g.togglePanel(pn)
    return { ok: true, how: `panelRef=${JSON.stringify(ref)} + Game.togglePanel(${pn})`, panel: g.panel }
  }, [kind, which, panel])
  return r
}

async function closePanel(s, mobile) {
  const btn = s.page.locator('[data-testid=panel-close]')
  if (!(await btn.count())) {
    await s.S(() => window.__sv.game.closePanel())
    return { closedByControl: false }
  }
  if (mobile) await s.page.tap('[data-testid=panel-close]').catch(() => {})
  else await s.page.click('[data-testid=panel-close]').catch(() => {})
  await s.page.waitForTimeout(250)
  const still = await s.S(() => window.__sv.game.panel)
  if (still) await s.S(() => window.__sv.game.closePanel())
  return { closedByControl: !still, ...(still ? { panelAfterCloseClick: still } : {}) }
}

async function runViewport(rt, viewport, checks) {
  const mobile = viewport === 'mobile'
  const s = await rt.start({ mobile })
  await s.S(() => {
    window.__sv.pause(true)
    window.__sv.setHour(11)
  })
  await s.page.waitForTimeout(1500)
  if (mobile) {
    // HUD without a panel: touch controls vs the 32 px rule.
    const hits = await runUiChecks(s.page, { mobile: true })
    checks.push({ viewport, panel: '(touch HUD, no panel)', state: 'default', hits })
    await rt.step(`${viewport}-touch-hud`, async () => ({ file: await s.snap(`${viewport}-touch-hud`), hits: hits.length }))
  }
  for (const spec of PLAN) {
    const name = `${viewport}-${spec.panel}-${spec.state}`
    await rt.step(name, async () => {
      const note = spec.prepare ? await prepare(s, spec.prepare) : 'no preparation'
      const opened = await openPanel(s, spec.open, mobile)
      if (opened.ok === false) return { ok: false, reason: opened.reason }
      await s.page.waitForTimeout(600)
      const shown = await s.S(() => window.__sv.game.panel)
      if (!shown) return { ok: false, reason: `panel did not open (${opened.how}); game.panel is null`, prepared: note }
      const file = await s.snap(name)
      const hits = await runUiChecks(s.page, { mobile })
      checks.push({ viewport, panel: spec.panel, state: spec.state, openedAs: shown, hits })
      const close = await closePanel(s, mobile)
      if (spec.prepare === 'empty-warehouse') await s.S(() => { const b = window.__rv.bld('warehouse') ?? window.__rv.findBld('warehouse'); b.inv.items = window.__rv.savedWh })
      return { panelOpened: shown, how: opened.how, prepared: note, file, hits: hits.length, ...close, ...(spec.note ? { note: spec.note } : {}) }
    })
  }
  await s.browser.close()
}

export default async function (rt) {
  const checks = []
  await runViewport(rt, 'desktop', checks)
  await runViewport(rt, 'mobile', checks)
  const summary = {}
  for (const c of checks) for (const h of c.hits) summary[h.check] = (summary[h.check] ?? 0) + 1
  fs.writeFileSync(path.join(rt.dir, 'ui-checks.json'), JSON.stringify({ summary, panels: checks }, null, 1))
  rt.note('uiCheckSummary', summary)
}
