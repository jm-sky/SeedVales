<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { formatClock } from '@/game/sim/time'

const { game, version } = useGameStrict()
const msgs = computed(() => {
  void version.value
  return game.value.sim.state.messages.slice(-6)
})
const color = (k?: string) => (k === 'good' ? 'text-good' : k === 'bad' ? 'text-bad' : k === 'quest' ? 'text-quest' : 'text-white/90')
</script>

<template>
  <ul
    class="space-y-0.5 text-xs"
    data-testid="message-log"
  >
    <li
      v-for="(m, i) in msgs"
      :key="i"
      :class="color(m.kind)"
    >
      <span class="text-white/50">{{ formatClock(m.t) }}</span> {{ m.text }}
    </li>
  </ul>
</template>
