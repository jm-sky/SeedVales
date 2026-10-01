/**
 * Crafting recipes and construction blueprints (data).
 * Craft time in gameplay seconds at skill 0; skill shortens it (up to −50%).
 * @domain crafting
 */
import type { StructureKind } from '../world/types'
import type { Capability } from './items'
import type { SkillId } from './skills'

export type StationKind = 'campfire' | 'anvil' | 'dryrack' | 'workbench'

export interface Recipe {
  id: string
  name: string
  inputs: { item: string; qty: number }[]
  output: { item: string; qty: number }
  tool?: Capability
  station?: StationKind
  skill: SkillId
  minSkill?: number
  timeS: number
  /** Output gets quality roll based on skill. */
  quality?: boolean
  category: 'survival' | 'food' | 'medicine' | 'smithing' | 'leather' | 'weapons'
}

export const RECIPES: Recipe[] = [
  { id: 'torch', name: 'Torches', inputs: [{ item: 'branch', qty: 1 }, { item: 'cloth', qty: 1 }], output: { item: 'torch', qty: 2 }, skill: 'survival', timeS: 4, category: 'survival' },
  { id: 'bandage', name: 'Bandages', inputs: [{ item: 'cloth', qty: 1 }], output: { item: 'bandage', qty: 2 }, tool: 'cut', skill: 'medicine', timeS: 4, category: 'medicine' },
  { id: 'salve', name: 'Herbal salve', inputs: [{ item: 'yarrow', qty: 2 }, { item: 'chamomile', qty: 1 }], output: { item: 'salve', qty: 1 }, skill: 'medicine', minSkill: 5, timeS: 10, category: 'medicine' },
  { id: 'herbal_tea', name: 'Herbal tea', inputs: [{ item: 'mint', qty: 1 }, { item: 'chamomile', qty: 1 }], output: { item: 'herbal_tea', qty: 1 }, station: 'campfire', skill: 'medicine', timeS: 6, category: 'medicine' },
  { id: 'dry_meat', name: 'Dried meat', inputs: [{ item: 'raw_meat', qty: 2 }], output: { item: 'dried_meat', qty: 1 }, station: 'dryrack', skill: 'survival', timeS: 12, category: 'food' },
  { id: 'stew', name: 'Stew', inputs: [{ item: 'raw_meat', qty: 1 }, { item: 'carrot', qty: 1 }, { item: 'cabbage', qty: 1 }], output: { item: 'stew', qty: 2 }, station: 'campfire', skill: 'survival', timeS: 14, category: 'food' },
  { id: 'bread', name: 'Bread', inputs: [{ item: 'grain', qty: 3 }], output: { item: 'bread', qty: 1 }, station: 'campfire', skill: 'survival', timeS: 12, category: 'food' },
  { id: 'rope', name: 'Rope', inputs: [{ item: 'wool', qty: 3 }], output: { item: 'rope', qty: 1 }, skill: 'survival', timeS: 10, category: 'survival' },
  { id: 'cloth', name: 'Cloth', inputs: [{ item: 'wool', qty: 2 }], output: { item: 'cloth', qty: 1 }, tool: 'sew', skill: 'survival', timeS: 10, category: 'survival' },
  { id: 'club', name: 'Club', inputs: [{ item: 'branch', qty: 2 }], output: { item: 'club', qty: 1 }, tool: 'cut', skill: 'survival', timeS: 8, category: 'weapons' },
  { id: 'staff', name: 'Staff', inputs: [{ item: 'branch', qty: 1 }], output: { item: 'staff', qty: 1 }, tool: 'cut', skill: 'survival', timeS: 5, category: 'weapons' },
  { id: 'spear', name: 'Spear', inputs: [{ item: 'branch', qty: 2 }, { item: 'iron_ingot', qty: 1 }], output: { item: 'spear', qty: 1 }, tool: 'cut', skill: 'survival', timeS: 14, quality: true, category: 'weapons' },
  { id: 'short_bow', name: 'Short bow', inputs: [{ item: 'branch', qty: 2 }, { item: 'rope', qty: 1 }], output: { item: 'short_bow', qty: 1 }, tool: 'cut', skill: 'ranged', minSkill: 5, timeS: 20, quality: true, category: 'weapons' },
  { id: 'arrows', name: 'Arrows ×6', inputs: [{ item: 'branch', qty: 1 }, { item: 'stone', qty: 1 }], output: { item: 'arrow', qty: 6 }, tool: 'cut', skill: 'ranged', timeS: 10, category: 'weapons' },
  { id: 'sling', name: 'Sling', inputs: [{ item: 'hide', qty: 1 }, { item: 'rope', qty: 1 }], output: { item: 'sling', qty: 1 }, tool: 'cut', skill: 'ranged', timeS: 8, category: 'weapons' },
  { id: 'sling_stones', name: 'Sling stones ×8', inputs: [{ item: 'stone', qty: 1 }], output: { item: 'sling_stone', qty: 8 }, skill: 'ranged', timeS: 4, category: 'weapons' },
  { id: 'leather_jerkin', name: 'Leather jerkin', inputs: [{ item: 'hide', qty: 3 }], output: { item: 'leather_jerkin', qty: 1 }, tool: 'sew', skill: 'survival', minSkill: 5, timeS: 25, quality: true, category: 'leather' },
  { id: 'leather_cap', name: 'Leather cap', inputs: [{ item: 'hide', qty: 1 }], output: { item: 'leather_cap', qty: 1 }, tool: 'sew', skill: 'survival', timeS: 10, quality: true, category: 'leather' },
  { id: 'leather_boots', name: 'Leather boots', inputs: [{ item: 'hide', qty: 2 }], output: { item: 'leather_boots', qty: 1 }, tool: 'sew', skill: 'survival', timeS: 14, quality: true, category: 'leather' },
  { id: 'iron_ingot', name: 'Smelt iron', inputs: [{ item: 'iron_ore', qty: 2 }, { item: 'coal', qty: 1 }], output: { item: 'iron_ingot', qty: 1 }, station: 'anvil', skill: 'blacksmith', timeS: 16, category: 'smithing' },
  { id: 'knife', name: 'Knife', inputs: [{ item: 'iron_ingot', qty: 1 }, { item: 'branch', qty: 1 }], output: { item: 'knife', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 16, quality: true, category: 'smithing' },
  { id: 'pan', name: 'Pan', inputs: [{ item: 'iron_ingot', qty: 1 }], output: { item: 'pan', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 14, category: 'smithing' },
  { id: 'axe', name: 'Axe', inputs: [{ item: 'iron_ingot', qty: 2 }, { item: 'branch', qty: 1 }], output: { item: 'axe', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 22, quality: true, category: 'smithing' },
  { id: 'shovel', name: 'Shovel', inputs: [{ item: 'iron_ingot', qty: 1 }, { item: 'branch', qty: 2 }], output: { item: 'shovel', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 18, quality: true, category: 'smithing' },
  { id: 'pickaxe', name: 'Pickaxe', inputs: [{ item: 'iron_ingot', qty: 2 }, { item: 'branch', qty: 1 }], output: { item: 'pickaxe', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 22, quality: true, category: 'smithing' },
  { id: 'sword', name: 'Sword', inputs: [{ item: 'iron_ingot', qty: 4 }, { item: 'hide', qty: 1 }], output: { item: 'sword', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', minSkill: 25, timeS: 40, quality: true, category: 'smithing' },
  { id: 'hammer', name: 'Hammer', inputs: [{ item: 'iron_ingot', qty: 1 }, { item: 'branch', qty: 1 }], output: { item: 'hammer', qty: 1 }, station: 'anvil', skill: 'blacksmith', timeS: 14, category: 'smithing' },
]

export interface BuildStage {
  name: string
  /** Calendar hours of work at construction skill 0 (skill speeds up to 2×). */
  hours: number
  tool: Capability
}

export interface Blueprint {
  id: string
  name: string
  kind: StructureKind
  materials: { item: string; qty: number }[]
  stages: BuildStage[]
  hw: number
  hd: number
  category: 'fire' | 'build'
}

export const BLUEPRINTS: Blueprint[] = [
  { id: 'campfire', name: 'Campfire', kind: 'campfire', materials: [{ item: 'stone', qty: 4 }, { item: 'branch', qty: 3 }], stages: [{ name: 'Laying the fire', hours: 0.25, tool: 'fire_start' }], hw: 1, hd: 1, category: 'fire' },
  { id: 'trough', name: 'Trough', kind: 'trough', materials: [{ item: 'log', qty: 2 }], stages: [{ name: 'Hewing', hours: 1, tool: 'chop' }], hw: 1.2, hd: 0.5, category: 'build' },
  { id: 'well', name: 'Well', kind: 'well', materials: [{ item: 'stone', qty: 12 }, { item: 'log', qty: 2 }, { item: 'rope', qty: 1 }], stages: [{ name: 'Digging the shaft', hours: 4, tool: 'dig' }, { name: 'Lining', hours: 4, tool: 'hammer' }], hw: 1.1, hd: 1.1, category: 'build' },
  { id: 'palisade', name: 'Palisade (4 m)', kind: 'palisade', materials: [{ item: 'log', qty: 4 }], stages: [{ name: 'Setting the stakes', hours: 1.5, tool: 'dig' }], hw: 2, hd: 0.3, category: 'build' },
  { id: 'spit', name: 'Spit (at a campfire)', kind: 'spit', materials: [{ item: 'branch', qty: 6 }, { item: 'rope', qty: 1 }], stages: [{ name: 'Lashing', hours: 0.5, tool: 'cut' }], hw: 1, hd: 0.4, category: 'fire' },
  { id: 'dryrack', name: 'Drying rack', kind: 'dryrack', materials: [{ item: 'branch', qty: 6 }, { item: 'rope', qty: 1 }], stages: [{ name: 'Lashing', hours: 1, tool: 'cut' }], hw: 1.5, hd: 0.6, category: 'build' },
  { id: 'shed', name: 'Shed', kind: 'shed', materials: [{ item: 'log', qty: 6 }, { item: 'branch', qty: 10 }, { item: 'stone', qty: 4 }], stages: [{ name: 'Foundation', hours: 2, tool: 'dig' }, { name: 'Framing', hours: 4, tool: 'hammer' }], hw: 2, hd: 2, category: 'build' },
  { id: 'house', name: 'House', kind: 'house', materials: [{ item: 'log', qty: 16 }, { item: 'branch', qty: 16 }, { item: 'stone', qty: 16 }], stages: [{ name: 'Levelling and foundation', hours: 6, tool: 'dig' }, { name: 'Walls', hours: 10, tool: 'hammer' }, { name: 'Roof', hours: 6, tool: 'hammer' }], hw: 4, hd: 3, category: 'build' },
]

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id)
export const blueprintById = (id: string) => BLUEPRINTS.find((b) => b.id === id)
