<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import type { NpcOverlay } from '@/game/Game'
import type { NpcQuestIcon } from '@/game/sim/questDialog'

const { game } = useGameStrict()

/** Names appear within NAME_FULL_M at full strength and fade out by NAME_END_M; quest icons stay visible further out. */
const NAME_FULL_M = 8
const NAME_END_M = 16

const ICON_GLYPH: Record<NpcQuestIcon, string> = { offer: '!', turnin: '?', done: '✔' }
const ICON_CLASS: Record<NpcQuestIcon, string> = { offer: 'text-yellow-300', turnin: 'text-sky-300', done: 'text-good' }

const items = ref<NpcOverlay[]>([])
let raf = 0
const tick = () => {
  raf = requestAnimationFrame(tick)
  const g = game.value
  items.value = g.panel ? [] : g.npcOverlays()
}
onMounted(() => {
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

const nameOpacity = (d: number) => Math.max(0, Math.min(1, (NAME_END_M - d) / (NAME_END_M - NAME_FULL_M)))
</script>

<template>
  <div
    class="absolute inset-0 overflow-hidden"
    data-testid="npc-labels"
  >
    <div
      v-for="n in items"
      :key="n.id"
      class="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center leading-tight"
      :style="{ left: `${n.x}px`, top: `${n.y}px` }"
      :data-npc-icon="n.icon ?? undefined"
    >
      <span
        v-if="n.icon"
        class="text-lg font-bold"
        :class="ICON_CLASS[n.icon]"
      >{{ ICON_GLYPH[n.icon] }}</span>
      <span
        v-if="nameOpacity(n.dist) > 0"
        class="whitespace-nowrap text-xs font-semibold"
        :style="{ opacity: nameOpacity(n.dist) }"
      >{{ n.name }}</span>
    </div>
  </div>
</template>
