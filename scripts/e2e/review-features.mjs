/**
 * review-features: evidence for the wave-5 features (app review round 3, review 020): NPC name labels and quest icons,
 * sound settings (Voices slider, lazy sound loading), combat target lock + marker, block/parry with the wooden shield,
 * jump and dodge, weapon sharpness + Sharpen, inn meals and preserved food, the rotten tag, buried treasure, the
 * headman's office option, and the touch controls for all of it (mobile viewport).
 * Produces screenshots + observations; it never asserts gameplay.
 */

const sleep = (page, ms) => page.waitForTimeout(ms)

async function labels(s) {
  return s.S(() => [...document.querySelectorAll('[data-testid="npc-labels"] > div')].map((e) => ({ icon: e.getAttribute('data-npc-icon'), text: e.textContent.trim(), left: e.style.left, top: e.style.top })))
}

const closeAll = (s) => s.S(() => {
  const g = window.__sv.game
  g.panel = null
  g.notify?.()
})

async function desktop(rt) {
  const s = await rt.start({ seed: '1337', quality: 'medium' })
  const { page, S } = s
  const step = (name, fn) => rt.step(name, async () => {
    await closeAll(s)
    return fn()
  })

  // 1. Name labels + quest icon above NPCs.
  await step('npc-labels-day', async () => {
    const r = await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      sv.setHour(11)
      Object.assign(sim.state.weather, { kind: 'clear', fog: 0.05, until: sim.state.time.cal + 86400 })
      const forced = ['q03', 'q07', 'g03', 'g01'].map((id) => [id, sv.forceQuest(id)])
      // Stand 6 m from a cast member of an offered quest.
      const st = Object.values(sim.state.authoredQuests).find((q) => q.status === 'offered')
      const npc = st ? sim.human(Object.values(st.cast)[0]) : sim.state.npcs.find((n) => !n.vitals.dead && n.settlementId === sim.world.homeSettlement)
      sv.approach(npc.x, npc.z, 6)
      sv.game.renderer.rig.distance = 8
      sv.game.renderer.rig.pitch = 0.2
      return { forced, npc: npc.name, offered: Object.entries(sim.state.authoredQuests).map(([id, q]) => `${id}:${q.status}`) }
    })
    await sleep(page, 2500)
    const shot = await s.snap('npc-labels-day')
    const l = await labels(s)
    const ov = await S(() => {
      const sim = window.__sv.game.sim
      const p = sim.player
      return window.__sv.game.npcOverlays().map((o) => {
        const n = sim.human(o.id)
        // Buildings whose footprint the straight line player→NPC crosses (sampled every 0.5 m).
        const blockers = sim.state.buildings.filter((b) => {
          const L = Math.hypot(n.x - p.x, n.z - p.z)
          for (let t = 0.5; t < L - 0.3; t += 0.5) {
            const x = p.x + ((n.x - p.x) * t) / L
            const z = p.z + ((n.z - p.z) * t) / L
            const c = Math.cos(b.rot ?? 0)
            const si = Math.sin(b.rot ?? 0)
            const lx = c * (x - b.x) - si * (z - b.z)
            const lz = si * (x - b.x) + c * (z - b.z)
            if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) return true
          }
          return false
        }).map((b) => b.kind)
        return { name: o.name, icon: o.icon, dist: Math.round(o.dist * 10) / 10, goal: n.ai.goal, activity: n.ai.activity ?? null, blockedBy: blockers }
      })
    })
    return { ...r, labels: l, overlays: ov, shot }
  })
  await step('npc-labels-crowd', async () => {
    const r = await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const set = sim.world.settlements[sim.world.homeSettlement]
      sv.teleport(set.x + 6, set.z + 6)
      sv.face(set.x, set.z)
      sv.game.renderer.rig.distance = 10
      sv.game.renderer.rig.pitch = 0.25
      return { settlement: set.name }
    })
    await sleep(page, 2500)
    const l = await labels(s)
    // Labels drawn for NPCs that are inside a building (sleeping/indoors) would show through walls.
    const indoor = await S(() => {
      const sim = window.__sv.game.sim
      const ov = window.__sv.game.npcOverlays()
      return ov.map((o) => {
        const n = sim.human(o.id)
        const inside = sim.state.buildings.some((b) => b.hw && Math.abs(Math.cos(b.rot ?? 0) * (n.x - b.x) - Math.sin(b.rot ?? 0) * (n.z - b.z)) < b.hw && Math.abs(Math.sin(b.rot ?? 0) * (n.x - b.x) + Math.cos(b.rot ?? 0) * (n.z - b.z)) < b.hd)
        return { name: o.name, dist: Math.round(o.dist), goal: n.ai.goal, inside }
      })
    })
    return { ...r, count: l.length, labels: l.map((x) => x.text), overlays: indoor, shot: await s.snap('npc-labels-crowd') }
  })
  await step('npc-labels-night', async () => {
    await S(() => {
      const sv = window.__sv
      sv.setHour(23.5)
      sv.step(1)
    })
    await sleep(page, 2500)
    const l = await labels(s)
    const goals = await S(() => window.__sv.game.npcOverlays().map((o) => `${o.name}:${window.__sv.game.sim.human(o.id).ai.goal}`))
    return { count: l.length, goals, shot: await s.snap('npc-labels-night') }
  })
  await step('npc-labels-panel-open', async () => {
    await S(() => window.__sv.setHour(11))
    await page.keyboard.press('KeyI')
    await sleep(page, 800)
    const l = await labels(s)
    await page.keyboard.press('KeyI')
    return { countWithInventoryOpen: l.length }
  })

  // 2. Sound settings (cannot hear audio headless: only requests, errors and the sliders).
  await step('sound-settings', async () => {
    const reqs = []
    page.on('request', (r) => {
      if (r.url().includes('/sounds/')) reqs.push(r.url().split('/sounds/')[1])
    })
    const failed = []
    page.on('response', (r) => {
      if (r.url().includes('/sounds/') && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
    })
    await page.keyboard.down('KeyW')
    await sleep(page, 1500)
    await page.keyboard.up('KeyW')
    for (let i = 0; i < 3 && !(await page.$('[data-testid="menu-settings"]')); i++) {
      await page.keyboard.press('Escape')
      await sleep(page, 600)
    }
    await page.click('[data-testid=menu-settings]')
    await sleep(page, 600)
    const sliders = await S(() => [...document.querySelectorAll('input[type=range]')].map((e) => ({ id: e.dataset.testid, value: e.value, label: e.closest('label')?.textContent.trim() })))
    // Set Voices to 20 % through the slider.
    await page.$eval('[data-testid=volume-voices]', (e) => {
      e.value = '0.2'
      e.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await sleep(page, 400)
    const stored = await S(() => localStorage.getItem('sv-settings'))
    const shot = await s.snap('settings-sound')
    const applied = await S(() => {
      const a = window.__sv.game.audio
      return JSON.parse(JSON.stringify(a.vol ?? null))
    })
    await page.keyboard.press('Escape')
    await sleep(page, 400)
    const panelAfterEsc = await S(() => window.__sv.game.panel)
    return { panelAfterEsc, sliders, stored, applied, soundRequests: reqs.slice(0, 20), soundRequestCount: reqs.length, failed, shot }
  })

  // 3. Combat target lock + red marker.
  await step('combat-lock', async () => {
    const r = await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const sp = sv.openSpot(150)
      sv.teleport(sp.x, sp.z)
      window.__rv.heal()
      sim.player.combat = false
      sv.give('short_sword', 1)
      sv.game.setPrimaryWeapon('melee', 'short_sword')
      sv.game.switchWeapon('melee')
      const ids = [sv.spawn('sheep', -1.5, 5), sv.spawn('sheep', 2.5, 7)]
      sv.face(sim.player.x, sim.player.z + 6)
      sv.game.renderer.rig.distance = 7
      sv.game.renderer.rig.pitch = 0.3
      sim.paused = false
      return { ids }
    })
    await page.keyboard.press('KeyR').catch(() => {})
    await S(() => {
      if (!window.__sv.game.sim.player.combat) window.__sv.game.toggleCombat()
    })
    await sleep(page, 300)
    await page.keyboard.press('Tab')
    await sleep(page, 700)
    const lock1 = await S(() => window.__sv.game.combatTargetId)
    await S(() => {
      const r = window.__sv.game.renderer.rig
      r.distance = 9
      r.pitch = 0.55
    })
    await sleep(page, 300)
    const shot1 = await s.snap('combat-lock-first')
    await page.keyboard.press('Tab')
    await sleep(page, 700)
    const lock2 = await S(() => window.__sv.game.combatTargetId)
    const shot2 = await s.snap('combat-lock-switch')
    const hud = await S(() => document.querySelector('[data-testid=target-prompt]')?.textContent.trim() ?? null)
    // Lock with nothing in range.
    await S(() => {
      const sv = window.__sv
      const sp = sv.openSpot(400)
      sv.teleport(sp.x, sp.z)
      sv.game.combatTargetId = null
    })
    await sleep(page, 300)
    await page.keyboard.press('Tab')
    await sleep(page, 300)
    const toastNone = await S(() => window.__sv.game.toast)
    return { ...r, lock1, lock2, targetPrompt: hud, toastNone, shot1, shot2 }
  })

  // 4. Block / parry with the wooden shield vs. a wolf: damage taken with and without guard.
  const fight = async (label, { shield, guard, seconds = 14 }) =>
    S(async ({ shield, guard, seconds }) => {
      const sv = window.__sv
      const sim = sv.game.sim
      const p = sim.player
      const sp = sv.openSpot(120)
      sv.teleport(sp.x, sp.z)
      window.__rv.heal()
      p.vitals.hunger = 90
      p.inv.items = []
      p.eq.off = undefined
      sv.give('club', 1)
      sv.game.setPrimaryWeapon('melee', 'club')
      sv.game.switchWeapon('melee')
      if (shield) {
        sv.give('wooden_shield', 1)
        sv.game.useItem(p.inv.items.find((x) => x.id === 'wooden_shield'))
      }
      if (!p.combat) sv.game.toggleCombat()
      const id = sv.spawn('wolf', 0, 3)
      const w = sim.actor(id)
      const m0 = sim.state.messages.length
      const hp0 = window.__rv.hp(p.vitals)
      const st0 = p.vitals.stamina
      const { input } = await import('/src/game/input/controls.ts')
      sim.paused = false
      let t = 0
      let minSt = st0
      let held = 0
      // Hold RMB; release for one frame every 1.5 s (a fresh press opens a parry window).
      while (t < seconds && !p.vitals.ko && !w.vitals.dead) {
        sv.face(w.x, w.z)
        input.secondary = guard && (t % 1.5) > 0.1
        sv.game.frame(0.1)
        if (sv.guard().held) held++
        t += 0.1
        minSt = Math.min(minSt, p.vitals.stamina)
      }
      input.secondary = false
      sv.game.frame(0.05)
      const msgs = sim.state.messages.slice(m0).map((m) => m.text)
      const count = (re) => msgs.filter((x) => re.test(x)).length
      const out = { shield, guard, seconds: Math.round(t), framesHeld: held, off: p.eq.off?.id ?? null, hpLost: Math.round((hp0 - window.__rv.hp(p.vitals)) * 10) / 10, minStamina: Math.round(minSt), ko: !!p.vitals.ko, blocks: count(/block/i), parries: count(/parry/i), breaks: count(/guard|broken|break/i), sample: msgs.slice(0, 8) }
      // Remove the wolf.
      w.vitals.dead = true
      return out
    }, { shield, guard, seconds })
  await step('block-none', async () => fight('none', { shield: false, guard: false }))
  await step('block-club', async () => fight('club', { shield: false, guard: true }))
  await step('block-shield', async () => fight('shield', { shield: true, guard: true }))
  await step('shield-guard-pose', async () => {
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      sim.paused = false
      window.__rv.heal()
      sv.game.renderer.rig.distance = 4.5
      sv.game.renderer.rig.pitch = 0.15
      sv.game.renderer.rig.yaw = sim.player.rot + 2.4
    })
    const box = await page.locator('[data-testid="game-canvas"]').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ button: 'right' })
    await sleep(page, 900)
    const g = await S(() => ({ guard: window.__sv.guard(), off: window.__sv.game.sim.player.eq.off?.id, combat: window.__sv.game.sim.player.combat }))
    const shot = await s.snap('shield-guard-pose')
    await page.mouse.up({ button: 'right' })
    // RMB outside combat mode.
    await S(() => window.__sv.game.toggleCombat())
    await page.mouse.down({ button: 'right' })
    await sleep(page, 500)
    const outside = await S(() => ({ guard: window.__sv.guard(), combat: window.__sv.game.sim.player.combat }))
    await page.mouse.up({ button: 'right' })
    await page.keyboard.press('Escape').catch(() => {})
    return { ...g, outsideCombat: outside, shot }
  })
  await step('shield-with-bow', async () =>
    S(() => {
      const sv = window.__sv
      const p = sv.game.sim.player
      sv.give('short_bow', 1)
      sv.give('arrow', 5)
      const off0 = p.eq.off?.id
      sv.game.setPrimaryWeapon('ranged', 'short_bow')
      sv.game.switchWeapon('ranged')
      return { offBefore: off0, mainAfter: p.eq.main?.id, offAfter: p.eq.off?.id ?? null, toast: sv.game.toast }
    }),
  )

  // 5. Jump and dodge.
  await step('jump', async () => {
    const before = await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const sp = sv.openSpot(200)
      sv.teleport(sp.x, sp.z)
      sim.player.combat = false
      sim.player.vitals.stamina = 100
      sim.paused = false
      sv.game.renderer.rig.distance = 6
      sv.game.renderer.rig.pitch = 0.1
      sv.game.renderer.rig.yaw = sim.player.rot + 1.57
      return { y: sim.player.y }
    })
    await sleep(page, 400)
    await page.keyboard.press('Space')
    await sleep(page, 180)
    const mid = await S(() => window.__sv.game.sim.player.y)
    const shot = await s.snap('jump-mid-air')
    await sleep(page, 1500)
    const after = await S(() => ({ y: window.__sv.game.sim.player.y, stamina: window.__sv.game.sim.player.vitals.stamina }))
    await S(() => {
      window.__sv.game.sim.player.vitals.stamina = 3
    })
    await page.keyboard.press('Space')
    await sleep(page, 200)
    const tired = await S(() => window.__sv.game.toast)
    return { before, midY: mid, after, toastLowStamina: tired, shot }
  })
  await step('dodge', async () => {
    const r0 = await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const p = sim.player
      p.vitals.stamina = 100
      if (!p.combat) sv.game.toggleCombat()
      sv.spawn('sheep', 0, 4)
      return { x: p.x, z: p.z }
    })
    await page.keyboard.press('Tab')
    await sleep(page, 300)
    await page.keyboard.down('KeyA')
    await page.keyboard.press('Space')
    await sleep(page, 150)
    const shot = await s.snap('dodge-left')
    await page.keyboard.up('KeyA')
    await sleep(page, 700)
    const r1 = await S(() => ({ x: window.__sv.game.sim.player.x, z: window.__sv.game.sim.player.z, stamina: window.__sv.game.sim.player.vitals.stamina, y: window.__sv.game.sim.player.y }))
    await S(() => {
      window.__sv.game.sim.player.vitals.stamina = 2
    })
    await page.keyboard.press('Space')
    await sleep(page, 200)
    const tired = await S(() => window.__sv.game.toast)
    await S(() => window.__sv.game.toggleCombat())
    return { moved: Math.round(Math.hypot(r1.x - r0.x, r1.z - r0.z) * 100) / 100, staminaAfter: Math.round(r1.stamina), toastLowStamina: tired, shot }
  })

  // 6. Weapon sharpness: dull a sword on a boar, read the detail line, sharpen with a whetstone.
  await step('sharpness', async () => {
    const r = await S(async () => {
      const sv = window.__sv
      const sim = sv.game.sim
      const p = sim.player
      const { edgeOf, maxEdge, dullEdge } = await import('/src/game/sim/edge.ts')
      const { itemDef } = await import('/src/game/data/items.ts')
      p.inv.items = []
      p.eq.off = undefined
      sv.give('sword', 1)
      sv.game.setPrimaryWeapon('melee', 'sword')
      sv.game.switchWeapon('melee')
      const sw = p.eq.main
      const e0 = edgeOf(sw)
      // 30 connecting hits worth of wear.
      for (let i = 0; i < 30; i++) dullEdge(sw, itemDef('sword').weapon)
      return { weapon: sw.id, edgeFresh: Math.round(e0 * 100), edgeAfter30Hits: Math.round(edgeOf(sw) * 100), max: Math.round(maxEdge(sw) * 100) }
    })
    // Inventory → select the sword (equipped slot) → details, without a whetstone.
    await page.keyboard.press('KeyI')
    await sleep(page, 600)
    const pickSword = () => page.locator('[data-testid=panel]').getByText(/^Sword/).first().click({ timeout: 3000 }).then(() => true, () => false)
    const clicked = await pickSword()
    await sleep(page, 400)
    const details = await S(() => document.querySelector('[data-testid=item-details]')?.innerText ?? null)
    const btnNoStone = !!(await page.$('[data-testid=sharpen]'))
    const shotNo = await s.snap('sharpness-no-whetstone')
    await page.keyboard.press('KeyI')
    await S(() => window.__sv.give('whetstone', 1))
    await page.keyboard.press('KeyI')
    await sleep(page, 600)
    await pickSword()
    await sleep(page, 400)
    const btn = await page.$('[data-testid=sharpen]')
    const shotStone = await s.snap('sharpness-with-whetstone')
    let result = null
    if (btn) {
      await btn.click()
      result = await S(() => window.__rv.finish(30))
    }
    const after = await S(async () => {
      const { edgeOf } = await import('/src/game/sim/edge.ts')
      const p = window.__sv.game.sim.player
      return { edge: Math.round(edgeOf(p.eq.main) * 100), msgs: window.__rv.msgs(3), whetstoneDur: p.inv.items.find((x) => x.id === 'whetstone')?.dur }
    })
    // Re-open details after sharpening.
    await page.keyboard.press('KeyI')
    await sleep(page, 600)
    await pickSword()
    await sleep(page, 400)
    const details2 = await S(() => document.querySelector('[data-testid=item-details]')?.innerText ?? null)
    const shotAfter = await s.snap('sharpness-after')
    await page.keyboard.press('KeyI')
    return { ...r, clicked, details, sharpenButtonWithoutStone: btnNoStone, sharpenButtonWithStone: !!btn, activity: result, after, detailsAfter: details2, shots: [shotNo, shotStone, shotAfter] }
  })

  // 7. Inn meals.
  await step('inn-meals', async () => {
    const r = await S(async () => {
      const sv = window.__sv
      const sim = sv.game.sim
      const inn = sim.state.buildings.find((b) => b.kind === 'inn' && b.settlementId === sim.world.homeSettlement) ?? sim.state.buildings.find((b) => b.kind === 'inn')
      window.__innId = inn.id
      sv.setHour(12)
      sim.player.money = 60
      sim.player.vitals.hunger = 30
      sv.approach(inn.x, inn.z, (inn.hd ?? 3) + 1.2)
      sv.step(0.3)
      return { inn: inn.id, settlement: sim.world.settlements[inn.settlementId].name, pantry: (inn.inv?.items ?? []).map((x) => `${x.id}×${x.qty}${x.fresh !== undefined ? `(${Math.round(x.fresh)}h)` : ''}`), target: sv.game.target?.label }
    })
    await sleep(page, 500)
    await S(() => window.__sv.game.interact())
    await sleep(page, 600)
    const menu = await S(() => [...document.querySelectorAll('[data-testid^=opt-]')].map((e) => ({ id: e.dataset.testid, text: e.innerText.trim(), disabled: e.disabled })))
    const shot = await s.snap('inn-menu')
    const eat = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const inn = sim.building(window.__innId)
      const ref = { type: 'building', id: inn.id }
      const opts = await rv.opts(ref)
      const tr0 = rv.treasury()[inn.settlementId]
      const m0 = rv.coins()
      const h0 = sim.player.vitals.hunger
      const pick = opts.find((o) => o.id === 'meal_hearty' && o.enabled) ?? opts.find((o) => o.id.startsWith('meal_') && o.enabled)
      if (!pick) return { opts, eaten: null }
      const c = await rv.choose(ref, pick.id)
      const f = rv.finish(60)
      return { opts, chose: pick.label, choose: c, finish: f, hunger: [Math.round(h0), Math.round(sim.player.vitals.hunger)], money: [m0, rv.coins()], treasury: [tr0, rv.treasury()[inn.settlementId]], msgs: rv.msgs(3) }
    })
    // Empty pantry: what do the options say?
    const empty = await S(async () => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const inn = sim.building(window.__innId)
      const keep = inn.inv.items
      inn.inv.items = []
      const opts = await rv.opts({ type: 'building', id: inn.id })
      inn.inv.items = keep
      return opts.filter((o) => o.id.startsWith('meal_'))
    })
    await page.keyboard.press('Escape').catch(() => {})
    return { ...r, menu, eat, emptyPantry: empty, shot }
  })

  // 8. Preserved food, salt recipes and the rotten tag in the inventory.
  await step('food-items-rotten', async () => {
    await S(async () => {
      const sv = window.__sv
      const p = sv.game.sim.player
      const { itemDef } = await import('/src/game/data/items.ts')
      p.inv.items = []
      for (const [id, q] of [['salt', 3], ['salted_meat', 2], ['fermented_cabbage', 2], ['raw_meat', 1], ['cabbage', 1]]) sv.give(id, q)
      // Two bread batches: one fresh, one rotten; one spoiling apple.
      sv.give('bread', 2)
      sv.give('bread', 1)
      const breads = p.inv.items.filter((x) => x.id === 'bread')
      const sp = itemDef('bread').food.spoilH
      if (breads.length === 1) {
        breads[0].qty = 2
        p.inv.items.push({ ...breads[0], qty: 1, fresh: sp * 0.02 })
      } else breads[1].fresh = sp * 0.02
      sv.give('apple', 1)
      const ap = p.inv.items.find((x) => x.id === 'apple')
      ap.fresh = itemDef('apple').food.spoilH * 0.15
    })
    await page.keyboard.press('KeyI')
    await sleep(page, 700)
    const rows = await S(() => [...document.querySelectorAll('[data-testid=inventory-list] [data-testid^=item-]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
    const shot = await s.snap('inventory-food-rotten')
    await page.click('[data-testid=item-salted_meat]').catch(() => {})
    await sleep(page, 300)
    const det = await S(() => document.querySelector('[data-testid=item-details]')?.innerText ?? null)
    const shot2 = await s.snap('inventory-salted-meat-details')
    await page.keyboard.press('KeyI')
    await sleep(page, 300)
    await page.keyboard.press('KeyC')
    await sleep(page, 700)
    const craftText = await S(() => document.querySelector('[data-testid=panel]')?.innerText ?? document.body.innerText)
    const hasSalt = /Salt meat|Ferment cabbage/.test(craftText)
    const shot3 = await s.snap('craft-food')
    await page.keyboard.press('KeyC')
    return { rows, salted: det, craftShowsSaltRecipes: hasSalt, shots: [shot, shot2, shot3] }
  })

  // 9. Buried treasure: dig at a seeded spot and at a random spot.
  await step('treasure', async () => {
    const r = await S(async () => {
      const sv = window.__sv
      const sim = sv.game.sim
      const { treasureSpots } = await import('/src/game/sim/treasure.ts')
      const spots = treasureSpots(sim)
      const lm = Object.fromEntries(sim.world.landmarks.map((l) => [l.id, l]))
      const s0 = spots[0]
      if (!s0) return { spots: 0 }
      const l = lm[s0.id.split('#')[0]] ?? sim.world.landmarks.find((x) => s0.id.startsWith(String(x.id)))
      sv.give('shovel', 1)
      sv.setHour(12)
      // Stand 2 m before the spot facing it (quick dig hits 2 m ahead).
      sv.approach(s0.x, s0.z, 2)
      sim.paused = false
      return { spots: spots.length, spot: { id: s0.id, x: Math.round(s0.x), z: Math.round(s0.z), richness: s0.richness }, landmark: l ? { kind: l.kind, name: l.name, radius: l.radius } : null }
    })
    await sleep(page, 2000)
    const shotSite = await s.snap('treasure-site')
    const dig1 = await S(() => {
      const rv = window.__rv
      const m0 = rv.msgCount()
      window.__sv.game.quick('dig')
      const f = rv.finish(30)
      return { f, toast: window.__sv.game.toast, msgs: rv.newMsgs(m0), money: rv.coins() }
    })
    await sleep(page, 500)
    const shotDug = await s.snap('treasure-dug')
    const dig2 = await S(() => {
      const rv = window.__rv
      const m0 = rv.msgCount()
      window.__sv.game.quick('dig')
      rv.finish(30)
      return { toast: window.__sv.game.toast, msgs: rv.newMsgs(m0) }
    })
    return { ...r, dig1, digAgain: dig2, shots: [shotSite, shotDug] }
  })

  // 10. Headman: the office option (not eligible, then eligible), the tax option with the deputy.
  await step('mayor-office', async () => {
    const r = await S(async () => {
      const sv = window.__sv
      const rv = window.__rv
      const sim = sv.game.sim
      const sid = sim.world.homeSettlement
      const st = sim.state.settlements[sid]
      const head = sim.human(st.headmanId)
      sv.setHour(12)
      sv.approach(head.x, head.z, 1.6)
      sv.step(0.3)
      const ref = { type: 'npc', id: head.id }
      const before = (await rv.opts(ref)).filter((o) => o.id === 'ask_office')
      return { headman: head?.name, profession: head.profession, kin: head.kin, target: sv.game.target?.label, before, rep: st.rep }
    })
    await sleep(page, 500)
    await S(() => window.__sv.game.interact())
    await sleep(page, 600)
    const menu1 = await S(() => [...document.querySelectorAll('[data-testid^=opt-]')].map((e) => e.innerText.trim()))
    const shot1 = await s.snap('mayor-not-eligible')
    await page.keyboard.press('Escape').catch(() => {})
    const r2 = await S(async () => {
      const sv = window.__sv
      const rv = window.__rv
      const sim = sv.game.sim
      const sid = sim.world.homeSettlement
      const st = sim.state.settlements[sid]
      st.rep.honesty = 40
      st.rep.helpfulness = 40
      for (const n of sim.npcsOf(sid)) n.opinion = 30
      const head = sim.human(st.headmanId)
      const ref = { type: 'npc', id: head.id }
      const c = await rv.choose(ref, 'ask_office')
      const dep = sim.human(st.deputyId)
      const tax = dep ? await rv.choose({ type: 'npc', id: dep.id }, 'set_tax') : null
      const optsDep = dep ? (await rv.opts({ type: 'npc', id: dep.id })).map((o) => o.label) : null
      return { choose: c, mayor: st.playerMayor, deputy: dep?.name, tax, optsDeputy: optsDep }
    })
    await S(() => window.__sv.game.interact())
    await sleep(page, 600)
    const shot2 = await s.snap('mayor-deputy-menu')
    await page.keyboard.press('Escape').catch(() => {})
    return { ...r, menuNotEligible: menu1, ...r2, shots: [shot1, shot2] }
  })
}

async function carrion(rt) {
  const { FRAMES } = await import('./frames.mjs')
  const frame = FRAMES.find((f) => f[0] === 'carrion')
  for (const quality of ['low', 'medium']) {
    const s = await rt.start({ seed: '1337', quality })
    await rt.step(`carrion-${quality}`, async () => {
      await s.S(() => {
        const sv = window.__sv
        const sp = sv.openSpot(120)
        sv.teleport(sp.x, sp.z)
      })
      await s.page.waitForTimeout(1500)
      await s.page.evaluate(`(${frame[1].toString()})(window.__sv)`)
      await s.page.waitForTimeout(3000)
      const phases = await s.S(async () => {
        const sim = window.__sv.game.sim
        return sim.state.corpses.slice(-3).map((c) => ({ id: c.id, hoursDead: Math.round((sim.state.time.cal - c.diedAt) / 3600) }))
      })
      const shot = await s.snap(`carrion-${quality}`)
      // Close view at the 12 h carcass.
      await s.S(() => {
        const sv = window.__sv
        const c = sv.game.sim.state.corpses.at(-2)
        sv.approach(c.x, c.z, 2.5)
        sv.game.renderer.rig.distance = 4
        sv.game.renderer.rig.pitch = 0.35
      })
      await s.page.waitForTimeout(1500)
      const shot2 = await s.snap(`carrion-${quality}-close`)
      const opts = await s.S(async () => {
        const c = window.__sv.game.sim.state.corpses.at(-2)
        return window.__rv.opts({ type: 'corpse', id: c.id })
      })
      return { phases, corpseOptions: opts, shots: [shot, shot2] }
    })
  }
}

async function mobile(rt) {
  const s = await rt.start({ seed: '1337', quality: 'low', mobile: true })
  const { page, S } = s
  const step = (name, fn) => rt.step(name, async () => {
    await closeAll(s)
    return fn()
  })
  await step('mobile-explore-buttons', async () => {
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      sv.setHour(11)
      sim.player.combat = false
      const set = sim.world.settlements[sim.world.homeSettlement]
      sv.teleport(set.x + 6, set.z + 6)
      sv.face(set.x, set.z)
    })
    await sleep(page, 2000)
    const btns = await S(() => ['touch-jump', 'touch-block', 'touch-next-target', 'touch-attack'].map((id) => {
      const e = document.querySelector(`[data-testid=${id}]`)
      const r = e?.getBoundingClientRect()
      return { id, text: e?.innerText.trim(), w: r && Math.round(r.width), h: r && Math.round(r.height) }
    }))
    const overlap = await S(() => {
      const j = document.querySelector('[data-testid=touch-jump]').getBoundingClientRect()
      const a = document.querySelector('[data-testid=touch-interact]').getBoundingClientRect()
      const ix = Math.max(0, Math.min(j.right, a.right) - Math.max(j.left, a.left))
      const iy = Math.max(0, Math.min(j.bottom, a.bottom) - Math.max(j.top, a.top))
      const cx = (Math.max(j.left, a.left) + Math.min(j.right, a.right)) / 2
      const cy = (Math.max(j.top, a.top) + Math.min(j.bottom, a.bottom)) / 2
      const top = ix && iy ? document.elementFromPoint(cx, cy)?.closest('[data-testid]')?.dataset.testid : null
      return { jump: [Math.round(j.left), Math.round(j.top), Math.round(j.width)], action: [Math.round(a.left), Math.round(a.top), Math.round(a.width)], overlapPx: [Math.round(ix), Math.round(iy)], topmostInOverlap: top }
    })
    return { btns, overlap, labels: (await labels(s)).map((l) => l.text), shot: await s.snap('mobile-explore') }
  })
  await step('mobile-block-outside-combat', async () => {
    const bb = await page.locator('[data-testid="touch-block"]').boundingBox()
    await page.dispatchEvent('[data-testid="touch-block"]', 'pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: bb.x + 5, clientY: bb.y + 5 })
    await sleep(page, 300)
    const g = await S(() => ({ guard: window.__sv.guard(), combat: window.__sv.game.sim.player.combat, toast: window.__sv.game.toast }))
    await page.dispatchEvent('[data-testid="touch-block"]', 'pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true })
    return g
  })
  await step('mobile-combat-lock', async () => {
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      const sp = sv.openSpot(150)
      sv.teleport(sp.x, sp.z)
      sv.give('wooden_shield', 1)
      sv.game.useItem(sim.player.inv.items.find((x) => x.id === 'wooden_shield'))
      sv.spawn('sheep', 0, 4)
      sv.face(sim.player.x, sim.player.z + 4)
      if (!sim.player.combat) sv.game.toggleCombat()
    })
    await sleep(page, 400)
    await page.tap('[data-testid=touch-next-target]')
    await sleep(page, 800)
    const lock = await S(() => window.__sv.game.combatTargetId)
    const jumpText = await S(() => document.querySelector('[data-testid=touch-jump]')?.innerText.trim())
    const shot = await s.snap('mobile-combat-lock')
    await page.tap('[data-testid=touch-jump]')
    await sleep(page, 600)
    const after = await S(() => ({ stamina: Math.round(window.__sv.game.sim.player.vitals.stamina), toast: window.__sv.game.toast }))
    return { lock, jumpButton: jumpText, afterDodge: after, shot }
  })
  await step('mobile-inn-menu', async () => {
    await S(() => {
      const sv = window.__sv
      const sim = sv.game.sim
      if (sim.player.combat) sv.game.toggleCombat()
      const inn = sim.state.buildings.find((b) => b.kind === 'inn')
      sim.player.money = 50
      sv.approach(inn.x, inn.z, (inn.hd ?? 3) + 1.2)
      sv.step(0.3)
    })
    await sleep(page, 700)
    await page.tap('[data-testid=touch-interact]').catch(() => {})
    await sleep(page, 700)
    const menu = await S(() => [...document.querySelectorAll('[data-testid^=opt-]')].map((e) => {
      const r = e.getBoundingClientRect()
      return { text: e.innerText.trim(), h: Math.round(r.height), overflow: e.scrollWidth > e.clientWidth + 1 }
    }))
    const shot = await s.snap('mobile-inn-menu')
    await page.tap('[data-testid=panel-close]').catch(() => {})
    return { menu, shot }
  })
  await step('mobile-settings-sound', async () => {
    await page.tap('[data-testid=touch-menu-menu]').catch(() => {})
    await sleep(page, 600)
    await page.tap('[data-testid=menu-settings]').catch(() => {})
    await sleep(page, 600)
    const sl = await S(() => [...document.querySelectorAll('input[type=range]')].map((e) => {
      const r = e.getBoundingClientRect()
      return { id: e.dataset.testid, h: Math.round(r.height), w: Math.round(r.width), visible: r.bottom <= window.innerHeight && r.top >= 0 }
    }))
    await S(() => document.querySelector('[data-testid=volume-voices]')?.scrollIntoView())
    await sleep(page, 300)
    return { sliders: sl, shot: await s.snap('mobile-settings-sound') }
  })
  await step('mobile-sharpen', async () => {
    await page.tap('[data-testid=panel-close]').catch(() => {})
    await S(async () => {
      const sv = window.__sv
      const p = sv.game.sim.player
      const { itemDef } = await import('/src/game/data/items.ts')
      const { dullEdge } = await import('/src/game/sim/edge.ts')
      sv.give('knife', 1)
      sv.give('whetstone', 1)
      const k = p.inv.items.find((x) => x.id === 'knife')
      for (let i = 0; i < 25; i++) dullEdge(k, itemDef('knife').weapon)
    })
    await page.tap('[data-testid=touch-menu-inventory]').catch(() => {})
    await sleep(page, 700)
    await page.tap('[data-testid=item-knife]').catch(() => {})
    await sleep(page, 400)
    await S(() => document.querySelector('[data-testid=item-details]')?.scrollIntoView())
    await sleep(page, 300)
    const det = await S(() => document.querySelector('[data-testid=item-details]')?.innerText ?? null)
    const btn = await S(() => {
      const e = document.querySelector('[data-testid=sharpen]')
      if (!e) return null
      const r = e.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    })
    return { details: det, sharpenButton: btn, shot: await s.snap('mobile-sharpen') }
  })
}

export default async function (rt) {
  const only = process.env.SV_FEATURES ?? 'desktop,carrion,mobile'
  if (only.includes('desktop')) await desktop(rt)
  if (only.includes('carrion')) await carrion(rt)
  if (only.includes('mobile')) await mobile(rt)
}
