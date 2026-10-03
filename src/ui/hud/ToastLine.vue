<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'

const props = defineProps<{ overlay?: boolean }>()
const { game, version } = useGameStrict()
/** The HUD copy shows while no panel is open; the overlay copy (GameView, above the panels) while one is. */
const text = computed(() => {
  void version.value
  const g = game.value
  if (!!g.panel !== !!props.overlay) return ''
  return performance.now() < g.toastUntil ? g.toast : ''
})
</script>

<template>
  <div
    v-if="text"
    class="rounded-md bg-black/70 px-3 py-1.5 text-center text-sm"
    data-testid="toast"
  >
    {{ text }}
  </div>
</template>
