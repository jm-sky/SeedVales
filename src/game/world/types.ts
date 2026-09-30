/**
 * Generated (deterministic) world foundation. Immutable after generation; cached per seed+version.
 * @domain world
 * @subdomain world-gen
 */

export const GEN_VERSION = 5
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

export type SettlementSize = 'SM' | 'MD' | 'LG' | 'XL'

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
  homeSettlement: number
  spawn: { x: number; z: number }
  genMs: number
}
