import type { QualityProfile } from '@/game/render/Renderer'

export interface StartRequest {
  seed: number
  slot?: string
  quality: QualityProfile
}

export type BarKind = 'hp' | 'stamina' | 'vigor' | 'hunger' | 'thirst'
