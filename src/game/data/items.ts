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
  armor?: ArmorStats
  food?: FoodStats
  herb?: HerbStats
  heal?: number
  /** Extra carrying capacity (kg) when in inventory. */
  carryBonus?: number
  /** Drinks held (waterskins/bucket). */
  waterCapacity?: number
  light?: number
  ammoKind?: AmmoKind
  damageBonus?: number
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
  res('log', 'Belka', 18, 'LG', 12),
  res('branch', 'Gałąź', 1.2, 'MD', 1),
  res('stone', 'Kamień', 3, 'SM', 1),
  res('coal', 'Węgiel', 2, 'SM', 4),
  res('iron_ore', 'Ruda żelaza', 3, 'SM', 8),
  res('copper_ore', 'Ruda miedzi', 3, 'SM', 7),
  res('gold_ore', 'Ruda złota', 3, 'SM', 60),
  res('iron_ingot', 'Sztaba żelaza', 2, 'SM', 30),
  res('hide', 'Skóra', 3, 'MD', 15),
  res('wool', 'Wełna', 1, 'SM', 6),
  res('bone', 'Kości', 1, 'SM', 1),
  res('antler', 'Poroże', 2, 'MD', 20),
  res('cloth', 'Płótno', 0.5, 'SM', 8),
  res('rope', 'Lina', 1.5, 'MD', 10),
  res('shell', 'Muszla', 0.05, 'XS', 2),
  res('pearl_shell', 'Drogocenna muszla', 0.05, 'XS', 80),
  res('grain', 'Zboże', 1, 'SM', 3),
  // Food
  food('berries', 'Jagody', 0.2, 2, { nutrition: 6, water: 2, spoilH: 48 }),
  food('apple', 'Jabłko', 0.2, 2, { nutrition: 8, water: 3, spoilH: 24 * 10 }),
  food('mushroom', 'Grzyb', 0.1, 2, { nutrition: 5, spoilH: 48, illnessChance: 0.05 }),
  food('carrot', 'Marchew', 0.15, 1, { nutrition: 7, spoilH: 24 * 12 }),
  food('cabbage', 'Kapusta', 1, 3, { nutrition: 14, spoilH: 24 * 15 }),
  food('tomato', 'Pomidor', 0.15, 2, { nutrition: 6, water: 2, spoilH: 24 * 5 }),
  food('egg', 'Jajko', 0.06, 2, { nutrition: 6, spoilH: 24 * 8, raw: true }),
  food('milk', 'Mleko', 1, 3, { nutrition: 8, water: 10, spoilH: 24 * 2 }),
  food('bread', 'Chleb', 0.5, 6, { nutrition: 25, spoilH: 24 * 4 }),
  food('raw_meat', 'Surowe mięso', 1, 5, { nutrition: 10, spoilH: 18, raw: true, illnessChance: 0.35 }),
  food('cooked_meat', 'Pieczone mięso', 0.8, 10, { nutrition: 30, spoilH: 24 * 3 }),
  food('dried_meat', 'Suszone mięso', 0.4, 14, { nutrition: 24, spoilH: 24 * 40 }),
  food('stew', 'Gulasz', 1, 12, { nutrition: 40, water: 10, spoilH: 24 * 2 }),
  // Herbs (common/medium/rare, healing/poisonous)
  herb('mint', 'Mięta', 2, { heal: 4, cures: true, rarity: 'common' }),
  herb('chamomile', 'Rumianek', 3, { heal: 6, cures: true, rarity: 'common' }),
  herb('yarrow', 'Krwawnik', 6, { heal: 14, rarity: 'medium' }),
  herb('arnica', 'Arnika', 18, { heal: 28, rarity: 'rare' }),
  herb('hemlock', 'Szalej', 4, { heal: 0, poison: 25, rarity: 'medium' }),
  herb('nightshade', 'Wilcza jagoda', 10, { heal: 0, poison: 45, rarity: 'rare' }),
  // Medical
  { id: 'bandage', name: 'Bandaż', category: 'medical', weight: 0.1, size: 'XS', price: 6, stack: true, heal: 15 },
  { id: 'salve', name: 'Maść ziołowa', category: 'medical', weight: 0.2, size: 'XS', price: 20, stack: true, heal: 35 },
  { id: 'herbal_tea', name: 'Napar ziołowy', category: 'medical', weight: 0.3, size: 'SM', price: 10, stack: true, heal: 5 },
  // Tools
  tool('axe', 'Siekiera', 1.8, 'MD', 45, ['chop'], { weapon: { kind: 'melee', reach: 1.1, damage: 16, dmgType: 'cut', cooldown: 1.1, sharpness: 0.6, stamina: 14 } }),
  tool('shovel', 'Łopata', 2.2, 'LG', 30, ['dig']),
  tool('pickaxe', 'Kilof', 3, 'LG', 55, ['mine']),
  tool('hammer', 'Młotek', 1, 'SM', 20, ['hammer']),
  tool('torch', 'Pochodnia', 0.6, 'MD', 3, ['light', 'fire_start'], { light: 14, stack: true, durability: 60 }),
  tool('flint', 'Krzesiwo', 0.1, 'XS', 8, ['fire_start']),
  tool('bucket', 'Wiadro', 1.2, 'MD', 12, ['carry_water', 'scoop'], { waterCapacity: 8 }),
  tool('waterskin_s', 'Bukłak S', 0.2, 'SM', 6, ['carry_water'], { waterCapacity: 2 }),
  tool('waterskin_m', 'Bukłak M', 0.3, 'SM', 10, ['carry_water'], { waterCapacity: 4 }),
  tool('waterskin_l', 'Bukłak L', 0.5, 'MD', 16, ['carry_water'], { waterCapacity: 7 }),
  tool('sewing_kit', 'Zestaw do szycia', 0.3, 'SM', 15, ['sew']),
  tool('backpack', 'Plecak', 1.5, 'LG', 40, [], { carryBonus: 15 }),
  tool('saddlebag', 'Sakwy', 1, 'MD', 25, [], { carryBonus: 6 }),
  { id: 'blanket', name: 'Koc', category: 'misc', weight: 1.5, size: 'MD', price: 12 },
  { id: 'tent', name: 'Namiot', category: 'misc', weight: 6, size: 'LG', price: 60 },
  { id: 'furs', name: 'Posłanie ze skór', category: 'misc', weight: 4, size: 'LG', price: 35 },
  // Weapons (§20)
  melee('knife', 'Nóż', 0.3, 8, { reach: 0.6, damage: 7, dmgType: 'cut', cooldown: 0.6, sharpness: 0.7, stamina: 6 }, ['cut']),
  melee('dagger', 'Sztylet', 0.4, 25, { reach: 0.7, damage: 10, dmgType: 'pierce', cooldown: 0.6, sharpness: 0.8, stamina: 7 }, ['cut']),
  melee('short_sword', 'Krótki miecz', 1.1, 70, { reach: 0.9, damage: 15, dmgType: 'cut', cooldown: 0.8, sharpness: 0.8, stamina: 10 }, ['cut']),
  melee('sword', 'Miecz', 1.4, 120, { reach: 1.1, damage: 19, dmgType: 'cut', cooldown: 0.95, sharpness: 0.85, stamina: 12 }, ['cut']),
  melee('long_sword', 'Długi miecz', 2, 200, { reach: 1.3, damage: 24, dmgType: 'cut', cooldown: 1.2, sharpness: 0.85, stamina: 16, twoHanded: true }),
  melee('small_axe', 'Mały topór', 1.3, 40, { reach: 0.9, damage: 15, dmgType: 'cut', cooldown: 0.95, sharpness: 0.6, stamina: 12 }, ['chop']),
  melee('big_axe', 'Duży topór', 3, 110, { reach: 1.3, damage: 28, dmgType: 'cut', cooldown: 1.5, sharpness: 0.6, stamina: 22, twoHanded: true }, ['chop']),
  melee('spear', 'Włócznia', 2, 35, { reach: 1.9, damage: 17, dmgType: 'pierce', cooldown: 1.1, sharpness: 0.7, stamina: 12, twoHanded: true }),
  melee('war_hammer', 'Młot bojowy', 2.5, 95, { reach: 1.1, damage: 22, dmgType: 'blunt', cooldown: 1.3, sharpness: 0, stamina: 18 }),
  melee('club', 'Maczuga', 1.5, 6, { reach: 0.9, damage: 11, dmgType: 'blunt', cooldown: 1, sharpness: 0, stamina: 11 }),
  melee('staff', 'Kij', 1.2, 3, { reach: 1.6, damage: 8, dmgType: 'blunt', cooldown: 0.9, sharpness: 0, stamina: 8, twoHanded: true }),
  ranged('short_bow', 'Krótki łuk', 0.8, 45, { damage: 14, dmgType: 'pierce', cooldown: 0.6, stamina: 6, ammo: 'arrow', drawTime: 0.9, projSpeed: 45, twoHanded: true }),
  ranged('long_bow', 'Długi łuk', 1.2, 90, { damage: 22, dmgType: 'pierce', cooldown: 0.9, stamina: 10, ammo: 'arrow', drawTime: 1.4, projSpeed: 60, twoHanded: true }),
  ranged('composite_bow', 'Łuk kompozytowy', 1, 160, { damage: 20, dmgType: 'pierce', cooldown: 0.7, stamina: 8, ammo: 'arrow', drawTime: 1.0, projSpeed: 62, twoHanded: true }),
  ranged('sling', 'Proca', 0.2, 5, { damage: 8, dmgType: 'blunt', cooldown: 0.8, stamina: 5, ammo: 'stone', drawTime: 0.7, projSpeed: 35 }),
  ranged('crossbow', 'Kusza', 3.5, 180, { damage: 30, dmgType: 'pierce', cooldown: 3.5, stamina: 4, ammo: 'bolt', drawTime: 0.2, projSpeed: 75, twoHanded: true }),
  { id: 'arrow', name: 'Strzała (liściasta)', category: 'ammo', weight: 0.03, size: 'XS', price: 1, stack: true, ammoKind: 'arrow', damageBonus: 2 },
  { id: 'arrow_bodkin', name: 'Strzała (bodkin)', category: 'ammo', weight: 0.03, size: 'XS', price: 2, stack: true, ammoKind: 'arrow', damageBonus: 5 },
  { id: 'arrow_blunt', name: 'Strzała (tępa)', category: 'ammo', weight: 0.03, size: 'XS', price: 1, stack: true, ammoKind: 'arrow', damageBonus: 0 },
  { id: 'bolt', name: 'Bełt', category: 'ammo', weight: 0.05, size: 'XS', price: 2, stack: true, ammoKind: 'bolt', damageBonus: 3 },
  { id: 'bolt_heavy', name: 'Bełt ciężki', category: 'ammo', weight: 0.07, size: 'XS', price: 3, stack: true, ammoKind: 'bolt', damageBonus: 7 },
  { id: 'bolt_blunt', name: 'Bełt tępy', category: 'ammo', weight: 0.05, size: 'XS', price: 2, stack: true, ammoKind: 'bolt', damageBonus: 1 },
  { id: 'sling_stone', name: 'Kamień do procy', category: 'ammo', weight: 0.1, size: 'XXS', price: 0, stack: true, ammoKind: 'stone', damageBonus: 0 },
  // Armour (§21)
  armor('padded_jacket', 'Przeszywanica', 3, 30, { slot: 'torso', layer: 'under', resist: { cut: 0.2, pierce: 0.1, blunt: 0.25 }, speedPenalty: 0.01 }),
  armor('leather_jerkin', 'Kaftan skórzany', 4, 50, { slot: 'torso', layer: 'outer', resist: { cut: 0.3, pierce: 0.15, blunt: 0.15 }, speedPenalty: 0.02 }),
  armor('studded_leather', 'Skóra z okuciami', 6, 90, { slot: 'torso', layer: 'outer', resist: { cut: 0.4, pierce: 0.25, blunt: 0.2 }, speedPenalty: 0.03 }),
  armor('chainmail', 'Kolczuga', 10, 240, { slot: 'torso', layer: 'outer', resist: { cut: 0.65, pierce: 0.35, blunt: 0.15 }, speedPenalty: 0.05 }),
  armor('plate_cuirass', 'Napierśnik płytowy', 12, 420, { slot: 'torso', layer: 'outer', resist: { cut: 0.8, pierce: 0.6, blunt: 0.35 }, speedPenalty: 0.07 }),
  armor('leather_cap', 'Czapka skórzana', 0.6, 12, { slot: 'head', layer: 'outer', resist: { cut: 0.25, pierce: 0.1, blunt: 0.15 }, speedPenalty: 0 }),
  armor('iron_helm', 'Hełm żelazny', 2.2, 80, { slot: 'head', layer: 'outer', resist: { cut: 0.7, pierce: 0.5, blunt: 0.3 }, speedPenalty: 0.01 }),
  armor('leather_boots', 'Buty skórzane', 1.2, 18, { slot: 'boots', layer: 'outer', resist: { cut: 0.2, pierce: 0.1, blunt: 0.1 }, speedPenalty: -0.03 }),
  armor('leather_trousers', 'Spodnie skórzane', 1.8, 22, { slot: 'legs', layer: 'outer', resist: { cut: 0.25, pierce: 0.1, blunt: 0.1 }, speedPenalty: 0.01 }),
  armor('leather_gloves', 'Rękawice skórzane', 0.3, 10, { slot: 'hands', layer: 'outer', resist: { cut: 0.2, pierce: 0.1, blunt: 0.1 }, speedPenalty: 0 }),
  armor('bracers', 'Karwasze', 0.6, 20, { slot: 'forearms', layer: 'outer', resist: { cut: 0.35, pierce: 0.2, blunt: 0.1 }, speedPenalty: 0 }),
  armor('pauldrons', 'Naramienniki', 1.8, 45, { slot: 'shoulders', layer: 'outer', resist: { cut: 0.4, pierce: 0.25, blunt: 0.2 }, speedPenalty: 0.01 }),
]

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(LIST.map((i) => [i.id, i]))

export function itemDef(id: string): ItemDef {
  const d = ITEMS[id]
  if (!d) throw new Error('Unknown item ' + id)
  return d
}

export const QUALITY_NAMES = ['niska', 'średnia', 'wysoka', 'wyjątkowa'] as const
export const MATERIAL_NAMES = ['niska', 'średnia', 'wysoka'] as const
/** Quality multipliers applied to damage/resist/durability and inversely to weight. */
export const QUALITY_MULT = [0.85, 1, 1.15, 1.3] as const
export const MATERIAL_MULT = [0.9, 1, 1.12] as const

export function formatCoins(copper: number): string {
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  return [g ? `${g}zł` : '', s ? `${s}sr` : '', `${c}m`].filter(Boolean).join(' ')
}
