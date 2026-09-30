/**
 * Vue bridge: provides the Game instance and a version ref bumped on each UI sync (5 Hz),
 * so components can derive view state with computed() without deep-reactive sim state.
 * @domain ui
 */
import { inject, type InjectionKey, provide, type Ref, ref, shallowRef } from 'vue'
import type { Game } from '@/game/Game'

interface GameCtx {
  game: Ref<Game | null>
  version: Ref<number>
}

const KEY: InjectionKey<GameCtx> = Symbol('game')

export function provideGame(): GameCtx {
  const ctx: GameCtx = { game: shallowRef<Game | null>(null), version: ref(0) }
  provide(KEY, ctx)
  return ctx
}

export function useGame(): GameCtx {
  const ctx = inject(KEY)
  if (!ctx) throw new Error('useGame outside provider')
  return ctx
}

/** Returns non-null game (components render only when game exists). */
export function useGameStrict() {
  const { game, version } = useGame()
  return { game: game as Ref<Game>, version }
}
