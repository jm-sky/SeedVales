import { describe, expect, it } from 'vitest'
import { newStack } from '../sim/inventory'
import { equipmentModules, equipmentVisualKey, outfitWithEquipment } from './equipmentVisuals'

const eq = (armor: Record<string, string>) => ({ armor: Object.fromEntries(Object.entries(armor).map(([k, id]) => [k, newStack(id)])) })

describe('equipment visuals (render--011)', () => {
  it('maps worn armour to modules in a fixed order and ignores unsupported items', () => {
    const e = eq({ head_outer: 'iron_helm', torso_outer: 'plate_cuirass', torso_under: 'padded_jacket', boots_outer: 'leather_boots', shoulders_outer: 'pauldrons' })
    expect(equipmentModules(e).map((m) => m.def.module)).toEqual(['LeatherBoots', 'PlateCuirass', 'Pauldrons', 'IronHelm'])
    expect(equipmentVisualKey(e)).toBe('LeatherBoots+PlateCuirass+Pauldrons+IronHelm')
    expect(equipmentVisualKey(eq({}))).toBe('')
    expect(equipmentVisualKey(eq({ torso_under: 'padded_jacket' }))).toBe('')
  })

  it('the signature ignores durability and changes with the worn set', () => {
    const a = eq({ head_outer: 'iron_helm' })
    a.armor.head_outer!.dur = 5
    expect(equipmentVisualKey(a)).toBe(equipmentVisualKey(eq({ head_outer: 'iron_helm' })))
    expect(equipmentVisualKey(a)).not.toBe(equipmentVisualKey(eq({})))
  })

  it('a helmet removes the hood of the Ranger and Herbalist outfits only', () => {
    const helm = eq({ head_outer: 'iron_helm' })
    expect(outfitWithEquipment('Ranger', helm)).toBe('Ranger_NoHood')
    expect(outfitWithEquipment('Herbalist', helm)).toBe('Peasant')
    expect(outfitWithEquipment('Knight', helm)).toBe('Knight')
    expect(outfitWithEquipment('Ranger', eq({ torso_outer: 'plate_cuirass' }))).toBe('Ranger')
  })
})
