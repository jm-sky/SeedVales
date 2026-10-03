#!/usr/bin/env node
/**
 * Acceptance scenario (docs/IMPLEMENTATION-PROMPT.md §9), desktop. State preparation uses the debug
 * API (teleport, time, fast-forward); the interactions under test go through the UI (keys, clicks, panels).
 * Usage: node scripts/e2e/acceptance.mjs  (dev server on :5199)
 */
import { check, launch, newGame, report, shot, sv } from './lib.mjs'

const results = []
const { browser, page, logs } = await launch()
const S = (fn, arg) => sv(page, fn, arg)
const key = async (k, wait = 700) => {
  await page.keyboard.press(k)
  await page.waitForTimeout(wait)
}
/** Wait until the UI target is set (5 Hz refresh at low FPS). */
const waitTarget = async (pred) => {
  for (let i = 0; i < 20; i++) {
    const t = await S(() => {
      const g = window.__sv.game
      return { label: g.target?.label ?? '', ref: g.target ? `${g.target.ref.type}:${g.target.ref.id}` : '', opts: g.options.map((o) => o.id) }
    })
    if (t.label && (!pred || pred(t))) return t
    await page.waitForTimeout(250)
  }
  return null
}
/** Fast-forward the sim until the player's activity ends (bounded). */
const finishActivity = async (max = 3600) => S((m) => {
  const sv = window.__sv
  let t = 0
  while (sv.game.sim.state.px.activity && t < m) {
    sv.simStep(1)
    t += 1
  }
  return t
}, max)
const clickTest = async (id, wait = 500) => {
  await page.click(`[data-testid="${id}"]`, { timeout: 8000 })
  await page.waitForTimeout(wait)
}
/** Authored quests (quests--001): walk up to a cast NPC, open the dialog and the quest topic through the UI. */
const talkTo = async (questId, slot) => {
  const id = await S(([q, s]) => {
    const sv = window.__sv
    const sim = sv.game.sim
    const n = sim.human(sim.state.authoredQuests[q].cast[s])
    sv.pause(true)
    sv.approach(n.x, n.z, 1.4)
    sv.face(n.x, n.z)
    sv.game.pinnedTarget = `npc:${n.id}`
    return n.id
  }, [questId, slot])
  await waitTarget((t) => t.ref === `npc:${id}` && t.opts.includes('talk'))
  await key('KeyE')
  await clickTest('opt-talk')
  await clickTest(`quest-topic-${questId}`)
}
/** Quest dialog: pick options in order, then close the panel. */
const questOpts = async (...ids) => {
  for (const id of ids) await clickTest(`quest-opt-${id}`)
  await clickTest('panel-close')
}
/** All money in the world (conservation checks). */
const worldMoney = () => S(() => {
  const s = window.__sv.game.sim.state
  return s.player.money + s.npcs.reduce((a, n) => a + n.money, 0) + s.settlements.reduce((a, t) => a + t.treasury, 0)
})
const questState = (id) => S((q) => {
  const st = window.__sv.game.sim.state.authoredQuests[q]
  return st ? { status: st.status, stage: st.stage, ending: st.ending, flags: st.flags } : null
}, id)
/** Runs the sim un-paused for `s` gameplay seconds, then pauses again (the dialog steps need still NPCs). */
const simFor = (s) => S((sec) => {
  window.__sv.pause(false)
  window.__sv.simStep(sec)
  window.__sv.pause(true)
}, s)

try {
  // 1. New game from a chosen seed.
  await newGame(page, '1337')
  const s0 = await S(() => window.__sv.state())
  check(results, '1. nowa gra z seeda 1337', s0.money === 150, `pozycja ${s0.x.toFixed(0)},${s0.z.toFixed(0)}`)
  await page.waitForTimeout(2500)
  await shot(page, 'acc-01-start')

  // 2. NPCs fulfil needs and duties (fast-forward 3 calendar hours = 450 s).
  const goals = await S(() => {
    const sv = window.__sv
    const seen = new Set()
    for (let i = 0; i < 45; i++) {
      sv.simStep(10)
      for (const n of sv.game.sim.state.npcs) if (n.ai.goal) seen.add(n.ai.goal)
    }
    return [...seen]
  })
  check(results, '2. NPC realizują potrzeby i obowiązki', goals.includes('work') && (goals.includes('drink') || goals.includes('eat')), goals.join(','))
  await page.waitForTimeout(1500)
  await shot(page, 'acc-02-settlement')

  // 4a. Trade: buy an axe and a hammer from the trader through the trade panel.
  await S(() => {
    const sv = window.__sv
    sv.setHour(10)
    const t = sv.game.sim.state.npcs.find((n) => n.profession === 'trader' && n.settlementId === 0)
    sv.pause(true)
    sv.approach(t.x, t.z, 1.4)
  })
  const tt = await waitTarget((t) => t.opts.includes('trade'))
  check(results, '4a. cel: handlarz', !!tt, tt?.label)
  await key('KeyE')
  await clickTest('opt-trade')
  const moneyBefore = await S(() => window.__sv.game.sim.player.money)
  await clickTest('buy-axe')
  await clickTest('buy-hammer')
  const bought = await S(() => ({ axe: window.__sv.count('axe'), hammer: window.__sv.count('hammer'), money: window.__sv.game.sim.player.money }))
  check(results, '4a. handel: kupno siekiery i młotka (pieniądze ubywają)', bought.axe === 1 && bought.hammer === 1 && bought.money < moneyBefore, bought)
  await shot(page, 'acc-04a-trade')
  await clickTest('panel-close')

  // 3. Gather resources with the correct tool (axe auto-equipped from inventory).
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    const s = sim.world.settlements[0]
    const tree = sim.nodes.query(s.x, s.z, 260).filter((n) => n.kind === 'tree_broad' && !sim.state.nodes[n.id] && Math.hypot(n.x - s.x, n.z - s.z) > s.radius + 10)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]
    window.__tree = tree.id
    sv.approach(tree.x, tree.z, 1.0)
    // Count only trees next to the player (NPC woodcutters fell trees elsewhere meanwhile).
    window.__nearFelled = () => sim.nodes.query(sim.player.x, sim.player.z, 6).filter((n) => sim.state.nodes[n.id]?.kind === 'felled').length
    window.__felled0 = window.__nearFelled()
  })
  const treeT = await waitTarget((t) => t.opts.includes('chop'))
  check(results, '3. cel: drzewo z opcją ścinania', !!treeT, treeT?.label)
  const logs0 = await S(() => window.__sv.count('log'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-chop"]')) await clickTest('opt-chop')
  await S(() => window.__sv.pause(false))
  const actKind = await S(() => window.__sv.state().activity)
  await page.waitForTimeout(1500)
  await shot(page, 'acc-03-chopping')
  await finishActivity()
  const after = await S(() => {
    const st = window.__sv.game.sim.state
    const felled = Object.entries(st.nodes).filter(([, x]) => x.kind === 'felled')
    // Remember which tree was felled (target chosen by facing — may differ from the one we walked to).
    window.__tree = felled.sort((a, b) => b[1].at - a[1].at)[0]?.[0]
    return { logs: window.__sv.count('log'), branch: window.__sv.count('branch'), main: window.__sv.state().main, felledDelta: window.__nearFelled() - window.__felled0 }
  })
  check(results, '3. ścięcie drzewa siekierą (auto-wzięta do ręki)', actKind === 'chop' && after.logs > logs0 && after.main === 'axe' && after.felledDelta === 1, after)

  // 4b. Craft through the craft panel (club from branches, needs knife = 'cut').
  await key('KeyC')
  await clickTest('craft-club')
  await finishActivity()
  const club = await S(() => window.__sv.count('club'))
  check(results, '4b. crafting maczugi (gałęzie + nóż)', club >= 1, `club=${club}`)

  // 4c. Carry to storage: deposit a log into the settlement warehouse (helps reputation).
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const wh = sim.building(sim.state.settlements[0].warehouseId)
    window.__wh = wh.id
    sv.pause(true)
    sv.approach(wh.x + Math.sin(wh.rot) * (wh.hd + 1.5), wh.z + Math.cos(wh.rot) * (wh.hd + 1.5), 0.2)
    sv.face(wh.x, wh.z)
  })
  const whT = await waitTarget((t) => t.opts.includes('storage'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-storage"]')) await clickTest('opt-storage')
  const whLogsBefore = await S(() => window.__sv.game.sim.building(window.__wh).inv.items.filter((i) => i.id === 'log').reduce((a, i) => a + i.qty, 0))
  await clickTest('put-log')
  const whLogsAfter = await S(() => window.__sv.game.sim.building(window.__wh).inv.items.filter((i) => i.id === 'log').reduce((a, i) => a + i.qty, 0))
  check(results, '4c. przeniesienie zasobów do magazynu osady', !!whT && whLogsAfter > whLogsBefore, `${whLogsBefore} → ${whLogsAfter}`)
  await clickTest('panel-close')

  // 4d. Sell branches to the trader.
  await S(() => {
    const sv = window.__sv
    const t = sv.game.sim.state.npcs.find((n) => n.profession === 'trader' && n.settlementId === 0)
    sv.approach(t.x, t.z, 1.4)
  })
  await waitTarget((t) => t.opts.includes('trade'))
  await key('KeyE')
  await clickTest('opt-trade')
  const m0 = await S(() => window.__sv.game.sim.player.money)
  await clickTest('sell-branch')
  const m1 = await S(() => window.__sv.game.sim.player.money)
  check(results, '4d. sprzedaż gałęzi', m1 > m0, `${m0} → ${m1}`)
  await clickTest('panel-close')

  // 4e. Order at the blacksmith through the UI, then cancel it (deposit refunded).
  let smithRef = ''
  await S(() => {
    const sv = window.__sv
    const smith = sv.game.sim.state.npcs.find((n) => n.profession === 'blacksmith')
    window.__smith = smith.id
    sv.approach(smith.x, smith.z, 1.4)
    sv.face(smith.x, smith.z)
    // Another villager may stand closer; pin the smith as the target (like Tab cycling).
    sv.game.pinnedTarget = `npc:${smith.id}`
    return smith.id
  }).then((id) => (smithRef = `npc:${id}`))
  await waitTarget((t) => t.ref === smithRef && t.opts.includes('orders'))
  await key('KeyE')
  await clickTest('opt-orders')
  const om0 = await S(() => window.__sv.game.sim.player.money)
  await clickTest('order-knife')
  const placed = await S(() => ({ n: window.__sv.game.sim.state.px.orders.length, money: window.__sv.game.sim.player.money, id: window.__sv.game.sim.state.px.orders[0]?.id }))
  if (placed.id) await clickTest(`cancel-${placed.id}`)
  const om1 = await S(() => ({ n: window.__sv.game.sim.state.px.orders.length, money: window.__sv.game.sim.player.money }))
  check(results, '4e. zamówienie u kowala (UI) i anulowanie ze zwrotem zaliczki', placed.n === 1 && placed.money < om0 && om1.n === 0 && om1.money === om0, { om0, placed, om1 })
  await clickTest('panel-close')

  // 5. Start and finish a simple construction (campfire) through the build panel.
  await S(() => {
    const sv = window.__sv
    const o = sv.openSpot(30)
    sv.teleport(o.x, o.z)
    sv.pause(false)
  })
  await key('KeyB')
  await clickTest('place-campfire')
  const siteT = await waitTarget((t) => t.opts.includes('build'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-build"]')) await clickTest('opt-build')
  await finishActivity()
  const built = await S(() => window.__sv.state().built)
  check(results, '5. budowa ogniska: plac → materiały → ukończenie', built.includes('campfire'), `${built.join(',')} target=${siteT?.label ?? '—'}`)
  await page.waitForTimeout(1200)
  await shot(page, 'acc-05-campfire')

  // 6. Travel outside, meet an animal and fight (melee via mouse clicks).
  await S(() => {
    const sv = window.__sv
    const o = sv.openSpot(220)
    sv.teleport(o.x, o.z)
    const p = sv.game.sim.player
    // Enter the fight rested and unhurt (earlier steps leave variable HP/stamina).
    for (const k of Object.keys(p.vitals.parts)) p.vitals.parts[k] = 0
    p.vitals.bleeding = 0
    sv.setNeeds({ hunger: 90, thirst: 90, vigor: 90, stamina: 100 })
    p.eq.main = { id: 'axe', qty: 1, dur: 250 }
    window.__wolf = sv.spawn('wolf', 0, 3)
    const w = sv.game.sim.actor(window.__wolf)
    w.aggroId = p.id
    w.aggroUntil = sv.game.sim.state.time.play + 60
    sv.face(w.x, w.z)
  })
  await page.mouse.click(640, 360)
  let wolfDead = false
  for (let i = 0; i < 100 && !wolfDead; i++) {
    await S(() => {
      const sv = window.__sv
      sv.simStep(0.3) // guarantee sim progress between clicks at low headless FPS
      const w = sv.game.sim.actor(window.__wolf)
      if (w) sv.face(w.x, w.z)
    })
    await page.mouse.click(640, 360)
    await page.waitForTimeout(350)
    wolfDead = await S(() => !window.__sv.game.sim.actor(window.__wolf))
  }
  const fight = await S(() => ({ hp: window.__sv.state().hp, corpses: window.__sv.game.sim.state.corpses.filter((c) => c.species === 'wolf').length, ko: !!window.__sv.game.sim.player.vitals.ko, c: Object.fromEntries(Object.entries(window.__sv.perf.report().counters).filter(([k]) => k.startsWith('combat'))) }))
  await shot(page, 'acc-06-fight')
  check(results, '6. walka z wilkiem (LPM) → zwłoki', wolfDead && fight.corpses > 0, fight)

  // 7. Recovery: apply bandage through the inventory panel.
  await S(() => {
    const p = window.__sv.game.sim.player
    p.vitals.parts.torso += 25
    p.vitals.ko = undefined
  })
  const hpBefore = await S(() => window.__sv.state().hp)
  await key('KeyI')
  await clickTest('use-bandage')
  const hpAfter = await S(() => window.__sv.state().hp)
  check(results, '7. leczenie bandażem z ekwipunku', hpAfter > hpBefore, `${hpBefore.toFixed(1)} → ${hpAfter.toFixed(1)}`)
  await clickTest('panel-close')

  // 8. Simulation problem → quest → solve → reputation. Fast-forward until rats nest in the neglected warehouse.
  const questInfo = await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    for (let i = 0; i < 400 && !sim.state.quests.some((q) => q.kind === 'rats'); i++) sv.simStep(20)
    const q = sim.state.quests.find((qq) => qq.kind === 'rats')
    return q ? { id: q.id, status: q.status, b: q.buildingId, sid: q.settlementId, cal: sim.state.time.cal } : null
  })
  check(results, '8a. problem w symulacji: gniazdo szczurów → ogłoszenie', !!questInfo, questInfo)
  if (questInfo) {
    // The nest can appear in any settlement (depends on the simulation); go to that settlement's noticeboard.
    await S((sid) => {
      const sv = window.__sv
      const sim = sv.game.sim
      const nb = sim.state.buildings.find((b) => b.kind === 'noticeboard' && b.settlementId === sid)
      sv.pause(true)
      sv.approach(nb.x, nb.z, 1.6)
      sv.setHour(12)
    }, questInfo.sid)
    await waitTarget((t) => t.opts.includes('quests'))
    await key('KeyE')
    if (await page.$('[data-testid="opt-quests"]')) await clickTest('opt-quests')
    await clickTest('accept-rats')
    await shot(page, 'acc-08-quest')
    await clickTest('panel-close')
    console.log('rats before kill loop', JSON.stringify(await S((bid) => {
      const sim = window.__sv.game.sim
      const q = sim.state.quests.find((x) => x.kind === 'rats')
      const b = sim.building(bid)
      return { q: q && { status: q.status, kills: q.kills }, nest: !!b.ratNest, dur: Math.round(b.durability), rats: sim.state.animals.filter((a) => a.species === 'rat').map((a) => `${a.denId}:${Math.round(Math.hypot(a.x - b.x, a.z - b.z))}`) }
    }, questInfo.b)))
    await S(() => {
      window.__sv.pause(false)
      window.__sv.game.sim.player.eq.main = { id: 'club', qty: 1, dur: 200 }
    })
    // Kill rats of this nest: approach each rat and click (UI attack). Runs again after the repair,
    // because the nest keeps breeding while the repair is under way.
    // Per-attempt trace (last 12 kept) so an intermittent failure shows why a rat survived (session 9/11).
    const ratTrace = []
    const killRats = async () => {
      for (let i = 0; i < 80; i++) {
        const left = await S((bid) => {
          const sv = window.__sv
          const sim = sv.game.sim
          const b = sim.building(bid)
          const rat = sim.state.animals.find((a) => a.species === 'rat' && !a.vitals.dead && (a.denId === `nest:${bid}` || Math.hypot(a.x - b.x, a.z - b.z) < 20))
          if (!rat) return 0
          sv.pause(false)
          sv.simStep(1.2)
          sv.pause(true)
          if (rat.vitals.dead) return 1
          sv.approach(rat.x, rat.z, 0.9)
          const p = sim.player
          return { id: rat.id, d: Math.round(Math.hypot(rat.x - p.x, rat.z - p.z) * 10) / 10, nest: Math.round(Math.hypot(rat.x - b.x, rat.z - b.z)), st: Math.round(p.vitals.stamina), ui: document.elementFromPoint(640, 360)?.tagName }
        }, questInfo.b)
        if (!left) break
        if (typeof left === 'object' && left.ui !== 'CANVAS') {
          await page.keyboard.press('Escape') // a menu/panel over the centre would take the click
          await S(() => { window.__sv.game.sim.player.eq.main = { id: 'club', qty: 1, dur: 200 } })
        }
        const c0 = await S(() => ({ ...window.__sv.perf.report().counters }))
        await page.mouse.click(640, 360)
        if (typeof left === 'object') {
          const c1 = await S(() => window.__sv.perf.report().counters)
          const dc = (k) => (c1[k] ?? 0) - (c0[k] ?? 0)
          ratTrace.push({ i, ...left, sw: dc('combat.swings'), hit: dc('combat.hits'), miss: dc('combat.misses'), none: dc('combat.noTarget') })
          if (ratTrace.length > 12) ratTrace.shift()
        }
        await page.waitForTimeout(80)
        if (i === 5) console.log('rat loop', JSON.stringify(await S(() => Object.fromEntries(Object.entries(window.__sv.perf.report().counters).filter(([k]) => k.startsWith('combat'))))))
      }
    }
    await killRats()
    // Repair the warehouse (hammer + branches) through the interaction menu until the nest is gone.
    await S((bid) => {
      const sv = window.__sv
      const b = sv.game.sim.building(bid)
      sv.give('branch', 6)
      sv.pause(true)
      sv.approach(b.x + Math.sin(b.rot) * (b.hd + 1.5), b.z + Math.cos(b.rot) * (b.hd + 1.5), 0.2)
      sv.face(b.x, b.z)
    }, questInfo.b)
    for (let i = 0; i < 3; i++) {
      // Stop once the warehouse needs no more repair: pressing E without the option would open the
      // interaction menu over the screen centre and swallow the kill loop's clicks (session 11 trace: ui DIV, 0 swings).
      if (!(await waitTarget((t) => t.opts.includes('repair')))) break
      await key('KeyE')
      if (await page.$('[data-testid="opt-repair"]')) await clickTest('opt-repair')
      await S(() => window.__sv.pause(false))
      await finishActivity()
      await S(() => window.__sv.pause(true))
    }
    await killRats()
    await S(() => {
      window.__sv.pause(false)
      window.__sv.simStep(15)
    })
    const q = await S((id) => {
      const sim = window.__sv.game.sim
      const qq = sim.state.quests.find((x) => x.id === id)
      const b = sim.building(qq.buildingId)
      const left = sim.state.animals.filter((a) => a.species === 'rat' && !a.vitals.dead && (a.denId === `nest:${b.id}` || (!a.denId && Math.hypot(a.x - b.x, a.z - b.z) < 20)))
      return { status: qq.status, kills: qq.kills, sid: qq.settlementId, rep: sim.state.settlements[qq.settlementId].rep, nest: !!b.ratNest, dur: b.durability, left: left.map((a) => ({ id: a.id, d: Math.round(Math.hypot(a.x - b.x, a.z - b.z)), den: a.denId, st: a.state })) }
    }, questInfo.id)
    check(results, '8b. zadanie ukończone i reputacja wzrosła', q.status === 'done' && q.rep.helpfulness >= 12, q.status === 'done' ? q : { ...q, ratTrace })
  }

  // 9. Save through the menu, reload the page, load the save, verify persisted changes.
  const ids = await S(() => ({ tree: window.__tree, wolf: window.__wolf }))
  const before = await S(() => {
    const sim = window.__sv.game.sim
    return { tree: sim.state.nodes[window.__tree]?.kind, campfires: sim.state.buildings.filter((b) => b.playerBuilt).length, wolf: !!sim.actor(window.__wolf), logs: window.__sv.count('log'), cal: sim.state.time.cal, quests: sim.state.quests.map((q) => q.status).join(','), edits: Object.keys(sim.terrain.edits.toJSON()).length }
  })
  for (let i = 0; i < 3 && !(await page.$('[data-testid="menu-save"]')); i++) await key('Escape', 800)
  await clickTest('menu-save', 1500)
  await page.reload()
  await page.waitForSelector('[data-testid=load-save]', { timeout: 20000 })
  await clickTest('load-save')
  await page.waitForSelector('[data-testid=status-bars]', { timeout: 120000 })
  await page.waitForFunction(() => !!window.__sv)
  const loaded = await S((ids) => {
    const sim = window.__sv.game.sim
    return { tree: sim.state.nodes[ids.tree]?.kind, campfires: sim.state.buildings.filter((b) => b.playerBuilt).length, wolf: !!sim.actor(ids.wolf), logs: window.__sv.count('log'), cal: sim.state.time.cal, quests: sim.state.quests.map((q) => q.status).join(',') }
  }, ids)
  await page.waitForTimeout(2000)
  await shot(page, 'acc-09-loaded')
  check(results, '9. zapis → odświeżenie → odczyt zachowuje zmiany', loaded.tree === 'felled' && !loaded.wolf && loaded.campfires === before.campfires && loaded.logs === before.logs && loaded.cal >= before.cal && loaded.cal - before.cal < 120 && loaded.quests === before.quests, { before, loaded })

  // 10. UI-03: character screen (K), primary ranged weapon, quick switch (X); inventory filter (I).
  await S(() => {
    const sv = window.__sv
    sv.give('short_bow')
    sv.give('sword')
    sv.pause(true)
  })
  await key('KeyK')
  const overview = !!(await page.$('[data-testid="character-overview"]'))
  await clickTest('char-tab-weapons')
  await clickTest('primary-ranged-short_bow')
  await shot(page, 'acc-10-character')
  await clickTest('panel-close')
  const mainBefore = await S(() => window.__sv.game.sim.player.eq.main?.id)
  await key('KeyX')
  const mainAfterX = await S(() => window.__sv.game.sim.player.eq.main?.id)
  await key('KeyX')
  const mainAfterX2 = await S(() => window.__sv.game.sim.player.eq.main?.id)
  const primary = await S(() => window.__sv.game.sim.state.px.primary)
  const xs = [mainAfterX, mainAfterX2]
  check(results, '10. ekran postaci (K) + broń podstawowa + przełączenie (X)', overview && primary?.ranged === 'short_bow' && xs.includes('short_bow') && xs[0] !== xs[1], { overview, mainBefore, xs, primary })
  await key('KeyI')
  await clickTest('filter-weapon')
  const rows = await page.$$eval('[data-testid="inventory-list"] [data-testid^="item-"]', (els) => els.map((e) => e.getAttribute('data-testid')))
  await page.click('[data-testid="inventory-list"] [data-testid^="item-"]')
  await page.waitForTimeout(300)
  const details = await page.$eval('[data-testid="item-details"]', (e) => e.textContent).catch(() => '')
  check(results, '10. ekwipunek: kliknięcie pokazuje parametry przedmiotu', (details ?? '').length > 5, (details ?? '').slice(0, 80))
  await shot(page, 'acc-10-inventory-filter')
  await clickTest('panel-close')
  check(results, '10. ekwipunek: filtr „Broń” pokazuje tylko broń', rows.length > 0 && !rows.includes('item-log') && !rows.includes('item-bandage'), rows.join(','))

  // 11. UI-06: Tab cycles between objects in range; the prompt follows the chosen target.
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    for (const [id, dx, dz] of [['stone', 0, 1.2], ['branch', 0.6, 2.2]]) sim.addGround({ id: sim.nextId(), x: p.x + dx, z: p.z + dz, stack: { id, qty: 1 }, droppedAt: sim.state.time.cal, lit: false })
    p.rot = 0
    sv.game.renderer.rig.yaw = 0
  })
  const t0 = await waitTarget()
  await key('Tab', 500)
  const t1 = await waitTarget((t) => t.label !== t0?.label)
  check(results, '11. Tab przełącza cel interakcji', !!t0 && !!t1 && t1.label !== t0.label, `${t0?.label} → ${t1?.label}`)
  await S(() => window.__sv.pause(false))

  // 12. UI-04: map (M) → click sets a waypoint → minimap shows the goal and its distance; clear from the map.
  await key('KeyM')
  const box = await page.locator('[data-testid="map-canvas"]').boundingBox()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.waitForTimeout(400)
  const wp = await S(() => window.__sv.game.sim.state.px.waypoint)
  const goalShown = !!(await page.$('[data-testid="map-goal"]'))
  // MAP-01 fog of war: a far unexplored corner of the map is covered, the player's area is not.
  const fog = await page.$eval('[data-testid="map-canvas"]', (c, pos) => {
    const ctx = c.getContext('2d')
    const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
    return { corner: px(4, 4), player: px(Math.round(pos.x * c.width), Math.round(pos.z * c.height) + 12) }
  }, await S(() => ({ x: window.__sv.game.sim.player.x / window.__sv.game.sim.world.size, z: window.__sv.game.sim.player.z / window.__sv.game.sim.world.size })))
  check(results, '12. mapa: mgła wojny zakrywa nieodkryte tereny (MAP-01)', fog.corner.join() === '22,19,15' && fog.player.join() !== '22,19,15', fog)
  // MAP-01 (review 013 M-01): the side list names only known settlements; an unexplored one is absent.
  const mapNames = await S(() => {
    const sim = window.__sv.game.sim
    const cellM = 64 // FOG.cellM
    const n = Math.ceil(sim.world.size / cellM)
    const explored = (x, z) => {
      const i = Math.floor(z / cellM) * n + Math.floor(x / cellM)
      return ((sim.state.px.explored?.[i >>> 5] ?? 0) & (1 << (i & 31))) !== 0
    }
    const unknown = sim.world.settlements.filter((s) => !sim.state.px.visited?.includes(s.id) && !explored(s.x, s.z)).map((s) => s.name)
    return { unknown }
  })
  const mapText = await page.locator('[data-testid="map-canvas"]').locator('xpath=../..').innerText()
  check(results, '12. map: an unexplored settlement does not leak into the list (MAP-01)', mapNames.unknown.length > 0 && mapNames.unknown.every((n) => !mapText.includes(n)), { mapNames, mapText })
  await shot(page, 'acc-12-map')
  await clickTest('panel-close')
  await page.waitForTimeout(600)
  const mini = await page.$eval('[data-testid="minimap-goal"]', (e) => e.textContent).catch(() => '')
  await shot(page, 'acc-12-minimap')
  check(results, '12. mapa: kliknięcie wyznacza cel, minimapa pokazuje cel i odległość', !!wp && goalShown && /Marker · [\d.]+ k?m/.test(mini ?? ''), { wp, goalShown, mini })
  await key('KeyM')
  await clickTest('map-clear-goal')
  const cleared = await S(() => window.__sv.game.sim.state.px.waypoint === undefined)
  await clickTest('panel-close')
  check(results, '12. mapa: usunięcie celu', cleared)

  // 14. RES-07: the felled tree left a stump; a boulder splits into a chunk (UI: mine) that breaks into stones (UI: break).
  const stump = await S((treeId) => {
    const sv = window.__sv
    const sim = sv.game.sim
    const n = sim.nodes.byId(treeId)
    sv.pause(true)
    sv.approach(n.x, n.z, 3)
    return sim.state.nodes[treeId]?.kind
  }, ids.tree)
  await page.waitForTimeout(1500)
  await shot(page, 'acc-14-stump')
  const boulder = await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    sv.give('pickaxe')
    let b = null
    for (let r = 200; r < 3000 && !b; r += 200) b = sim.nodes.query(p.x, p.z, r).find((n) => n.kind === 'rock' && n.scale >= 2 && !sim.state.nodes[n.id])
    sv.approach(b.x, b.z, b.radius + 0.9)
    window.__boulder = b.id
    return { id: b.id, stones: sv.count('stone') }
  })
  await waitTarget((t) => t.opts.includes('mine'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-mine"]')) await clickTest('opt-mine')
  await S(() => window.__sv.pause(false))
  await finishActivity()
  await S(() => window.__sv.pause(true))
  const chunkT = await waitTarget((t) => t.opts.includes('break_chunk'))
  await shot(page, 'acc-14-chunk')
  await key('KeyE')
  if (await page.$('[data-testid="opt-break_chunk"]')) await clickTest('opt-break_chunk')
  await S(() => window.__sv.pause(false))
  await finishActivity()
  const stonesAfter = await S(() => window.__sv.count('stone'))
  check(results, '14. pień po ścięciu; głaz → odłamek → kamienie (kilof, przez UI)', stump === 'felled' && !!chunkT && stonesAfter === boulder.stones + 4, { stump, chunk: chunkT?.label, stones: [boulder.stones, stonesAfter] })

  // 15. FOOD-03: roast two pieces at once with a pan; cooked meat keeps the species.
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    const f = sim.state.buildings.filter((b) => b.kind === 'campfire').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]
    f.lit = true
    f.fuel = Math.max(f.fuel ?? 0, 10) // the step-5 campfire may have burnt down by now
    p.inv.items = p.inv.items.filter((x) => x.id !== 'raw_meat' && x.id !== 'cooked_meat')
    sim.player.inv.items.push({ id: 'raw_meat', qty: 1, fresh: 48, sp: 'deer' }, { id: 'raw_meat', qty: 2, fresh: 48, sp: 'boar' })
    sv.give('pan')
    sv.pause(true)
    sv.approach(f.x, f.z, 1.8)
  })
  const fireT = await waitTarget((t) => t.opts.includes('roast'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-roast"]')) await clickTest('opt-roast')
  await S(() => window.__sv.pause(false))
  await page.waitForTimeout(800)
  await shot(page, 'acc-15-roasting')
  await finishActivity()
  const roast = await S(() => ({ cooked: window.__sv.game.sim.player.inv.items.filter((x) => x.id === 'cooked_meat').map((x) => `${x.sp}×${x.qty}`), raw: window.__sv.count('raw_meat') }))
  check(results, '15. pieczenie 2 kawałków na raz (patelnia), mięso zachowuje gatunek', !!fireT && roast.raw === 1 && roast.cooked.length === 2, roast)

  // 16. TRANS-01: push a wheelbarrow (inventory), load logs (quick actions), unload at the warehouse (interaction).
  await S(() => {
    const sv = window.__sv
    sv.pause(true)
    sv.give('wheelbarrow')
    sv.give('log', 3)
  })
  await key('KeyI')
  await clickTest('use-wheelbarrow')
  await key('KeyQ')
  await clickTest('quick-load_cart')
  await clickTest('panel-close')
  const cartLoaded = await S(() => window.__sv.game.sim.state.px.cart?.inv.items.map((x) => `${x.id}×${x.qty}`).join(','))
  const whInfo = await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    const wh = sim.state.buildings.filter((b) => b.kind === 'warehouse').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]
    sv.approach(wh.x + Math.sin(wh.rot) * (wh.hd + 1.6), wh.z + Math.cos(wh.rot) * (wh.hd + 1.6), 0.2)
    sv.face(wh.x, wh.z)
    return { id: wh.id, logs: wh.inv.items.filter((x) => x.id === 'log').reduce((n, x) => n + x.qty, 0) }
  })
  await shot(page, 'acc-16-cart')
  await waitTarget((t) => t.opts.includes('unload_cart_here'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-unload_cart_here"]')) await clickTest('opt-unload_cart_here')
  const whLogs = await S((id) => window.__sv.game.sim.building(id).inv.items.filter((x) => x.id === 'log').reduce((n, x) => n + x.qty, 0), whInfo.id)
  check(results, '16. taczka: pchanie, załadunek belek, rozładunek w magazynie (UI)', (cartLoaded ?? '').includes('log×3') && whLogs === whInfo.logs + 3, { cartLoaded, logs: [whInfo.logs, whLogs] })
  await S(() => {
    window.__sv.game.parkCart()
    window.__sv.pause(false)
  })

  // 17. COMP-01 / SOC-01: hire a companion and give a gift through the UI (npc--001).
  const sonId = await S(() => {
    const sv = window.__sv
    const son = sv.game.sim.state.npcs.find((n) => n.kin === 'son' && n.settlementId === 0)
    son.big5.n = 0.3
    sv.pause(true)
    sv.approach(son.x, son.z, 1.4)
    sv.face(son.x, son.z)
    // Another villager may stand closer than the son; pin him as the target (same as cycling with Tab).
    sv.game.pinnedTarget = `npc:${son.id}`
    return son.id
  })
  const sonRef = `npc:${sonId}`
  await waitTarget((t) => t.ref === sonRef && t.opts.includes('hire'))
  await key('KeyE')
  await clickTest('opt-hire')
  await clickTest('hire-days-3')
  await clickTest('hire-task-escort')
  await clickTest('hire-risk-low')
  await shot(page, 'acc-17-hire')
  const m17 = await S(() => window.__sv.game.sim.player.money)
  await clickTest('hire-confirm')
  const hired = await S((id) => {
    const sim = window.__sv.game.sim
    const n = sim.human(id)
    return { c: n.companion, money: sim.player.money }
  }, sonId)
  await S((ref) => { window.__sv.game.pinnedTarget = ref }, sonRef)
  await waitTarget((t) => t.ref === sonRef && t.opts.includes('gift'))
  await key('KeyE')
  await clickTest('opt-gift')
  const op0 = await S((id) => window.__sv.game.sim.human(id).opinion, sonId)
  await clickTest('gift-bread')
  const op1 = await S((id) => window.__sv.game.sim.human(id).opinion, sonId)
  await clickTest('panel-close')
  check(results, '17. najem towarzysza (3 dni, eskorta) i prezent przez UI', hired.c?.kind === 'hired' && Math.abs(hired.c.until - hired.c.since - 3 * 86400) < 1e-3 && hired.money < m17 && op1 > op0, { hired, op0, op1 })
  await S(() => window.__sv.pause(false))

  // 18. FIRE-01 / FIRE-03: plant a torch from the quick panel, light / extinguish / burn it out; feed and burn out a campfire.
  await S(() => {
    const sv = window.__sv
    const p = sv.game.sim.player
    sv.pause(true)
    p.eq.off = undefined
    p.inv.items = p.inv.items.filter((x) => x.id !== 'torch' && x.id !== 'branch')
    sv.give('torch', 1)
    sv.give('flint', 1)
    sv.give('branch', 6)
  })
  await key('KeyQ')
  await clickTest('quick-plant_torch')
  const torchId = await S(() => window.__sv.game.sim.state.ground.find((g) => g.planted)?.id)
  await S((id) => { window.__sv.game.pinnedTarget = `ground:${id}` }, torchId)
  await waitTarget((t) => t.ref === `ground:${torchId}` && t.opts.includes('light_planted'))
  await key('KeyE')
  await clickTest('opt-light_planted')
  const torchLit = await S((id) => window.__sv.game.sim.state.ground.find((g) => g.id === id)?.lit, torchId)
  await waitTarget((t) => t.ref === `ground:${torchId}` && t.opts.includes('douse_planted'))
  await key('KeyE')
  await clickTest('opt-douse_planted')
  const torchOut = await S((id) => window.__sv.game.sim.state.ground.find((g) => g.id === id)?.lit, torchId)
  const burnLeft = await S((id) => window.__sv.game.sim.state.ground.find((g) => g.id === id)?.burnH, torchId)
  await waitTarget((t) => t.ref === `ground:${torchId}` && t.opts.includes('light_planted'))
  await key('KeyE')
  await clickTest('opt-light_planted')
  await shot(page, 'acc-18-planted-torch')
  const torchGone = await S((id) => {
    window.__sv.pause(false)
    window.__sv.simStep(6 * 150)
    return !window.__sv.game.sim.state.ground.some((g) => g.id === id)
  }, torchId)
  check(results, '18a. latarnia: wbicie, zapalenie, zgaszenie (zachowuje czas), wypalenie po upływie czasu', torchLit === true && torchOut === false && burnLeft > 4.9 && torchGone, { torchLit, torchOut, burnLeft, torchGone })

  // Placement goes 2.8 m in front of the player: start from an open spot like step 5, otherwise the spot left
  // by 18a can be blocked (tree/rock/building) and no site is created (failure seen in session 11, sites: []).
  await S(() => {
    const sv = window.__sv
    const o = sv.openSpot(30)
    sv.teleport(o.x, o.z)
    sv.face(o.x, o.z + 10)
    sv.pause(false)
  })
  await key('KeyB')
  await clickTest('place-campfire')
  await waitTarget((t) => t.opts.includes('build'))
  await key('KeyE')
  if (await page.$('[data-testid="opt-build"]')) await clickTest('opt-build')
  await finishActivity()
  await S(() => window.__sv.pause(true))
  const fire0 = await S(() => {
    const sim = window.__sv.game.sim
    const f = sim.state.buildings.filter((b) => b.playerBuilt && b.kind === 'campfire').pop()
    return f ? { id: f.id, fuel: f.fuel, lit: f.lit, x: f.x, z: f.z } : { missing: JSON.stringify({ sites: sim.state.sites, act: sim.state.px.activity, toast: window.__sv.game.toast, inv: sim.player.inv.items.map((x) => x.id + x.qty).join(), hour: (sim.state.time.cal / 3600) % 24 }) }
  })
  if (fire0.missing) throw new Error('18b: no campfire built ' + fire0.missing)
  await S((f) => { window.__sv.approach(f.x, f.z, 1.8) }, fire0)
  await S((id) => { window.__sv.game.pinnedTarget = `building:${id}` }, fire0.id)
  await waitTarget((t) => t.ref === `building:${fire0.id}` && t.opts.includes('add_fuel'))
  await key('KeyE')
  await clickTest('opt-add_fuel')
  const fire1 = await S((id) => window.__sv.game.sim.building(id)?.fuel, fire0.id)
  const burnt = await S((f) => {
    const sv = window.__sv
    const sim = sv.game.sim
    sv.pause(false)
    sv.simStep((sim.building(f.id).fuel + 1) * 150)
    return { gone: !sim.building(f.id), ash: sim.tracesNear(f.x, f.z, 2).some((t) => t.kind === 'ash') }
  }, fire0)
  check(results, '18b. ognisko: start na 3 gałęziach, dokładanie opału (UI), wypalenie → popiół', fire0.lit === true && fire1 > fire0.fuel + 2 && burnt.gone && burnt.ash, { fire0, fire1, burnt })
  await S(() => window.__sv.pause(false))

  // 19. QUEST-03 / Q03 "A Roof Before Rain": offered by Miles, accepted in the dialog, journal (J), beam inspected with a
  // lit torch, plan agreed with Lucy, house repaired, thanks — dialogs through the UI, world actions through the sim.
  await S(() => {
    const sv = window.__sv
    sv.pause(false)
    window.__q3ok = sv.forceQuest('q03')
    const sim = sv.game.sim
    const st = sim.state.authoredQuests.q03
    const house = sim.building(sim.state.households[sim.human(st.cast.miles).householdId].houseId)
    house.durability = 40
    window.__q3house = house.id
    sv.pause(true)
  })
  const q3money = await worldMoney()
  await talkTo('q03', 'miles')
  await questOpts('show_damage')
  const q3a = await questState('q03')
  await key('KeyJ')
  const q3journal = await page.$eval('[data-testid="journal-text-q03"]', (e) => e.textContent).catch(() => '')
  await shot(page, 'acc-19-journal')
  await clickTest('panel-close')
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const h = sim.building(window.__q3house)
    sim.player.eq.off = { id: 'torch', qty: 1, dur: 60 }
    sv.teleport(h.x + h.hw + 2, h.z)
  })
  await simFor(8)
  const q3b = await questState('q03')
  await talkTo('q03', 'miles')
  await questOpts('plan_repair')
  await talkTo('q03', 'lucy')
  await questOpts('say_repair', 'agree')
  const q3c = await questState('q03')
  await S(() => {
    // The player's own repair (D-QUEST-2: NPC work alone ends the quest without thanks; the repair action itself is
    // covered in vitest): count it, then the house is mended.
    const sim = window.__sv.game.sim
    sim.state.authoredQuests.q03.counters.myRepairs = 1
    sim.building(window.__q3house).durability = 95
  })
  await simFor(2)
  const q3d = await questState('q03')
  await talkTo('q03', 'lucy')
  await questOpts('take_coin_repair')
  const q3e = await questState('q03')
  check(results, '19. Q03 A Roof Before Rain: accept (dialog), journal (J), beam with a torch, plan, repair, thanks; money constant',
    !!q3a && (await S(() => window.__q3ok)) && q3a.status === 'active' && /Judge the damage/.test(q3journal) && q3b.flags.beamInspected && q3c.stage === 3 && q3c.flags.plan === 'repair' && q3d.flags.workComplete && q3e.status === 'done' && q3e.ending === 'repair' && (await worldMoney()) === q3money,
    { q3a, q3journal: q3journal.slice(0, 60), q3b: q3b?.flags.beamInspected, q3c: q3c?.stage, q3d: q3d?.flags.workComplete, q3e })

  // 20. QUEST-03 / Q07 "Six Bowls, One Pan": accept, check the stores, walk Mark's dusk round (light every post), roast in two
  // batches with a pan, serve one table; Mark then lets the player take a torch.
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    sv.pause(false)
    for (const n of sim.state.npcs) if (sim.state.households[n.householdId]?.profession === 'woodcutter') n.opinion = 12
    window.__q7ok = sv.forceQuest('q07')
    sv.give('flint', 1)
    sv.pause(true)
  })
  const q7money = await worldMoney()
  await talkTo('q07', 'lucy')
  await questOpts('accept')
  await talkTo('q07', 'lucy')
  await questOpts('examine_meat')
  await S(() => window.__sv.setHour(17.5)) // Mark is held only in the dusk window (review 014 #1)
  await talkTo('q07', 'mark')
  await questOpts('round')
  await simFor(2)
  const q7a = await S(() => {
    const sim = window.__sv.game.sim
    const m = sim.human(sim.state.authoredQuests.q07.cast.mark)
    return { held: m.questHold?.q, flags: sim.state.authoredQuests.q07.flags }
  })
  const postIds = await S(() => {
    const sim = window.__sv.game.sim
    window.__sv.setHour(17.5)
    const posts = sim.settlementBuildings(0, 'torchpost')
    for (const b of posts) b.lit = false
    return posts.map((b) => b.id)
  })
  for (const id of postIds) {
    await S((bid) => {
      const sv = window.__sv
      const b = sv.game.sim.building(bid)
      sv.approach(b.x, b.z, 1.6)
      sv.face(b.x, b.z)
      sv.game.pinnedTarget = `building:${bid}`
    }, id)
    await waitTarget((t) => t.ref === `building:${id}` && t.opts.includes('light'))
    await key('KeyE', 400)
  }
  await simFor(2)
  const q7b = await questState('q07')
  // Roast 4 pieces in two batches (pan: two at a time) at the settlement hearth through the interaction menu.
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    const f = sim.state.buildings.find((b) => b.kind === 'campfire' && b.settlementId === 0 && b.hearth)
    f.lit = true
    f.fuel = Math.max(f.fuel ?? 0, 10)
    p.inv.items = p.inv.items.filter((x) => x.id !== 'raw_meat' && x.id !== 'cooked_meat')
    p.inv.items.push({ id: 'raw_meat', qty: 4, fresh: 48, sp: 'deer' })
    sv.give('pan')
    sv.approach(f.x, f.z, 1.8)
    sv.game.pinnedTarget = `building:${f.id}`
  })
  for (let i = 0; i < 2; i++) {
    await waitTarget((t) => t.opts.includes('roast'))
    await key('KeyE')
    if (await page.$('[data-testid="opt-roast"]')) await clickTest('opt-roast')
    await S(() => window.__sv.pause(false))
    await finishActivity()
    await S(() => window.__sv.pause(true))
  }
  await simFor(2)
  const q7c = await questState('q07')
  await talkTo('q07', 'lucy')
  await questOpts('together', 'serve_together')
  const q7d = await questState('q07')
  const torches0 = await S(() => window.__sv.count('torch'))
  await talkTo('q07', 'mark')
  await questOpts('take_torch')
  const torches1 = await S(() => window.__sv.count('torch'))
  const q7held = await S(() => window.__sv.game.sim.state.npcs.filter((n) => n.questHold?.q === 'q07').length)
  check(results, '20. Q07 Six Bowls, One Pan: Mark holds for his round, 6 posts lit, 2 batches roasted, one table, Mark gives a torch; money constant',
    (await S(() => window.__q7ok)) && q7a.held === 'q07' && postIds.length === 6 && q7b.flags.markCovered && q7c.flags.cooked && q7d.status === 'done' && q7d.ending === 'together' && torches1 === torches0 + 1 && q7held === 0 && (await worldMoney()) === q7money,
    { q7a, posts: postIds.length, q7b: q7b?.flags.markCovered, q7c: q7c?.flags.cooked, q7d, torches: [torches0, torches1], q7held })

  // 21. QUEST-03 / G03 "Night Torches": Mark asks, the player keeps watch at the dark post at night, Hazel appears (held),
  // she tells Mark together with the player; Mark pays 15 c from the treasury.
  await S(() => {
    const sv = window.__sv
    sv.pause(false)
    window.__g3ok = sv.forceQuest('g03')
    sv.pause(true)
  })
  const g3money = await worldMoney()
  const g3p0 = await S(() => window.__sv.game.sim.player.money)
  await talkTo('g03', 'mark')
  await questOpts('watch')
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const st = sim.state.authoredQuests.g03
    const house = sim.building(sim.state.households[sim.human(st.cast.hazel).householdId].houseId)
    const post = [...sim.settlementBuildings(0, 'torchpost')].sort((a, b) => Math.hypot(a.x - house.x, a.z - house.z) - Math.hypot(b.x - house.x, b.z - house.z))[0]
    sv.setHour(1)
    sv.teleport(post.x + 3, post.z)
    window.__g3post = post.id
  })
  await simFor(45)
  const g3a = await S(() => {
    const sim = window.__sv.game.sim
    const st = sim.state.authoredQuests.g03
    const h = sim.human(st.cast.hazel)
    const post = sim.building(window.__g3post)
    return { stage: st.stage, held: h.questHold?.q, near: Math.hypot(h.x - post.x, h.z - post.z) < 4, lit: post.lit }
  })
  await talkTo('g03', 'hazel')
  await questOpts('path_together')
  await talkTo('g03', 'mark')
  await questOpts('close_together')
  const g3b = await questState('g03')
  const g3held = await S(() => window.__sv.game.sim.state.npcs.filter((n) => n.questHold?.q === 'g03').length)
  check(results, '21. G03 Night Torches: watch at night, Hazel at the post, tell Mark together, +15 c from the treasury, nobody left held',
    (await S(() => window.__g3ok)) && g3a.stage === 2 && g3a.held === 'g03' && g3a.near && g3a.lit === false && g3b.status === 'done' && g3b.ending === 'together' && (await S(() => window.__sv.game.sim.player.money)) === g3p0 + 15 && g3held === 0 && (await worldMoney()) === g3money,
    { g3a, g3b: g3b?.ending, held: g3held })

  // 22. QUEST-03 / G01 "Lost Lamb": Molly asks, Piers waits at the camp by the road, the finder's fee frees Pip (follows the
  // player), Molly takes her back and pays; Piers is gone afterwards.
  await S(() => {
    const sv = window.__sv
    sv.pause(false)
    window.__g1ok = sv.forceQuest('g01')
    sv.pause(true)
    sv.game.sim.player.money = Math.max(sv.game.sim.player.money, 40)
  })
  const g1money = await worldMoney()
  await talkTo('g01', 'molly')
  await questOpts('help', 'no_accusing')
  const g1a = await questState('g01')
  await talkTo('g01', 'piers')
  await questOpts('paid')
  const g1b = await S(() => {
    const sim = window.__sv.game.sim
    const st = sim.state.authoredQuests.g01
    const pip = sim.actor(st.cast.pip)
    return { stage: st.stage, resolved: st.flags.resolved, follows: pip.questFollow === sim.player.id, held: !!pip.questHold }
  })
  await S(() => {
    const sim = window.__sv.game.sim
    const st = sim.state.authoredQuests.g01
    const molly = sim.human(st.cast.molly)
    const pip = sim.actor(st.cast.pip)
    pip.x = molly.x + 1.5
    pip.z = molly.z
    sim.actors.update(pip)
  })
  await talkTo('g01', 'molly')
  await questOpts('home_paid')
  const g1c = await questState('g01')
  await key('KeyJ')
  const journalFinished = await page.$eval('[data-testid="journal-finished"]', (e) => e.textContent).catch(() => '')
  await clickTest('panel-close')
  const g1after = await S(() => ({ visitors: window.__sv.game.sim.state.npcs.filter((n) => n.questOwner).length, held: window.__sv.game.sim.state.npcs.filter((n) => n.questHold?.q === 'g01').length + window.__sv.game.sim.state.animals.filter((a) => a.questHold?.q === 'g01' || a.questFollow !== undefined).length }))
  check(results, '22. G01 Lost Lamb: accept, Piers (visitor, held), the fee frees Pip, Molly pays; Piers gone, nothing held; journal lists it as finished',
    (await S(() => window.__g1ok)) && g1a.status === 'active' && g1a.stage === 2 && g1b.resolved === 'paid' && g1b.follows && !g1b.held && g1c.status === 'done' && g1c.ending === 'paid' && g1after.visitors === 0 && g1after.held === 0 && /Lost Lamb/.test(journalFinished) && (await worldMoney()) === g1money,
    { g1a: g1a?.stage, g1b, g1c: g1c?.ending, g1after, journal: journalFinished.slice(0, 40) })
  await S(() => window.__sv.pause(false))

  // 13. UI-05: settings (quality switch without restart, volume saved), named save, new game from the in-game menu.
  const openMenu = async () => {
    for (let i = 0; i < 3 && !(await page.$('[data-testid="menu-settings"]')); i++) await key('Escape', 600)
  }
  await openMenu()
  await clickTest('menu-settings')
  await clickTest('quality-high', 800)
  await page.fill('[data-testid="volume-effects"]', '0.25')
  await page.waitForTimeout(300)
  const st = await S(() => ({ q: window.__sv.game.renderer.quality, shadows: window.__sv.game.renderer.renderer.shadowMap.enabled, saved: JSON.parse(localStorage.getItem('sv-settings') ?? '{}') }))
  await shot(page, 'acc-13-settings')
  await clickTest('quality-low', 800)
  const q2 = await S(() => ({ q: window.__sv.game.renderer.quality, shadows: window.__sv.game.renderer.renderer.shadowMap.enabled }))
  check(results, '13. ustawienia: jakość bez restartu + głośność zapisana', st.q === 'high' && st.shadows && q2.q === 'low' && !q2.shadows && st.saved.volume?.effects === 0.25, { st, q2 })
  await clickTest('panel-close')
  await openMenu()
  await page.fill('[data-testid="save-name"]', 'Moja wyprawa')
  await clickTest('menu-save-as', 1500)
  const named = await S(() => ({ slot: window.__sv.game.slot, name: window.__sv.game.saveName }))
  await openMenu()
  await clickTest('menu-new-game')
  const calBefore = await S(() => window.__sv.game.sim.state.time.cal)
  await clickTest('new-game-same', 500)
  await page.waitForSelector('[data-testid=status-bars]', { timeout: 120000 })
  await page.waitForFunction((c) => window.__sv && window.__sv.game.sim.state.time.cal < c, calBefore, { timeout: 60000 })
  const fresh = await S(() => ({ cal: window.__sv.game.sim.state.time.cal, money: window.__sv.game.sim.player.money, slot: window.__sv.game.slot }))
  check(results, '13. nowa gra z menu gry (ten sam świat)', fresh.cal < calBefore && fresh.money === 150 && fresh.slot !== named.slot, { calBefore, fresh })
  await openMenu()
  await page.click('[data-testid="menu-quit"]')
  await page.waitForSelector('[data-testid=load-save]', { timeout: 20000 })
  const listed = !!(await page.$('[data-slot-name="Moja wyprawa"]'))
  await shot(page, 'acc-13-saves')
  check(results, '13. zapis pod nazwą widoczny na liście zapisów', named.name === 'Moja wyprawa' && listed, { named, listed })
} catch (e) {
  check(results, 'exception', false, String(e).slice(0, 400))
  await shot(page, 'acc-error')
}
await browser.close()
process.exit(report('acceptance', results, logs) ? 0 : 1)
