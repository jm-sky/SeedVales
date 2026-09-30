<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { ATTR_NAMES, SKILL_NAMES } from '@/game/data/skills'

const { game, version } = useGameStrict()
const v = computed(() => {
  void version.value
  const p = game.value.sim.player
  return { attrs: p.attrs, skills: p.skills }
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        Atrybuty
      </h3>
      <div
        v-for="(val, k) in v.attrs"
        :key="k"
        class="flex justify-between border-b py-1"
      >
        <span>{{ ATTR_NAMES[k] }}</span><span>{{ val }}</span>
      </div>
    </div>
    <div>
      <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        Umiejętności (rosną z użyciem)
      </h3>
      <div
        v-for="(val, k) in v.skills"
        :key="k"
        class="flex items-center justify-between gap-2 border-b py-1"
      >
        <span>{{ SKILL_NAMES[k] }}</span>
        <div class="h-1.5 w-24 overflow-hidden rounded bg-white/15">
          <div
            class="h-full bg-primary"
            :style="{ width: `${val}%` }"
          />
        </div>
        <span class="w-10 text-right">{{ val.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>
