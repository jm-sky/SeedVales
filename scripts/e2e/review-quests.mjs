/**
 * review-quests: board quest "rats in the warehouse" end to end, then the main path of each authored quest (quests--001: Q03, Q07, G03, G01).
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
      window.__ratWh = wh.id
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
    // Several boards' rats notices can be listed (other settlements too): accept the one for this warehouse's quest.
    const title = rt.notes.ratQuest?.quest?.title ?? ''
    const all = s.page.locator('[data-testid="accept-rats"]')
    if (!(await all.count())) return { ok: false, reason: 'no accept-rats button in the quests panel' }
    const idx = await s.page.evaluate((t) => {
      const btns = [...document.querySelectorAll('[data-testid="accept-rats"]')]
      return Math.max(0, btns.findIndex((b) => {
        let el = b.parentElement
        while (el && el.querySelectorAll('[data-testid="accept-rats"]').length === 1) {
          if (el.textContent.includes(t)) return true
          el = el.parentElement
        }
        return false
      }))
    }, title)
    await all.nth(idx).click()
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
      const q = sim.state.quests.find((x) => x.kind === 'rats' && x.buildingId === window.__ratWh)
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
      const q = sim.state.quests.find((x) => x.kind === 'rats' && x.buildingId === window.__ratWh)
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
      const g = sim.human(sim.state.quests.find((x) => x.kind === 'rats' && x.buildingId === window.__ratWh).giverId)
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
      const q = sim.state.quests.find((x) => x.kind === 'rats' && x.buildingId === window.__ratWh)
      const g = sim.human(q.giverId)
      // Rats of this nest still alive anywhere (the quest resolves only when none are left, sim/quests.ts).
      const b = sim.building(q.buildingId)
      const nestRatsAlive = sim.state.animals.filter((a) => a.species === 'rat' && !a.vitals.dead && a.denId === `nest:${q.buildingId}`).map((a) => ({ id: a.id, distFromBuilding: Math.round(Math.hypot(a.x - b.x, a.z - b.z)) }))
      return { status: q.status, kills: q.kills, reward: q.reward, nestRatsAlive, treasury: rv.treasury()[0], money: rv.coins(), rep: { ...sim.state.settlements[0].rep }, giverOpinion: g?.opinion, log: rv.msgs(4) }
    })
    await s.page.waitForTimeout(500)
    await S(() => window.__sv.game.togglePanel('quests'))
    await s.page.waitForTimeout(500)
    const journal = await panelText(s)
    const file = await s.snap('quest-completed-journal')
    await S(() => window.__sv.game.closePanel())
    return { before, repair: rep, after, rewardSource: `treasury ${before.treasury} -> ${after.treasury}; player money ${before.money} -> ${after.money}`, journalText: journal, file }
  })

  // Authored quests (quests--001, docs/design/quests-engine.md): each main path through the UI dialog (talk → quest-topic-<id> →
  // quest-opt-<id>), the journal (key J) after every stage, world objectives through __sv (as acceptance.mjs steps 19–22).
  // The quests are offered with __sv.forceQuest (their natural start conditions are recorded first by the probe).
  const page = s.page
  const sleep = (ms) => page.waitForTimeout(ms)
  const key = async (k, wait = 600) => {
    await page.keyboard.press(k)
    await sleep(wait)
  }
  const clickTest = async (id, wait = 500) => {
    await page.click(`[data-testid="${id}"]`, { timeout: 8000 })
    await sleep(wait)
  }
  const waitTarget = async (pred) => {
    for (let i = 0; i < 20; i++) {
      const t = await S(() => {
        const g = window.__sv.game
        return { label: g.target?.label ?? '', ref: g.target ? `${g.target.ref.type}:${g.target.ref.id}` : '', opts: g.options.map((o) => o.id) }
      })
      if (t.label && (!pred || pred(t))) return t
      await sleep(250)
    }
    return null
  }
  const questState = (id) => S((q) => {
    const st = window.__sv.game.sim.state.authoredQuests[q]
    return st ? { status: st.status, stage: st.stage, ending: st.ending ?? null, flags: { ...st.flags } } : null
  }, id)
  /** Money/rep/opinion snapshot of the quest cast (reward sources). */
  const ledger = (id) => S((q) => {
    const sim = window.__sv.game.sim
    const st = sim.state.authoredQuests[q]
    const cast = {}
    for (const [slot, nid] of Object.entries(st?.cast ?? {})) {
      const h = sim.human(nid)
      if (h) cast[slot] = { name: h.name, money: h.money, opinion: Math.round(h.opinion * 10) / 10 }
    }
    const worldMoney = sim.state.player.money + sim.state.npcs.reduce((a, n) => a + n.money, 0) + sim.state.settlements.reduce((a, t) => a + t.treasury, 0)
    return { player: sim.player.money, treasury0: sim.state.settlements[0].treasury, rep0: { ...sim.state.settlements[0].rep }, cast, worldMoney, inv: sim.player.inv.items.map((x) => `${x.id}x${x.qty}`).join(' ') }
  }, id)
  const dialogText = () => page.locator('[data-testid="quest-dialog"]').innerText({ timeout: 2000 }).catch(() => null)
  /** Walk up to a cast NPC, open the dialog through E → Talk → quest topic; screenshot the topic's first node. */
  const talkTo = async (rec, q, slot, tag) => {
    const id = await S(([qq, sl]) => {
      const sv = window.__sv
      const sim = sv.game.sim
      const n = sim.human(sim.state.authoredQuests[qq].cast[sl])
      if (!n) return null
      sv.pause(true)
      sv.approach(n.x, n.z, 1.4)
      sv.face(n.x, n.z)
      sv.game.pinnedTarget = `npc:${n.id}`
      return n.id
    }, [q, slot])
    if (id == null) throw new Error(`cast slot ${slot} of ${q} missing`)
    await waitTarget((t) => t.ref === `npc:${id}` && t.opts.includes('talk'))
    await key('KeyE')
    await clickTest('opt-talk')
    const topics = await page.locator('[data-testid^="quest-topic-"]').allInnerTexts().catch(() => [])
    await clickTest(`quest-topic-${q}`)
    rec.push({ talk: `${q}/${slot}`, topics, line: await dialogText(), file: await s.snap(`${q}-${tag}-dialog`) })
  }
  /** Pick options in order; record the node shown after each; screenshot the last node; close the panel. */
  const opts = async (rec, q, tag, ...ids) => {
    for (const oid of ids) {
      await clickTest(`quest-opt-${oid}`)
      rec.push({ chose: oid, after: await dialogText() })
    }
    rec.at(-1).file = await s.snap(`${q}-${tag}-after`)
    await clickTest('panel-close')
  }
  const journal = async (rec, q, tag) => {
    await key('KeyJ')
    const text = await panelText(s)
    const file = await s.snap(`${q}-${tag}-journal`)
    await clickTest('panel-close').catch(() => {})
    rec.push({ journal: tag, text, state: await questState(q), file })
  }
  const simFor = (sec) => S((t) => {
    window.__sv.pause(false)
    window.__sv.simStep(t)
    window.__sv.pause(true)
  }, sec)
  const castNames = (q) => S((qq) => {
    const sim = window.__sv.game.sim
    const st = sim.state.authoredQuests[qq]
    return st && Object.fromEntries(Object.entries(st.cast).map(([k, v]) => [k, (sim.human(v) ?? sim.actor(v))?.name ?? v]))
  }, q)
  const force = (q) => S((qq) => {
    const sv = window.__sv
    sv.pause(false)
    const ok = sv.forceQuest(qq)
    sv.pause(true)
    return ok
  }, q)
  const walk = (name, fn) => rt.step(name, async () => {
    const rec = []
    try {
      const extra = (await fn(rec)) ?? {}
      return { ...extra, trace: rec }
    } catch (e) {
      return { ok: false, reason: `exception: ${String(e).slice(0, 300)}`, trace: rec, file: await s.snap(`${name}-failed`).catch(() => null) }
    }
  })
  const after = async (q) => ({ final: await questState(q), held: await S((qq) => window.__sv.game.sim.state.npcs.filter((n) => n.questHold?.q === qq).length, q), log: await S(() => window.__rv.msgs(6)) })

  await rt.step('authored-quests-natural-offer', async () => {
    const r = await S(() => {
      const g = window.__sv.game
      if (typeof g.questTopics !== 'function') return { present: false }
      const sim = g.sim
      const topics = []
      for (const n of sim.state.npcs) {
        const t = g.questTopics(n.id)
        if (t?.length) topics.push({ npc: n.name, profession: n.profession ?? null, topics: t.map((x) => `${x.questId}:${x.label}`) })
      }
      return { present: true, day: Math.floor(sim.state.time.cal / 86400), authored: Object.fromEntries(Object.entries(sim.state.authoredQuests ?? {}).map(([k, v]) => [k, v.status])), npcsWithTopics: topics }
    })
    if (!r.present) return { ok: false, reason: 'authored quest engine not present (game.questTopics missing)' }
    return r
  })

  // Q03 "A Roof Before Rain": Miles offers (house durability < 60), torch at the house, plan with Miles, agree with Lucy, repair, thanks.
  await walk('q03-roof-before-rain', async (rec) => {
    if (!(await force('q03'))) return { ok: false, reason: 'forceQuest(q03) refused' }
    await S(() => {
      const sim = window.__sv.game.sim
      const st = sim.state.authoredQuests.q03
      const house = sim.building(sim.state.households[sim.human(st.cast.miles).householdId].houseId)
      house.durability = 40
      window.__q3house = house.id
    })
    const l0 = await ledger('q03')
    await talkTo(rec, 'q03', 'miles', '1-offer')
    await opts(rec, 'q03', '1-accept', 'show_damage')
    await journal(rec, 'q03', '1-accepted')
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const h = sim.building(window.__q3house)
      sim.player.eq.off = { id: 'torch', qty: 1, dur: 60 }
      sv.teleport(h.x + h.hw + 2, h.z)
      sv.face(h.x, h.z)
    })
    await simFor(8)
    await sleep(600)
    rec.push({ afterTorch: await questState('q03'), file: await s.snap('q03-2-beam-with-torch') })
    await journal(rec, 'q03', '2-beam')
    await talkTo(rec, 'q03', 'miles', '3-plan')
    await opts(rec, 'q03', '3-plan', 'plan_repair')
    await talkTo(rec, 'q03', 'lucy', '4-agree')
    await opts(rec, 'q03', '4-agree', 'say_repair', 'agree')
    await journal(rec, 'q03', '4-work')
    // The repair itself is a recorded shortcut (the repair loop is covered by the rats steps above and review-build).
    await S(() => {
      window.__sv.game.sim.building(window.__q3house).durability = 95
    })
    await simFor(2)
    await talkTo(rec, 'q03', 'lucy', '5-thanks')
    await opts(rec, 'q03', '5-thanks', 'take_coin_repair')
    await journal(rec, 'q03', '5-done')
    return { cast: await castNames('q03'), ledgerBefore: l0, ledgerAfter: await ledger('q03'), ...(await after('q03')) }
  })

  // Q07 "Six Bowls, One Pan": Lucy invites, stores checked, Mark's dusk round (all posts), 2 roast batches with a pan, one table, torch.
  await walk('q07-six-bowls-one-pan', async (rec) => {
    if (!(await force('q07'))) return { ok: false, reason: 'forceQuest(q07) refused' }
    await S(() => window.__sv.give('flint', 1))
    const l0 = await ledger('q07')
    await talkTo(rec, 'q07', 'lucy', '1-offer')
    await opts(rec, 'q07', '1-accept', 'accept')
    await journal(rec, 'q07', '1-accepted')
    await talkTo(rec, 'q07', 'lucy', '2-stores')
    await opts(rec, 'q07', '2-stores', 'examine_meat')
    await S(() => window.__sv.setHour(17.5))
    await talkTo(rec, 'q07', 'mark', '3-round')
    await opts(rec, 'q07', '3-round', 'round')
    await simFor(2)
    await journal(rec, 'q07', '3-round')
    const postIds = await S(() => {
      const sim = window.__sv.game.sim
      window.__sv.setHour(17.5)
      const posts = sim.settlementBuildings(0, 'torchpost')
      for (const b of posts) b.lit = false
      return posts.map((b) => b.id)
    })
    let lit = 0
    for (const id of postIds) {
      await S((bid) => {
        const sv = window.__sv
        const b = sv.game.sim.building(bid)
        sv.approach(b.x, b.z, 1.6)
        sv.face(b.x, b.z)
        sv.game.pinnedTarget = `building:${bid}`
      }, id)
      if (await waitTarget((t) => t.ref === `building:${id}` && t.opts.includes('light'))) {
        await key('KeyE', 400)
        lit++
      }
    }
    await simFor(2)
    await sleep(600)
    rec.push({ posts: postIds.length, litByE: lit, file: await s.snap('q07-4-posts-lit-dusk') })
    await journal(rec, 'q07', '4-round-done')
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
    const batches = []
    for (let i = 0; i < 2; i++) {
      await waitTarget((t) => t.opts.includes('roast'))
      await key('KeyE')
      if (await page.$('[data-testid="opt-roast"]')) await clickTest('opt-roast')
      batches.push(await S(() => {
        window.__sv.pause(false)
        const r = window.__rv.finish()
        window.__sv.pause(true)
        return { ...r, cooked: window.__sv.count('cooked_meat'), raw: window.__sv.count('raw_meat') }
      }))
    }
    await simFor(2)
    rec.push({ batches, state: await questState('q07'), file: await s.snap('q07-5-roasted') })
    await talkTo(rec, 'q07', 'lucy', '6-meal')
    await opts(rec, 'q07', '6-meal', 'together', 'serve_together')
    await journal(rec, 'q07', '6-done')
    const t0 = await S(() => window.__sv.count('torch'))
    await talkTo(rec, 'q07', 'mark', '7-torch')
    await opts(rec, 'q07', '7-torch', 'take_torch')
    const t1 = await S(() => window.__sv.count('torch'))
    return { cast: await castNames('q07'), torches: [t0, t1], ledgerBefore: l0, ledgerAfter: await ledger('q07'), ...(await after('q07')) }
  })

  // G03 "Night Torches": Mark asks, watch at the dark post at night, Hazel caught, talk to her, tell Mark together, 15 c.
  await walk('g03-night-torches', async (rec) => {
    if (!(await force('g03'))) return { ok: false, reason: 'forceQuest(g03) refused' }
    const l0 = await ledger('g03')
    await talkTo(rec, 'g03', 'mark', '1-offer')
    await opts(rec, 'g03', '1-accept', 'watch')
    await journal(rec, 'g03', '1-accepted')
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const st = sim.state.authoredQuests.g03
      const house = sim.building(sim.state.households[sim.human(st.cast.hazel).householdId].houseId)
      const post = [...sim.settlementBuildings(0, 'torchpost')].sort((a, b) => Math.hypot(a.x - house.x, a.z - house.z) - Math.hypot(b.x - house.x, b.z - house.z))[0]
      sv.setHour(1)
      sv.teleport(post.x + 3, post.z)
      sv.face(post.x, post.z)
      window.__g3post = post.id
    })
    await simFor(45)
    const caught = await S(() => {
      const sim = window.__sv.game.sim
      const st = sim.state.authoredQuests.g03
      const h = sim.human(st.cast.hazel)
      const post = sim.building(window.__g3post)
      return { stage: st.stage, held: h.questHold?.q ?? null, distToPost: Math.round(Math.hypot(h.x - post.x, h.z - post.z) * 10) / 10, postLit: post.lit, log: window.__rv.msgs(3) }
    })
    await sleep(800)
    rec.push({ nightWatch: caught, file: await s.snap('g03-2-night-post-hazel') })
    await journal(rec, 'g03', '2-caught')
    await talkTo(rec, 'g03', 'hazel', '3-hazel')
    await opts(rec, 'g03', '3-hazel', 'path_together')
    await talkTo(rec, 'g03', 'mark', '4-mark')
    await opts(rec, 'g03', '4-mark', 'close_together')
    await journal(rec, 'g03', '4-done')
    return { cast: await castNames('g03'), ledgerBefore: l0, ledgerAfter: await ledger('g03'), ...(await after('g03')) }
  })

  // G01 "Lost Lamb": Molly asks, Piers at the camp by the road holds Pip, pay the finder's fee, Pip follows, Molly pays back.
  await walk('g01-lost-lamb', async (rec) => {
    if (!(await force('g01'))) return { ok: false, reason: 'forceQuest(g01) refused' }
    await S(() => {
      const p = window.__sv.game.sim.player
      p.money = Math.max(p.money, 40)
    })
    const l0 = await ledger('g01')
    await talkTo(rec, 'g01', 'molly', '1-offer')
    await opts(rec, 'g01', '1-accept', 'help', 'no_accusing')
    await journal(rec, 'g01', '1-accepted')
    const camp = await S(() => {
      const sim = window.__sv.game.sim
      const st = sim.state.authoredQuests.g01
      const piers = sim.human(st.cast.piers)
      const pip = sim.actor(st.cast.pip)
      const s0 = sim.world.settlements[0]
      return { pipNearPiers: piers && pip ? Math.round(Math.hypot(pip.x - piers.x, pip.z - piers.z) * 10) / 10 : null, campFromSettlementCentre: piers ? Math.round(Math.hypot(piers.x - s0.x, piers.z - s0.z)) : null }
    })
    await talkTo(rec, 'g01', 'piers', '2-piers')
    rec.at(-1).camp = camp
    await opts(rec, 'g01', '2-pay', 'paid')
    await sleep(500)
    rec.push({ state: await questState('g01'), file: await s.snap('g01-2-camp-after-pay') })
    await journal(rec, 'g01', '2-paid')
    await S(() => {
      const sim = window.__sv.game.sim
      const st = sim.state.authoredQuests.g01
      const molly = sim.human(st.cast.molly)
      const pip = sim.actor(st.cast.pip)
      pip.x = molly.x + 1.5
      pip.z = molly.z
      sim.actors.update(pip)
    })
    await talkTo(rec, 'g01', 'molly', '3-home')
    await opts(rec, 'g01', '3-home', 'home_paid')
    await journal(rec, 'g01', '3-done')
    return { cast: await castNames('g01'), ledgerBefore: l0, ledgerAfter: await ledger('g01'), visitorsLeft: await S(() => window.__sv.game.sim.state.npcs.filter((n) => n.questOwner).length), ...(await after('g01')) }
  })

}
