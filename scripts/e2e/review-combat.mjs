/**
 * review-combat: fight a wolf and a boar with the club, then with the bow; get knocked down; bandage; herbalist healing.
 * Evidence: damage per hit, hits to kill, stamina use, KO duration, bleeding, heal amounts.
 * Setup shortcuts (heal, stamina reset, spawn distance) are listed in each step's `setup` field.
 */

/** Defines window.__rv.fight in the page. */
async function installFight(s) {
  await s.S(() => {
    const rv = window.__rv
    const sv = () => window.__sv
    const sim = () => sv().game.sim
    const f = (rv.fight = {})
    f.start = (species, weapon, dist) => {
      const p = sim().player
      const spot = sv().openSpot(60)
      sv().teleport(spot.x, spot.z)
      rv.heal()
      p.vitals.hunger = 80
      sv().give('bandage', 3)
      if (weapon === 'club') {
        sv().game.setPrimaryWeapon('melee', 'club')
        sv().game.switchWeapon('melee')
      } else {
        sv().give('short_bow', 1)
        sv().give('arrow', 30)
        sv().game.setPrimaryWeapon('ranged', 'short_bow')
        sv().game.switchWeapon('ranged')
      }
      p.attackReadyAt = 0
      const id = sv().spawn(species, 0, dist)
      sv().face(p.x, p.z + dist)
      const a = sim().actor(id)
      f.cur = { id, a, species, weapon, t: 0, events: [], swings: 0, shots: 0, hpStart: rv.round(rv.hp(a.vitals), 1), maxHp: a.vitals.maxHp, playerHpStart: rv.round(rv.hp(p.vitals), 1), minStamina: p.vitals.stamina, staminaPerSwing: [], approachedByTeleport: false, outcome: null, drawT: weapon === 'bow' ? 0.9 : 0, shotLog: [], arrowsStart: sv().count('arrow') }
      return { id, animalHp: f.cur.hpStart, dist, weapon: p.eq.main?.id, playerPos: { x: Math.round(p.x), z: Math.round(p.z) } }
    }
    /** Runs until `maxT` gameplay seconds pass, the fight ends or (stopAtFirstHit) the first damage lands. */
    f.run = async (maxT, stopAtFirstHit = false) => {
      const c = f.cur
      const p = sim().player
      const { fireRanged } = await rv.mod('sim/combat')
      sim().paused = false
      const end = c.t + maxT
      while (c.t < end) {
        const a = c.a
        if (a.vitals.dead) {
          c.outcome = 'animal-killed'
          break
        }
        if (p.vitals.ko) {
          c.outcome = 'player-knocked-out'
          break
        }
        const now = sim().state.time.play
        const d = Math.hypot(a.x - p.x, a.z - p.z)
        const hpBefore = rv.hp(a.vitals)
        if (c.weapon === 'club') {
          // Nothing happens at range: the animal comes to us; after 8 s of waiting, close in (recorded).
          if (d > 2.2 && c.t > 8 && !c.approachedByTeleport) {
            sv().approach(a.x, a.z, 1.2)
            c.approachedByTeleport = true
          }
          if (d < 1.9 && now >= p.attackReadyAt) {
            sv().face(a.x, a.z)
            const st0 = p.vitals.stamina
            sv().game.attack()
            c.swings++
            c.staminaPerSwing.push(rv.round(st0 - p.vitals.stamina, 1))
          }
        } else {
          c.drawT += 0.1
          if (now >= p.attackReadyAt && c.drawT >= 0.9 && sv().count('arrow') > 0) {
            sv().face(a.x, a.z)
            const rig = sv().game.renderer.rig
            if (fireRanged(sim(), p, rig.yaw, rig.pitch * -0.6 + 0.12, 1)) {
              c.shots++
              c.shotLog.push({ t: rv.round(c.t, 1), targetDistance: rv.round(d, 1) })
            }
            c.drawT = 0
          }
        }
        sv().simStep(0.1)
        c.t += 0.1
        c.minStamina = Math.min(c.minStamina, p.vitals.stamina)
        const dmg = hpBefore - rv.hp(a.vitals)
        // Below 0.5 hp per 0.1 s it is the animal bleeding, not a hit.
        if (dmg > 0.5) {
          c.events.push({ t: rv.round(c.t, 1), damage: rv.round(dmg, 1), animalHpLeft: rv.round(rv.hp(a.vitals), 1), distance: rv.round(d, 1) })
          if (stopAtFirstHit) break
        }
      }
      sim().paused = true
      if (!c.outcome && c.t >= end) c.outcome = 'time-limit'
      return rv.fight.report()
    }
    f.report = () => {
      const c = f.cur
      const p = sim().player
      const dmgs = c.events.map((e) => e.damage)
      return {
        species: c.species,
        weapon: c.weapon,
        outcome: c.outcome,
        seconds: rv.round(c.t, 1),
        animalMaxHp: c.maxHp,
        damageEvents: c.events,
        hitsLanded: c.events.length,
        swingsOrShots: c.weapon === 'club' ? c.swings : c.shots,
        damagePerHit: dmgs.length ? { min: Math.min(...dmgs), max: Math.max(...dmgs), avg: rv.round(dmgs.reduce((x, y) => x + y, 0) / dmgs.length, 1) } : null,
        hitsToKill: c.a.vitals.dead ? c.events.length : null,
        animalHpNow: rv.round(rv.hp(c.a.vitals), 1),
        staminaPerSwing: c.staminaPerSwing.length ? { first: c.staminaPerSwing[0], min: Math.min(...c.staminaPerSwing), max: Math.max(...c.staminaPerSwing) } : null,
        staminaMin: rv.round(c.minStamina, 1),
        shotLog: c.weapon === 'bow' ? c.shotLog : undefined,
        arrowsUsed: c.weapon === 'bow' ? c.arrowsStart - sv().count('arrow') : undefined,
        approachedByTeleport: c.approachedByTeleport,
        player: { hpStart: c.playerHpStart, hpNow: rv.round(rv.hp(p.vitals), 1), bleeding: rv.round(p.vitals.bleeding, 2), ko: !!p.vitals.ko, hurtParts: Object.fromEntries(Object.entries(p.vitals.parts).filter(([, v]) => v > 0).map(([k, v]) => [k, rv.round(v, 1)])) },
        corpseLeft: sim().state.corpses.some((x) => x.species === c.species && Math.hypot(x.x - c.a.x, x.z - c.a.z) < 4),
        messages: rv.msgs(4),
      }
    }
  })
}

export default async function (rt) {
  const s = await rt.start()
  const { S } = s
  await S(() => window.__sv.pause(true))
  await s.page.waitForTimeout(1200)
  await installFight(s)

  const fights = [['wolf', 'club', 6], ['boar', 'club', 6], ['wolf', 'bow', 9], ['boar', 'bow', 9]]
  for (const [species, weapon, dist] of fights) {
    await rt.step(`${species}-with-${weapon}`, async () => {
      const setup = await S(([sp, w, d]) => window.__rv.fight.start(sp, w, d), [species, weapon, dist])
      await s.page.waitForTimeout(1500)
      const shot0 = await s.snap(`${species}-${weapon}-start`)
      const first = await S(() => window.__rv.fight.run(25, true))
      await s.page.waitForTimeout(400)
      const shot1 = await s.snap(`${species}-${weapon}-first-hit`)
      const res = first.outcome ? first : await S(() => window.__rv.fight.run(60))
      await s.page.waitForTimeout(400)
      const shot2 = await s.snap(`${species}-${weapon}-end`)
      return { setup: { ...setup, note: 'player healed + stamina reset first; animal spawned at this distance; combat run in gameplay seconds' + (weapon === 'bow' ? '; bow already drawn for the first shot, hits measured as animal hp loss above 0.5 per 0.1 s (part weights make hp loss differ from raw damage)' : '') }, ...res, files: [shot0, shot1, shot2] }
    })
  }

  await rt.step('knocked-down', async () => {
    const r = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const p = sim.player
      const { applyDamage, isDown } = await rv.mod('sim/combat')
      rv.heal()
      const m0 = rv.msgCount()
      const t0 = sim.state.time.play
      const hpBefore = rv.hp(p.vitals)
      applyDamage(sim, p, 500, 'blunt')
      const ko = p.vitals.ko ? { downForS: rv.round(p.vitals.ko.until - t0, 1), protectedForS: rv.round(p.vitals.ko.protectUntil - t0, 1) } : null
      return { hpBefore: rv.round(hpBefore, 1), hpAfterHit: rv.round(rv.hp(p.vitals), 1), ko, convalescenceH: p.vitals.convalescenceH, bleeding: p.vitals.bleeding, log: rv.newMsgs(m0), isDownNow: isDown(sim, p), toast: window.__sv.game.toast }
    })
    await s.page.waitForTimeout(700)
    const file = await s.snap('knocked-down')
    const after = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const { isDown } = await rv.mod('sim/combat')
      const t0 = sim.state.time.play
      sim.paused = false
      let t = 0
      while (isDown(sim, sim.player) && t < 30) {
        window.__sv.simStep(0.1)
        t += 0.1
      }
      sim.paused = true
      return { standsUpAfterS: rv.round(sim.state.time.play - t0, 1), hpNow: rv.round(rv.hp(sim.player.vitals), 1), protectRemainingS: rv.round((sim.player.vitals.ko?.protectUntil ?? 0) - sim.state.time.play, 1) }
    })
    return { setup: 'applyDamage(player, 500, blunt) through the combat module', ...r, ...after, file }
  })

  await rt.step('bandage', async () => {
    const r = await S(() => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const p = sim.player
      rv.heal()
      p.vitals.parts.torso = 30
      p.vitals.parts.larm = 12
      p.vitals.bleeding = 2
      window.__sv.give('bandage', 2)
      const before = { hp: rv.round(rv.hp(p.vitals), 1), bleeding: p.vitals.bleeding, bandages: window.__sv.count('bandage') }
      const m0 = rv.msgCount()
      window.__sv.game.toast = ''
      window.__sv.game.useFirst(['bandage', 'salve'])
      const act = rv.finish()
      return { before, after: { hp: rv.round(rv.hp(p.vitals), 1), bleeding: rv.round(p.vitals.bleeding, 2), bandages: window.__sv.count('bandage') }, activity: act, toast: window.__sv.game.toast, log: rv.newMsgs(m0) }
    })
    return { setup: 'torso 30 + left arm 12 damage, bleeding 2; Game.useFirst([bandage, salve])', ...r, file: await s.snap('after-bandage') }
  })

  await rt.step('herbalist-healing', async () => {
    const found = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const h = rv.findNpc((n) => n.profession === 'herbalist')
      if (!h) return null
      const p = sim.player
      p.vitals.parts.torso = 40
      p.vitals.parts.lleg = 20
      p.vitals.bleeding = 1
      p.vitals.convalescenceH = 10
      rv.stand(h.x, h.z, 1.6)
      return { id: h.id, name: h.name, settlement: h.settlementId, hpBefore: rv.round(rv.hp(p.vitals), 1), money: p.money, convalescenceH: p.vitals.convalescenceH, bleeding: p.vitals.bleeding, options: await rv.opts({ type: 'npc', id: h.id }) }
    })
    if (!found) return { ok: false, reason: 'no herbalist in the world' }
    await s.page.waitForTimeout(800)
    const dialog = await S((id) => window.__rv.choose({ type: 'npc', id }, 'heal_service'), found.id)
    const after = await S(() => {
      const rv = window.__rv
      const p = window.__sv.game.sim.player
      return { hp: rv.round(rv.hp(p.vitals), 1), money: p.money, convalescenceH: p.convalescenceH ?? p.vitals.convalescenceH, bleeding: p.vitals.bleeding, log: rv.msgs(2) }
    })
    return { setup: 'torso 40 + left leg 20 damage, bleeding 1, convalescence 10 h', ...found, choose: dialog, after, file: await s.snap('after-herbalist') }
  })
}
