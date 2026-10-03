/**
 * Generated (deterministic) world foundation. Immutable after generation; cached per seed+version.
 * @domain world
 * @subdomain world-gen
 */

export const GEN_VERSION = 10
export const WORLD_SIZE_M = 8192
export const CELL_M = 8
export const GRID_N = WORLD_SIZE_M / CELL_M + 1 // vertices per side
export const SEA_LEVEL = 0
export const CHUNK_M = 128

export const Biome = {
  Ocean: 0,
  Beach: 1,
  Meadow: 2,
  Steppe: 3,
  Swamp: 4,
  ForestDeciduous: 5,
  ForestMixed: 6,
  ForestConifer: 7,
  Mountain: 8,
  Snow: 9,
  Water: 10,
} as const
export type BiomeId = (typeof Biome)[keyof typeof Biome]

/** Settlement sizes the generator produces (a bigger tier needs a generator + content contract first, review 013 M-07). */
export type SettlementSize = 'SM' | 'MD' | 'LG'

export type StructureKind =
  | 'house'
  | 'well'
  | 'campfire'
  | 'noticeboard'
  | 'warehouse'
  | 'market'
  | 'inn'
  | 'field'
  | 'pen'
  | 'anvil'
  | 'woodpile'
  | 'dryrack'
  | 'herbgarden'
  | 'torchpost'
  | 'trough'
  | 'palisade'
  | 'shed'
  | 'bridge'
  /** Roasting spit over a campfire (FOOD-03). */
  | 'spit'

export type ProfessionId =
  | 'farmer'
  | 'woodcutter'
  | 'hunter'
  | 'guard'
  | 'herbalist'
  | 'trader'
  | 'blacksmith'
  | 'shepherd'

export interface GenStructure {
  id: string
  kind: StructureKind
  x: number
  z: number
  /** Rotation around Y (radians). */
  rot: number
  /** Footprint half-sizes (m) for collision/flattening. */
  hw: number
  hd: number
  settlementId: number
  householdIdx?: number
}

export interface GenHousehold {
  idx: number
  profession: ProfessionId
  houseId: string
  members: number
}

export interface GenSettlement {
  id: number
  name: string
  size: SettlementSize
  x: number
  z: number
  y: number
  radius: number
  households: GenHousehold[]
}

export interface GenRoad {
  id: number
  from: number
  to: number
  points: { x: number; z: number }[]
  length: number
  crossings: { x: number; z: number; kind: 'ford' | 'bridge'; rot: number; span: number }[]
}

export type DenSpecies = 'wolf' | 'fox' | 'bear' | 'boar' | 'deer' | 'hare' | 'rat'

export interface GenDen {
  id: string
  species: DenSpecies
  x: number
  z: number
  /** Herd/pack size at start. */
  count: number
}

export type OreKind = 'coal' | 'iron' | 'copper' | 'gold'

export interface GenDeposit {
  id: string
  ore: OreKind
  x: number
  z: number
  radius: number
  /** 0..1 chance multiplier. */
  richness: number
}

export type LandmarkKind = 'stone_circle' | 'house_ruin' | 'estate_ruin' | 'shipwreck' | 'boat_wreck'

/** Static point of interest (WORLD-11); rendered from `landmarks.glb`, discovered through the map. */
export interface GenLandmark {
  id: string
  kind: LandmarkKind
  /** English proper name, e.g. "The Hollow Stones". */
  name: string
  x: number
  z: number
  /** Rotation around Y (radians). */
  rot: number
  /** Footprint radius (m): where the pieces lie and the discovery distance. */
  radius: number
}

export type CaveSize = 'small' | 'medium'

/**
 * Cave (WORLD-05): a tunnel/chamber chain entered through a cutting in a mountain slope. Only this compact
 * descriptor is generated and cached; floor/ceiling grids are derived on demand (`world/caveShape.ts`).
 */
export interface GenCave {
  id: string
  /** English proper name, e.g. "Wolfmaw Cave". */
  name: string
  size: CaveSize
  /** Entrance (start of the spine) and the direction into the mountain (radians, atan2(dx, dz)). */
  x: number
  z: number
  yaw: number
  /** Floor height at the entrance (m); the floor descends from here along the spine. */
  y0: number
  /** Flat [x, z, radius, …] spine points ~6 m apart; a radius above the tunnel radius marks a chamber. */
  spine: number[]
}

export interface WorldData {
  version: number
  seed: number
  size: number
  cell: number
  n: number
  /** Terrain height after carving/flattening (m). */
  height: Float32Array
  /** Water surface height or -Infinity when dry. Ocean handled via SEA_LEVEL. */
  water: Float32Array
  /** 1 = river cell, 2 = lake cell. */
  waterKind: Uint8Array
  biome: Uint8Array
  /** 0..255 — how much micro-detail is suppressed (roads, settlements). */
  flat: Uint8Array
  /** 0..255 road presence for rendering tint. */
  road: Uint8Array
  moisture: Float32Array
  settlements: GenSettlement[]
  structures: GenStructure[]
  roads: GenRoad[]
  dens: GenDen[]
  deposits: GenDeposit[]
  landmarks: GenLandmark[]
  caves: GenCave[]
  homeSettlement: number
  spawn: { x: number; z: number }
  /** Wall-clock generation time of THIS run (not stored in the cache; 0 on cache hit). */
  genMs: number
}
