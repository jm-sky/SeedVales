/**
 * Content audits (review 013 audit A + B, findings C-01, C-02, C-04, M-10).
 *  A. Item reachability: every NPC wish, recipe ingredient, blueprint material and the ammo of every obtainable
 *     weapon is reachable from the game's sources; every `active` item has a source; `future` markers are honest.
 *  B. Recipe economy: input value vs output value per recipe, accepted ratio band per recipe class, explicit and
 *     commented exceptions. The audit documents the economy, it does not recalibrate prices (deferred, L3).
 */
import { describe, expect, it } from 'vitest'
import { WISHES } from '../sim/gifts'
import { HERB_IDS } from '../world/nodes'
import { itemDef, ITEMS } from './items'
import { availabilityOf, blueprintMaterials, itemSources, PLAYER_START_ITEMS } from './itemSources'
import { PROFESSIONS } from './professions'
import { CLASS_OF, EXCEPTIONS, RATIO_BANDS, recipeEconomy } from './recipeEconomy'
import { isOrderable, RECIPES } from './recipes'

const sources = itemSources()
const reachable = (id: string) => sources.has(id)
const active = (id: string) => availabilityOf(itemDef(id)) === 'active'

describe('item reachability audit (C-01, C-02)', () => {
  it('C-02: catalogue ids referenced by data all exist and availability is a known value', () => {
    for (const d of Object.values(ITEMS)) expect(['active', 'future', 'quest-only', 'unique']).toContain(availabilityOf(d))
    for (const id of [...Object.values(WISHES).flat(), ...blueprintMaterials(), ...PLAYER_START_ITEMS.map((s) => s[0])]) expect(ITEMS[id], id).toBeDefined()
  })

  it('C-01: the herb node table and the herb items agree (gathering source is complete)', () => {
    expect([...HERB_IDS].sort()).toEqual(Object.values(ITEMS).filter((d) => d.category === 'herb').map((d) => d.id).sort())
  })

  it('C-01: every NPC wish is an active item the player can obtain', () => {
    const bad: string[] = []
    for (const [who, list] of Object.entries(WISHES)) {
      for (const id of list) {
        if (!active(id)) bad.push(`${who} wishes for ${id}: not active`)
        else if (!reachable(id)) bad.push(`${who} wishes for ${id}: no source`)
      }
    }
    expect(bad).toEqual([])
  })

  it('C-01: every recipe input and output, blueprint material and cooking input is active and obtainable', () => {
    const bad: string[] = []
    for (const r of RECIPES) {
      for (const i of [...r.inputs.map((x) => x.item), r.output.item]) {
        if (!active(i)) bad.push(`recipe ${r.id}: ${i} is not active`)
        else if (!reachable(i)) bad.push(`recipe ${r.id}: ${i} unobtainable`)
      }
    }
    for (const m of blueprintMaterials()) if (!reachable(m) || !active(m)) bad.push(`blueprint material ${m} unobtainable`)
    expect(bad).toEqual([])
  })

  it('C-01: every obtainable ranged weapon has obtainable ammo of its kind', () => {
    const bad: string[] = []
    for (const d of Object.values(ITEMS)) {
      if (d.weapon?.kind !== 'ranged' || !reachable(d.id)) continue
      const ammo = Object.values(ITEMS).filter((a) => a.category === 'ammo' && a.ammoKind === d.weapon!.ammo)
      if (!ammo.some((a) => active(a.id) && reachable(a.id))) bad.push(`${d.id} (${d.weapon.ammo}) has no obtainable ammo`)
    }
    expect(bad).toEqual([])
  })

  it('C-02: every active item has at least one source (quest-only/unique are exempt)', () => {
    const dead = Object.values(ITEMS).filter((d) => availabilityOf(d) === 'active' && !reachable(d.id)).map((d) => d.id)
    expect(dead).toEqual([])
  })

  it('C-02: `future` items are really unreachable and used nowhere (stores, kits, wishes, recipes) — remove the marker once wired', () => {
    const future = Object.values(ITEMS).filter((d) => availabilityOf(d) === 'future').map((d) => d.id)
    expect(future.length).toBeGreaterThan(0)
    const used = new Set<string>([
      ...blueprintMaterials(),
      ...Object.values(PROFESSIONS).flatMap((p) => [p.weapon, ...p.kit.map((k) => k.item), ...p.store.map((s) => s.item)]),
      ...Object.values(WISHES).flat(),
      ...PLAYER_START_ITEMS.map((s) => s[0]),
      ...RECIPES.flatMap((r) => [...r.inputs.map((i) => i.item), r.output.item]),
    ])
    for (const id of future) {
      expect(reachable(id), `${id} is marked future but has a source`).toBe(false)
      expect(used.has(id), `${id} is marked future but referenced by game data`).toBe(false)
    }
  })

  it('C-01: the profession kits are not a purchase channel (kit-only items are unobtainable)', () => {
    // short_sword/spear style kit weapons must come from a recipe or store, else the guard wish chain breaks.
    for (const p of Object.values(PROFESSIONS)) for (const k of p.kit) if (!active(k.item)) throw new Error(`${p.id} kit has non-active ${k.item}`)
  })
})

describe('station kinds (C-04)', () => {
  it('C-04: every recipe station is a structure kind the generator/blueprints can produce', () => {
    const stationKinds = new Set(RECIPES.map((r) => r.station).filter(Boolean))
    // workbench was removed: it had no world structure.
    expect([...stationKinds].sort()).toEqual(['anvil', 'campfire', 'dryrack'])
  })
})

// ---------------------------------------------------------------------------------------------------------
// B. Recipe economy audit (M-10)
// ---------------------------------------------------------------------------------------------------------

describe('recipe economy audit (M-10)', () => {
  it('M-10: every recipe is classified, and every exception names an existing recipe', () => {
    for (const r of RECIPES) expect(CLASS_OF[r.id], `recipe ${r.id} has no economy class`).toBeDefined()
    for (const id of Object.keys(CLASS_OF)) expect(RECIPES.some((r) => r.id === id), `class entry for unknown recipe ${id}`).toBe(true)
    for (const id of Object.keys(EXCEPTIONS)) expect(RECIPES.some((r) => r.id === id)).toBe(true)
  })

  it('M-10: output/input value ratio is inside the class band, except the documented exceptions', () => {
    const out: string[] = []
    for (const e of recipeEconomy()) {
      const [lo, hi] = RATIO_BANDS[e.cls!]
      const inBand = e.ratio >= lo - 1e-9 && e.ratio <= hi + 1e-9
      if (!inBand && !EXCEPTIONS[e.id]) out.push(`${e.id} (${e.cls}): in ${e.input} c → out ${e.output} c, ratio ${e.ratio.toFixed(2)} outside [${lo}, ${hi}]`)
      if (inBand && EXCEPTIONS[e.id]) out.push(`${e.id}: listed as an exception but inside its band — remove the exception`)
    }
    expect(out).toEqual([])
  })

  it('M-10: orderable recipes make exactly one item (orders ignore output quantity)', () => {
    for (const r of RECIPES.filter(isOrderable)) expect(r.output.qty, r.id).toBe(1)
  })
})
