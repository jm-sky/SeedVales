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
  { id: 'torch', name: 'Pochodnia', inputs: [{ item: 'branch', qty: 1 }, { item: 'cloth', qty: 1 }], output: { item: 'torch', qty: 2 }, skill: 'survival', timeS: 4, category: 'survival' },
  { id: 'bandage', name: 'Bandaże', inputs: [{ item: 'cloth', qty: 1 }], output: { item: 'bandage', qty: 2 }, tool: 'cut', skill: 'medicine', timeS: 4, category: 'medicine' },
  { id: 'salve', name: 'Maść ziołowa', inputs: [{ item: 'yarrow', qty: 2 }, { item: 'chamomile', qty: 1 }], output: { item: 'salve', qty: 1 }, skill: 'medicine', minSkill: 5, timeS: 10, category: 'medicine' },
  { id: 'herbal_tea', name: 'Napar ziołowy', inputs: [{ item: 'mint', qty: 1 }, { item: 'chamomile', qty: 1 }], output: { item: 'herbal_tea', qty: 1 }, station: 'campfire', skill: 'medicine', timeS: 6, category: 'medicine' },
  { id: 'cook_meat', name: 'Pieczenie mięsa', inputs: [{ item: 'raw_meat', qty: 1 }], output: { item: 'cooked_meat', qty: 1 }, station: 'campfire', skill: 'survival', timeS: 8, category: 'food' },
  { id: 'dry_meat', name: 'Suszenie mięsa', inputs: [{ item: 'raw_meat', qty: 2 }], output: { item: 'dried_meat', qty: 1 }, station: 'dryrack', skill: 'survival', timeS: 12, category: 'food' },
  { id: 'stew', name: 'Gulasz', inputs: [{ item: 'raw_meat', qty: 1 }, { item: 'carrot', qty: 1 }, { item: 'cabbage', qty: 1 }], output: { item: 'stew', qty: 2 }, station: 'campfire', skill: 'survival', timeS: 14, category: 'food' },
  { id: 'bread', name: 'Chleb', inputs: [{ item: 'grain', qty: 3 }], output: { item: 'bread', qty: 1 }, station: 'campfire', skill: 'survival', timeS: 12, category: 'food' },
  { id: 'rope', name: 'Lina', inputs: [{ item: 'wool', qty: 3 }], output: { item: 'rope', qty: 1 }, skill: 'survival', timeS: 10, category: 'survival' },
  { id: 'cloth', name: 'Płótno', inputs: [{ item: 'wool', qty: 2 }], output: { item: 'cloth', qty: 1 }, tool: 'sew', skill: 'survival', timeS: 10, category: 'survival' },
  { id: 'club', name: 'Maczuga', inputs: [{ item: 'branch', qty: 2 }], output: { item: 'club', qty: 1 }, tool: 'cut', skill: 'survival', timeS: 8, category: 'weapons' },
  { id: 'staff', name: 'Kij', inputs: [{ item: 'branch', qty: 1 }], output: { item: 'staff', qty: 1 }, tool: 'cut', skill: 'survival', timeS: 5, category: 'weapons' },
  { id: 'spear', name: 'Włócznia', inputs: [{ item: 'branch', qty: 2 }, { item: 'iron_ingot', qty: 1 }], output: { item: 'spear', qty: 1 }, tool: 'cut', skill: 'survival', timeS: 14, quality: true, category: 'weapons' },
  { id: 'short_bow', name: 'Krótki łuk', inputs: [{ item: 'branch', qty: 2 }, { item: 'rope', qty: 1 }], output: { item: 'short_bow', qty: 1 }, tool: 'cut', skill: 'ranged', minSkill: 5, timeS: 20, quality: true, category: 'weapons' },
  { id: 'arrows', name: 'Strzały ×6', inputs: [{ item: 'branch', qty: 1 }, { item: 'stone', qty: 1 }], output: { item: 'arrow', qty: 6 }, tool: 'cut', skill: 'ranged', timeS: 10, category: 'weapons' },
  { id: 'sling', name: 'Proca', inputs: [{ item: 'hide', qty: 1 }, { item: 'rope', qty: 1 }], output: { item: 'sling', qty: 1 }, tool: 'cut', skill: 'ranged', timeS: 8, category: 'weapons' },
  { id: 'sling_stones', name: 'Kamienie do procy ×8', inputs: [{ item: 'stone', qty: 1 }], output: { item: 'sling_stone', qty: 8 }, skill: 'ranged', timeS: 4, category: 'weapons' },
  { id: 'leather_jerkin', name: 'Kaftan skórzany', inputs: [{ item: 'hide', qty: 3 }], output: { item: 'leather_jerkin', qty: 1 }, tool: 'sew', skill: 'survival', minSkill: 5, timeS: 25, quality: true, category: 'leather' },
  { id: 'leather_cap', name: 'Czapka skórzana', inputs: [{ item: 'hide', qty: 1 }], output: { item: 'leather_cap', qty: 1 }, tool: 'sew', skill: 'survival', timeS: 10, quality: true, category: 'leather' },
  { id: 'leather_boots', name: 'Buty skórzane', inputs: [{ item: 'hide', qty: 2 }], output: { item: 'leather_boots', qty: 1 }, tool: 'sew', skill: 'survival', timeS: 14, quality: true, category: 'leather' },
  { id: 'iron_ingot', name: 'Wytop żelaza', inputs: [{ item: 'iron_ore', qty: 2 }, { item: 'coal', qty: 1 }], output: { item: 'iron_ingot', qty: 1 }, station: 'anvil', skill: 'blacksmith', timeS: 16, category: 'smithing' },
  { id: 'knife', name: 'Nóż', inputs: [{ item: 'iron_ingot', qty: 1 }, { item: 'branch', qty: 1 }], output: { item: 'knife', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 16, quality: true, category: 'smithing' },
  { id: 'axe', name: 'Siekiera', inputs: [{ item: 'iron_ingot', qty: 2 }, { item: 'branch', qty: 1 }], output: { item: 'axe', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 22, quality: true, category: 'smithing' },
  { id: 'shovel', name: 'Łopata', inputs: [{ item: 'iron_ingot', qty: 1 }, { item: 'branch', qty: 2 }], output: { item: 'shovel', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 18, quality: true, category: 'smithing' },
  { id: 'pickaxe', name: 'Kilof', inputs: [{ item: 'iron_ingot', qty: 2 }, { item: 'branch', qty: 1 }], output: { item: 'pickaxe', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', timeS: 22, quality: true, category: 'smithing' },
  { id: 'sword', name: 'Miecz', inputs: [{ item: 'iron_ingot', qty: 4 }, { item: 'hide', qty: 1 }], output: { item: 'sword', qty: 1 }, tool: 'hammer', station: 'anvil', skill: 'blacksmith', minSkill: 25, timeS: 40, quality: true, category: 'smithing' },
  { id: 'hammer', name: 'Młotek', inputs: [{ item: 'iron_ingot', qty: 1 }, { item: 'branch', qty: 1 }], output: { item: 'hammer', qty: 1 }, station: 'anvil', skill: 'blacksmith', timeS: 14, category: 'smithing' },
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
  { id: 'campfire', name: 'Ognisko', kind: 'campfire', materials: [{ item: 'stone', qty: 4 }, { item: 'branch', qty: 3 }], stages: [{ name: 'Układanie', hours: 0.25, tool: 'fire_start' }], hw: 1, hd: 1, category: 'fire' },
  { id: 'trough', name: 'Koryto', kind: 'trough', materials: [{ item: 'log', qty: 2 }], stages: [{ name: 'Ciosanie', hours: 1, tool: 'chop' }], hw: 1.2, hd: 0.5, category: 'build' },
  { id: 'well', name: 'Studnia', kind: 'well', materials: [{ item: 'stone', qty: 12 }, { item: 'log', qty: 2 }, { item: 'rope', qty: 1 }], stages: [{ name: 'Kopanie dołu', hours: 4, tool: 'dig' }, { name: 'Obudowa', hours: 4, tool: 'hammer' }], hw: 1.1, hd: 1.1, category: 'build' },
  { id: 'palisade', name: 'Palisada (4 m)', kind: 'palisade', materials: [{ item: 'log', qty: 4 }], stages: [{ name: 'Wkopywanie pali', hours: 1.5, tool: 'dig' }], hw: 2, hd: 0.3, category: 'build' },
  { id: 'dryrack', name: 'Suszarnia', kind: 'dryrack', materials: [{ item: 'branch', qty: 6 }, { item: 'rope', qty: 1 }], stages: [{ name: 'Wiązanie', hours: 1, tool: 'cut' }], hw: 1.5, hd: 0.6, category: 'build' },
  { id: 'shed', name: 'Szopa', kind: 'shed', materials: [{ item: 'log', qty: 6 }, { item: 'branch', qty: 10 }, { item: 'stone', qty: 4 }], stages: [{ name: 'Fundament', hours: 2, tool: 'dig' }, { name: 'Konstrukcja', hours: 4, tool: 'hammer' }], hw: 2, hd: 2, category: 'build' },
  { id: 'house', name: 'Dom', kind: 'house', materials: [{ item: 'log', qty: 16 }, { item: 'branch', qty: 16 }, { item: 'stone', qty: 16 }], stages: [{ name: 'Wyrównanie i fundament', hours: 6, tool: 'dig' }, { name: 'Ściany', hours: 10, tool: 'hammer' }, { name: 'Dach', hours: 6, tool: 'hammer' }], hw: 4, hd: 3.5, category: 'build' },
]

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id)
export const blueprintById = (id: string) => BLUEPRINTS.find((b) => b.id === id)
