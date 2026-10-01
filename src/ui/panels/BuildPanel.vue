<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { BLUEPRINTS } from '@/game/data/recipes'
import { countItem } from '@/game/sim/inventory'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const list = computed(() => {
  void version.value
  const p = game.value.sim.player
  return BLUEPRINTS.map((b) => ({
    b,
    mats: b.materials.map((m) => ({ name: itemDef(m.item).name, qty: m.qty, have: countItem(p.inv, m.item) })),
    hours: b.stages.reduce((a, s) => a + s.hours, 0),
  }))
})
</script>

<template>
  <PanelFrame
    title="Building"
    @close="game.closePanel()"
  >
    <p class="mb-2 text-xs text-muted-foreground">
      The building site is marked in front of you. Materials in your backpack or lying within 6 m of the site count automatically.
      Long stages speed up time (Esc cancels, progress is kept).
    </p>
    <div class="grid gap-2">
      <div
        v-for="e in list"
        :key="e.b.id"
        class="rounded-md border p-2"
      >
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ e.b.name }}</span>
          <Button
            size="xs"
            :data-testid="`place-${e.b.id}`"
            @click="game.placeBlueprint(e.b.id)"
          >
            Mark site
          </Button>
        </div>
        <div class="text-xs">
          <span
            v-for="m in e.mats"
            :key="m.name"
            class="mr-2"
            :class="m.have >= m.qty ? 'text-good' : 'text-bad'"
          >{{ m.name }} {{ m.have }}/{{ m.qty }}</span>
        </div>
        <div class="text-[11px] text-muted-foreground">
          Stages: {{ e.b.stages.map((s) => `${s.name} (${s.hours} h, ${s.tool})`).join(' → ') }}
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
