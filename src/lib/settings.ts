/**
 * Player preferences (UI-05): graphics quality and volumes. Stored in localStorage — not part of the
 * savegame. Reading tolerates missing/corrupt data and blocked storage.
 * @domain ui
 * @subdomain settings
 */
import type { QualityProfile } from '@/game/render/quality'

export interface Volumes {
  master: number
  ambient: number
  effects: number
}

export interface GameSettings {
  quality: QualityProfile
  volume: Volumes
}

const KEY = 'sv-settings'
/** Pre-settings key used by the main menu (kept in sync for older code paths). */
const LEGACY_QUALITY = 'sv-quality'
const PROFILES: QualityProfile[] = ['low', 'medium', 'high']

type Store = Pick<Storage, 'getItem' | 'setItem'>

function storage(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d)

export function defaultSettings(touch = false): GameSettings {
  return { quality: touch ? 'low' : 'medium', volume: { master: 0.8, ambient: 1, effects: 1 } }
}

export function loadSettings(touch = false, st: Store | null = storage()): GameSettings {
  const d = defaultSettings(touch)
  let raw: Partial<GameSettings> = {}
  try {
    raw = JSON.parse(st?.getItem(KEY) ?? '{}') ?? {}
  } catch {
    raw = {}
  }
  let legacy: string | null = null
  try {
    legacy = st?.getItem(LEGACY_QUALITY) ?? null
  } catch {
    legacy = null
  }
  const q = [raw.quality, legacy].find((x): x is QualityProfile => PROFILES.includes(x as QualityProfile))
  const v = raw.volume ?? d.volume
  return {
    quality: q ?? d.quality,
    volume: { master: clamp01(v.master, d.volume.master), ambient: clamp01(v.ambient, d.volume.ambient), effects: clamp01(v.effects, d.volume.effects) },
  }
}

export function saveSettings(s: GameSettings, st: Store | null = storage()) {
  try {
    st?.setItem(KEY, JSON.stringify(s))
    st?.setItem(LEGACY_QUALITY, s.quality)
  } catch {
    // storage full or blocked — settings stay for this session only
  }
}
