<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { RECIPES } from '@/game/data/recipes'
import { SKILL_NAMES } from '@/game/data/skills'
import { canCraft, craftTime, STATION_NAMES } from '@/game/sim/craft'
import { countItem } from '@/game/sim/inventory'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const list = computed(() => {
  void version.value
  const g = game.value
  const p = g.sim.player
  return RECIPES.map((r) => ({
    r,
    check: canCraft(g.sim, p, r),
    time: craftTime(p, r),
    inputs: r.inputs.map((i) => ({ name: itemDef(i.item).name, qty: i.qty, have: countItem(p.inv, i.item) })),
  })).sort((a, b) => Number(b.check.ok) - Number(a.check.ok))
})
</script>

<template>
  <PanelFrame
    title="Crafting"
    wide
    @close="game.closePanel()"
  >
    <div class="grid gap-2 sm:grid-cols-2">
      <div
        v-for="e in list"
        :key="e.r.id"
        class="rounded-md border p-2"
        :class="e.check.ok ? '' : 'opacity-70'"
      >
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ e.r.name }}</span>
          <Button
            size="xs"
            :disabled="!e.check.ok"
            :data-testid="`craft-${e.r.id}`"
            @click="game.craft(e.r.id)"
          >
            Craft ({{ Math.round(e.time) }} s)
          </Button>
        </div>
        <div class="mt-1 text-xs">
          <span
            v-for="i in e.inputs"
            :key="i.name"
            :class="i.have >= i.qty ? 'text-good' : 'text-bad'"
            class="mr-2"
          >{{ i.name }} {{ i.have }}/{{ i.qty }}</span>
        </div>
        <div class="text-[11px] text-muted-foreground">
          {{ SKILL_NAMES[e.r.skill] }}<span v-if="e.r.tool"> · tool: {{ e.r.tool }}</span><span v-if="e.r.station"> · at: {{ STATION_NAMES[e.r.station] }}</span>
          <span
            v-if="!e.check.ok"
            class="text-bad"
          > · {{ e.check.reason }}</span>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
