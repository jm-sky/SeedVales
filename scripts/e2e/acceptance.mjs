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
    const t = await S(() => ({ label: window.__sv.game.target?.label ?? '', opts: window.__sv.game.options.map((o) => o.id) }))
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

  // 5. Start and finish a simple construction (campfire) through the build panel.
  await S(() => {
    const sv = window.__sv
    const o = sv.openSpot(30)
    sv.teleport(o.x, o.z)
    sv.give('stone', 4)
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
    return q ? { id: q.id, status: q.status, b: q.buildingId, cal: sim.state.time.cal } : null
  })
  check(results, '8a. problem w symulacji: gniazdo szczurów → ogłoszenie', !!questInfo, questInfo)
  if (questInfo) {
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const nb = sim.state.buildings.find((b) => b.kind === 'noticeboard' && b.settlementId === 0)
      sv.pause(true)
      sv.approach(nb.x, nb.z, 1.6)
      sv.setHour(12)
    })
    await waitTarget((t) => t.opts.includes('quests'))
    await key('KeyE')
    if (await page.$('[data-testid="opt-quests"]')) await clickTest('opt-quests')
    await clickTest('accept-rats')
    await shot(page, 'acc-08-quest')
    await clickTest('panel-close')
    // Kill rats: approach each rat and click (UI attack).
    await S(() => {
      window.__sv.pause(false)
      window.__sv.game.sim.player.eq.main = { id: 'club', qty: 1, dur: 200 }
    })
    for (let i = 0; i < 40; i++) {
      const left = await S((bid) => {
        const sv = window.__sv
        const sim = sv.game.sim
        const b = sim.building(bid)
        const rat = sim.state.animals.find((a) => a.species === 'rat' && Math.hypot(a.x - b.x, a.z - b.z) < 60)
        if (!rat) return 0
        sv.pause(false)
        sv.simStep(1.2)
        sv.pause(true)
        if (rat.vitals.dead) return 1
        sv.approach(rat.x, rat.z, 0.9)
        return 1
      }, questInfo.b)
      if (!left) break
      await page.mouse.click(640, 360)
      await page.waitForTimeout(80)
      if (i === 5) console.log('rat loop', JSON.stringify(await S(() => Object.fromEntries(Object.entries(window.__sv.perf.report().counters).filter(([k]) => k.startsWith('combat'))))))
    }
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
      await waitTarget((t) => t.opts.includes('repair'))
      await key('KeyE')
      if (await page.$('[data-testid="opt-repair"]')) await clickTest('opt-repair')
      await S(() => window.__sv.pause(false))
      await finishActivity()
      await S(() => window.__sv.pause(true))
    }
    await S(() => {
      window.__sv.pause(false)
      window.__sv.simStep(15)
    })
    const q = await S((id) => {
      const sim = window.__sv.game.sim
      const qq = sim.state.quests.find((x) => x.id === id)
      return { status: qq.status, kills: qq.kills, sid: qq.settlementId, rep: sim.state.settlements[qq.settlementId].rep, nest: !!sim.building(qq.buildingId).ratNest, dur: sim.building(qq.buildingId).durability }
    }, questInfo.id)
    check(results, '8b. zadanie ukończone i reputacja wzrosła', q.status === 'done' && q.rep.helpfulness >= 12, q)
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
} catch (e) {
  check(results, 'exception', false, String(e).slice(0, 400))
  await shot(page, 'acc-error')
}
await browser.close()
process.exit(report('acceptance', results, logs) ? 0 : 1)
