/**
 * review-start: new game, first 2 game hours — look around, needs over time, eat, drink at the well,
 * read the notice board, sleep a night in the inn. Evidence: needs per game hour, message log, HUD at each step.
 * 1 game hour = 150 gameplay seconds (calendar speed 24x).
 */
const HOUR_S = 150

export default async function (rt) {
  const s = await rt.start()
  const { S } = s
  await S(() => window.__sv.pause(true))
  await s.page.waitForTimeout(1500)

  await rt.step('spawn', async () => {
    const info = await S(() => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const p = sim.player
      const st = rv.settle(0)
      return {
        clock: rv.clock(),
        needs: rv.needs(),
        money: p.money,
        inventory: p.inv.items.map((i) => `${i.id}x${i.qty}`),
        equipped: { main: p.eq.main?.id, off: p.eq.off?.id },
        hp: rv.round(rv.hp(p.vitals), 1),
        settlement: { name: st.name, distanceM: Math.round(Math.hypot(st.x - p.x, st.z - p.z)) },
        target: window.__sv.game.target?.label ?? null,
        options: window.__sv.game.options.map((o) => o.label),
        weather: sim.state.weather.kind,
        messages: rv.msgs(8),
      }
    })
    return { ...info, file: await s.snap('spawn-hud') }
  })

  await rt.step('look-around', async () => {
    const files = []
    for (const [i, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) {
      await S((y) => window.__rv.look(y + window.__sv.game.sim.player.rot, 0.25, 9), yaw)
      await s.page.waitForTimeout(1200)
      files.push(await s.snap(`look-${i}`))
    }
    return { files }
  })

  await rt.step('needs-first-2-game-hours', async () => {
    const samples = []
    for (let i = 0; i <= 4; i++) {
      samples.push(await S(() => ({ ...window.__rv.clock(), needs: window.__rv.needs() })))
      if (i < 4) await S((sec) => window.__rv.advance(sec), HOUR_S / 2)
      if (i === 2) await rt.note('needsHour1Shot', await s.snap('hud-after-1h'))
    }
    const per = (k) => +(((samples[0].needs[k] - samples.at(-1).needs[k]) / 2).toFixed(2))
    await S(() => window.__sv.pause(true))
    return { samples: samples.map((x) => ({ hour: x.hour, ...x.needs })), perGameHourIdle: { hunger: per('hunger'), thirst: per('thirst'), vigor: per('vigor'), social: per('social') }, file: await s.snap('hud-after-2h') }
  })

  await rt.step('drink-at-well', async () => {
    await S(() => window.__sv.setNeeds({ thirst: 40 }))
    const r = await S(async () => {
      const rv = window.__rv
      const well = rv.bld('well')
      if (!well) return { ok: false, reason: 'no well in settlement 0' }
      rv.stand(well.x, well.z, 1.8)
      const before = rv.needs().thirst
      const c = await rv.choose({ type: 'building', id: well.id }, 'drink_well')
      return { c, before }
    })
    if (r.ok === false) return r
    await s.page.waitForTimeout(600)
    const midShot = await s.snap('drinking-activity')
    const after = await S(() => {
      const f = window.__rv.finish()
      return { f, thirst: window.__rv.needs().thirst, log: window.__rv.msgs(3) }
    })
    return { thirstBefore: r.before, thirstAfter: after.thirst, choose: r.c, activity: after.f, log: after.log, files: [midShot, await s.snap('after-drink')] }
  })

  await rt.step('eat', async () => {
    const r = await S(() => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      window.__sv.setNeeds({ hunger: 40 })
      let food = sim.player.inv.items.find((i) => i.id === 'bread')
      let gave = false
      if (!food) {
        window.__sv.give('bread', 1)
        food = sim.player.inv.items.find((i) => i.id === 'bread')
        gave = true
      }
      const before = rv.needs()
      const m0 = rv.msgCount()
      window.__sv.game.toast = ''
      window.__sv.game.useItem(food)
      const f = rv.finish()
      return { before, after: rv.needs(), gaveBreadForTest: gave, toast: window.__sv.game.toast, log: rv.newMsgs(m0), activity: f }
    })
    return { ...r, file: await s.snap('after-eat') }
  })

  await rt.step('notice-board', async () => {
    const r = await S(async () => {
      const rv = window.__rv
      const nb = rv.bld('noticeboard')
      if (!nb) return { ok: false, reason: 'no notice board in settlement 0' }
      rv.stand(nb.x, nb.z, 1.8)
      const opts = await rv.opts({ type: 'building', id: nb.id })
      const c = await rv.choose({ type: 'building', id: nb.id }, 'quests')
      return { opts, c }
    })
    if (r.ok === false) return r
    await s.page.waitForTimeout(500)
    const text = await s.page.locator('[data-testid=panel]').innerText().catch(() => null)
    const file = await s.snap('notice-board-panel')
    await S(() => window.__sv.game.closePanel())
    return { options: r.opts, choose: r.c, panelText: text, file }
  })

  await rt.step('sleep-night-in-inn', async () => {
    await S(() => {
      window.__sv.setHour(21)
      window.__sv.setNeeds({ vigor: 35 })
    })
    const r = await S(async () => {
      const rv = window.__rv
      const inn = rv.bld('inn') ?? rv.findBld('inn')
      if (!inn) return { ok: false, reason: 'no inn in any settlement' }
      const inSettlement0 = inn.settlementId === 0
      rv.stand(inn.x, inn.z, 2)
      const before = { needs: rv.needs(), clock: rv.clock(), money: rv.coins(), treasury: rv.treasury()[0] }
      const c = await rv.choose({ type: 'building', id: inn.id }, 'inn_sleep')
      return { before, c, innSettlement: inn.settlementId, innInSettlement0: inSettlement0 }
    })
    if (r.ok === false) return r
    await S((sec) => window.__rv.advance(sec), 60)
    const mid = await s.snap('sleeping')
    const done = await S(() => {
      const rv = window.__rv
      const f = rv.finish(6000)
      return { f, after: { needs: rv.needs(), clock: rv.clock(), money: rv.coins(), treasury: rv.treasury()[0] }, log: rv.msgs(6) }
    })
    return { before: r.before, choose: r.c, innSettlement: r.innSettlement, innInSettlement0: r.innInSettlement0, ...done, files: [mid, await s.snap('woke-up')] }
  })
}
