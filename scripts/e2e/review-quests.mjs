/**
 * review-quests: board quest "rats in the warehouse" end to end now; authored quests (quests--001) later.
 * Evidence: dialog lines shown, journal text per stage, rewards and where they come from (treasury, reputation, opinion).
 * Setup shortcut (recorded): the warehouse of settlement 0 is neglected (durability 20, rat nest) so the guard posts the quest
 * the way worldSystems/questSystem would after days of neglect; the sim then runs until the notice appears.
 */
const panelText = (s) => s.page.locator('[data-testid=panel]').innerText().catch(() => null)

export default async function (rt) {
  const s = await rt.start()
  const { S } = s
  await S(() => {
    window.__sv.pause(true)
    window.__sv.setHour(10)
    window.__sv.give('hammer', 1)
    window.__sv.give('branch', 6)
    window.__sv.give('club', 1)
  })
  await s.page.waitForTimeout(1500)

  await rt.step('neglected-warehouse-posts-quest', async () => {
    const r = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const wh = rv.bld('warehouse')
      if (!wh) return { ok: false, reason: 'no warehouse in settlement 0' }
      const { nestTag } = await rv.mod('sim/queries')
      wh.durability = 20
      wh.ratNest = { strength: 2, since: sim.state.time.cal }
      rv.stand(wh.x, wh.z, 8)
      const before = { treasury: rv.treasury()[0], money: rv.coins(), rep: { ...sim.state.settlements[0].rep } }
      let hours = 0
      let quest = null
      while (hours < 12 && !quest) {
        rv.advance(150)
        hours++
        quest = sim.state.quests.find((q) => q.kind === 'rats' && q.buildingId === wh.id)
      }
      const ratCount = sim.actors.query(wh.x, wh.z, 60).filter((a) => a.kind === 'animal' && a.species === 'rat').length
      return { whId: wh.id, nest: nestTag(wh.id), gameHoursUntilPosted: quest ? hours : null, ratCountNearby: ratCount, quest: quest && { title: quest.title, desc: quest.desc, reward: quest.reward, killsNeeded: quest.killsNeeded, status: quest.status, giver: sim.human(quest.giverId)?.name }, before, log: rv.msgs(3) }
    })
    if (r.ok === false) return r
    rt.note('ratQuest', r)
    if (!r.quest) return { ok: false, reason: 'the guard did not post the quest within 12 game hours', ...r }
    await s.page.waitForTimeout(800)
    return { ...r, file: await s.snap('warehouse-with-rats') }
  })

  await rt.step('read-notice-board', async () => {
    const info = rt.notes.ratQuest
    if (!info?.quest) return { ok: false, reason: 'no quest posted' }
    const nb = await S(async () => {
      const rv = window.__rv
      const b = rv.bld('noticeboard')
      if (!b) return null
      rv.stand(b.x, b.z, 1.8)
      return { open: await rv.choose({ type: 'building', id: b.id }, 'quests') }
    })
    if (!nb) return { ok: false, reason: 'no notice board' }
    await s.page.waitForTimeout(500)
    const text = await panelText(s)
    return { panelText: text, file: await s.snap('notice-board-with-quest') }
  })

  await rt.step('accept-quest', async () => {
    const btn = s.page.locator('[data-testid="accept-rats"]')
    if (!(await btn.count())) return { ok: false, reason: 'no accept-rats button in the quests panel' }
    await btn.first().click()
    await s.page.waitForTimeout(500)
    const r = await S(() => ({ toast: window.__sv.game.toast, status: window.__sv.game.sim.state.quests.map((q) => `${q.kind}:${q.status}`), log: window.__rv.msgs(3) }))
    const text = await panelText(s)
    const file = await s.snap('quest-accepted-journal')
    await S(() => window.__sv.game.closePanel())
    return { ...r, journalText: text, file }
  })

  await rt.step('talk-to-quest-giver', async () => {
    const info = rt.notes.ratQuest
    if (!info?.quest) return { ok: false, reason: 'no quest posted' }
    const r = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const q = sim.state.quests.find((x) => x.kind === 'rats')
      const g = sim.human(q.giverId)
      if (!g) return null
      rv.stand(g.x, g.z, 1.6)
      return { id: g.id, name: g.name, options: await rv.opts({ type: 'npc', id: g.id }), talk: await rv.choose({ type: 'npc', id: g.id }, 'talk'), opinionBefore: g.opinion }
    })
    if (!r) return { ok: false, reason: 'quest giver not found' }
    await s.page.waitForTimeout(500)
    const text = await panelText(s)
    const file = await s.snap('talk-to-giver')
    await S(() => window.__sv.game.closePanel())
    return { ...r, dialogText: text, file }
  })

  await rt.step('inspect-nest-and-kill-rats', async () => {
    const info = rt.notes.ratQuest
    if (!info?.quest) return { ok: false, reason: 'no quest posted' }
    const insp = await S(async (id) => {
      const rv = window.__rv
      const wh = window.__sv.game.sim.building(id)
      rv.stand(wh.x, wh.z, 4)
      return rv.choose({ type: 'building', id }, 'inspect_nest')
    }, info.whId)
    const fight = await S(async (id) => {
      const rv = window.__rv
      const sv = window.__sv
      const sim = sv.game.sim
      const wh = sim.building(id)
      const q = sim.state.quests.find((x) => x.kind === 'rats')
      sv.game.setPrimaryWeapon('melee', 'club')
      sv.game.switchWeapon('melee')
      rv.heal()
      sim.paused = false
      const progress = []
      let t = 0
      let swings = 0
      while (t < 150 && q.kills < q.killsNeeded) {
        const rats = sim.actors.query(wh.x, wh.z, 40).filter((a) => a.kind === 'animal' && a.species === 'rat' && !a.vitals.dead)
        if (!rats.length) {
          sv.simStep(1)
          t += 1
          if (t % 20 === 0 && !sim.actors.query(wh.x, wh.z, 40).some((a) => a.species === 'rat')) break
          continue
        }
        const r = rats.sort((a, b) => Math.hypot(a.x - sim.player.x, a.z - sim.player.z) - Math.hypot(b.x - sim.player.x, b.z - sim.player.z))[0]
        sv.approach(r.x, r.z, 1.0)
        for (let i = 0; i < 12 && !r.vitals.dead; i++) {
          sim.player.attackReadyAt = 0
          sv.face(r.x, r.z)
          const k0 = q.kills
          sv.game.attack()
          swings++
          sv.simStep(0.2)
          t += 0.2
          if (q.kills > k0) progress.push({ t: rv.round(t, 1), kills: q.kills })
        }
        if (rv.hp(sim.player.vitals) < 40) rv.heal()
      }
      sim.paused = true
      return { kills: q.kills, needed: q.killsNeeded, swings, seconds: rv.round(t, 1), progress, status: q.status, ratsLeft: sim.actors.query(wh.x, wh.z, 40).filter((a) => a.species === 'rat' && !a.vitals.dead).length, log: rv.msgs(3) }
    }, info.whId)
    await s.page.waitForTimeout(500)
    return { inspectNest: insp, fight, file: await s.snap('rats-killed') }
  })

  await rt.step('repair-and-complete', async () => {
    const info = rt.notes.ratQuest
    if (!info?.quest) return { ok: false, reason: 'no quest posted' }
    const before = await S(() => {
      const sim = window.__sv.game.sim
      const g = sim.human(sim.state.quests.find((x) => x.kind === 'rats').giverId)
      return { treasury: window.__rv.treasury()[0], money: window.__rv.coins(), rep: { ...sim.state.settlements[0].rep }, giverOpinion: g?.opinion }
    })
    const rep = await S(async (id) => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const wh = sim.building(id)
      rv.stand(wh.x, wh.z, 3)
      const out = { options: await rv.opts({ type: 'building', id }), durabilityBefore: wh.durability }
      out.repairs = []
      // One repair adds ~30%; the nest only goes away above 60% durability, so repair until it is gone (max 5).
      for (let i = 0; i < 5 && wh.ratNest; i++) {
        window.__sv.give('branch', 2)
        const c = await rv.choose({ type: 'building', id }, 'repair')
        const f = rv.finish()
        out.repairs.push({ choose: c.ok ? 'started' : c.reason, playS: f.playS, durability: rv.round(wh.durability, 1), nest: !!wh.ratNest, toast: window.__sv.game.toast })
      }
      out.durabilityAfter = rv.round(wh.durability, 1)
      out.nestAfter = !!wh.ratNest
      out.log = rv.msgs(3)
      return out
    }, info.whId)
    // Let the quest system notice (it runs on the simulation tick).
    const after = await S(() => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      rv.advance(60)
      const q = sim.state.quests.find((x) => x.kind === 'rats')
      const g = sim.human(q.giverId)
      return { status: q.status, reward: q.reward, treasury: rv.treasury()[0], money: rv.coins(), rep: { ...sim.state.settlements[0].rep }, giverOpinion: g?.opinion, log: rv.msgs(4) }
    })
    await s.page.waitForTimeout(500)
    await S(() => window.__sv.game.togglePanel('quests'))
    await s.page.waitForTimeout(500)
    const journal = await panelText(s)
    const file = await s.snap('quest-completed-journal')
    await S(() => window.__sv.game.closePanel())
    return { before, repair: rep, after, rewardSource: `treasury ${before.treasury} -> ${after.treasury}; player money ${before.money} -> ${after.money}`, journalText: journal, file }
  })

  // TODO(quests--001): walk each authored quest's main path once the quest engine (docs/design/quests-engine.md) is in the tree.
  // The probe below only records whether the engine is present and which topics each NPC offers. When it lands, add one rt.step per
  // authored quest, each walking the main path:
  //   1. stand next to the quest giver, rv.choose({ type: 'npc', id }, 'talk'), screenshot the dialog (topics visible),
  //   2. click quest-topic-<questId>, then quest-opt-<optionId> in turn; record the dialog line shown after each choice (panel innerText),
  //   3. open the journal (key J / game.journal()) and record its text for every quest stage,
  //   4. do the stage objective via __sv / rv helpers (deliver item, kill, go to) and record rewards: player money/items before/after,
  //      the treasury or NPC purse they came out of, reputation and opinion deltas (state.authoredQuests holds the quest state).
  await rt.step('authored-quests-probe', async () => {
    const r = await S(() => {
      const g = window.__sv.game
      if (typeof g.questTopics !== 'function') return { present: false }
      const sim = g.sim
      const topics = []
      for (const n of sim.state.npcs) {
        const t = g.questTopics(n.id)
        if (t?.length) topics.push({ npc: n.name, profession: n.profession ?? null, topics: t.map((x) => x.id ?? x.questId ?? JSON.stringify(x).slice(0, 60)) })
      }
      return { present: true, npcsWithTopics: topics }
    })
    if (!r.present) return { ok: false, reason: 'authored quest engine not present in this build (game.questTopics missing); TODO block in review-quests.mjs' }
    return r
  })
}
