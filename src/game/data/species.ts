/**
 * Animal species (data). Distances in m, speeds m/s (gameplay seconds), cooldowns in gameplay s.
 * @domain fauna
 */
import type { DamageType } from './items'

export type SpeciesId =
  | 'rat' | 'fox' | 'wolf' | 'bear' | 'boar' | 'hare' | 'deer' | 'stag' | 'moose'
  | 'cow' | 'chicken' | 'sheep' | 'horse' | 'donkey' | 'dog'

export type Temperament = 'prey' | 'predator' | 'aggressive' | 'domestic' | 'vermin'

export interface SpeciesDef {
  id: SpeciesId
  name: string
  /** Asset model id (public/assets/models/animals/<model>.glb) or undefined → procedural placeholder. */
  model?: string
  height: number
  length: number
  color: number
  walk: number
  run: number
  hp: number
  damage: number
  dmgType: DamageType
  attackRange: number
  attackCooldown: number
  perception: number
  temperament: Temperament
  /** Eats: grass (grazes), meat (hunts/scavenges). */
  diet: 'grass' | 'meat' | 'omni'
  preys?: SpeciesId[]
  corpse: { meat: number; hide: number; bone: number; antler?: number }
  /** Counts as dangerous for reputation/badges. */
  dangerous?: boolean
  /** Calendar hours between drinks. */
  drinkEveryH: number
  /** Decision interval multiplier (AI-01): skittish prey decide faster, placid/weak animals slower. Default 1. */
  decisionS?: number
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  rat: { id: 'rat', name: 'Rat', model: 'Rat', height: 0.12, length: 0.3, color: 0x5a4d45, walk: 1.2, run: 3.5, hp: 5, damage: 2, dmgType: 'pierce', attackRange: 0.5, attackCooldown: 1.2, perception: 10, temperament: 'vermin', diet: 'omni', corpse: { meat: 0, hide: 0, bone: 0 }, drinkEveryH: 12, decisionS: 1.5 },
  fox: { id: 'fox', name: 'Fox', model: 'Fox', height: 0.45, length: 0.9, color: 0xc0632a, walk: 1.5, run: 7, hp: 18, damage: 4, dmgType: 'pierce', attackRange: 0.8, attackCooldown: 1.2, perception: 35, temperament: 'prey', diet: 'meat', preys: ['hare', 'chicken', 'rat'], corpse: { meat: 1, hide: 1, bone: 1 }, drinkEveryH: 10 },
  wolf: { id: 'wolf', name: 'Wolf', model: 'Wolf', height: 0.8, length: 1.4, color: 0x6b6b70, walk: 1.6, run: 7.5, hp: 45, damage: 9, dmgType: 'pierce', attackRange: 1.3, attackCooldown: 1.4, perception: 50, temperament: 'predator', diet: 'meat', preys: ['deer', 'hare', 'sheep', 'chicken', 'boar'], corpse: { meat: 3, hide: 1, bone: 2 }, dangerous: true, drinkEveryH: 10 },
  bear: { id: 'bear', name: 'Bear', model: 'Bear', height: 1.3, length: 2.1, color: 0x4a3222, walk: 1.3, run: 6.5, hp: 140, damage: 22, dmgType: 'cut', attackRange: 1.8, attackCooldown: 2, perception: 40, temperament: 'aggressive', diet: 'omni', preys: ['deer', 'boar'], corpse: { meat: 10, hide: 2, bone: 4 }, dangerous: true, drinkEveryH: 12 },
  boar: { id: 'boar', name: 'Boar', model: 'Boar', height: 0.8, length: 1.4, color: 0x3d3027, walk: 1.2, run: 6, hp: 60, damage: 12, dmgType: 'pierce', attackRange: 1.2, attackCooldown: 1.6, perception: 30, temperament: 'aggressive', diet: 'omni', corpse: { meat: 5, hide: 1, bone: 2 }, dangerous: true, drinkEveryH: 10 },
  hare: { id: 'hare', name: 'Hare', model: 'Hare', height: 0.3, length: 0.5, color: 0x8c7a5b, walk: 1, run: 9, hp: 8, damage: 0, dmgType: 'blunt', attackRange: 0, attackCooldown: 99, perception: 30, temperament: 'prey', diet: 'grass', corpse: { meat: 1, hide: 1, bone: 0 }, drinkEveryH: 12, decisionS: 0.8 },
  deer: { id: 'deer', name: 'Deer', model: 'Deer', height: 0.95, length: 1.3, color: 0xa0703e, walk: 1.3, run: 9, hp: 35, damage: 3, dmgType: 'blunt', attackRange: 1, attackCooldown: 2, perception: 55, temperament: 'prey', diet: 'grass', corpse: { meat: 4, hide: 1, bone: 2 }, drinkEveryH: 10, decisionS: 0.8 },
  stag: { id: 'stag', name: 'Stag', model: 'Stag', height: 1.5, length: 2, color: 0x8a5a33, walk: 1.4, run: 8.5, hp: 70, damage: 12, dmgType: 'pierce', attackRange: 1.5, attackCooldown: 2, perception: 55, temperament: 'prey', diet: 'grass', corpse: { meat: 7, hide: 2, bone: 3, antler: 1 }, drinkEveryH: 10 },
  moose: { id: 'moose', name: 'Moose', height: 2, length: 2.8, color: 0x3f2d20, walk: 1.3, run: 7, hp: 120, damage: 16, dmgType: 'blunt', attackRange: 1.8, attackCooldown: 2, perception: 40, temperament: 'prey', diet: 'grass', corpse: { meat: 12, hide: 2, bone: 4, antler: 1 }, drinkEveryH: 10 },
  cow: { id: 'cow', name: 'Cow', model: 'Cow', height: 1.4, length: 2.2, color: 0xe8e2d8, walk: 1, run: 4, hp: 90, damage: 6, dmgType: 'blunt', attackRange: 1.5, attackCooldown: 2, perception: 20, temperament: 'domestic', diet: 'grass', corpse: { meat: 12, hide: 2, bone: 4 }, drinkEveryH: 8, decisionS: 1.5 },
  chicken: { id: 'chicken', name: 'Chicken', height: 0.35, length: 0.4, color: 0xf2efe6, walk: 0.8, run: 3, hp: 5, damage: 0, dmgType: 'pierce', attackRange: 0, attackCooldown: 99, perception: 12, temperament: 'domestic', diet: 'grass', corpse: { meat: 1, hide: 0, bone: 0 }, drinkEveryH: 8, decisionS: 1.5 },
  sheep: { id: 'sheep', name: 'Sheep', height: 0.8, length: 1.2, color: 0xefebe0, walk: 0.9, run: 4.5, hp: 30, damage: 0, dmgType: 'blunt', attackRange: 0, attackCooldown: 99, perception: 25, temperament: 'domestic', diet: 'grass', corpse: { meat: 4, hide: 1, bone: 1 }, drinkEveryH: 8, decisionS: 1.3 },
  horse: { id: 'horse', name: 'Horse', model: 'Horse', height: 1.6, length: 2.3, color: 0x6e4a2e, walk: 1.6, run: 12, hp: 100, damage: 10, dmgType: 'blunt', attackRange: 1.5, attackCooldown: 2, perception: 40, temperament: 'domestic', diet: 'grass', corpse: { meat: 12, hide: 2, bone: 4 }, drinkEveryH: 8 },
  donkey: { id: 'donkey', name: 'Donkey', model: 'Donkey', height: 1.2, length: 1.7, color: 0x8b8278, walk: 1.3, run: 6, hp: 70, damage: 8, dmgType: 'blunt', attackRange: 1.3, attackCooldown: 2, perception: 30, temperament: 'domestic', diet: 'grass', corpse: { meat: 8, hide: 1, bone: 3 }, drinkEveryH: 8 },
  dog: { id: 'dog', name: 'Dog', model: 'Husky', height: 0.6, length: 1, color: 0x7a6552, walk: 1.5, run: 7, hp: 30, damage: 6, dmgType: 'pierce', attackRange: 1, attackCooldown: 1.2, perception: 40, temperament: 'domestic', diet: 'meat', corpse: { meat: 2, hide: 1, bone: 1 }, drinkEveryH: 8 },
}

export type AnimalVariant = 'young' | 'adult' | 'alpha' | 'strong' | 'albino'

export const VARIANT_MULT: Record<AnimalVariant, { size: number; hp: number; dmg: number }> = {
  young: { size: 0.65, hp: 0.5, dmg: 0.4 },
  adult: { size: 1, hp: 1, dmg: 1 },
  alpha: { size: 1.15, hp: 1.4, dmg: 1.4 },
  strong: { size: 1.25, hp: 1.8, dmg: 1.6 },
  albino: { size: 1, hp: 1, dmg: 1 },
}
