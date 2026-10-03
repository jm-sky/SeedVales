/**
 * Worn armour → character model modules (render--011, stage 1: reuse of existing Quaternius parts only).
 * Pure rules, no three.js: which module an item shows, how it changes the base outfit (hoods under helmets), and the
 * stable signature that makes `Actors` rebuild a human's model when the worn armour changes.
 * @domain render
 * @subdomain characters
 */
import type { CharOutfit } from '../data/professions'
import type { Equipment } from '../sim/types'

/** Modules built by `scripts/assets/build-equipment-modules.mjs` (node names are `EQ_<module>` or `EQ_<module>_<n>`). */
export type EquipmentModule = 'IronHelm' | 'PlateCuirass' | 'Pauldrons' | 'LeatherBoots'

export interface EquipmentVisualDef {
  module: EquipmentModule
  /** The module covers the head, so a hooded base outfit must lose its hood. */
  hidesHood?: boolean
}

/** Item id → module. Items without an entry keep the base outfit (stage 2, `render--012`). */
export const EQUIPMENT_VISUALS: Readonly<Record<string, EquipmentVisualDef>> = {
  iron_helm: { module: 'IronHelm', hidesHood: true },
  plate_cuirass: { module: 'PlateCuirass' },
  pauldrons: { module: 'Pauldrons' },
  leather_boots: { module: 'LeatherBoots' },
}

/** Fixed attach order: under layer first, outer second; slots in a stable order. */
const ORDER = ['boots', 'legs', 'torso', 'forearms', 'hands', 'shoulders', 'head'] as const
const LAYERS = ['under', 'outer'] as const

/** Visible modules of an actor's worn armour, deterministic and without duplicates. */
export function equipmentModules(eq: Pick<Equipment, 'armor'>): { def: EquipmentVisualDef; id: string }[] {
  const out: { def: EquipmentVisualDef; id: string }[] = []
  for (const slot of ORDER) {
    for (const layer of LAYERS) {
      const s = eq.armor[`${slot}_${layer}`]
      const def = s ? EQUIPMENT_VISUALS[s.id] : undefined
      if (s && def && !out.some((o) => o.def.module === def.module)) out.push({ def, id: s.id })
    }
  }
  return out
}

/** Signature of the visible armour (module names only: durability or quality never change the model). */
export const equipmentVisualKey = (eq: Pick<Equipment, 'armor'>): string => equipmentModules(eq).map((m) => m.def.module).join('+')

/** The base outfit with the equipment rules applied: a helmet replaces the hood of the Ranger and Herbalist outfits. */
export function outfitWithEquipment(base: CharOutfit, eq: Pick<Equipment, 'armor'>): CharOutfit {
  if (!equipmentModules(eq).some((m) => m.def.hidesHood)) return base
  if (base === 'Ranger') return 'Ranger_NoHood'
  if (base === 'Herbalist') return 'Peasant'
  return base
}
