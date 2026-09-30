/**
 * Deterministic random helpers.
 * @domain core
 */

/** Mulberry32 PRNG. State is a single uint32 so it can be saved. */
export class Rng {
  state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  int(min: number, maxInclusive: number): number {
    return min + Math.floor(this.next() * (maxInclusive - min + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!
  }

  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    let total = 0
    for (const i of items) total += weight(i)
    let r = this.next() * total
    for (const i of items) {
      r -= weight(i)
      if (r <= 0) return i
    }
    return items[items.length - 1]!
  }
}

/** Integer hash of arbitrary ints → uint32. */
export function hashInts(...vals: number[]): number {
  let h = 0x811c9dc5
  for (const v of vals) {
    h = Math.imul(h ^ (v | 0), 0x01000193)
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995)
    h ^= h >>> 15
  }
  return h >>> 0
}

/** Hash to float 0..1. */
export function hash01(...vals: number[]): number {
  return hashInts(...vals) / 4294967296
}

export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

export function parseSeed(input: string | number): number {
  if (typeof input === 'number') return input >>> 0
  const n = Number(input)
  return Number.isFinite(n) && input.trim() !== '' ? n >>> 0 : hashString(input)
}
