<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { giftGain, wantedItem } from '@/game/sim/gifts'
import ItemRow from './ItemRow.vue'
import PanelFrame from './PanelFrame.vue'
import type { ItemStack } from '@/game/sim/types'

const { game, version } = useGameStrict()
const d = computed(() => {
  void version.value
  const g = game.value
  const ref = g.panelRef
  const npc = ref?.type === 'npc' ? g.sim.human(ref.id) : undefined
  if (!npc) return null
  const want = wantedItem(npc)
  return {
    npc,
    want: want ? itemDef(want).name : null,
    // Rough reaction hint instead of numbers: the gift system stays readable without exposing opinion maths.
    mine: g.sim.player.inv.items.map((s) => {
      const gain = giftGain(g.sim, npc, s, 1)
      return { s, wanted: s.id === want, hint: gain >= 10 ? 'pleased' : gain >= 3 ? 'grateful' : 'polite' }
    }),
  }
})
function give(s: ItemStack) {
  game.value.giftTo(d.value!.npc, s)
}
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="`Gift for ${d.npc.name}`"
    @close="game.closePanel()"
  >
    <p
      v-if="d.want"
      class="mb-2 text-xs italic"
      data-testid="gift-wish"
    >
      “I could really use: {{ d.want }}.”
    </p>
    <div class="grid gap-1">
      <ItemRow
        v-for="(e, i) in d.mine"
        :key="i + e.s.id"
        :stack="e.s"
      >
        <span
          class="mr-1 text-[11px]"
          :class="e.wanted ? 'text-quest' : 'text-muted-foreground'"
        >{{ e.wanted ? 'wished for' : e.hint }}</span>
        <Button
          size="xs"
          :data-testid="`gift-${e.s.id}`"
          @click="give(e.s)"
        >
          Give 1
        </Button>
      </ItemRow>
    </div>
  </PanelFrame>
</template>
