<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { BADGES } from '@/game/sim/reputation'
import { REP_DIMS, type RepDim } from '@/game/sim/types'

const DIM: Record<RepDim, string> = { honesty: 'Uczciwość', helpfulness: 'Pomocność', renown: 'Sława', courage: 'Odwaga' }
const { game, version } = useGameStrict()
const v = computed(() => {
  void version.value
  const s = game.value.sim.state
  return {
    settlements: s.settlements.map((st) => ({ id: st.id, name: st.name, size: game.value.sim.world.settlements[st.id]!.size, rep: st.rep })),
    badges: BADGES.filter((b) => s.px.badges[b.id]),
  }
})
</script>

<template>
  <div
    class="space-y-3"
    data-testid="character-reputation"
  >
    <div
      v-for="st in v.settlements"
      :key="st.id"
      class="rounded border p-2"
    >
      <div class="mb-1 font-medium">
        {{ st.name }} ({{ st.size }})
      </div>
      <div class="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
        <span
          v-for="d in REP_DIMS"
          :key="d"
          class="text-xs"
        >
          {{ DIM[d] }}: <b :class="st.rep[d] < 0 ? 'text-destructive' : ''">{{ Math.round(st.rep[d]) }}</b>
        </span>
      </div>
    </div>
    <div>
      <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        Odznaki
      </h3>
      <p v-if="!v.badges.length">
        Brak.
      </p>
      <span
        v-for="b in v.badges"
        :key="b.id"
        class="mr-2 rounded px-2 py-0.5 text-xs"
        :class="b.positive ? 'bg-emerald-800/60' : 'bg-red-900/60'"
      >
        {{ b.name }}
      </span>
    </div>
  </div>
</template>
