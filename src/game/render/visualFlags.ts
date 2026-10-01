/**
 * Visual A/B switches for render--002 (light, sky, terrain). Defaults are the kept variants; a developer
 * can override them for A/B screenshots with localStorage `sv-visual` (JSON), e.g.
 * `{"tone":"none","sky":"flat","tintUniforms":true,"smooth":true,"detail":true}`. Read once when the renderer is created.
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
}

export const VISUAL_DEFAULTS: VisualFlags = { tone: 'none', exposure: 1, sky: 'dome', tintUniforms: false, smooth: false, detail: false }

export function readVisualFlags(): VisualFlags {
  try {
    const raw = globalThis.localStorage?.getItem('sv-visual')
    return raw ? { ...VISUAL_DEFAULTS, ...(JSON.parse(raw) as Partial<VisualFlags>) } : { ...VISUAL_DEFAULTS }
  } catch {
    return { ...VISUAL_DEFAULTS }
  }
}
