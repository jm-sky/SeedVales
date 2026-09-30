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
