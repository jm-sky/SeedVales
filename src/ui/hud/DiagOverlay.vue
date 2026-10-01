<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { perf } from '@/game/diag/perf'

const { version } = useGameStrict()
const r = computed(() => {
  void version.value
  const rep = perf.report()
  const pick = ['frame', 'sim.tick', 'render.cpu', 'render.draw', 'render.terrain', 'render.actors', 'sim.npc', 'sim.fauna', 'sim.ecology', 'ui.sync']
  return {
    timers: rep.timers.filter((t) => pick.includes(t.name)).sort((a, b) => pick.indexOf(a.name) - pick.indexOf(b.name)),
    gauges: rep.gauges,
  }
})
const f = (v: number) => v.toFixed(2)
</script>

<template>
  <div
    class="pointer-events-none absolute bottom-3 right-3 w-80 rounded bg-black/75 p-2 font-mono text-[10px] text-green-200"
    data-testid="diag"
  >
    <div class="mb-1 font-bold">
      CPU diagnostics (ms: med / p95 / p99 · n) — GPU not measured
    </div>
    <div
      v-for="t in r.timers"
      :key="t.name"
    >
      {{ t.name.padEnd(15) }} {{ f(t.median) }} / {{ f(t.p95) }} / {{ f(t.p99) }} · {{ t.samples }}<span v-if="t.budget"> (&gt;{{ t.budget }}: {{ t.overBudget }})</span>
    </div>
    <div class="mt-1 grid grid-cols-2 gap-x-2">
      <div
        v-for="(v, k) in r.gauges"
        :key="k"
      >
        {{ k }}: {{ Math.round(Number(v)) }}
      </div>
    </div>
  </div>
</template>
