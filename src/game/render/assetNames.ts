/**
 * Node names the render code looks up by name in the pack GLBs. Kept in one pure module so the
 * guard test (`assetNames.test.ts`) checks exactly what the renderer requests: a node renamed or
 * dropped by a re-export would otherwise silently fall back to procedural geometry.
 * @domain render
 * @subdomain assets
 */

/** Wall/door/window/corner nodes per house style in `village.glb`. */
export const WALL_STYLES = {
  plaster: { wall: 'Wall_Plaster_Straight', door: 'Wall_Plaster_Door_Round', win: 'Wall_Plaster_Window_Wide_Round', grid: 'Wall_Plaster_WoodGrid' },
  brick: { wall: 'Wall_UnevenBrick_Straight', door: 'Wall_UnevenBrick_Door_Flat', win: 'Wall_UnevenBrick_Window_Wide_Flat', grid: null },
} as const

export const HOUSE_CORNER = 'Corner_Exterior_Wood'
export const HOUSE_CHIMNEY = 'Prop_Chimney'
export const ROOFS = { r6x8: 'Roof_RoundTiles_6x8', r8x10: 'Roof_RoundTiles_8x10', r4x4: 'Roof_RoundTiles_4x4' } as const

/** Other `village.glb` / `props.glb` nodes used by structure templates. */
export const VILLAGE_PROPS = { fence: 'Prop_WoodenFence_Single', crate: 'Prop_Crate', wagon: 'Prop_Wagon' } as const
export const PROPS_NODES = { stall: 'Stall_Cart_Empty', barrel: 'Barrel', carrots: 'FarmCrate_Carrot', anvil: 'Anvil_Log', workbench: 'Workbench' } as const

/** Model per node kind + variant in `nature.glb` (heights normalised to node.scale for trees). */
export const NATURE_MODEL: Record<string, { models: string[]; baseH: number }> = {
  tree_broad: { models: ['CommonTree_1', 'CommonTree_3'], baseH: 8 },
  tree_apple: { models: ['CommonTree_3'], baseH: 9 },
  tree_pine: { models: ['Pine_1', 'Pine_3'], baseH: 7.1 },
  tree_dead: { models: ['DeadTree_1'], baseH: 9.2 },
  bush: { models: ['Fern_1'], baseH: 1.3 },
  bush_berry: { models: ['Bush_Common'], baseH: 1 },
  rock: { models: ['Rock_Medium_1', 'Rock_Medium_2'], baseH: 1 },
  stone: { models: ['Pebble_Round_1'], baseH: 1 },
  herb: { models: ['Flower_3_Group', 'Plant_1'], baseH: 1 },
  mushroom: { models: ['Mushroom_Common'], baseH: 1 },
  reed: { models: ['Grass_Common_Tall'], baseH: 1 },
}

/** Piece nodes of `landmarks.glb` (WORLD-11): ruins, standing stones, wrecks. Built by `scripts/assets/build-landmarks.mjs`. */
export const LANDMARK_NODES = {
  walls: ['Ruin_Wall_Broken', 'Ruin_Wall_Half', 'Ruin_Wall_Hole', 'Ruin_Wall_Double_Broken', 'Ruin_Wall_Overgrown'],
  arch: 'Ruin_Arch_Broken',
  columns: ['Ruin_Column', 'Ruin_Column_Short'],
  floor: 'Ruin_Floor',
  bricks: 'Ruin_Bricks',
  stones: ['Stone_1', 'Stone_2', 'Stone_3', 'Stone_4', 'Stone_5'],
  ship: 'Wreck_Ship',
  boat: 'Wreck_Boat',
} as const

/** Pack file -> node names that must exist in it. */
export function packNodeNames(): Record<string, string[]> {
  const village: string[] = [HOUSE_CORNER, HOUSE_CHIMNEY, ...Object.values(ROOFS), ...Object.values(VILLAGE_PROPS)]
  for (const s of Object.values(WALL_STYLES)) for (const n of Object.values(s)) if (n) village.push(n)
  return {
    'village.glb': village,
    'props.glb': Object.values(PROPS_NODES),
    'nature.glb': Object.values(NATURE_MODEL).flatMap((d) => d.models),
    'landmarks.glb': Object.values(LANDMARK_NODES).flat(),
  }
}
