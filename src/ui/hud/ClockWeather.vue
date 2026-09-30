<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { reputationLabel } from '@/game/sim/reputationView'
import { formatClock, formatDate, SEASON_NAMES, seasonOf } from '@/game/sim/time'
import { WEATHER_NAMES } from '@/game/sim/weather'

const { game, version } = useGameStrict()
const s = computed(() => {
  void version.value
  const sim = game.value.sim
  const t = sim.state.time.cal
  const w = sim.weather
  return {
    clock: formatClock(t),
    date: formatDate(t),
    season: SEASON_NAMES[seasonOf(t)],
    weather: WEATHER_NAMES[w.kind] + (w.fog > 0.4 ? ', mgła' : ''),
    temp: Math.round(w.temp),
    scale: sim.timeScale,
    place: reputationLabel(sim),
  }
})
</script>

<template>
  <div
    class="rounded-lg bg-black/35 px-3 py-2 text-right text-xs"
    data-testid="clock"
  >
    <div class="text-lg font-semibold leading-tight">
      {{ s.clock }}
      <span
        v-if="s.scale > 1"
        class="ml-1 rounded bg-primary px-1 text-[10px] text-primary-foreground"
      >×{{ s.scale }}</span>
    </div>
    <div class="text-white/80">
      {{ s.date }}
    </div>
    <div class="text-white/80">
      {{ s.season }} · {{ s.weather }} · {{ s.temp }}°C
    </div>
    <div
      v-if="s.place"
      class="text-quest"
    >
      {{ s.place }}
    </div>
  </div>
</template>
