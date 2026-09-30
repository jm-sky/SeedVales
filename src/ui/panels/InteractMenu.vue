<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { targetOptions } from '@/game/sim/interact'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const data = computed(() => {
  void version.value
  const g = game.value
  const ref = g.panelRef
  return ref ? { ref, opts: targetOptions(g.sim, ref), title: g.target?.label ?? 'Interakcja' } : null
})
</script>

<template>
  <PanelFrame
    v-if="data"
    :title="data.title"
    @close="game.closePanel()"
  >
    <div class="grid gap-2">
      <button
        v-for="o in data.opts"
        :key="o.id"
        :disabled="!o.enabled"
        :data-testid="`opt-${o.id}`"
        class="flex items-center justify-between rounded-md border px-3 py-3 text-left hover:bg-accent disabled:opacity-50"
        @click="game.choose(o, data.ref)"
      >
        <span>{{ o.label }}</span>
        <span
          v-if="!o.enabled"
          class="text-xs text-bad"
        >{{ o.reason }}</span>
      </button>
    </div>
  </PanelFrame>
</template>
