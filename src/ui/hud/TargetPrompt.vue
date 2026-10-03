<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'

const { game, version } = useGameStrict()
const t = computed(() => {
  void version.value
  const g = game.value
  if (!g.target || g.panel || g.sim.state.px.activity) return null
  const first = g.options.find((o) => o.enabled) ?? g.options[0]
  return { label: g.target.label, hint: g.options.length > 1 ? `${g.options.length} options` : first?.label ?? '', reason: first && !first.enabled ? first.reason : '', more: g.targetCount > 1 && !g.sim.player.combat }
})
</script>

<template>
  <div
    v-if="t"
    class="rounded-md bg-black/55 px-3 py-1.5 text-center text-sm"
    data-testid="target-prompt"
  >
    <span class="font-semibold">{{ t.label }}</span>
    <span class="ml-2 text-white/80">
      <kbd
        v-if="!game.isTouch"
        class="rounded border border-white/40 px-1 text-xs"
      >E</kbd>
      {{ t.hint }}
    </span>
    <kbd
      v-if="!game.isTouch && t.more"
      class="ml-2 rounded border border-white/30 px-1 text-[10px] text-white/70"
    >Tab</kbd>
    <div
      v-if="t.reason"
      class="text-xs text-bad"
    >
      {{ t.reason }}
    </div>
  </div>
</template>
