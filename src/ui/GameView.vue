<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { provideGame } from '@/composables/useGame'
import { installDebugApi } from '@/game/debug/api'
import { Game } from '@/game/Game'
import type { StartRequest } from './types'
import DiagOverlay from './hud/DiagOverlay.vue'
import Hud from './hud/Hud.vue'
import MobileControls from './mobile/MobileControls.vue'
import PanelHost from './panels/PanelHost.vue'

const props = defineProps<{ request: StartRequest }>()
const emit = defineEmits<{ quit: [] }>()
const canvas = ref<HTMLCanvasElement>()
const loading = ref('Przygotowanie…')
const error = ref('')
const { game, version } = provideGame()
let ro: ResizeObserver | null = null

onMounted(async () => {
  const c = canvas.value!
  try {
    const g = await Game.create(c, { seed: props.request.seed, slot: props.request.slot, quality: props.request.quality, onProgress: (l) => (loading.value = l) })
    game.value = g
    g.onUi(() => version.value++)
    installDebugApi(g)
    ro = new ResizeObserver(() => g.renderer.resize(c.clientWidth, c.clientHeight))
    ro.observe(c)
    g.start()
    loading.value = ''
  } catch (e) {
    console.error(e)
    error.value = String(e)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  game.value?.stop()
})
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-black">
    <canvas
      ref="canvas"
      class="block h-full w-full"
      data-testid="game-canvas"
    />
    <template v-if="game && !loading">
      <Hud />
      <MobileControls v-if="game.isTouch" />
      <PanelHost @quit="emit('quit')" />
      <DiagOverlay v-if="game.showDiag" />
    </template>
    <div
      v-if="loading || error"
      class="absolute inset-0 flex items-center justify-center bg-black/80"
    >
      <div class="text-center">
        <div class="text-2xl font-semibold text-primary">
          SeedVales
        </div>
        <div
          class="mt-3 text-sm text-muted-foreground"
          data-testid="loading"
        >
          {{ error || loading }}
        </div>
      </div>
    </div>
  </div>
</template>
