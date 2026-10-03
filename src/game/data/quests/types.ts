import type { ProfessionId, StructureKind } from '../../world/types'
/**
 * Authored quest definitions: plain data (no functions, no closures). Conditions and effects are tagged unions
 * evaluated by `sim/questEngine.ts`. This layer must not import `sim/*` (docs/design/quests-engine.md §1).
 * @domain quests
 */
import type { SkillId } from '../skills'
import type { AnimalVariant, SpeciesId } from '../species'

export type QuestId = string
export type SlotId = string
export type FlagValue = boolean | number | string
export type QuestKin = 'head' | 'spouse' | 'child' | 'elder' | 'son'
export type QuestAge = 'child' | 'adult' | 'elder'
export type QuestRepDim = 'honesty' | 'helpfulness' | 'renown' | 'courage'
export type QuestStatusId = 'offered' | 'active' | 'done' | 'lapsed' | 'refused'
export type QuestEventKind = 'roast' | 'repair' | 'light' | 'douse' | 'built' | 'give' | 'kill'

/** A place named without coordinates; resolved once and cached in the quest state (`anchors`). */
export type Anchor =
  /** House of the slot's household. */
  | { k: 'house'; slot: SlotId }
  /** Nearest building of `kind` owned by the slot's household (e.g. the shepherd's pen). */
  | { k: 'building'; slot: SlotId; kind: StructureKind }
  /** Home-settlement torch post nearest to the slot's house. */
  | { k: 'torchpost'; slot: SlotId }
  /** Home-settlement building of `kind` nearest to the settlement centre. */
  | { k: 'settlement'; kind: StructureKind }
  /** Live position of a cast actor (not cached). */
  | { k: 'actor'; slot: SlotId }
  /** A point beside the road leaving the home settlement, `m` metres beyond its edge (the ford camp). */
  | { k: 'road'; m: number }
  /** An anchor stored earlier by a counter (`match.save`), e.g. a building the player built. */
  | { k: 'saved'; id: string }

export type Source =
  | 'player'
  | { purse: SlotId }
  | { store: SlotId }
  | { treasury: 'home' }
  | { warehouse: 'home' }

/** Conditions: pure reads of the sim and the quest state. */
export type Cond =
  | { k: 'flag'; flag: string; eq?: FlagValue; ne?: FlagValue; gte?: number; in?: FlagValue[] }
  | { k: 'stage'; gte?: number; eq?: number; lt?: number }
  | { k: 'alive'; slot: SlotId }
  | { k: 'opinion'; slot: SlotId; gte?: number; lt?: number }
  | { k: 'durability'; slot: SlotId; lt?: number; gte?: number }
  /** Game day since the start (1 = the first day). */
  | { k: 'day'; from?: number; to?: number }
  /** Hour of day [from, to) (wraps midnight when from > to), or `night: true`. */
  | { k: 'hour'; from?: number; to?: number; night?: boolean }
  | { k: 'hasItem'; item: string; qty: number; from: 'player' | { store: SlotId } }
  | { k: 'counter'; id: string; gte: number | 'homePosts' }
  /** The home settlement has at least this many torch posts. */
  | { k: 'posts'; gte: number }
  /** The player has at least this many coins. */
  | { k: 'money'; gte: number }
  | { k: 'observed'; id: string }
  | { k: 'skill'; skill: SkillId; gte: number }
  /** `of` (default: the player) is within `r` metres of a cast actor or an anchor. */
  | { k: 'near'; of?: SlotId; slot?: SlotId; anchor?: Anchor; r: number }
  /** The player holds a (burning) torch in the off hand. */
  | { k: 'litTorch' }
  | { k: 'sneaking' }
  /** Another authored quest has one of these statuses (`started`: and the player had accepted it). */
  | { k: 'quest'; id: QuestId; in: QuestStatusId[]; started?: boolean }
  /** Calendar hours since the quest was offered / accepted. */
  | { k: 'since'; hours: number; from: 'offered' | 'started' | 'stage' }
  | { k: 'all'; of: Cond[] }
  | { k: 'any'; of: Cond[] }
  | { k: 'not'; of: Cond }

/** Effects, applied in order. */
export type Effect =
  /** `value: 'today'` stores the current game day. */
  | { k: 'set'; flag: string; value: FlagValue }
  /** Sets the flag and records the outcome `choice` — changeable until the quest is settled. */
  | { k: 'choose'; flag: string; value: string }
  | { k: 'stage'; to: number }
  | { k: 'accept' }
  | { k: 'refuse' }
  | { k: 'end'; ending: string }
  | { k: 'lapse' }
  | { k: 'pay'; from: Source; to: Source; amount: number }
  | { k: 'give'; from: Source; to: Source; item: string; qty: number }
  | { k: 'consume'; from: Source; item: string; qty: number }
  | { k: 'opinion'; slot: SlotId; delta: number }
  | { k: 'rep'; delta: Partial<Record<QuestRepDim, number>>; reason: string }
  | { k: 'need'; slots: SlotId[]; social: number }
  | { k: 'message'; text: string; kind?: 'info' | 'good' | 'bad' | 'quest' }
  | { k: 'torch'; anchor: Anchor; lit: boolean }
  /**
   * `at` defaults to the actor's own position; `snap` moves the actor there at once. Every hold is bounded
   * (review 014 #1): it ends at the next `untilHour` o'clock (0..24), else after `hours` calendar hours (default 3).
   */
  | { k: 'hold'; slot: SlotId; at?: Anchor; snap?: boolean; hours?: number; untilHour?: number }
  | { k: 'release'; slot: SlotId }
  | { k: 'follow'; slot: SlotId; target: 'player' | SlotId }
  | { k: 'unfollow'; slot: SlotId }
  | { k: 'spawn'; slot: SlotId }
  | { k: 'despawn'; slot: SlotId }
  | { k: 'owner'; anchor: Anchor; to: SlotId }
  | { k: 'if'; when: Cond[]; then: Effect[]; else?: Effect[] }

export interface SpawnSpec {
  name: string
  male: boolean
  at: Anchor
  items: { item: string; qty: number }[]
  money?: number
}

export interface CastSpec {
  kind: 'npc' | 'animal' | 'spawn'
  required: boolean
  /** npc: household profession + kin (first match in the order given, ids unique across slots) + optional age. */
  profession?: ProfessionId
  kin?: QuestKin[]
  age?: QuestAge
  /** animal: from the household of another slot. */
  ofSlot?: SlotId
  species?: SpeciesId
  preferVariant?: AnimalVariant
  spawn?: SpawnSpec
  /** Name used in dialog when the slot is empty but optional. */
  fallbackName?: string
  /** Sex used for pronoun tokens (`{slot:he}`) while the slot is empty (default: female, also for animals). */
  fallbackMale?: boolean
}

export interface DialogLine {
  /** Speaker: a cast slot, 'player' or 'self' (narration). */
  who: SlotId | 'player' | 'self'
  /** `{slot}` = generated first name of the cast NPC, `{slot:he}`/`{slot:him}`/`{slot:his}` = pronouns (He/Him/His capitalised), `{H}` / `{V}` = settlement names. */
  text: string
  when?: Cond[]
}

export interface DialogOption {
  id: string
  text: string
  /** Visible only when all hold. */
  when?: Cond[]
  /** Enabled only when all hold; otherwise shown disabled with `reason`. */
  needs?: Cond[]
  reason?: string
  effects: Effect[]
  /** Follow-up node shown at once. */
  next?: string
}

export interface DialogNode {
  lines: DialogLine[]
  options: DialogOption[]
}

export interface TopicDef {
  slot: SlotId
  node: string
  label: string
  when?: Cond[]
  /** Still offered after the quest is done (e.g. Mark's torches). */
  done?: boolean
}

export interface Observation {
  id: string
  at: Anchor
  r: number
  /** Gameplay seconds the conditions must hold with the player inside `r`. */
  dwellS: number
  when?: Cond[]
  /** Leaving the radius resets the dwell (default: keeps it). */
  reset?: boolean
  effects: Effect[]
}

export interface Counter {
  id: string
  /** `visit` is ticked by the engine: the player passing within `visit.r` m of a matching building (see `visit`). */
  on: QuestEventKind | 'visit'
  /** `on: 'visit'`: counts each home building of `kind` once when the player is within `r` m (and, with `lit`, it is lit). */
  visit?: { kind: StructureKind; r: number; lit?: boolean }
  /** `n` adds the event amount (roast pieces) instead of 1. */
  weight?: 'n'
  match?: {
    kind?: StructureKind
    /** The building must belong to the home settlement. */
    home?: boolean
    /** Count each building once. */
    distinct?: boolean
    near?: { anchor: Anchor; r: number }
    /** Remember the matched building as the anchor `save`. */
    save?: string
    item?: string
    slot?: SlotId
    species?: string
    /** `repair` events: only repairs by the player (true) or only by NPCs (false). */
    byPlayer?: boolean
  }
  when?: Cond[]
}

export interface Rule {
  id: string
  when: Cond[]
  effects: Effect[]
  /** `always` every tick, `day` once per game day, `ever` once. Default `ever`. */
  once?: 'always' | 'day' | 'ever'
  /** Quest phases the rule runs in. Default `active`. */
  phase?: 'offered' | 'active' | 'both'
}

export interface Ending {
  id: string
  journal: string
  effects: Effect[]
}

export interface StageDef {
  id: string
  journal: string
  /** Progress sentences appended to the journal text while the stage is current (review 016 #5): shown when `when` holds. */
  progress?: { when: Cond[]; text: string }[]
  /** Map marker while this stage is current (only drawn in explored cells). */
  anchor?: Anchor
}

export interface QuestDef {
  id: QuestId
  title: string
  giver: SlotId
  cast: Record<SlotId, CastSpec>
  /** Checked only while the quest has no state entry. All must hold. */
  start: Cond[]
  /** Applied once when the quest is offered (cast resolved). */
  onOffer?: Effect[]
  flags: Record<string, FlagValue>
  stages: StageDef[]
  nodes: Record<string, DialogNode>
  topics: TopicDef[]
  observations: Observation[]
  counters: Counter[]
  rules: Rule[]
  endings: Ending[]
  lapse?: { journal: string; effects: Effect[] }
  /** Journal text of the `choice` outcome ("Decision: …"), per choice value. */
  choiceLabels?: Record<string, string>
}
