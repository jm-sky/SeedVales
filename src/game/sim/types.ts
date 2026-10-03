/**
 * Mutable per-playthrough state (everything here is saved). Plain data only — no class instances.
 * @domain sim
 */
import type { ArmorLayer, ArmorSlot } from '../data/items'
import type { FlagValue, QuestId, SlotId } from '../data/quests/types'
import type { Attributes, Skills } from '../data/skills'
import type { AnimalVariant, SpeciesId } from '../data/species'
import type { DenSpecies, ProfessionId, StructureKind } from '../world/types'

export const SAVE_VERSION = 9

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
  /** Current edge sharpness 0..1 of an edged weapon (combat--005); absent = at the weapon's maximum (documented compatibility default, no save bump). */
  edge?: number
  /** Freshness remaining (calendar hours) for food. */
  fresh?: number
  /** Drinks held (waterskins). */
  water?: number
  /** Animal species the meat comes from (FOOD-03); stacks of different species never merge. */
  sp?: string
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
  /** Last blood trace this predator investigated (not revisited, TRACE-01). */
  sniffedTrace?: number
  /** Utility score when the current plan was chosen (hysteresis when its precondition disappears mid-plan). */
  goalScore?: number
  /** Obstacle avoidance: chosen side (+1/−1) while sliding along a wall. */
  avoidSide?: number
  /** Max gameplay seconds for the current goto step (unreachable target guard). */
  stepLimit?: number
  /** Gameplay second of the next perception/decision (AI-01 cadence); 0 = decide now. */
  decideAt?: number
  /** Gameplay second when the current goal was chosen (bounded chases). */
  goalAt?: number
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

/**
 * Role in the household: `son` = grown son living with his parents, no family of his own (COMP-02);
 * `visitor` = quest-owned wanderer without a household (quests--001, G01 Piers).
 */
export type Kin = 'head' | 'spouse' | 'child' | 'elder' | 'son' | 'visitor'

/** An actor kept at a spot by an authored quest (hold primitive, quests-engine §7). */
export interface QuestHold {
  q: QuestId
  x: number
  z: number
  /**
   * Calendar s at which the hold ends by itself (review 014 #1: every hold is bounded). A missing value (a hold written
   * by an older build) counts as already expired.
   */
  until?: number
}

export type CompanionTask = 'escort' | 'guard'
export type CompanionRisk = 'low' | 'medium' | 'high'

/** Companion contract with the player (COMP-01/02). Times in calendar seconds. */
export interface CompanionContract {
  kind: 'hired' | 'free'
  task: CompanionTask
  risk: CompanionRisk
  since: number
  /** Contract end (hired only). */
  until?: number
  paid: number
  /** Calendar s of the last opinion gain from travelling together. */
  bondAt: number
}

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
  /** Trader caravan expedition (explicit phase; calendar s of departure). */
  trip?: { phase: 'outbound' | 'returning'; since: number }
  kin?: Kin
  /** Travels with the player (COMP-01/02). */
  companion?: CompanionContract
  /** Gifts received from the player today (SOC-01 diminishing returns). */
  gifts?: { day: number; n: number }
  /** Calendar day the player last asked this NPC to join for free (one roll per day). */
  joinAskDay?: number
  /** Authored quest holding this NPC at a spot (safety and eating from the pack only). */
  questHold?: QuestHold
  /** Quest-owned NPC (visitor): no household, no profession, removed by the quest. */
  questOwner?: QuestId
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
  /** Calendar s of last shearing (wool regrows over WOOL_REGROW_DAYS). */
  shornAt?: number
  /** Authored quest keeps this animal at a spot / makes it follow an actor (id). */
  questHold?: QuestHold
  questFollow?: number
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
  /** Settlement treasury (copper): pays quest rewards and caravan fees, receives inn/penance money. */
  treasury: number
  /** Calendar day index of the last tax collection. */
  taxDay?: number
  /** Pending reputation spread from other settlements (gameplay seconds). */
  pendingRep: { at: number; delta: Partial<Record<RepDim, number>>; from: number }[]
  /** Headman NPC id (SET-05); becomes the deputy when the player takes the office. */
  headmanId?: number
  deputyId?: number
  /** The player holds the office of mayor here. */
  playerMayor?: boolean
  taxRate?: TaxRateChoice
}

export type TaxRateChoice = 'low' | 'normal' | 'high'

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
  /** Campfire / hearth fuel in calendar hours (FIRE-01); the fire is lit while > 0. */
  fuel?: number
  /** Stone hearth: permanent, relit with fuel, dismantled for its stones (FIRE-02). */
  hearth?: boolean
  /** NPC currently feeding this fire (reservation, FIRE-02); ignored once `until` (calendar s) has passed. */
  tender?: { id: number; until: number }
  /** Water level (drinks) for troughs. */
  water?: number
  field?: { crop: FieldCrop; growth: number; moisture: number }
  ratNest?: { strength: number; since: number }
  playerBuilt?: boolean
  /** Bridge deck height (m) — walkway surface for collision/rendering. */
  deck?: number
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
  /** Torch standing upright in the ground (FIRE-03). */
  planted?: boolean
  /** Remaining burn time in calendar hours of a torch lying/standing in the world; decreases only while lit. */
  burnH?: number
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

/** Blood on the ground (TRACE-01); rendered as decals, attracts predators. */
/** Wheelbarrow or handcart (TRANS-01): pushed by the player or parked in the world, with its own load. */
export interface Cart {
  id: number
  /** Item id ('wheelbarrow' | 'handcart'). */
  item: string
  x: number
  z: number
  rot: number
  dur?: number
  inv: Inventory
}

export interface Trace {
  id: number
  x: number
  z: number
  /** 'blood' (default) lures predators; 'ash' is what a burnt-out campfire leaves (FIRE-01). */
  kind?: 'ash' | 'blood'
  /** 0..1, fades over calendar time (faster in rain). */
  intensity: number
  /** Calendar s of the last addition. */
  at: number
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
  /** Maximum reward; the settlement treasury may pay less (see `paid`). */
  reward: number
  /** Amount actually paid at completion (M-04). */
  paid?: number
  createdAt: number
  killsNeeded: number
  kills: number
}

export type AuthoredQuestStatus = 'offered' | 'active' | 'done' | 'lapsed' | 'refused'

/** Runtime state of one authored quest (docs/design/quests-engine.md §3). Plain data, saved. */
export interface AuthoredQuestState {
  status: AuthoredQuestStatus
  /** Index into `QuestDef.stages`; only moves forward. */
  stage: number
  flags: Record<string, FlagValue>
  /** Outcome choice, changeable until `settled`. */
  choice?: string
  settled: boolean
  ending?: string
  offeredAt: number
  startedAt?: number
  endedAt?: number
  /** Calendar s of the last stage change (`since … from: 'stage'`); falls back to `startedAt`. */
  stageAt?: number
  /** Cast slot → actor id, resolved once at offer time. */
  cast: Record<SlotId, number>
  /** Resolved anchors (cache key = JSON of the anchor spec). */
  anchors: Record<string, { x: number; z: number; id?: string }>
  /** Observation id → accumulated dwell (gameplay s); −1 = done. */
  obs: Record<string, number>
  counters: Record<string, number>
  /** Counter id → building ids already counted (`distinct`). */
  seen: Record<string, string[]>
  /** Rule id → last game day it fired (−1 = never; `once: 'ever'` uses any value ≥ 0). */
  fired: Record<string, number>
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
  /** Recipe to forge and the item it yields (separate fields — a recipe id is not an item id). */
  recipeId: string
  itemId: string
  paid: number
  price: number
  readyAt: number
  status: 'waiting' | 'ready'
  /** Materials set aside from the smith's store when ordering (consumed at forging). */
  reserved?: ItemStack[]
  /** Forged item held by the smith until collected (materials already consumed). */
  item?: ItemStack
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
  /** Preferred weapons (item ids) for quick switching (UI-03). */
  primary?: Partial<Record<WeaponKind, string>>
  /** Map waypoint set by the player (UI-04). */
  waypoint?: { x: number; z: number; label: string }
  /** Player map notes (P-08): dropped at the player's own position, so always in explored cells. */
  pins?: MapPin[]
  /** Settlement ids the player has reached (map, UI-04). */
  visited?: number[]
  /** Cart being pushed (TRANS-01). */
  cart?: Cart
  /** Fog of war (MAP-01): explored map cells as a bitmask in 32-bit words (FOG.cellM grid). */
  explored?: number[]
  /** Cave the player is in (WORLD-05): cave index + 1; absent/0 = on the surface. */
  cave?: number
  /** Treasure spots already dug up (LOOT-01); the contents are derived from the world seed + spot id, so nothing else is stored. */
  lootTaken?: string[]
  /** Landmarks a villager has already told a treasure tale about (P-06). */
  talesTold?: string[]
}

export interface MapPin {
  id: number
  x: number
  z: number
  label: string
}

export type WeaponKind = 'melee' | 'ranged'

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
  traces: Trace[]
  /** Parked carts in the world (TRANS-01). */
  carts: Cart[]
  nodes: Record<string, NodeState>
  dens: DenState[]
  quests: Quest[]
  /** Authored quests (quests--001), by quest id. */
  authoredQuests: Record<QuestId, AuthoredQuestState>
  terrainEdits: Record<string, number[]>
  messages: GameMessage[]
  nextId: number
  rng: number
}
