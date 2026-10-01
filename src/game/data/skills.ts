/**
 * Skills and attributes. Skills are continuous 0..100, grow with use (diminishing returns). No levels/XP.
 * @domain character
 */

export type SkillId =
  | 'medicine'
  | 'sneak'
  | 'survival'
  | 'traps'
  | 'melee'
  | 'ranged'
  | 'construction'
  | 'blacksmith'
  | 'woodcutting'
  | 'farming'
  | 'trade'

export const SKILL_NAMES: Record<SkillId, string> = {
  medicine: 'Medicine',
  sneak: 'Sneaking',
  survival: 'Survival',
  traps: 'Trapping',
  melee: 'Melee',
  ranged: 'Ranged',
  construction: 'Construction',
  blacksmith: 'Blacksmithing',
  woodcutting: 'Woodcutting',
  farming: 'Farming',
  trade: 'Trading',
}

export type AttrId = 'str' | 'per' | 'end' | 'cha' | 'int' | 'agi'

export const ATTR_NAMES: Record<AttrId, string> = {
  str: 'Strength',
  per: 'Perception',
  end: 'Endurance',
  cha: 'Charisma',
  int: 'Intelligence',
  agi: 'Agility',
}

export type Skills = Record<SkillId, number>
export type Attributes = Record<AttrId, number>

export function emptySkills(): Skills {
  return { medicine: 0, sneak: 0, survival: 5, traps: 0, melee: 5, ranged: 5, construction: 5, blacksmith: 0, woodcutting: 5, farming: 5, trade: 5 }
}

/**
 * Skill gain for one use of given difficulty (0..1). Higher skill → slower gain.
 * ~200 average uses to go 0→50, far more to reach 90.
 */
export function skillGain(current: number, difficulty = 0.5, amount = 1): number {
  const room = Math.max(0, 100 - current)
  return (room / 100) ** 2 * 0.6 * (0.5 + difficulty) * amount
}
