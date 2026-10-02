/**
 * Visual A/B switches for render--002 (light, sky, terrain). Defaults are the kept variants; a developer
 * can override them for A/B screenshots with localStorage `sv-visual` (JSON), e.g.
 * `{"sky":"flat","tintUniforms":false,"smooth":false,"detail":false}` = the pre-render--002 look (D-REN-9, D-REN-13). Read once when the renderer is created.
 * @domain render
 */
export type ToneMode = 'none' | 'aces' | 'agx' | 'neutral'
export type SkyMode = 'flat' | 'dome'

export interface VisualFlags {
  tone: ToneMode
  exposure: number
  sky: SkyMode
  /** Season and snow tint applied in the terrain shader from uniforms (no chunk rebuild on season/snow change). */
  tintUniforms: boolean
  /** Smooth terrain normals (instead of flat shading). */
  smooth: boolean
  /** Ground detail texture (medium/high only, D-PERF-2). */
  detail: boolean
  /** Grass rings (render--007 step 2); false = the pre-grass look for A/B. */
  grass: boolean
  /** Tree impostors baked from the models beyond the `treeModel` ring (render--007 step 3c); false = the old split. */
  impostors: boolean
  /** Offline LOD0/LOD1 trees + baked atlas from `trees.glb` (session 12); false = the kit trees. */
  treeAssets: boolean
  /** Actors: per-actor frustum culling + shadow radius (render--003); false = the old always-drawn actors (A/B). */
  actorCull: boolean
  /** Impostors lit with the baked normal atlas (session 14 asset); false = up normal (A/B). */
  impostorNormals: boolean
}

export const VISUAL_DEFAULTS: VisualFlags = { tone: 'none', exposure: 1, sky: 'dome', tintUniforms: true, smooth: true, detail: true, grass: true, impostors: true, treeAssets: true, actorCull: true, impostorNormals: true }

export function readVisualFlags(): VisualFlags {
  try {
    const raw = globalThis.localStorage?.getItem('sv-visual')
    return raw ? { ...VISUAL_DEFAULTS, ...(JSON.parse(raw) as Partial<VisualFlags>) } : { ...VISUAL_DEFAULTS }
  } catch {
    return { ...VISUAL_DEFAULTS }
  }
}
