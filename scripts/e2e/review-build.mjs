/**
 * review-build: place a campfire, a hearth, a shed; deliver materials; build; light/feed/douse the fire; plant a torch.
 * Evidence: material counts, build times (gameplay seconds and game hours), fuel hours, failure messages.
 */

/** Places a blueprint through Game.placeBlueprint at the first of several open spots where it works. */
async function placeOn(s, bp, tries = 5) {
  const attempts = []
  for (let i = 0; i < tries; i++) {
    const r = await s.S(async ([id, minR]) => {
      const sim = window.__sv.game.sim
      const spot = window.__sv.openSpot(minR)
      window.__sv.teleport(spot.x, spot.z)
      window.__sv.face(spot.x, spot.z + 10)
      const n0 = sim.state.sites.length
      window.__sv.game.toast = ''
      window.__sv.game.placeBlueprint(id)
      const site = sim.state.sites.length > n0 ? sim.state.sites.at(-1) : null
      return { toast: window.__sv.game.toast, siteId: site?.id ?? null, at: { x: Math.round(spot.x), z: Math.round(spot.z) } }
    }, [bp, 30 + i * 25])
    attempts.push({ toast: r.toast, at: r.at })
    if (r.siteId) return { siteId: r.siteId, attempts }
  }
  return { siteId: null, attempts }
}

/** Runs 'build' on a site until it is finished or stuck; returns per-stage timings and messages. */
async function buildSite(s, siteId, maxStages = 6) {
  return s.S(async ([id, max]) => {
    const rv = window.__rv
    const sim = window.__sv.game.sim
    const stages = []
    for (let i = 0; i < max; i++) {
      const site = sim.state.sites.find((x) => x.id === id)
      if (!site) break
      const stageBefore = site.stage
      const c = await rv.choose({ type: 'site', id }, 'build')
      if (!sim.state.px.activity) {
        stages.push({ stage: stageBefore, started: false, toast: c.toast, reason: c.reason })
        break
      }
      const f = rv.finish(6000)
      stages.push({ stage: stageBefore, started: true, ...f, log: rv.msgs(1) })
    }
    return { stages, done: !sim.state.sites.some((x) => x.id === id) }
  }, [siteId, maxStages])
}

export default async function (rt) {
  const s = await rt.start()
  const { S } = s
  await S(() => {
    const sv = window.__sv
    sv.pause(true)
    sv.setHour(10)
    window.__rv.setInv([['flint', 1], ['bread', 2]])
  })
  await s.page.waitForTimeout(1500)

  await rt.step('build-panel', async () => {
    await S(() => window.__sv.game.togglePanel('build'))
    await s.page.waitForTimeout(500)
    const text = await s.page.locator('[data-testid=panel]').innerText().catch(() => null)
    const file = await s.snap('build-panel')
    await S(() => window.__sv.game.closePanel())
    return { panelText: text, file }
  })

  await rt.step('campfire', async () => {
    await S(() => window.__sv.give('branch', 3))
    const placed = await placeOn(s, 'campfire')
    if (!placed.siteId) return { ok: false, reason: 'could not place a campfire site', attempts: placed.attempts }
    await s.page.waitForTimeout(800)
    const siteShot = await s.snap('campfire-site')
    const mats = await S(() => ({ branches: window.__sv.count('branch') }))
    const built = await buildSite(s, placed.siteId)
    const info = await S(() => {
      const sim = window.__sv.game.sim
      const b = sim.state.buildings.filter((x) => x.playerBuilt && x.kind === 'campfire').at(-1)
      return b ? { id: b.id, lit: b.lit, fuelHours: window.__rv.round(b.fuel ?? 0, 2), hearth: !!b.hearth, branchesLeft: window.__sv.count('branch') } : null
    })
    await s.page.waitForTimeout(800)
    const file = await s.snap('campfire-built')
    rt.note('campfireId', info?.id ?? null)
    return { placed: placed.attempts, materialsBefore: mats, build: built, result: info, files: [siteShot, file], blueprint: 'campfire: 3 branches, 0.25 h, flint and steel' }
  })

  await rt.step('campfire-feed-douse-light', async () => {
    const id = rt.notes.campfireId
    if (!id) return { ok: false, reason: 'no player-built campfire from the previous step' }
    const r = await S(async (cid) => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const b = sim.building(cid)
      rv.stand(b.x, b.z, 1.8)
      const ref = { type: 'building', id: cid }
      const out = { options: await rv.opts(ref), fuelStart: rv.round(b.fuel ?? 0, 2), lit: b.lit }
      out.burn = []
      // Burn 1 game hour (150 s) and see the fuel drop.
      rv.advance(150)
      out.burn.push({ afterGameHours: 1, fuel: rv.round(b.fuel ?? 0, 2), lit: b.lit })
      window.__sv.give('branch', 4)
      window.__sv.give('log', 1)
      const f0 = b.fuel ?? 0
      out.addBranches = await rv.choose(ref, 'add_fuel')
      out.addBranchesFuelDelta = rv.round((b.fuel ?? 0) - f0, 2)
      out.itemsLeft = { branch: window.__sv.count('branch'), log: window.__sv.count('log') }
      const f1 = b.fuel ?? 0
      out.addMore = await rv.choose(ref, 'add_fuel')
      out.addMoreFuelDelta = rv.round((b.fuel ?? 0) - f1, 2)
      out.itemsLeft2 = { branch: window.__sv.count('branch'), log: window.__sv.count('log') }
      out.douse = await rv.choose(ref, 'douse_fire')
      out.afterDouse = { lit: b.lit, fuel: rv.round(b.fuel ?? 0, 2) }
      out.light = await rv.choose(ref, 'light')
      out.afterLight = { lit: b.lit, fuel: rv.round(b.fuel ?? 0, 2) }
      // No fuel at all.
      window.__rv.setInv([['flint', 1]])
      out.addWithoutFuel = await rv.choose(ref, 'add_fuel')
      return out
    }, id)
    return { ...r, file: await s.snap('campfire-lit') }
  })

  await rt.step('hearth', async () => {
    await S(() => window.__sv.give('stone', 4))
    const placed = await placeOn(s, 'hearth')
    if (!placed.siteId) return { ok: false, reason: 'could not place a hearth site', attempts: placed.attempts }
    const built = await buildSite(s, placed.siteId)
    const r = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const b = sim.state.buildings.filter((x) => x.playerBuilt && x.hearth).at(-1)
      if (!b) return null
      rv.stand(b.x, b.z, 1.8)
      const ref = { type: 'building', id: b.id }
      const out = { id: b.id, initial: { lit: b.lit, fuel: b.fuel } }
      window.__sv.give('branch', 5)
      out.lightEmpty = await rv.choose(ref, 'light')
      out.afterLightEmpty = { lit: b.lit, fuel: rv.round(b.fuel ?? 0, 2) }
      out.feed = await rv.choose(ref, 'add_fuel')
      out.afterFeed = { lit: b.lit, fuel: rv.round(b.fuel ?? 0, 2), branchesLeft: window.__sv.count('branch') }
      out.douse = await rv.choose(ref, 'douse_fire')
      out.afterDouse = { lit: b.lit, fuel: rv.round(b.fuel ?? 0, 2) }
      out.relight = await rv.choose(ref, 'light')
      out.afterRelight = { lit: b.lit, fuel: rv.round(b.fuel ?? 0, 2) }
      out.options = await rv.opts(ref)
      return out
    })
    if (!r) return { ok: false, reason: 'hearth not built', build: built }
    await s.page.waitForTimeout(600)
    return { blueprint: 'hearth: 4 stones, 0.5 h', build: built, ...r, file: await s.snap('hearth-built') }
  })

  await rt.step('shed-failures', async () => {
    const r = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const { placeSite, canPlace } = await rv.mod('sim/build')
      const { blueprintById } = await rv.mod('data/recipes')
      const out = {}
      rv.setInv([['flint', 1]])
      // 1. No materials: place on an open spot, try to build.
      const spot = window.__sv.openSpot(120)
      window.__sv.teleport(spot.x, spot.z)
      window.__sv.face(spot.x, spot.z + 10)
      window.__sv.game.toast = ''
      window.__sv.game.placeBlueprint('shed')
      const site = sim.state.sites.at(-1)
      out.placeShed = { toast: window.__sv.game.toast, site: !!site }
      if (site) {
        out.buildWithoutMaterials = await rv.choose({ type: 'site', id: site.id }, 'build')
        // 2. Materials but no tools.
        for (const [id, q] of [['log', 6], ['branch', 10], ['stone', 4]]) window.__sv.give(id, q)
        out.buildWithoutTools = await rv.choose({ type: 'site', id: site.id }, 'build')
        out.siteDelivered = { ...site.delivered }
        out.siteId = site.id
      }
      // 3. Too close to a building.
      const b = sim.state.buildings.find((x) => x.kind === 'well' && x.settlementId === 0)
      if (b) {
        rv.stand(b.x, b.z, 2.5)
        window.__sv.game.toast = ''
        window.__sv.game.placeBlueprint('shed')
        out.tooCloseToWell = window.__sv.game.toast
      }
      // 4. In water / on a slope (placeSite through the module; the UI places 3 m ahead of the player).
      const t = sim.terrain
      let water = null
      let slope = null
      for (let i = 0; i < 30000 && (!water || !slope); i++) {
        const x = 400 + ((i * 89) % 7400)
        const z = 400 + ((i * 151) % 7400)
        if (!water && t.waterDepthAt(x, z) > 0.5) water = { x, z }
        if (!slope && t.waterDepthAt(x, z) === 0 && t.slopeAt(x, z) > 0.45) slope = { x, z }
      }
      if (water) out.inWater = placeSite(sim, 'campfire', water.x, water.z, 0).msg
      if (slope) {
        const bp = blueprintById('shed')
        const c = canPlace(sim, bp, slope.x, slope.z)
        out.onSlope = c.ok ? 'placeable' : c.reason
      }
      out.note = 'water/slope tested with the build module directly'
      return out
    })
    await s.page.waitForTimeout(500)
    rt.note('shedSiteId', r.siteId ?? null)
    return { ...r, file: await s.snap('shed-failures') }
  })

  await rt.step('shed-build', async () => {
    const siteId = rt.notes.shedSiteId
    if (!siteId) return { ok: false, reason: 'no shed site from the failure step' }
    await S(() => {
      window.__sv.give('shovel', 1)
      window.__sv.give('hammer', 1)
    })
    const siteBefore = await S((id) => {
      const site = window.__sv.game.sim.state.sites.find((x) => x.id === id)
      if (!site) return null
      window.__rv.stand(site.x, site.z, 5)
      return { delivered: site.delivered, stage: site.stage }
    }, siteId)
    if (!siteBefore) return { ok: false, reason: 'site vanished' }
    const built = await buildSite(s, siteId)
    const after = await S(() => {
      const b = window.__sv.game.sim.state.buildings.filter((x) => x.playerBuilt && x.kind === 'shed').at(-1)
      return b ? { id: b.id, owner: b.owner, durability: b.durability, hasStorage: !!b.inv } : null
    })
    return { blueprint: 'shed: 6 logs, 10 branches, 4 stones; stages Foundation 2 h (shovel) + Framing 4 h (hammer)', siteBefore, build: built, result: after, file: await s.snap('shed-built') }
  })

  await rt.step('plant-torch', async () => {
    const r = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const { torchBurnH } = await rv.mod('sim/fire')
      rv.setInv([['flint', 1], ['torch', 2]])
      const spot = window.__sv.openSpot(150)
      window.__sv.teleport(spot.x, spot.z)
      window.__sv.face(spot.x, spot.z + 10)
      window.__sv.game.toast = ''
      window.__sv.game.quick('plant_torch')
      const out = { toast: window.__sv.game.toast, torchesLeft: window.__sv.count('torch') }
      const g = sim.state.ground.find((x) => x.planted)
      if (!g) return out
      out.planted = { id: g.id, lit: !!g.lit, burnHoursFull: rv.round(g.burnH ?? 0, 2), stackDur: g.stack.dur, torchBurnHFn: rv.round(torchBurnH(g.stack), 2) }
      const ref = { type: 'ground', id: g.id }
      out.options = await rv.opts(ref)
      rv.stand(g.x, g.z, 1.3)
      out.light = await rv.choose(ref, 'light_planted')
      out.afterLight = { lit: !!g.lit, burnHoursLeft: rv.round(g.burnH ?? 0, 2) }
      rv.advance(150)
      out.afterOneGameHour = { lit: !!g.lit, burnHoursLeft: rv.round(g.burnH ?? 0, 2) }
      return out
    })
    await s.page.waitForTimeout(800)
    const lit = await s.snap('torch-planted-lit')
    await S(() => window.__sv.setHour(22.5))
    await s.page.waitForTimeout(1500)
    return { ...r, files: [lit, await s.snap('torch-planted-night')] }
  })
}
