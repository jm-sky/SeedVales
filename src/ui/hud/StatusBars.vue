<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { hp } from '@/game/sim/vitals'
import type { BarKind } from '../types'

const { game, version } = useGameStrict()

const BARS: { kind: BarKind; label: string; color: string }[] = [
  { kind: 'hp', label: 'Zdrowie', color: 'bg-red-500' },
  { kind: 'stamina', label: 'Stamina', color: 'bg-yellow-400' },
  { kind: 'vigor', label: 'Wigor', color: 'bg-sky-400' },
  { kind: 'hunger', label: 'Sytość', color: 'bg-orange-400' },
  { kind: 'thirst', label: 'Nawodnienie', color: 'bg-blue-500' },
]

const values = computed(() => {
  void version.value
  const v = game.value.sim.player.vitals
  return {
    hp: Math.max(0, hp(v)) / v.maxHp,
    stamina: v.stamina / 100,
    vigor: v.vigor / 100,
    hunger: v.hunger / 100,
    thirst: v.thirst / 100,
  } satisfies Record<BarKind, number>
})

const flags = computed(() => {
  void version.value
  const v = game.value.sim.player.vitals
  const f: string[] = []
  if (v.bleeding > 0.05) f.push('Krwawienie')
  if (v.illness) f.push(v.illness.kind === 'poison' ? 'Zatrucie' : 'Choroba')
  if (v.vigor <= 0) f.push('Wyczerpanie')
  if (v.convalescenceH > 0) f.push('Rekonwalescencja')
  if (v.ko && v.ko.protectUntil > game.value.sim.state.time.play) f.push(`Ochrona ${Math.ceil(v.ko.protectUntil - game.value.sim.state.time.play)} s`)
  return f
})
</script>

<template>
  <div
    class="w-44 space-y-1 rounded-lg bg-black/35 p-2 sm:w-52"
    data-testid="status-bars"
  >
    <div
      v-for="b in BARS"
      :key="b.kind"
      class="flex items-center gap-2"
    >
      <span class="w-20 text-[11px] leading-none text-white/85">{{ b.label }}</span>
      <div class="h-2 flex-1 overflow-hidden rounded bg-white/15">
        <div
          :class="[b.color, 'h-full transition-[width] duration-200']"
          :style="{ width: `${Math.round(values[b.kind] * 100)}%` }"
        />
      </div>
    </div>
    <div
      v-if="flags.length"
      class="flex flex-wrap gap-1 pt-1"
    >
      <span
        v-for="f in flags"
        :key="f"
        class="rounded bg-bad/80 px-1.5 py-0.5 text-[10px] font-semibold text-white"
      >{{ f }}</span>
    </div>
  </div>
</template>
