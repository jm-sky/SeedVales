/**
 * Calibration constants — single place to tune time, space and needs.
 * Units are explicit in names: `_M` metres, `_S` gameplay seconds, `_H` calendar hours, `_MPS` m/s.
 * @domain config
 */

/** Real (gameplay) seconds per one calendar day at normal speed. */
export const REAL_SECONDS_PER_DAY = 3600
/** Calendar runs this many times faster than gameplay seconds. */
export const CALENDAR_SPEED = 86400 / REAL_SECONDS_PER_DAY // 24
export const DAYS_PER_MONTH = 5
export const MONTHS_PER_YEAR = 12
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR // 60 (vision typo 70 corrected)
export const DAYS_PER_SEASON = DAYS_PER_YEAR / 4 // 15
/** New game starts on day 3 of spring at 07:00. */
export const START_CALENDAR_S = 2 * 86400 + 7 * 3600

export const WALK_SPEED_MPS = 1.5
export const RUN_SPEED_MPS = 4.0
export const SNEAK_SPEED_MPS = 0.9
export const SWIM_SPEED_MPS = 0.8
export const ROAD_SPEED_BONUS = 1.1
/** Target route distance home → nearest settlement (16 h march = 40 real min × 1.5 m/s). */
export const DAY_MARCH_M = 16 * (REAL_SECONDS_PER_DAY / 24) * WALK_SPEED_MPS // 3600

/** Water depth thresholds. */
export const WADE_DEPTH_M = 0.5
export const SWIM_DEPTH_M = 1.2

/**
 * Needs are 0..100 where 100 = fully satisfied. Drain per calendar hour.
 * Calibrated so that a full day (24 h) = 60 real minutes needs ~2 meals and ~3 drinks.
 */
export const NEEDS = {
  thirstDrainPerH: 100 / 20, // empty after 20 h
  hungerDrainPerH: 100 / 30, // empty after 30 h (hunger is weaker than thirst)
  /** Vigor: lasts ~19 h of marching (vision §9.2: 18–20 h). */
  vigorDrainWalkPerH: 100 / 19,
  vigorDrainIdlePerH: 100 / 40,
  vigorDrainWorkPerH: 100 / 16,
  /** Recovery per calendar hour of sleep at comfort 1.0 (8 h to full). */
  vigorSleepPerH: 100 / 8,
  vigorRestPerH: 100 / 30,
  socialDrainPerH: 100 / 36,
  /** Penalties begin below this level. */
  penaltyBelow: 25,
  /** Hours of activity allowed at 0 vigor before collapse (vision: ~24 h). */
  exhaustionMaxH: 24,
}

export const STAMINA = {
  max: 100,
  regenPerS: 12,
  sprintPerS: 10,
  swimPerS: 4,
  meleeSwing: 12,
  bowDrawPerS: 8,
}

export const COMBAT = {
  /** Player knock-out: stand up after, protected (ignored by enemies) for. Gameplay seconds. */
  koStandUpS: 3,
  koProtectionS: 120,
  /** NPCs survive down to this HP (vision §28). */
  npcDeathHp: -20,
  hpRegenPerH: 4,
  bandageHeal: 15,
}

/** Settlement treasury at world start (copper) — the only initial money besides NPC/player purses (D-ECON-1). */
export const TREASURY_START = { SM: 150, MD: 300, LG: 600, XL: 1200 } as const

/** Daily settlement tax on NPC purses above `exempt` copper (money recirculates to the treasury). */
export const TAX = { rate: 0.03, exempt: 20 }

/** Caravan: fee the home settlement's treasury pays its trader per trip (base + per unit moved). */
export const CARAVAN_FEE = { base: 5, perUnit: 1 }

/** Days for a sheep's wool to regrow after shearing. */
export const WOOL_REGROW_DAYS = 10

/**
 * AI decision cadence (AI-01): perception/decisions every `baseS` gameplay seconds × species
 * `decisionS` × state (tired ×tiredMul). Critical events (hits, shots, calls for help) force an
 * immediate decision for actors within the alert radius (m).
 */
export const DECISION = { baseS: 1, tiredMul: 1.5, alertHitM: 30, alertShotM: 30, alertHelpM: 60 }

/** Wild animals' fear (FAUNA-07), distances in m; exceptions: young nearby, own den, starving predator. */
export const FEAR = { humanM: 16, aggressiveAttackM: 6, fireM: 14, penM: 10, desperateHungerH: 40, protectYoungM: 25, protectDenM: 30, preyDefendM: 6, suppressS: 45 }

/**
 * Roasting (FOOD-03): calendar minutes per batch, pieces at once (bare fire 1 / pan or pot / spit), spit must
 * stand within spitM of the fire; cooked freshness keeps at least minFreshFrac of its shelf life.
 */
export const ROAST = { calMin: 30, vesselSlots: 2, spitSlots: 5, spitM: 3, minFreshFrac: 0.2 }

/** Fog of war (MAP-01): map cell size (m) and how far around the player the map gets revealed (m). */
export const FOG = { cellM: 64, revealM: 180 }

/** Carts (TRANS-01): steepest rise per metre a pushed cart can climb, deepest water (m) it can cross. */
export const CART = { maxRise: 0.32, maxWaterM: 0.25 }

/** Rocks (RES-07): boulders (scale ≥ boulderScale) break into chunks; a chunk breaks into `chunkStones` stones. */
export const ROCK = { boulderScale: 2, chunkStones: 4, strikeS: 6, breakS: 4 }

/** Eating carrion takes time (FAUNA-08): gameplay seconds per portion of meat, hunger hours satisfied per portion. */
export const CARRION = { eatS: 25, hungerPerMeat: 15, lureEatS: 6 }

/**
 * Blood traces (TRACE-01): intensity 0..1 per hit (dmg / dmgFull), merged within mergeM, decaying per
 * calendar hour (×rainMul in rain/storm), at most `max` kept; predators smell them within smellM × intensity.
 */
export const TRACE = { dmgFull: 20, mergeM: 1.5, decayPerH: 0.05, rainMul: 4, max: 300, smellM: 70 }

/** Predator hunting: chase limit (gameplay s), give-up distance (× perception), retry cooldown (gameplay s). */
export const HUNT = {
  chaseMaxS: 40,
  giveUpPerception: 1.6,
  cooldownS: 90,
}

/** Time acceleration for sleep and long work (whole simulation). */
export const ACCEL = {
  sleep: 40,
  longWork: 20,
  roadAutopilot: 3,
}

/** Simulation LOD: update interval in gameplay seconds by distance to player. */
export const SIM_LOD = [
  { maxDist: 180, interval: 0.1 },
  { maxDist: 700, interval: 0.5 },
  { maxDist: Infinity, interval: 3 },
] as const

export const FOOD = {
  /** Container storage slows spoilage by this factor. */
  chestSpoilFactor: 0.5,
  corpseRotH: 6,
  corpseBonesAfterH: 48,
}
