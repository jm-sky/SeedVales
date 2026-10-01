/**
 * Professions (data): starting kit, skill focus, duty hours. Duty logic lives in sim/npc/duties.
 * @domain npc
 */
import type { ProfessionId } from '../world/types'
import type { SkillId } from './skills'

/** Outfit GLB family under characters/ (`<Male|Female>_<outfit>.glb`); the player keeps Ranger (hood). */
export type CharOutfit = 'Peasant' | 'Ranger' | 'Ranger_NoHood' | 'Knight' | 'Wizard'

export interface ProfessionDef {
  id: ProfessionId
  name: string
  kit: { item: string; qty: number }[]
  weapon: string
  skills: Partial<Record<SkillId, number>>
  money: [number, number]
  /** Calendar hours when primary duty is active [from, to). */
  workHours: [number, number]
  /** Household store starting goods. */
  store: { item: string; qty: number }[]
  shirt: number
  /** Character outfit model; omitted = Peasant. */
  outfit?: CharOutfit
}

export const PROFESSIONS: Record<ProfessionId, ProfessionDef> = {
  farmer: {
    id: 'farmer', name: 'Farmer', weapon: 'staff', money: [20, 60], workHours: [6, 18], shirt: 0x8a7a4a,
    kit: [{ item: 'shovel', qty: 1 }, { item: 'knife', qty: 1 }, { item: 'bucket', qty: 1 }],
    skills: { farming: 45, survival: 15 },
    store: [{ item: 'carrot', qty: 10 }, { item: 'cabbage', qty: 5 }, { item: 'grain', qty: 12 }, { item: 'bread', qty: 3 }],
  },
  woodcutter: {
    id: 'woodcutter', name: 'Woodcutter', weapon: 'axe', money: [20, 50], workHours: [7, 17], shirt: 0x6b3b2a,
    kit: [{ item: 'axe', qty: 1 }, { item: 'knife', qty: 1 }, { item: 'waterskin_m', qty: 1 }],
    skills: { woodcutting: 50, construction: 20, melee: 15 },
    store: [{ item: 'log', qty: 4 }, { item: 'branch', qty: 12 }, { item: 'bread', qty: 3 }, { item: 'dried_meat', qty: 2 }],
  },
  hunter: {
    id: 'hunter', name: 'Hunter', weapon: 'short_bow', money: [25, 70], workHours: [5, 15], shirt: 0x3e5a32, outfit: 'Ranger_NoHood',
    kit: [{ item: 'knife', qty: 1 }, { item: 'arrow', qty: 20 }, { item: 'waterskin_m', qty: 1 }],
    skills: { ranged: 45, survival: 35, sneak: 30, traps: 20 },
    store: [{ item: 'dried_meat', qty: 6 }, { item: 'hide', qty: 2 }, { item: 'arrow', qty: 20 }],
  },
  guard: {
    id: 'guard', name: 'Guard', weapon: 'spear', money: [30, 80], workHours: [0, 24], shirt: 0x5a2a2a, outfit: 'Knight',
    kit: [{ item: 'short_sword', qty: 1 }, { item: 'torch', qty: 3 }, { item: 'bandage', qty: 2 }, { item: 'flint', qty: 1 }],
    skills: { melee: 40, medicine: 10 },
    store: [{ item: 'bread', qty: 4 }, { item: 'dried_meat', qty: 3 }, { item: 'torch', qty: 6 }],
  },
  herbalist: {
    id: 'herbalist', name: 'Herbalist', weapon: 'staff', money: [30, 70], workHours: [7, 16], shirt: 0x4d6b5a,
    kit: [{ item: 'knife', qty: 1 }, { item: 'bandage', qty: 4 }, { item: 'salve', qty: 2 }],
    skills: { medicine: 45, survival: 25 },
    store: [{ item: 'mint', qty: 6 }, { item: 'chamomile', qty: 6 }, { item: 'yarrow', qty: 3 }, { item: 'bread', qty: 3 }, { item: 'carrot', qty: 4 }],
  },
  trader: {
    id: 'trader', name: 'Trader', weapon: 'dagger', money: [200, 400], workHours: [8, 18], shirt: 0x2f4a78, outfit: 'Wizard',
    kit: [{ item: 'knife', qty: 1 }],
    skills: { trade: 50 },
    store: [
      { item: 'bread', qty: 8 }, { item: 'cloth', qty: 6 }, { item: 'rope', qty: 3 }, { item: 'bandage', qty: 6 },
      { item: 'waterskin_m', qty: 2 }, { item: 'torch', qty: 6 }, { item: 'flint', qty: 2 }, { item: 'arrow', qty: 30 },
      { item: 'axe', qty: 1 }, { item: 'shovel', qty: 1 }, { item: 'pickaxe', qty: 1 }, { item: 'hammer', qty: 1 }, { item: 'pan', qty: 1 }, { item: 'wheelbarrow', qty: 1 },
      { item: 'short_bow', qty: 1 }, { item: 'backpack', qty: 1 }, { item: 'leather_jerkin', qty: 1 }, { item: 'sling', qty: 1 },
      { item: 'apple', qty: 10 }, { item: 'dried_meat', qty: 4 }, { item: 'sewing_kit', qty: 1 }, { item: 'blanket', qty: 1 },
    ],
  },
  blacksmith: {
    id: 'blacksmith', name: 'Blacksmith', weapon: 'war_hammer', money: [60, 150], workHours: [7, 17], shirt: 0x333333,
    kit: [{ item: 'hammer', qty: 1 }, { item: 'knife', qty: 1 }],
    skills: { blacksmith: 55, melee: 25 },
    store: [{ item: 'iron_ingot', qty: 8 }, { item: 'iron_ore', qty: 6 }, { item: 'coal', qty: 8 }, { item: 'branch', qty: 6 }, { item: 'bread', qty: 3 }],
  },
  shepherd: {
    id: 'shepherd', name: 'Shepherd', weapon: 'staff', money: [15, 40], workHours: [6, 18], shirt: 0x9a8c70,
    kit: [{ item: 'sling', qty: 1 }, { item: 'sling_stone', qty: 15 }, { item: 'bucket', qty: 1 }, { item: 'waterskin_m', qty: 1 }, { item: 'bandage', qty: 1 }, { item: 'blanket', qty: 1 }, { item: 'rope', qty: 1 }, { item: 'knife', qty: 1 }],
    skills: { survival: 30, ranged: 25 },
    store: [{ item: 'wool', qty: 6 }, { item: 'milk', qty: 2 }, { item: 'bread', qty: 3 }, { item: 'carrot', qty: 3 }],
  },
}

const FIRST_M = ['Bogdan', 'Mirosław', 'Wojciech', 'Jarosław', 'Zbigniew', 'Stanisław', 'Kazimierz', 'Radosław', 'Bolesław', 'Mieszko', 'Przemysł', 'Dobromir', 'Sławomir', 'Leszek', 'Janko', 'Maciej', 'Tomasz', 'Piotr']
const FIRST_F = ['Dobrawa', 'Jadwiga', 'Bogna', 'Wanda', 'Radomira', 'Zofia', 'Małgorzata', 'Agnieszka', 'Dorota', 'Świętosława', 'Ludmiła', 'Halina', 'Marta', 'Anna', 'Elżbieta']
export const NAMES = { male: FIRST_M, female: FIRST_F }

/** Occupational surnames per household profession (D-LANG-1): the head's trade shows in the family name. */
export const SURNAMES: Record<ProfessionId, string[]> = {
  farmer: ['Plowman', 'Harrow', 'Sheaf', 'Barleycorn', 'Fieldman'],
  woodcutter: ['Axeman', 'Woodward', 'Sawyer', 'Hewer', 'Faller'],
  hunter: ['Fowler', 'Bowman', 'Tracker', 'Forester', 'Hawker'],
  guard: ['Hornblower', 'Warden', 'Spearman', 'Watcher', 'Shieldman'],
  herbalist: ['Wortman', 'Gatherer', 'Simpler', 'Brewster', 'Herber'],
  trader: ['Chapman', 'Mercer', 'Packer', 'Monger', 'Merchant'],
  blacksmith: ['Smith', 'Hammerman', 'Ironside', 'Farrier', 'Anvil'],
  shepherd: ['Shepherd', 'Herder', 'Wooler', 'Flockman', 'Fold'],
}
