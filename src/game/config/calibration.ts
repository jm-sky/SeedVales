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

/** Combat target lock (combat--001, D-COMBAT-1): transient, assist-only; free camera stays the default. */
export const COMBAT_LOCK = {
  /** Candidates within this distance (m) of the player. */
  rangeM: 25,
  /** A lock is dropped beyond this distance (hysteresis over rangeM). */
  dropRangeM: 32,
  /** Cycling prefers targets inside this camera cone (full angle, degrees); others rank after. */
  coneDeg: 150,
  /** The lock survives the target being off-screen (angle from the camera yaw, degrees) for this long (s) before dropping. */
  lookAwayDeg: 120,
  lookAwayGraceS: 5,
  /** Camera yaw assist: max rate (rad/s) and the pause after manual look input (s). */
  cameraRateRadS: 1.4,
  cameraGraceS: 0.9,
  /** Unlocked melee: the swing turns the player toward the best target by at most this much (degrees). */
  softAssistDeg: 15,
  /** Score penalties by class (lower score ranks first). */
  classPenalty: { threat: 0, dangerous: 10, neutral: 25 },
} as const

/** Stack identity of condition-bearing items (items--001 / economy--004, D-ITEM-1): stacks merge only within these tolerances and are never averaged. */
export const ITEM_BATCH = {
  /** Food whose remaining freshness differs by more than this (hours) stays in a separate batch; a merged batch keeps the older value (never extends shelf life; 12 h ≈ half a day of production, 4 h made the caravan worst-case test lose a trade because spoilage is no longer refreshed by averaging). */
  freshTolH: 12,
  /** Durability values within this (points) merge; the merged stack keeps the lower value. */
  durTol: 0.5,
} as const

/** Weapon edge (combat--005, D-COMBAT-4): dulling by use, sharpening with a whetstone. */
export const EDGE = {
  /** Largest damage loss of a fully dull blade (fraction): cut hurts most, pierce less, blunt none. */
  cutPenalty: 0.4,
  piercePenalty: 0.15,
  /** Edge lost per hit that connects. */
  dullPerHit: { cut: 0.012, pierce: 0.007 },
  /** A blade never gets duller than this (still usable). */
  floor: 0.05,
  /** One sharpening restores this share of the weapon's maximum edge (and takes `sharpenTimeS` of gameplay time). */
  sharpenGain: 0.5,
  sharpenTimeS: 6,
} as const

/** Walkability: the steepest uphill rise/run a step may have (~50°); steeper faces are inaccessible (peaks). Downhill is not limited. */
export const TRAVERSE = { maxUphillRise: 1.2 } as const

/** Jump (combat--004, D-MOVE-1): small grounded traversal jump, gameplay seconds. */
export const JUMP = {
  /** Take-off speed (m/s) and gravity (m/s²): apex ≈ 0.66 m, air time ≈ 0.73 s. */
  vy: 3.6,
  gravity: 9.8,
  staminaCost: 8,
  /** While airborne a rise is only passable when the feet are within this much of the destination terrain (m). */
  lipClearM: 0.05,
  /** A short lip is jumpable only when the terrain this far (m) beyond it is not a sustained face (gradient above TRAVERSE.maxUphillRise). */
  probeM: 2,
} as const

/** Combat dodge (combat--003, D-COMBAT-3): real, collision-aware displacement, no i-frames. */
export const DODGE = {
  distanceM: 1.5,
  durationS: 0.22,
  staminaCost: 18,
  /** No new dodge for this long after a dodge started (s). */
  recoveryS: 0.55,
  /** Right after a swing the player is committed this long (s) and cannot dodge. */
  strikeCommitS: 0.25,
  /** Dodge is refused in water deeper than this (m). */
  maxWaterM: 0.3,
} as const

/** Block and parry (combat--002, D-COMBAT-2): all tuning in one place. */
export const DEFENCE = {
  /** Defence by equipment class: front arc (full angle, degrees), share of raw damage a block removes, stamina efficiency (lower = cheaper), parry window (s from guard start). */
  shield: { arcDeg: 140, reduction: 0.8, efficiency: 0.6, parryWindowS: 0.25, canParry: true },
  oneHanded: { arcDeg: 100, reduction: 0.5, efficiency: 1, parryWindowS: 0.2, canParry: true },
  twoHanded: { arcDeg: 80, reduction: 0.55, efficiency: 1.3, parryWindowS: 0.15, canParry: true },
  unarmed: { arcDeg: 70, reduction: 0.25, efficiency: 1.6, parryWindowS: 0.1, canParry: false },
  /** Defender stamina per point of incoming raw damage (× efficiency); a parry costs `parryCostMul` of that. */
  staminaPerDamage: 1.2,
  parryCostMul: 0.6,
  /** Guard stays down this long after the stamina ran out (s). */
  guardBreakS: 2,
  /** A parried attacker cannot swing again for this long (s, added to `attackReadyAt`). */
  parryAttackerDelayS: 0.9,
  /** Durability lost by the blocking item per defended hit. */
  wearPerBlock: 1,
  /** Heavy animals: their attacks can be blocked but never parried by ordinary weapons (a shield may still parry a boar, never a bear/moose). */
  heavyAnimals: ['bear', 'boar', 'moose', 'stag', 'horse', 'cow'] as readonly string[],
  shieldParriesHeavy: ['boar', 'stag', 'cow', 'horse'] as readonly string[],
} as const

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
export const TREASURY_START = { SM: 150, MD: 300, LG: 600 } as const

/**
 * Blacksmith orders (CRAFT-02, review 013 M-09): price = max(resale floor, replacement value of the reserved inputs +
 * labour), labour = craft time (s) × labourPerS. The smith never sells below what the materials cost; the resale floor
 * (an exceptional-quality result at the best price any NPC would pay) keeps order → sell loops from paying (D-ECON-5).
 */
export const ORDER = { labourPerS: 0.5 }

/** Daily settlement tax on NPC purses above `exempt` copper (money recirculates to the treasury). */
export const TAX = { rate: 0.03, exempt: 20 }

/** Caravan: fee the home settlement's treasury pays its trader per trip (base + per unit moved). */
export const CARAVAN_FEE = { base: 5, perUnit: 1 }

/**
 * Caravan provisions in nutrition points (a bread is 25, a hunger bar is 100; a trader loses ~55 a day): packed at departure
 * (household store, home warehouse, then bought from a household; moved, not created, D-NPC-6) — enough for the outbound leg.
 * The return leg is stocked at the destination to `CARAVAN_RETURN_NUTRITION`. A caravan only departs when `CARAVAN_MIN_NUTRITION` can be had.
 */
export const CARAVAN_PROVISIONS = 200
export const CARAVAN_RETURN_NUTRITION = 100
export const CARAVAN_MIN_NUTRITION = 100

/**
 * Household baking (review 015 row 1d): farmers' grain is not edible; a household member turns it into bread at home
 * (recipe `bread`: `grainPerBread` grain -> 1 bread), `durS` gameplay seconds per loaf.
 */
export const BAKE = { grainPerBread: 3, durS: 12 }

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

/** Food below this share of its shelf life is spoiled (extra illness chance when eaten). */
export const SPOILED_FRAC = 0.15

/**
 * Warehouse goodwill (D-ECON-4): helpfulness = value / `coinsPerPoint` per deposit (only from `minValue`
 * coins, at most `maxPerDeposit`); taking goods out costs the same rate without the cap or threshold,
 * so depositing and taking back never gains anything.
 */
export const WAREHOUSE = { coinsPerPoint: 20, minValue: 10, maxPerDeposit: 3 }

/** Fog of war (MAP-01): map cell size (m) and how far around the player the map gets revealed (m). */
export const FOG = { cellM: 64, revealM: 180 }

/**
 * Caves (WORLD-05). All metres. `cell` is the cave grid resolution; `block` the terrain-hole granularity
 * (= the LOD-0 terrain quad). Tunnel/chamber heights leave room for the third-person camera (target +1.6 m).
 */
export const CAVE = {
  cell: 1,
  block: 2,
  tunnelRadius: 2,
  chamberRadius: [5, 7] as const,
  tunnelHeight: 3.8,
  chamberHeight: 5.6,
  /** Rock that must stay above a roofed cell; shallower cells are open to the sky (the entrance cutting). */
  minCover: 1.2,
  /** Floor descent per metre of tunnel while it is still below the first {@link maxDepth} metres. */
  rampSlope: 0.24,
  maxDepth: 7,
  /** Safety margin: the generator assumes the surface is this much lower than the grid says (micro-detail). */
  surfaceMargin: 0.8,
  /** Longest cutting (tunnel length that may still be open to the sky). */
  maxCuttingM: 26,
  /** Steepest floor step (m) the player may climb between neighbouring cells; also the mouth tolerance. */
  stepM: 0.8,
  /** Render streaming distance (m). */
  showM: 260,
} as const

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

/**
 * Fires and torches (FIRE-01..03, plan survival--001). All durations are calendar hours (world-calendar domain):
 * at 24x a branch burns ~1.7 real minutes. fuelCapH = most fuel a fire holds; levelFullH = fuel at which the flame is at
 * full size (fireLevel 1), levelMin = flame size of a nearly spent fire; ash fades like blood but slower (x ashRainMul in rain).
 * tendBelowH = guard feeds the settlement hearth below this; fallbackBelowH = any NPC steps in below this.
 */
export const FIRE = {
  fuelCapH: 24,
  branchH: 0.7,
  logH: 2.5,
  starterBranches: 3,
  hearthStones: 4,
  levelFullH: 6,
  levelMin: 0.2,
  ashFadePerH: 1 / 12,
  ashRainMul: 3,
  tendBelowH: 6,
  fallbackBelowH: 2,
  settlementStartH: 12,
  tendHoldCalS: 3600,
  carryMax: 10,
}

/** Standing / thrown torch: calendar hours of burn time while lit. */
export const TORCH = { burnH: 5 }

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
  /** Carrion (rotting, flies) lasts until this age (h); then only bones remain until `corpseBonesAfterH`. */
  corpseCarrionEndH: 30,
  corpseBonesAfterH: 48,
}

/**
 * Trade with any NPC (TRADE-02): what a household keeps for itself and never sells.
 * Food reserve per household member; work kit and the main weapon are always kept.
 */
/**
 * Trade (TRADE-02): food reserve kept per household member; an NPC farther than `homeReachM` from its house
 * trades only from/into its own pack; buy price multiplier bounds (sell prices stay below the lowest buy price).
 */
export const TRADE = { foodReservePerMember: 3, homeReachM: 150, minBuyMul: 0.95, plentyScarcity: 0.9 }

/**
 * Gifts (SOC-01): opinion gain = clamp(base + perLog·log2(1 + value/valueUnit)) × preference × personality,
 * divided by (1 + gifts already given today). Wanted item ×wantedMul, liked category ×likedMul.
 */
export const GIFT = { base: 1, perLog: 4, valueUnit: 5, maxGain: 25, wantedMul: 2, likedMul: 1.4 }

/**
 * Companions (COMP-01/02/03). Daily wage (copper) = base + skill·perSkill, × risk and task multipliers.
 * Travelling together within bondM raises opinion by bondPerH per calendar hour (up to bondCap).
 */
export const COMPANION = {
  wageBase: 6,
  wagePerSkill: 0.15,
  riskMul: { low: 1, medium: 1.6, high: 2.6 },
  taskMul: { escort: 1, guard: 1.3 },
  followM: 3.5,
  catchUpM: 12,
  bondM: 30,
  bondPerH: 0.5,
  bondCap: 60,
  killBond: 2,
  maxCompanions: 3,
  /** Provisions packed from the household store on hiring/joining (meals per day, cap; free companions: days). */
  foodPerDay: 2,
  maxProvisions: 8,
  freeProvisionDays: 2,
  /** Beyond this distance from home a companion lives from its pack (no walking home to eat). */
  awayM: 150,
  /** Away from home: water farther than this is not worth leaving the player for. */
  awayDrinkM: 60,
  /** Stuck while following: pause following (s), repeat the message at most this often (s). */
  stuckWaitS: 8,
  stuckMsgS: 60,
  /** Hunger below which a companion with an empty pack leaves for home. */
  starveLeave: 5,
}

/** Character variety (CHAR-01): body scale jitter (fractions), hair colours (multiplied onto the hair texture), cloth tints. */
export const CHARACTER_LOOK = {
  scaleXZ: 0.05,
  scaleY: 0.1,
  hair: [0xe6c27a, 0x7a5230, 0x262220, 0xb4512a, 0xb8b8b8] as const, // blond, brown, black, red, grey
  cloth: [0xffffff, 0xcfe6c0, 0xbfd2ee, 0xe8d3b0] as const, // neutral, green, blue, sand
}
