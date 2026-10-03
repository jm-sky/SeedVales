/**
 * Sound catalogue (audio--001): file names → sound ids with variants, and pure selection helpers
 * (voice role/sex/situation with fallback, footsteps by surface). No sim/three/vue imports.
 * @domain audio
 */
import { Biome } from '../world/types'
import { SOUND_FILES } from './soundFiles'

export type SoundCategory = 'ambient-loop' | 'one-shot' | 'voice'

export interface SoundEntry {
  id: string
  files: string[]
  category: SoundCategory
}

/** `door-creak-02.ogg` → `door-creak`; `meadowsinging-birds-1.ogg` → `meadowsinging-birds`; names without a number keep their stem. */
const stemOf = (file: string) => file.replace(/^voices\//, '').replace(/\.(ogg|mp3)$/, '').replace(/[-_]\d+$/, '')

function build(files: readonly string[]): Record<string, SoundEntry> {
  const out: Record<string, SoundEntry> = {}
  for (const f of files) {
    const voice = f.startsWith('voices/')
    const id = stemOf(f)
    const category: SoundCategory = voice ? 'voice' : /^ambient-.*(loop|rain|wave|cave|seagull)|loop/.test(id) ? 'ambient-loop' : 'one-shot'
    const e = (out[id] ??= { id, files: [], category })
    e.files.push(f)
  }
  return out
}

export const CATALOGUE: Record<string, SoundEntry> = build(SOUND_FILES)

export const soundUrl = (file: string) => `${import.meta.env?.BASE_URL ?? '/'}sounds/${file}`

/** One random variant file of a sound id, or null when the id does not exist. */
export function pickFile(id: string, rand: () => number = Math.random): string | null {
  const e = CATALOGUE[id]
  return e ? e.files[Math.floor(rand() * e.files.length)]! : null
}

export type VoiceSex = 'male' | 'female'
export type VoiceSituation = 'greeting' | 'farewell' | 'call_for_help' | 'danger_alert' | 'combat_start' | 'exhausted' | 'hungry' | 'weather_shelter' | 'work_finished' | 'attention' | 'livestock_danger' | 'thanks' | 'quest_accepted' | 'quest_complete' | 'quest_declined' | 'refusal'

/** Profession id (game data) → voice role in the files; unknown professions use `general`. */
const ROLE_OF: Record<string, string> = { guard: 'guard', shepherd: 'shepherd', hunter: 'hunter', trader: 'merchant' }

/** Voice id for a speaker: role+sex → general+sex → role (other sex) is not used (a wrong-sex voice is worse than silence) → null. */
export function voiceId(profession: string | undefined, sex: VoiceSex, situation: VoiceSituation): string | null {
  const role = (profession && ROLE_OF[profession]) || 'general'
  for (const r of role === 'general' ? ['general'] : [role, 'general']) {
    const id = `${r}_${sex}_${situation}`
    if (CATALOGUE[id]) return id
  }
  return null
}

export type FootSurface = 'grass' | 'forest' | 'gravel' | 'sand' | 'stone'

/** Footstep sound id for a surface and gait; run falls back to the walk variants. */
export function footstepId(surface: FootSurface, run: boolean): string {
  const walk = `footstep-${surface}-alt-mayra`
  const runId = `${walk}-run`
  if (run && CATALOGUE[runId]) return runId
  return CATALOGUE[walk] ? walk : 'footstep-grass-alt-mayra'
}

/** Surface under the player's feet: roads are gravel, forests/swamps forest floor, beaches sand, mountains stone. */
export function surfaceFor(biome: number, road: number): FootSurface {
  if (road > 0.3) return 'gravel'
  if (biome === Biome.Beach) return 'sand'
  if (biome === Biome.Mountain || biome === Biome.Snow) return 'stone'
  if (biome === Biome.Swamp || (biome >= Biome.ForestDeciduous && biome <= Biome.ForestConifer)) return 'forest'
  return 'grass'
}

/** Player activity kind → sound id and repeat period (s; 0 = once at the start). */
export const ACTIVITY_SOUNDS: Record<string, { id: string; periodS: number }> = {
  chop: { id: 'action-wood-chop', periodS: 1.1 },
  mine: { id: 'action-dig', periodS: 1.2 },
  break_chunk: { id: 'action-dig', periodS: 1.2 },
  dig: { id: 'action-dig', periodS: 1.2 },
  build: { id: 'action-building-wood-construction', periodS: 0 },
  repair: { id: 'action-building-wood-construction', periodS: 0 },
  roast: { id: 'action-cook', periodS: 0 },
  craft: { id: 'action-cook', periodS: 0 },
  drink: { id: 'action-drink', periodS: 0 },
  gather: { id: 'inventory-pick-up', periodS: 1.5 },
  sharpen: { id: 'gridstone_sharpen', periodS: 0 },
  meal: { id: 'action-cook', periodS: 0 },
}

/** Simulation `sound` event kinds and the ambience's synthetic kinds → recorded sound id. */
export const KIND_SAMPLES: Record<string, string> = {
  bird: 'meadowsinging-birds',
  owl: 'ambient-owl-at-night',
  howl: 'fauna-wolf-howl',
  moo: 'animal-cow',
  bleat: 'animal-sheep',
  bark: 'animal-dog',
  hit: 'action-melee-hit',
  treefall: 'pine-tree-falling',
  thunder: 'thunder-mid',
  fire: 'action-fire-ignite',
}
