/**
 * Item catalogue (data-driven). Prices in copper coins. Weight in kg. Spoil in calendar hours.
 * @domain items
 */

export type Capability =
  | 'cut'
  | 'chop'
  | 'dig'
  | 'mine'
  | 'carry_water'
  | 'scoop'
  | 'light'
  | 'hammer'
  | 'sew'
  | 'fire_start'
  /** Pan or pot: roast two pieces at once (FOOD-03). */
  | 'cook_vessel'
  /** Whetstone: restores a blade's edge. */
  | 'sharpen'

/** Player-facing name of the tool that provides a capability (used in "Missing: …" reasons). */
export const CAPABILITY_NAMES: Record<Capability, string> = {
  cut: 'knife',
  chop: 'axe',
  dig: 'shovel',
  mine: 'pickaxe',
  carry_water: 'water container',
  scoop: 'bucket',
  light: 'torch',
  hammer: 'hammer',
  sew: 'sewing kit',
  fire_start: 'flint and steel or torch',
  cook_vessel: 'pan or pot',
  sharpen: 'whetstone',
}

export type ItemCategory = 'weapon' | 'armor' | 'tool' | 'food' | 'resource' | 'herb' | 'medical' | 'misc' | 'ammo'
export type SizeClass = 'XXS' | 'XS' | 'SM' | 'MD' | 'LG' | 'XL'
export type DamageType = 'cut' | 'pierce' | 'blunt'
export type ArmorSlot = 'boots' | 'legs' | 'torso' | 'head' | 'hands' | 'forearms' | 'shoulders'
export type ArmorLayer = 'under' | 'outer'
export type AmmoKind = 'arrow' | 'bolt' | 'stone'

export interface WeaponStats {
  kind: 'melee' | 'ranged'
  reach: number
  damage: number
  dmgType: DamageType
  /** Seconds between swings/shots (gameplay seconds). */
  cooldown: number
  sharpness: number
  stamina: number
  ammo?: AmmoKind
  /** Full draw time (s) for bows. */
  drawTime?: number
  projSpeed?: number
  twoHanded?: boolean
}

export interface ArmorStats {
  slot: ArmorSlot
  layer: ArmorLayer
  resist: Record<DamageType, number>
  speedPenalty: number
}

export interface FoodStats {
  nutrition: number
  water?: number
  spoilH: number
  raw?: boolean
  illnessChance?: number
}

export interface HerbStats {
  heal: number
  poison?: number
  cures?: boolean
  rarity: 'common' | 'medium' | 'rare'
}

/**
 * Content status (review 013 C-02): `active` items must be obtainable in the game (audit: itemSources);
 * `future` = catalogue-only, not wired to any source yet (must not appear in wishes, recipes, stores);
 * `quest-only` = obtainable only as an authored-quest reward; `unique` = a single deliberate instance.
 */
export type ItemAvailability = 'active' | 'future' | 'quest-only' | 'unique'

/** Block/parry stats of a held shield (combat--002); weapons use the class table `DEFENCE` in calibration. */
export interface DefenceStats {
  arcDeg: number
  reduction: number
  efficiency: number
  parryWindowS: number
  canParry: boolean
}

export interface ItemDef {
  id: string
  name: string
  category: ItemCategory
  weight: number
  size: SizeClass
  price: number
  stack?: boolean
  durability?: number
  caps?: Capability[]
  weapon?: WeaponStats
  /** Held in the off hand to block (shield). */
  defence?: DefenceStats
  armor?: ArmorStats
  food?: FoodStats
  herb?: HerbStats
  heal?: number
  /** Extra carrying capacity (kg) when in inventory. */
  carryBonus?: number
  /** Pushed cart (TRANS-01): heavy-goods capacity (kg) and walking-speed multiplier while pushing. */
  cart?: { capacity: number; speed: number }
  /** Drinks held (waterskins/bucket). */
  waterCapacity?: number
  light?: number
  ammoKind?: AmmoKind
  damageBonus?: number
  /** Content status; missing = `active`. */
  availability?: ItemAvailability
}

const res = (id: string, name: string, weight: number, size: SizeClass, price: number): ItemDef => ({
  id, name, category: 'resource', weight, size, price, stack: true,
})
const food = (id: string, name: string, weight: number, price: number, f: FoodStats): ItemDef => ({
  id, name, category: 'food', weight, size: 'SM', price, stack: true, food: f,
})
const herb = (id: string, name: string, price: number, h: HerbStats): ItemDef => ({
  id, name, category: 'herb', weight: 0.05, size: 'XS', price, stack: true, herb: h, food: { nutrition: 1, spoilH: 24 * 6 },
})
const melee = (id: string, name: string, weight: number, price: number, w: Omit<WeaponStats, 'kind'>, caps?: Capability[]): ItemDef => ({
  id, name, category: 'weapon', weight, size: w.reach > 1.6 ? 'XL' : w.reach > 1.1 ? 'LG' : 'MD', price, durability: 200, weapon: { kind: 'melee', ...w }, caps,
})
const ranged = (id: string, name: string, weight: number, price: number, w: Omit<WeaponStats, 'kind' | 'reach' | 'sharpness'>): ItemDef => ({
  id, name, category: 'weapon', weight, size: 'LG', price, durability: 150, weapon: { kind: 'ranged', reach: 60, sharpness: 0, ...w },
})
const armor = (id: string, name: string, weight: number, price: number, a: ArmorStats): ItemDef => ({
  id, name, category: 'armor', weight, size: 'MD', price, durability: 300, armor: a,
})
const tool = (id: string, name: string, weight: number, size: SizeClass, price: number, caps: Capability[], extra: Partial<ItemDef> = {}): ItemDef => ({
  id, name, category: 'tool', weight, size, price, durability: 250, caps, ...extra,
})

const LIST: ItemDef[] = [
  // Resources
  res('log', 'Log', 18, 'LG', 12),
  res('branch', 'Branch', 1.2, 'MD', 1),
  res('stone', 'Stone', 3, 'SM', 1),
  res('rock_chunk', 'Rock chunk', 12, 'LG', 2),
  res('coal', 'Coal', 2, 'SM', 4),
  res('iron_ore', 'Iron ore', 3, 'SM', 8),
  res('copper_ore', 'Copper ore', 3, 'SM', 7),
  res('gold_ore', 'Gold ore', 3, 'SM', 60),
  res('iron_ingot', 'Iron ingot', 2, 'SM', 30),
  res('hide', 'Hide', 3, 'MD', 15),
  res('wool', 'Wool', 1, 'SM', 6),
  res('bone', 'Bones', 1, 'SM', 1),
  res('antler', 'Antler', 2, 'MD', 20),
  res('cloth', 'Cloth', 0.5, 'SM', 8),
  res('rope', 'Rope', 1.5, 'MD', 10),
  res('shell', 'Shell', 0.05, 'XS', 2),
  res('pearl_shell', 'Pearl shell', 0.05, 'XS', 80),
  res('grain', 'Grain', 1, 'SM', 3),
  // Valuables (LOOT-01): found only as treasure; the trader pays well, other NPCs little (cash limit).
  res('gold_ring', 'Gold ring', 0.02, 'XXS', 120),
  res('ruby', 'Ruby', 0.01, 'XXS', 220),
  res('emerald', 'Emerald', 0.01, 'XXS', 280),
  res('diamond', 'Diamond', 0.01, 'XXS', 520),
  // Food
  food('berries', 'Berries', 0.2, 2, { nutrition: 6, water: 2, spoilH: 48 }),
  food('apple', 'Apple', 0.2, 2, { nutrition: 8, water: 3, spoilH: 24 * 10 }),
  food('mushroom', 'Mushroom', 0.1, 2, { nutrition: 5, spoilH: 48, illnessChance: 0.05 }),
  { id: 'axe_head', name: 'Axe head', category: 'misc', weight: 2.5, size: 'SM', price: 24, availability: 'quest-only' },
  { id: 'iron_wedge', name: 'Iron wedge', category: 'misc', weight: 0.8, size: 'XS', price: 6, availability: 'quest-only' },
  { id: 'miles_mark', name: 'Miles\'s mark', category: 'misc', weight: 0.05, size: 'XXS', price: 0, availability: 'quest-only' },
  { id: 'letter', name: 'Sealed letter', category: 'misc', weight: 0.05, size: 'XS', price: 0, availability: 'quest-only' },
  { id: 'plowshare', name: 'Plowshare', category: 'tool', weight: 8, size: 'XL', price: 30, durability: 300, caps: [], availability: 'quest-only' },
  res('white_pelt', 'White hare pelt', 0.3, 'SM', 30),
  { ...tool('saw', 'Saw', 1.4, 'MD', 35, ['cut']), availability: 'quest-only' },
  { ...tool('shears', 'Shears', 0.6, 'SM', 22, ['cut']), availability: 'quest-only' },
  { ...tool('sickle', 'Sickle', 0.7, 'SM', 20, ['cut']), availability: 'quest-only' },
  { ...res('oak_plank', 'Oak plank', 6, 'LG', 12), availability: 'quest-only' },
  { ...food('small_beer', 'Small beer', 1.2, 6, { nutrition: 4, water: 12, spoilH: 24 * 20 }), availability: 'quest-only' },
  food('carrot', 'Carrot', 0.15, 1, { nutrition: 7, spoilH: 24 * 12 }),
  food('cabbage', 'Cabbage', 1, 3, { nutrition: 14, spoilH: 24 * 15 }),
  food('tomato', 'Tomato', 0.15, 2, { nutrition: 6, water: 2, spoilH: 24 * 5 }),
  food('egg', 'Egg', 0.06, 2, { nutrition: 6, spoilH: 24 * 8, raw: true }),
  food('milk', 'Milk', 1, 3, { nutrition: 8, water: 10, spoilH: 24 * 2 }),
  food('bread', 'Bread', 0.5, 6, { nutrition: 25, spoilH: 24 * 4 }),
  food('raw_meat', 'Raw meat', 1, 5, { nutrition: 10, spoilH: 18, raw: true, illnessChance: 0.35 }),
  food('cooked_meat', 'Roast meat', 0.8, 10, { nutrition: 30, spoilH: 24 * 3 }),
  food('dried_meat', 'Dried meat', 0.4, 14, { nutrition: 24, spoilH: 24 * 40 }),
  res('salt', 'Salt', 0.3, 'XS', 4),
  food('salted_meat', 'Salted meat', 0.5, 16, { nutrition: 22, spoilH: 24 * 75 }),
  food('fermented_cabbage', 'Fermented cabbage', 0.8, 6, { nutrition: 14, spoilH: 24 * 90 }),
  food('stew', 'Stew', 1, 12, { nutrition: 40, water: 10, spoilH: 24 * 2 }),
  // Herbs (common/medium/rare, healing/poisonous)
  herb('mint', 'Mint', 2, { heal: 4, cures: true, rarity: 'common' }),
  herb('chamomile', 'Chamomile', 3, { heal: 6, cures: true, rarity: 'common' }),
  herb('yarrow', 'Yarrow', 6, { heal: 14, rarity: 'medium' }),
  herb('arnica', 'Arnica', 18, { heal: 28, rarity: 'rare' }),
  herb('hemlock', 'Hemlock', 4, { heal: 0, poison: 25, rarity: 'medium' }),
  herb('nightshade', 'Nightshade', 10, { heal: 0, poison: 45, rarity: 'rare' }),
  // Medical
  { id: 'bandage', name: 'Bandage', category: 'medical', weight: 0.1, size: 'XS', price: 6, stack: true, heal: 15 },
  { id: 'salve', name: 'Herbal salve', category: 'medical', weight: 0.2, size: 'XS', price: 20, stack: true, heal: 35 },
  { id: 'herbal_tea', name: 'Herbal tea', category: 'medical', weight: 0.3, size: 'SM', price: 10, stack: true, heal: 5 },
  // Tools
  tool('axe', 'Axe', 1.8, 'MD', 45, ['chop'], { weapon: { kind: 'melee', reach: 1.1, damage: 16, dmgType: 'cut', cooldown: 1.1, sharpness: 0.6, stamina: 14 } }),
  tool('shovel', 'Shovel', 2.2, 'LG', 30, ['dig']),
  tool('pickaxe', 'Pickaxe', 3, 'LG', 55, ['mine']),
  { id: 'wheelbarrow', name: 'Wheelbarrow', category: 'tool', weight: 14, size: 'XL', price: 40, durability: 300, cart: { capacity: 80, speed: 0.8 } },
  { id: 'handcart', name: 'Handcart', category: 'tool', weight: 28, size: 'XL', price: 75, durability: 400, cart: { capacity: 160, speed: 0.68 } },
  tool('pan', 'Pan', 1.5, 'MD', 30, ['cook_vessel']),
  tool('pot', 'Pot', 2.5, 'MD', 40, ['cook_vessel']),
  tool('whetstone', 'Whetstone', 0.4, 'XS', 3, ['sharpen'], { durability: 40 }),
  tool('hammer', 'Hammer', 1, 'SM', 20, ['hammer']),
  tool('torch', 'Torch', 0.6, 'MD', 3, ['light', 'fire_start'], { light: 14, stack: true, durability: 60 }),
  tool('flint', 'Flint and steel', 0.1, 'XS', 8, ['fire_start']),
  tool('bucket', 'Bucket', 1.2, 'MD', 12, ['carry_water', 'scoop'], { waterCapacity: 8 }),
  tool('waterskin_s', 'Waterskin (S)', 0.2, 'SM', 6, ['carry_water'], { waterCapacity: 2 }),
  tool('waterskin_m', 'Waterskin (M)', 0.3, 'SM', 10, ['carry_water'], { waterCapacity: 4 }),
  tool('waterskin_l', 'Waterskin (L)', 0.5, 'MD', 16, ['carry_water'], { waterCapacity: 7 }),
  tool('sewing_kit', 'Sewing kit', 0.3, 'SM', 15, ['sew']),
  tool('backpack', 'Backpack', 1.5, 'LG', 40, [], { carryBonus: 15 }),
  tool('saddlebag', 'Saddlebags', 1, 'MD', 25, [], { carryBonus: 6 }),
  { id: 'blanket', name: 'Blanket', category: 'misc', weight: 1.5, size: 'MD', price: 12 },
  { id: 'tent', name: 'Tent', category: 'misc', weight: 6, size: 'LG', price: 60 },
  { id: 'furs', name: 'Fur bedding', category: 'misc', weight: 4, size: 'LG', price: 35 },
  // Weapons (§20)
  { id: 'wooden_shield', name: 'Wooden shield', category: 'misc', weight: 3.2, size: 'LG', price: 35, durability: 160, defence: { arcDeg: 140, reduction: 0.8, efficiency: 0.6, parryWindowS: 0.25, canParry: true } },
  melee('obsidian_dagger', 'Obsidian dagger', 0.35, 340, { reach: 0.6, damage: 11, dmgType: 'cut', cooldown: 0.5, sharpness: 0.95, stamina: 6 }, ['cut']),
  melee('damascus_dagger', 'Damascus dagger', 0.4, 480, { reach: 0.65, damage: 12, dmgType: 'cut', cooldown: 0.5, sharpness: 1, stamina: 6 }, ['cut']),
  melee('obsidian_knife', 'Obsidian knife', 0.25, 260, { reach: 0.55, damage: 9, dmgType: 'cut', cooldown: 0.5, sharpness: 0.97, stamina: 5 }, ['cut']),
  melee('damascus_sword', 'Damascus sword', 1.3, 900, { reach: 1.15, damage: 24, dmgType: 'cut', cooldown: 0.85, sharpness: 1, stamina: 11 }, ['cut']),
  melee('knife', 'Knife', 0.3, 8, { reach: 0.6, damage: 7, dmgType: 'cut', cooldown: 0.6, sharpness: 0.7, stamina: 6 }, ['cut']),
  melee('dagger', 'Dagger', 0.4, 25, { reach: 0.7, damage: 10, dmgType: 'pierce', cooldown: 0.6, sharpness: 0.8, stamina: 7 }, ['cut']),
  melee('short_sword', 'Short sword', 1.1, 70, { reach: 0.9, damage: 15, dmgType: 'cut', cooldown: 0.8, sharpness: 0.8, stamina: 10 }, ['cut']),
  melee('sword', 'Sword', 1.4, 120, { reach: 1.1, damage: 19, dmgType: 'cut', cooldown: 0.95, sharpness: 0.85, stamina: 12 }, ['cut']),
  melee('long_sword', 'Longsword', 2, 200, { reach: 1.3, damage: 24, dmgType: 'cut', cooldown: 1.2, sharpness: 0.85, stamina: 16, twoHanded: true }),
  melee('small_axe', 'Hatchet', 1.3, 40, { reach: 0.9, damage: 15, dmgType: 'cut', cooldown: 0.95, sharpness: 0.6, stamina: 12 }, ['chop']),
  melee('big_axe', 'Battle axe', 3, 110, { reach: 1.3, damage: 28, dmgType: 'cut', cooldown: 1.5, sharpness: 0.6, stamina: 22, twoHanded: true }, ['chop']),
  melee('spear', 'Spear', 2, 35, { reach: 1.9, damage: 17, dmgType: 'pierce', cooldown: 1.1, sharpness: 0.7, stamina: 12, twoHanded: true }),
  melee('war_hammer', 'War hammer', 2.5, 95, { reach: 1.1, damage: 22, dmgType: 'blunt', cooldown: 1.3, sharpness: 0, stamina: 18 }),
  melee('club', 'Club', 1.5, 6, { reach: 0.9, damage: 11, dmgType: 'blunt', cooldown: 1, sharpness: 0, stamina: 11 }),
  melee('staff', 'Staff', 1.2, 3, { reach: 1.6, damage: 8, dmgType: 'blunt', cooldown: 0.9, sharpness: 0, stamina: 8, twoHanded: true }),
  ranged('short_bow', 'Short bow', 0.8, 45, { damage: 14, dmgType: 'pierce', cooldown: 0.6, stamina: 6, ammo: 'arrow', drawTime: 0.9, projSpeed: 45, twoHanded: true }),
  ranged('long_bow', 'Longbow', 1.2, 90, { damage: 22, dmgType: 'pierce', cooldown: 0.9, stamina: 10, ammo: 'arrow', drawTime: 1.4, projSpeed: 60, twoHanded: true }),
  ranged('composite_bow', 'Composite bow', 1, 160, { damage: 20, dmgType: 'pierce', cooldown: 0.7, stamina: 8, ammo: 'arrow', drawTime: 1.0, projSpeed: 62, twoHanded: true }),
  ranged('sling', 'Sling', 0.2, 5, { damage: 8, dmgType: 'blunt', cooldown: 0.8, stamina: 5, ammo: 'stone', drawTime: 0.7, projSpeed: 35 }),
  ranged('crossbow', 'Crossbow', 3.5, 180, { damage: 30, dmgType: 'pierce', cooldown: 3.5, stamina: 4, ammo: 'bolt', drawTime: 0.2, projSpeed: 75, twoHanded: true }),
  { id: 'arrow', name: 'Arrow (broadhead)', category: 'ammo', weight: 0.03, size: 'XS', price: 1, stack: true, ammoKind: 'arrow', damageBonus: 2 },
  { id: 'arrow_bodkin', name: 'Arrow (bodkin)', category: 'ammo', weight: 0.03, size: 'XS', price: 2, stack: true, ammoKind: 'arrow', damageBonus: 5 },
  { id: 'arrow_blunt', name: 'Arrow (blunt)', category: 'ammo', weight: 0.03, size: 'XS', price: 1, stack: true, ammoKind: 'arrow', damageBonus: 0 },
  { id: 'bolt', name: 'Bolt', category: 'ammo', weight: 0.05, size: 'XS', price: 2, stack: true, ammoKind: 'bolt', damageBonus: 3 },
  { id: 'bolt_heavy', name: 'Heavy bolt', category: 'ammo', weight: 0.07, size: 'XS', price: 3, stack: true, ammoKind: 'bolt', damageBonus: 7 },
  { id: 'bolt_blunt', name: 'Blunt bolt', category: 'ammo', weight: 0.05, size: 'XS', price: 2, stack: true, ammoKind: 'bolt', damageBonus: 1 },
  { id: 'sling_stone', name: 'Sling stone', category: 'ammo', weight: 0.1, size: 'XXS', price: 0, stack: true, ammoKind: 'stone', damageBonus: 0 },
  // Armour (§21)
  armor('padded_jacket', 'Gambeson', 3, 30, { slot: 'torso', layer: 'under', resist: { cut: 0.2, pierce: 0.1, blunt: 0.25 }, speedPenalty: 0.01 }),
  armor('leather_jerkin', 'Leather jerkin', 4, 50, { slot: 'torso', layer: 'outer', resist: { cut: 0.3, pierce: 0.15, blunt: 0.15 }, speedPenalty: 0.02 }),
  armor('studded_leather', 'Studded leather', 6, 90, { slot: 'torso', layer: 'outer', resist: { cut: 0.4, pierce: 0.25, blunt: 0.2 }, speedPenalty: 0.03 }),
  armor('chainmail', 'Mail shirt', 10, 240, { slot: 'torso', layer: 'outer', resist: { cut: 0.65, pierce: 0.35, blunt: 0.15 }, speedPenalty: 0.05 }),
  armor('plate_cuirass', 'Plate cuirass', 12, 420, { slot: 'torso', layer: 'outer', resist: { cut: 0.8, pierce: 0.6, blunt: 0.35 }, speedPenalty: 0.07 }),
  armor('leather_cap', 'Leather cap', 0.6, 12, { slot: 'head', layer: 'outer', resist: { cut: 0.25, pierce: 0.1, blunt: 0.15 }, speedPenalty: 0 }),
  armor('iron_helm', 'Iron helm', 2.2, 80, { slot: 'head', layer: 'outer', resist: { cut: 0.7, pierce: 0.5, blunt: 0.3 }, speedPenalty: 0.01 }),
  armor('leather_boots', 'Leather boots', 1.2, 18, { slot: 'boots', layer: 'outer', resist: { cut: 0.2, pierce: 0.1, blunt: 0.1 }, speedPenalty: -0.03 }),
  armor('leather_trousers', 'Leather trousers', 1.8, 22, { slot: 'legs', layer: 'outer', resist: { cut: 0.25, pierce: 0.1, blunt: 0.1 }, speedPenalty: 0.01 }),
  armor('leather_gloves', 'Leather gloves', 0.3, 10, { slot: 'hands', layer: 'outer', resist: { cut: 0.2, pierce: 0.1, blunt: 0.1 }, speedPenalty: 0 }),
  armor('bracers', 'Bracers', 0.6, 20, { slot: 'forearms', layer: 'outer', resist: { cut: 0.35, pierce: 0.2, blunt: 0.1 }, speedPenalty: 0 }),
  armor('pauldrons', 'Pauldrons', 1.8, 45, { slot: 'shoulders', layer: 'outer', resist: { cut: 0.4, pierce: 0.25, blunt: 0.2 }, speedPenalty: 0.01 }),
]

/**
 * Catalogue entries without any acquisition path yet (review 013 C-02). They stay defined (balance/data APIs
 * can use them) but are explicitly not part of the playable economy until a source is added; then drop the
 * entry here (the audit fails for a `future` item that already has a source).
 */
const FUTURE_ITEMS: readonly string[] = [
  'long_sword', 'small_axe', 'composite_bow', 'crossbow', 'bolt', 'bolt_heavy', 'bolt_blunt', 'arrow_blunt',
  'padded_jacket', 'studded_leather', 'plate_cuirass', 'leather_trousers', 'bracers', 'pauldrons', 'saddlebag', 'tent',
]

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  LIST.map((i) => [i.id, FUTURE_ITEMS.includes(i.id) ? { ...i, availability: 'future' as const } : i]),
)

/** Heavy goods that go into a cart (TRANS-01). */
export const HEAVY_GOODS = new Set(['coal', 'copper_ore', 'gold_ore', 'iron_ingot', 'iron_ore', 'log', 'rock_chunk', 'stone'])

export function itemDef(id: string): ItemDef {
  const d = ITEMS[id]
  if (!d) throw new Error('Unknown item ' + id)
  return d
}

export const QUALITY_NAMES = ['poor', 'average', 'good', 'exceptional'] as const
export const MATERIAL_NAMES = ['poor', 'average', 'good'] as const
/** Quality multipliers applied to damage/resist/durability and inversely to weight. */
export const QUALITY_MULT = [0.85, 1, 1.15, 1.3] as const
export const MATERIAL_MULT = [0.9, 1, 1.12] as const

export function formatCoins(copper: number): string {
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  return [g ? `${g}g` : '', s ? `${s}s` : '', `${c}c`].filter(Boolean).join(' ')
}
