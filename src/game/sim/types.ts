/**
 * Mutable per-playthrough state (everything here is saved). Plain data only — no class instances.
 * @domain sim
 */
import type { ArmorLayer, ArmorSlot } from '../data/items'
import type { Attributes, Skills } from '../data/skills'
import type { AnimalVariant, SpeciesId } from '../data/species'
import type { DenSpecies, ProfessionId, StructureKind } from '../world/types'

export const SAVE_VERSION = 1

export type BodyPart = 'head' | 'torso' | 'gut' | 'larm' | 'rarm' | 'lleg' | 'rleg'
export const BODY_PARTS: BodyPart[] = ['head', 'torso', 'gut', 'larm', 'rarm', 'lleg', 'rleg']

export type IllnessKind = 'stomach' | 'poison' | 'rabies'

export interface Vitals {
  /** Damage accumulated per body part. */
  parts: Record<BodyPart, number>
  maxHp: number
  stamina: number
  /** 0..100, 100 = rested. */
  vigor: number
  /** 0..100, 100 = satiated. */
  hunger: number
  /** 0..100, 100 = no thirst. */
  thirst: number
  social: number
  /** Calendar hours spent active at 0 vigor. */
  exhaustionH: number
  illness?: { kind: IllnessKind; severity: number; hoursLeft: number }
  bleeding: number
  /** Knock-out (player) / downed (NPC). Times in gameplay seconds. */
  ko?: { until: number; protectUntil: number }
  dead?: boolean
  /** Remaining convalescence (calendar hours) after heavy injury. */
  convalescenceH: number
}

export interface ItemStack {
  id: string
  qty: number
  /** Durability remaining (tools/weapons/armour). */
  dur?: number
  /** Craft quality 0..3 and material class 0..2. */
  q?: number
  m?: number
  /** Freshness remaining (calendar hours) for food. */
  fresh?: number
  /** Drinks held (waterskins). */
  water?: number
}

export interface Inventory {
  items: ItemStack[]
}

export type ArmorKey = `${ArmorSlot}_${ArmorLayer}`

export interface Equipment {
  main?: ItemStack
  off?: ItemStack
  armor: Partial<Record<ArmorKey, ItemStack>>
}

export interface BigFive {
  /** All 0..1. */
  o: number
  c: number
  e: number
  a: number
  n: number
}

export type AiStep =
  | { op: 'goto'; x: number; z: number; run?: boolean; range?: number; road?: boolean }
  | { op: 'work'; act: string; dur: number; ref?: string; label: string; anim?: string }

export interface AiState {
  goal: string | null
  label: string
  steps: AiStep[]
  stepIdx: number
  stepT: number
  replanAt: number
  /** Goal id → gameplay second until which the goal is suppressed (after failure). */
  cooldowns: Record<string, number>
  stuckT: number
  targetId?: number
  /** Utility score when the current plan was chosen (hysteresis when its precondition disappears mid-plan). */
  goalScore?: number
  /** Obstacle avoidance: chosen side (+1/−1) while sliding along a wall. */
  avoidSide?: number
  /** Max gameplay seconds for the current goto step (unreachable target guard). */
  stepLimit?: number
  /** Diagnostics: last failed goal/step. */
  lastFail?: string
}

export interface ActorBase {
  id: number
  x: number
  y: number
  z: number
  rot: number
  vx: number
  vz: number
  vitals: Vitals
  /** Gameplay second of last sim update (LOD scheduling). */
  lastUpdate: number
  nextUpdate: number
  /** Movement mode for rendering. */
  moving: 'idle' | 'walk' | 'run' | 'swim' | 'sneak'
  /** Last action animation (render hint) and time. */
  action?: { kind: string; at: number }
  attackReadyAt: number
}

export type AgeGroup = 'child' | 'adult' | 'elder'

export interface Human extends ActorBase {
  kind: 'player' | 'npc'
  name: string
  male: boolean
  age: AgeGroup
  attrs: Attributes
  skills: Skills
  big5: BigFive
  money: number
  inv: Inventory
  eq: Equipment
  settlementId: number
  householdId: number
  profession?: ProfessionId
  ai: AiState
  /** Sympathy towards the player −100..100. */
  opinion: number
  combat: boolean
  /** Accumulated kg·hours carried (slow Strength growth). */
  strTrain: number
  callForHelpAt?: number
}

export interface Animal extends ActorBase {
  kind: 'animal'
  species: SpeciesId
  variant: AnimalVariant
  homeX: number
  homeZ: number
  denId?: string
  householdId?: number
  rabid?: boolean
  ai: AiState
  /** Calendar hours since last drink/eat. */
  thirstH: number
  hungerH: number
  fleeFrom?: { x: number; z: number; until: number }
  aggroId?: number
  aggroUntil?: number
}

export type Actor = Human | Animal

export interface Household {
  id: number
  settlementId: number
  profession: ProfessionId
  houseId: string
  memberIds: number[]
}

export type RepDim = 'honesty' | 'helpfulness' | 'renown' | 'courage'
export const REP_DIMS: RepDim[] = ['honesty', 'helpfulness', 'renown', 'courage']

export interface SettlementState {
  id: number
  name: string
  rep: Record<RepDim, number>
  warehouseId?: string
  /** Pending reputation spread from other settlements (gameplay seconds). */
  pendingRep: { at: number; delta: Partial<Record<RepDim, number>>; from: number }[]
}

export type FieldCrop = 'carrot' | 'cabbage' | 'tomato' | 'grain'

export interface Building {
  id: string
  kind: StructureKind
  x: number
  z: number
  rot: number
  hw: number
  hd: number
  settlementId: number
  householdId?: number
  /** 0..100. */
  durability: number
  owner: 'settlement' | 'player' | `household:${number}`
  inv?: Inventory
  lit?: boolean
  /** Water level (drinks) for troughs. */
  water?: number
  field?: { crop: FieldCrop; growth: number; moisture: number }
  ratNest?: { strength: number; since: number }
  playerBuilt?: boolean
  /** Fractional daily household food production accumulator. */
  foodAcc?: number
}

export interface ConstructionSite {
  id: string
  blueprint: string
  x: number
  z: number
  rot: number
  stage: number
  /** Calendar hours of work done in current stage. */
  progressH: number
  delivered: Record<string, number>
  settlementId: number
}

export interface GroundItem {
  id: number
  x: number
  z: number
  stack: ItemStack
  /** Calendar s. */
  droppedAt: number
  lit?: boolean
}

export interface Corpse {
  id: number
  species: SpeciesId
  variant: AnimalVariant
  x: number
  z: number
  rot: number
  diedAt: number
  butchered: boolean
  buried?: boolean
  /** Remaining meat for scavengers. */
  meat: number
}

export interface NodeState {
  /** Calendar s when felled / harvested / depleted. */
  at: number
  kind: 'felled' | 'harvested' | 'depleted'
  left?: number
}

export interface DenState {
  id: string
  species: DenSpecies
  x: number
  z: number
  alive: boolean
  maxCount: number
  nextSpawn: number
}

export type QuestStatus = 'available' | 'active' | 'done' | 'expired'

export interface Quest {
  id: string
  kind: 'rats' | 'wolves'
  title: string
  desc: string
  settlementId: number
  giverId: number
  buildingId?: string
  status: QuestStatus
  reward: number
  createdAt: number
  killsNeeded: number
  kills: number
}

export interface PlayerActivity {
  kind: string
  ref?: string
  label: string
  total: number
  elapsed: number
  accel?: number
  /** Extra payload (recipe id, blueprint id…). */
  data?: string
}

export interface Order {
  id: string
  npcId: number
  recipe: string
  paid: number
  price: number
  readyAt: number
  status: 'waiting' | 'ready' | 'collected'
}

export type WeatherKind = 'clear' | 'overcast' | 'rain' | 'storm' | 'snow'

export interface WeatherState {
  kind: WeatherKind
  fog: number
  intensity: number
  /** Calendar s when next weather roll happens. */
  until: number
  temp: number
  /** Ground wetness 0..1 (waters fields). */
  wetness: number
}

export interface PlayerExtra {
  activity?: PlayerActivity
  stats: Record<string, number>
  badges: Record<string, { at: number; count: number }>
  sneaking: boolean
  orders: Order[]
  autopilot?: { roadId: number; idx: number; dir: 1 | -1 }
  bowDraw: number
  bed?: string
}

export interface Projectile {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  ownerId: number
  damage: number
  dmgType: 'cut' | 'pierce' | 'blunt'
  ttl: number
  item?: string
}

export interface GameMessage {
  t: number
  text: string
  kind?: 'info' | 'good' | 'bad' | 'quest'
}

export interface GameState {
  saveVersion: number
  genVersion: number
  seed: number
  time: { cal: number; play: number }
  weather: WeatherState
  player: Human
  px: PlayerExtra
  npcs: Human[]
  animals: Animal[]
  households: Household[]
  settlements: SettlementState[]
  buildings: Building[]
  sites: ConstructionSite[]
  ground: GroundItem[]
  corpses: Corpse[]
  nodes: Record<string, NodeState>
  dens: DenState[]
  quests: Quest[]
  terrainEdits: Record<string, number[]>
  messages: GameMessage[]
  nextId: number
  rng: number
}
