/**
 * Gifts and item preferences (SOC-01). A gift moves an item from the player to the NPC's pack and
 * raises `npc.opinion` (D-PLAN-3) by value, preference and agreeableness, with diminishing returns per day.
 * Preferences are derived deterministically from role and id (no saved state); an item the NPC already
 * owns is skipped, so a fulfilled wish moves on to the next one.
 * @domain npc
 * @subdomain social
 */
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Human, ItemStack } from './types'
import { GIFT } from '../config/calibration'
import { itemDef } from '../data/items'
import { addItem, qualityMult, removeStack } from './inventory'
import { equipReceived } from './npc/companions'
import { questEvent } from './questHooks'

const DAY_S = 86400

/** Wish lists by profession (household head) or household role. */
export const WISHES: Record<string, string[]> = {
  farmer: ['pan', 'leather_boots', 'bread'],
  woodcutter: ['big_axe', 'leather_gloves', 'stew'],
  hunter: ['long_bow', 'arrow_bodkin', 'leather_boots'],
  guard: ['sword', 'iron_helm', 'chainmail'],
  herbalist: ['arnica', 'pot', 'cloth'],
  trader: ['pearl_shell', 'gold_ore', 'backpack'],
  blacksmith: ['iron_ore', 'coal', 'iron_helm'],
  shepherd: ['blanket', 'cloth', 'sling'],
  spouse: ['cloth', 'pan', 'berries', 'apple'],
  son: ['sword', 'short_sword', 'leather_jerkin', 'spear'],
  child: ['apple', 'berries', 'egg'],
  elder: ['herbal_tea', 'blanket', 'furs'],
}

function wishList(npc: Human): string[] {
  if (npc.profession) return WISHES[npc.profession] ?? []
  if (npc.kin && WISHES[npc.kin]) return WISHES[npc.kin]!
  return npc.age === 'child' ? WISHES.child! : npc.age === 'elder' ? WISHES.elder! : WISHES.spouse!
}

const owns = (npc: Human, id: string) =>
  npc.eq.main?.id === id || npc.inv.items.some((s) => s.id === id) || Object.values(npc.eq.armor).some((s) => s?.id === id)

/** The item the NPC currently wishes for (revealed in conversation), or undefined when content. */
/** Uncountable items read "some bread", the rest "a/an apple" (review 018 #15). */
const MASS_ITEMS = new Set(['berries', 'bread', 'cloth', 'coal', 'cooked_meat', 'dried_meat', 'grain', 'hide', 'milk', 'raw_meat', 'rope', 'salve', 'wool'])
export function withArticle(itemId: string, name: string): string {
  const n = name.toLowerCase()
  if (MASS_ITEMS.has(itemId) || /s$/.test(n)) return `some ${n}`
  return `${/^[aeiou]/.test(n) ? 'an' : 'a'} ${n}`
}

export function wantedItem(npc: Human): string | undefined {
  const list = wishList(npc)
  const start = (npc.id * 2654435761) >>> 0
  for (let i = 0; i < list.length; i++) {
    const id = list[(start + i) % list.length]!
    if (!owns(npc, id)) return id
  }
  return undefined
}

/** Favours (gifts, purchases) the NPC already received today — each further one counts less. */
export function goodwillToday(sim: Sim, npc: Human): number {
  const today = Math.floor(sim.state.time.cal / DAY_S)
  return npc.gifts?.day === today ? npc.gifts.n : 0
}

export function countGoodwill(sim: Sim, npc: Human) {
  npc.gifts = { day: Math.floor(sim.state.time.cal / DAY_S), n: goodwillToday(sim, npc) + 1 }
}

/** Value of a stack for gift purposes (price × quality, spoiled food and worn gear count less). */
export function giftValue(s: ItemStack, qty = s.qty): number {
  const d = itemDef(s.id)
  const spoiled = s.fresh !== undefined && d.food && s.fresh < d.food.spoilH * 0.3 ? 0.3 : 1
  const worn = s.dur !== undefined && d.durability ? 0.4 + 0.6 * (s.dur / d.durability) : 1
  return d.price * qualityMult(s) * spoiled * worn * qty
}

/** Opinion gain a gift would bring now (before applying). */
export function giftGain(sim: Sim, npc: Human, s: ItemStack, qty = s.qty): number {
  const value = giftValue(s, qty)
  if (value <= 0) return 0
  const want = wantedItem(npc)
  const pref = s.id === want ? GIFT.wantedMul : want && itemDef(want).category === itemDef(s.id).category ? GIFT.likedMul : 1
  const given = goodwillToday(sim, npc)
  // The value part is capped first, so a wished-for item still counts more than an expensive random one.
  const byValue = Math.min(GIFT.maxGain, GIFT.base + GIFT.perLog * Math.log2(1 + value / GIFT.valueUnit))
  return (byValue * pref * (0.7 + npc.big5.a * 0.6)) / (1 + given)
}

export function giveGift(sim: Sim, npc: Human, stack: ItemStack, qty = stack.qty): ActionResult {
  const p = sim.player
  if (!p.inv.items.includes(stack)) return { ok: false, msg: 'You don\'t have that.' }
  if (npc.vitals.dead) return { ok: false, msg: '' }
  const q = Math.min(qty, stack.qty)
  const gain = giftGain(sim, npc, stack, q)
  const wanted = stack.id === wantedItem(npc)
  const given = removeStack(p.inv, stack, q)!
  addItem(npc.inv, given)
  countGoodwill(sim, npc)
  npc.opinion = Math.min(100, npc.opinion + gain)
  equipReceived(npc)
  questEvent(sim, { k: 'give', npcId: npc.id, item: given.id, qty: given.qty })
  const name = itemDef(given.id).name
  if (wanted) return { ok: true, msg: `${npc.name} is delighted with the ${name.toLowerCase()}!` }
  return { ok: true, msg: gain >= 3 ? `${npc.name} thanks you for the ${name.toLowerCase()}.` : `${npc.name} takes the ${name.toLowerCase()} politely.` }
}
