/**
 * Where items come from (review 013 C-01/C-02, audit A): the non-recipe sources of the game plus a
 * reachability graph over sources → recipes → items. Used by the content audit test; the start-gear
 * constants are also what `newGame` uses, so the audit and the game cannot drift apart for those.
 * The gathering/mining/digging/farming tables mirror the yields in `sim/actions.ts`, `sim/npc/works.ts`
 * and `sim/worldSystems.ts` (comments point at them); the audit test cross-checks them against the data.
 * @domain items
 */
import type { ItemDef } from './items'
import { ITEMS } from './items'
import { TREASURE_TABLE } from './loot'
import { PROFESSIONS } from './professions'
import { BLUEPRINTS, isOrderable, RECIPES } from './recipes'
import { SPECIES } from './species'

export type ItemSourceKind =
  | 'start_gear'
  | 'warehouse'
  | 'pantry'
  | 'trade_stock'
  | 'recipe'
  | 'smith_order'
  | 'cooking'
  | 'gathering'
  | 'butchering'
  | 'mining'
  | 'digging'
  | 'farming'
  | 'household'
  | 'shearing'
  | 'treasure'

type Stock = readonly (readonly [item: string, qty: number])[]

/** New-game inventory of the player (equipped club comes on top, see `PLAYER_START_WEAPON`). */
export const PLAYER_START_ITEMS: Stock = [['knife', 1], ['waterskin_m', 1], ['bread', 2], ['apple', 3], ['bandage', 2], ['flint', 1], ['torch', 2], ['blanket', 1]]
export const PLAYER_START_WEAPON = 'club'

/** Settlement warehouse stock at world start. */
export const WAREHOUSE_START: Stock = [['bread', 6], ['grain', 20], ['carrot', 10], ['log', 6], ['branch', 20], ['stone', 20], ['rope', 2], ['cloth', 3]]

/** Added to every household store besides the profession store. */
export const HOUSEHOLD_PANTRY: Stock = [['bread', 2], ['branch', 4]]

/** Household background food production (abstracted kitchen garden/hens/cow/baking, `worldSystems.households`). */
export const HOUSEHOLD_PRODUCE = {
  winter: ['bread', 'dried_meat', 'cabbage', 'egg'],
  other: ['bread', 'carrot', 'cabbage', 'egg', 'milk', 'tomato', 'apple'],
} as const

/** Field crops (`FieldCrop`): harvested by farmers into the household store (`works.harvest_field`). */
export const FIELD_CROPS = ['carrot', 'cabbage', 'grain', 'tomato'] as const

/** Node/yield tables: `gatherNode`, `fellTree` (log, branches, apples), `mineRock` (stone, rock chunks, ore). */
export const GATHERED_ITEMS = ['branch', 'berries', 'mushroom', 'apple', 'stone', 'log'] as const
export const MINED_ITEMS = ['stone', 'rock_chunk', 'coal', 'iron_ore', 'copper_ore', 'gold_ore'] as const
/** `dig`: shells near the sea (pearl shells rarely) and ore deposits. */
export const DUG_ITEMS = ['shell', 'pearl_shell', 'coal', 'iron_ore', 'copper_ore', 'gold_ore'] as const
/** Sheep shearing by shepherds (`works.shear`), regrows after WOOL_REGROW_DAYS. */
export const SHEARED_ITEMS = ['wool'] as const

/** Cooking over a fire (`sim/cooking.ts`) — not a crafting recipe. */
export const COOKING: readonly { inputs: string[]; output: string }[] = [{ inputs: ['raw_meat'], output: 'cooked_meat' }]

/** Item ids with a given availability tag (default `active`). */
export const availabilityOf = (d: ItemDef) => d.availability ?? 'active'

type Origins = Map<string, Set<ItemSourceKind>>

/** Items with a source that needs no other item (the roots of the graph). */
function baseSources(): Origins {
  const o: Origins = new Map()
  const add = (id: string, kind: ItemSourceKind) => {
    if (!o.has(id)) o.set(id, new Set())
    o.get(id)!.add(kind)
  }
  for (const [id] of PLAYER_START_ITEMS) add(id, 'start_gear')
  add(PLAYER_START_WEAPON, 'start_gear')
  for (const [id] of WAREHOUSE_START) add(id, 'warehouse')
  for (const [id] of HOUSEHOLD_PANTRY) add(id, 'pantry')
  // Any NPC sells its surplus (TRADE-02): every profession's household store is trade stock. The kit is NOT:
  // it is kept back by `tradeStock`, so kit-only items are not obtainable by the player.
  for (const p of Object.values(PROFESSIONS)) for (const s of p.store) add(s.item, 'trade_stock')
  for (const id of [...HOUSEHOLD_PRODUCE.winter, ...HOUSEHOLD_PRODUCE.other]) add(id, 'household')
  for (const id of FIELD_CROPS) add(id, 'farming')
  for (const id of GATHERED_ITEMS) add(id, 'gathering')
  for (const d of Object.values(ITEMS)) if (d.category === 'herb') add(d.id, 'gathering')
  for (const id of MINED_ITEMS) add(id, 'mining')
  for (const id of DUG_ITEMS) add(id, 'digging')
  for (const id of SHEARED_ITEMS) add(id, 'shearing')
  for (const e of TREASURE_TABLE) add(e.item, 'treasure')
  for (const sp of Object.values(SPECIES)) {
    if (sp.corpse.meat > 0) add('raw_meat', 'butchering')
    if (sp.corpse.hide > 0) add('hide', 'butchering')
    if (sp.corpse.bone > 0) add('bone', 'butchering')
    if (sp.corpse.antler) add('antler', 'butchering')
  }
  add('white_pelt', 'butchering') // an albino hare (FAUNA-09)
  return o
}

/**
 * Reachability fixpoint: an item is obtainable when a base source gives it, or a recipe/cooking step whose
 * inputs are all obtainable produces it. Returns the sources per obtainable item.
 */
export function itemSources(): Origins {
  const o = baseSources()
  let changed = true
  while (changed) {
    changed = false
    const have = (id: string) => o.has(id)
    const derive = (out: string, inputs: string[], kind: ItemSourceKind) => {
      if (!inputs.every(have)) return
      const set = o.get(out) ?? new Set<ItemSourceKind>()
      if (!set.has(kind)) {
        set.add(kind)
        o.set(out, set)
        changed = true
      }
    }
    for (const r of RECIPES) {
      const inputs = r.inputs.map((i) => i.item)
      derive(r.output.item, inputs, 'recipe')
      if (isOrderable(r)) derive(r.output.item, inputs, 'smith_order')
    }
    for (const c of COOKING) derive(c.output, c.inputs, 'cooking')
  }
  return o
}

/** Items building blueprints consume. */
export const blueprintMaterials = () => [...new Set(BLUEPRINTS.flatMap((b) => b.materials.map((m) => m.item)))]
