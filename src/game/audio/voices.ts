/**
 * Vocalization limiter: per-kind cooldown + global concurrency cap, so ambient sounds and animal
 * calls never turn into an "orchestra" (vision §6 Otoczenie). Pure logic (unit-tested).
 * @domain audio
 */

export interface VoiceRule {
  cooldownS: number
  maxSame: number
}

export class VoiceLimiter {
  private lastAt = new Map<string, number>()
  private active: { kind: string; until: number }[] = []
  maxConcurrent: number
  private rules: Record<string, VoiceRule>

  constructor(rules: Record<string, VoiceRule>, maxConcurrent = 4) {
    this.rules = rules
    this.maxConcurrent = maxConcurrent
  }

  /** Returns true if a sound of `kind` lasting `durS` may start at time `now` (seconds). */
  request(kind: string, now: number, durS: number): boolean {
    this.active = this.active.filter((a) => a.until > now)
    const rule = this.rules[kind] ?? { cooldownS: 5, maxSame: 1 }
    const last = this.lastAt.get(kind)
    if (last !== undefined && now - last < rule.cooldownS) return false
    if (this.active.length >= this.maxConcurrent) return false
    if (this.active.filter((a) => a.kind === kind).length >= rule.maxSame) return false
    this.lastAt.set(kind, now)
    this.active.push({ kind, until: now + durS })
    return true
  }

  get activeCount() {
    return this.active.length
  }
}

export const DEFAULT_RULES: Record<string, VoiceRule> = {
  bird: { cooldownS: 2.5, maxSame: 2 },
  owl: { cooldownS: 25, maxSame: 1 },
  gull: { cooldownS: 9, maxSame: 1 },
  howl: { cooldownS: 30, maxSame: 1 },
  moo: { cooldownS: 20, maxSame: 1 },
  bleat: { cooldownS: 12, maxSame: 1 },
  bark: { cooldownS: 10, maxSame: 1 },
  hit: { cooldownS: 0.15, maxSame: 2 },
  swing: { cooldownS: 0.2, maxSame: 2 },
  treefall: { cooldownS: 2, maxSame: 1 },
  fire: { cooldownS: 2, maxSame: 1 },
  thunder: { cooldownS: 20, maxSame: 1 },
}
