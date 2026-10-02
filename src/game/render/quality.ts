/**
 * Quality profiles: render distances and detail radii. Budgets explained in docs/design/DECISIONS.md (D-PERF).
 * @domain render
 */
export type QualityProfile = 'low' | 'medium' | 'high'

export interface QualitySettings {
  viewDist: number
  /** Terrain LOD ring distances for steps 2/4/8/16 m. */
  lods: [number, number, number, number]
  vegNear: number
  vegFar: number
  /** Tree model ring (m) of the offline LOD0/LOD1 trees; impostors beyond it (render--007 step 3c). */
  treeModel: number
  /** LOD0 → LOD1 switch distance (m) of the offline trees. */
  treeLod0: number
  /** Impostor atlas cell size (px per view). */
  impostorCell: number
  humanModel: number
  /** Actors cast shadows only within this distance (m; render--003 draw-call attribution). */
  actorShadow: number
  animalModel: number
  shadows: boolean
  pixelRatio: number
  fogFar: number
}

export const QUALITY: Record<QualityProfile, QualitySettings> = {
  low: { viewDist: 650, lods: [120, 260, 450, 650], vegNear: 45, vegFar: 380, treeModel: 60, treeLod0: 20, impostorCell: 128, humanModel: 30, actorShadow: 0, animalModel: 45, shadows: false, pixelRatio: 1, fogFar: 700 },
  medium: { viewDist: 1000, lods: [180, 380, 700, 1000], vegNear: 80, vegFar: 600, treeModel: 120, treeLod0: 40, impostorCell: 256, humanModel: 40, actorShadow: 30, animalModel: 80, shadows: true, pixelRatio: 1.5, fogFar: 1050 },
  high: { viewDist: 1400, lods: [220, 480, 900, 1400], vegNear: 120, vegFar: 850, treeModel: 120, treeLod0: 50, impostorCell: 256, humanModel: 70, actorShadow: 40, animalModel: 110, shadows: true, pixelRatio: 2, fogFar: 1450 },
}
