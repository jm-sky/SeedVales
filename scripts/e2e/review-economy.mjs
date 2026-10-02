/**
 * review-economy: trade with the trader and a non-trader NPC, gift, hire a companion, warehouse take/deposit,
 * smith order. Evidence: buy/sell prices of 10 common goods, opinion changes, treasury before/after, refusal texts.
 */
const GOODS = ['bread', 'apple', 'carrot', 'cooked_meat', 'log', 'branch', 'stone', 'rope', 'bandage', 'knife']

/** In-page: open a panel for an npc option, return the panel text. */
async function openFor(s, npcId, option) {
  const r = await s.S(([id, opt]) => window.__rv.choose({ type: 'npc', id }, opt), [npcId, option])
  await s.page.waitForTimeout(500)
  return r
}
const panelText = (s) => s.page.locator('[data-testid=panel]').innerText().catch(() => null)

async function pricesFor(s, npcId) {
  return s.S(async ([id, goods]) => {
    const rv = window.__rv
    const sim = window.__sv.game.sim
    const { buyPrice, sellPrice, tradeStock } = await rv.mod('sim/trade')
    const { itemDef } = await rv.mod('data/items')
    const { newStack } = await rv.mod('sim/inventory')
    const npc = sim.human(id)
    const stock = tradeStock(sim, npc)
    return {
      npc: { name: npc.name, profession: npc.profession ?? null, money: npc.money, opinion: npc.opinion },
      stockOffered: stock.map((e) => `${e.stack.id}x${e.max}`),
      goods: goods.map((g) => {
        const st = newStack(g, 1)
        return { id: g, basePrice: itemDef(g).price, playerPaysToBuy: buyPrice(sim, npc, st), playerGetsWhenSelling: sellPrice(sim, npc, st), npcWillSell: stock.some((e) => e.stack.id === g) }
      }),
    }
  }, [npcId, GOODS])
}

export default async function (rt) {
  const s = await rt.start()
  const { S } = s
  await S(() => {
    window.__sv.pause(true)
    window.__sv.give('apple', 3)
    window.__sv.give('bread', 2)
    window.__sv.give('stone', 4)
  })
  await s.page.waitForTimeout(1500)
  const sid = 0
  rt.note('treasuryStart', await S(() => window.__rv.treasury()))
  rt.note('moneyStart', await S(() => window.__rv.coins()))

  const traderId = await S(() => (window.__rv.npc('trader') ?? window.__rv.findNpc((n) => n.profession === 'trader'))?.id ?? null)
  const otherId = await S(() => {
    const rv = window.__rv
    const n = rv.findNpc((x) => x.settlementId === 0 && x.age === 'adult' && !['blacksmith', 'guard', 'herbalist', 'hunter', 'trader'].includes(x.profession))
    return n?.id ?? null
  })
  rt.note('npcs', { traderId, otherId })

  for (const [label, id] of [['trader', traderId], ['non-trader', otherId]]) {
    await rt.step(`prices-${label}`, async () => {
      if (id === null) return { ok: false, reason: `no ${label} NPC found` }
      return pricesFor(s, id)
    })
    await rt.step(`trade-panel-${label}`, async () => {
      if (id === null) return { ok: false, reason: `no ${label} NPC found` }
      await S((i) => {
        const n = window.__rv.mod && window.__sv.game.sim.human(i)
        window.__rv.stand(n.x, n.z, 1.6)
      }, id)
      const open = await openFor(s, id, 'trade')
      const text = await panelText(s)
      const file = await s.snap(`trade-panel-${label}`)
      // Real purchase through the panel buttons: first affordable offered item.
      const buy = await s.page.locator('[data-testid^="buy-"]').first()
      const hasBuy = (await buy.count()) > 0
      const before = await S((i) => ({ money: window.__rv.coins(), opinion: window.__sv.game.sim.human(i).opinion, npcMoney: window.__sv.game.sim.human(i).money, treasury: window.__rv.treasury() }), id)
      let bought = null
      if (hasBuy) {
        const tid = await buy.getAttribute('data-testid')
        await buy.click()
        await s.page.waitForTimeout(300)
        bought = { item: tid, toast: await S(() => window.__sv.game.toast) }
      }
      const sellBtn = s.page.locator('[data-testid="sell-apple"]')
      let sold = null
      if ((await sellBtn.count()) > 0) {
        await sellBtn.first().click()
        await s.page.waitForTimeout(300)
        sold = { item: 'sell-apple', toast: await S(() => window.__sv.game.toast) }
      }
      const after = await S((i) => ({ money: window.__rv.coins(), opinion: window.__sv.game.sim.human(i).opinion, npcMoney: window.__sv.game.sim.human(i).money, treasury: window.__rv.treasury() }), id)
      const file2 = await s.snap(`trade-after-${label}`)
      await S(() => window.__sv.game.closePanel())
      return { open, panelText: text, bought, sold, before, after, files: [file, file2] }
    })
    await rt.step(`refusal-texts-${label}`, async () => {
      if (id === null) return { ok: false, reason: `no ${label} NPC found` }
      return S(async (i) => {
        const rv = window.__rv
        const sim = window.__sv.game.sim
        const { buyFromNpc, sellToNpc, tradeStock } = await rv.mod('sim/trade')
        const { newStack } = await rv.mod('sim/inventory')
        const npc = sim.human(i)
        const out = {}
        const money = sim.player.money
        const stock = tradeStock(sim, npc)
        if (stock[0]) {
          sim.player.money = 0
          out.buyWithoutMoney = buyFromNpc(sim, npc, stock[0].stack).msg
          sim.player.money = money
        }
        out.buyNotOffered = buyFromNpc(sim, npc, newStack('gold_ore', 1)).msg
        out.sellNotOwned = sellToNpc(sim, npc, newStack('gold_ore', 1)).msg
        return out
      }, id)
    })
  }

  await rt.step('gift', async () => {
    if (otherId === null) return { ok: false, reason: 'no non-trader NPC' }
    const info = await S(async (i) => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const { wantedItem } = await rv.mod('sim/gifts')
      const n = sim.human(i)
      rv.stand(n.x, n.z, 1.6)
      const want = wantedItem(n)
      if (want) window.__sv.give(want, 2)
      window.__sv.give('apple', 2)
      return { name: n.name, wanted: want ?? null, opinionBefore: n.opinion }
    }, otherId)
    const open = await openFor(s, otherId, 'gift')
    const file = await s.snap('gift-panel')
    const deltas = []
    for (const item of [info.wanted, 'apple', 'apple'].filter(Boolean)) {
      const btn = s.page.locator(`[data-testid="gift-${item}"]`)
      if (!(await btn.count())) {
        deltas.push({ item, ok: false, reason: 'no button' })
        continue
      }
      const o0 = await S((i) => window.__sv.game.sim.human(i).opinion, otherId)
      await btn.first().click()
      await s.page.waitForTimeout(300)
      const o1 = await S((i) => window.__sv.game.sim.human(i).opinion, otherId)
      deltas.push({ item, opinionDelta: +(o1 - o0).toFixed(2), toast: await S(() => window.__sv.game.toast) })
    }
    await S(() => window.__sv.game.closePanel())
    return { ...info, open, giftSequence: deltas, file }
  })

  await rt.step('hire-companion', async () => {
    if (otherId === null) return { ok: false, reason: 'no non-trader NPC' }
    const open = await openFor(s, otherId, 'hire')
    if (open.ok === false) return { ok: false, reason: open.reason ?? 'hire not offered', open }
    const text = await panelText(s)
    const info = await S(async (i) => {
      const rv = window.__rv
      const sim = window.__sv.game.sim
      const { hirePrice, hireRefusal } = await rv.mod('sim/npc/companions')
      const n = sim.human(i)
      return { name: n.name, price1DayEscortLow: hirePrice(n, 'escort', 'low', 1), refusal: hireRefusal(sim, n, 'escort', 'low') ?? null, moneyBefore: sim.player.money, npcMoneyBefore: n.money }
    }, otherId)
    const file = await s.snap('hire-panel')
    await s.page.click('[data-testid=hire-confirm]')
    await s.page.waitForTimeout(400)
    const after = await S((i) => ({ money: window.__rv.coins(), npcMoney: window.__sv.game.sim.human(i).money, companion: !!window.__sv.game.sim.human(i).companion, toast: window.__sv.game.toast, panel: window.__sv.game.panel }), otherId)
    const dismiss = await S((i) => window.__rv.choose({ type: 'npc', id: i }, 'dismiss'), otherId)
    return { panelText: text, ...info, after, dismiss, file }
  })

  await rt.step('warehouse', async () => {
    const wh = await S(() => {
      const rv = window.__rv
      const b = rv.bld('warehouse') ?? rv.findBld('warehouse')
      if (!b) return null
      rv.stand(b.x, b.z, 2.2)
      return { id: b.id, items: (b.inv?.items ?? []).map((i) => `${i.id}x${i.qty}`) }
    })
    if (!wh) return { ok: false, reason: 'no warehouse' }
    const before = await S(() => ({ money: window.__rv.coins(), rep: window.__sv.game.sim.state.settlements[0].rep, treasury: window.__rv.treasury() }))
    const open = await S((id) => window.__rv.choose({ type: 'building', id }, 'storage'), wh.id)
    await s.page.waitForTimeout(500)
    const file = await s.snap('warehouse-panel')
    const text = await panelText(s)
    const res = { stock: wh.items, open, panelText: text, before }
    const take = s.page.locator('[data-testid^="take-"]').first()
    if (await take.count()) {
      const tid = await take.getAttribute('data-testid')
      await take.click()
      await s.page.waitForTimeout(300)
      res.take = { button: tid, toast: await S(() => window.__sv.game.toast), log: await S(() => window.__rv.msgs(3)) }
    } else res.take = { ok: false, reason: 'no take button (empty warehouse?)' }
    const put = s.page.locator('[data-testid="put-stone"]')
    if (await put.count()) {
      await put.first().click()
      await s.page.waitForTimeout(300)
      res.deposit = { button: 'put-stone', toast: await S(() => window.__sv.game.toast) }
    } else res.deposit = { ok: false, reason: 'no put-stone button' }
    res.after = await S(() => ({ money: window.__rv.coins(), rep: window.__sv.game.sim.state.settlements[0].rep, treasury: window.__rv.treasury() }))
    res.fileAfter = await s.snap('warehouse-after')
    await S(() => window.__sv.game.closePanel())
    return { ...res, file }
  })

  await rt.step('smith-order', async () => {
    const smithId = await S(() => (window.__rv.npc('blacksmith') ?? window.__rv.findNpc((n) => n.profession === 'blacksmith'))?.id ?? null)
    if (smithId === null) return { ok: false, reason: 'no blacksmith in the world' }
    await S((i) => {
      const n = window.__sv.game.sim.human(i)
      window.__rv.stand(n.x, n.z, 1.6)
    }, smithId)
    const open = await openFor(s, smithId, 'orders')
    if (open.ok === false) return { ok: false, reason: open.reason ?? 'orders not offered', open }
    const text = await panelText(s)
    const file = await s.snap('orders-panel')
    const btn = s.page.locator('[data-testid^="order-"]:not([disabled])').first()
    const before = await S(() => ({ money: window.__rv.coins() }))
    const res = { open, panelText: text, before }
    if (await btn.count()) {
      const tid = await btn.getAttribute('data-testid')
      await btn.click()
      await s.page.waitForTimeout(400)
      res.order = { button: tid, toast: await S(() => window.__sv.game.toast) }
    } else {
      res.order = { ok: false, reason: 'every order button disabled (smith lacks materials)' }
      res.refusal = await S(async (i) => {
        const rv = window.__rv
        const { placeOrder } = await rv.mod('sim/orders')
        const { RECIPES } = await rv.mod('data/recipes')
        const r = RECIPES.find((x) => x.category === 'smithing' && x.quality)
        return r ? placeOrder(window.__sv.game.sim, window.__sv.game.sim.human(i), r.id) : 'no smithing recipe'
      }, smithId)
    }
    res.after = await S(() => ({ money: window.__rv.coins(), orders: window.__sv.game.sim.state.px.orders.map((o) => ({ item: o.itemId, paid: o.paid, price: o.price, readyInH: +((o.readyAt - window.__sv.game.sim.state.time.cal) / 3600).toFixed(1) })) }))
    res.fileAfter = await s.snap('orders-after')
    await S(() => window.__sv.game.closePanel())
    return { ...res, file }
  })

  rt.note('treasuryEnd', await S(() => window.__rv.treasury()))
  rt.note('moneyEnd', await S(() => window.__rv.coins()))
  void sid
}
