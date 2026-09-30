<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { cancelActivity } from '@/game/sim/player'

const { game, version } = useGameStrict()
const a = computed(() => {
  void version.value
  const act = game.value.sim.state.px.activity
  if (!act) return null
  return { label: act.label, frac: Math.min(1, act.elapsed / act.total), accel: game.value.sim.timeScale }
})
function cancel() {
  cancelActivity(game.value.sim, 'Przerwano.')
}
</script>

<template>
  <div
    v-if="a"
    class="pointer-events-auto w-full rounded-lg bg-black/60 p-2"
    data-testid="activity-bar"
  >
    <div class="mb-1 flex items-center justify-between text-xs">
      <span>{{ a.label }}<span v-if="a.accel > 1"> (czas ×{{ a.accel }})</span></span>
      <button
        class="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
        data-testid="activity-cancel"
        @click="cancel"
      >
        Przerwij [Esc]
      </button>
    </div>
    <div class="h-2 overflow-hidden rounded bg-white/15">
      <div
        class="h-full bg-primary"
        :style="{ width: `${Math.round(a.frac * 100)}%` }"
      />
    </div>
  </div>
</template>
