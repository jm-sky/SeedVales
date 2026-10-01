<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { RECIPES } from '@/game/data/recipes'
import { cancelOrder, canOrder, collectOrder, orderPrice, placeOrder } from '@/game/sim/orders'
import { formatClock } from '@/game/sim/time'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const d = computed(() => {
  void version.value
  const g = game.value
  const ref = g.panelRef
  const n = ref?.type === 'npc' ? g.sim.human(ref.id) : undefined
  if (!n) return null
  return {
    n,
    recipes: RECIPES.filter((r) => r.category === 'smithing' && r.quality).map((r) => ({ r, price: orderPrice(r.id), ok: canOrder(g.sim, n, r.id) })),
    orders: g.sim.state.px.orders.filter((o) => o.npcId === n.id),
  }
})
function order(id: string) {
  game.value.showToast(placeOrder(game.value.sim, d.value!.n, id))
  version.value++
}
function cancel(id: string) {
  game.value.showToast(cancelOrder(game.value.sim, id))
  version.value++
}
function collect(id: string) {
  game.value.showToast(collectOrder(game.value.sim, id))
  version.value++
}
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="`Blacksmith orders: ${d.n.name}`"
    @close="game.closePanel()"
  >
    <p class="mb-2 text-xs text-muted-foreground">
      A 50% deposit covers materials; you pay the rest on collection. Quality depends on the blacksmith's skill ({{ Math.round(d.n.skills.blacksmith) }}).
    </p>
    <div class="grid gap-1">
      <div
        v-for="e in d.recipes"
        :key="e.r.id"
        class="flex items-center justify-between rounded border px-2 py-1"
      >
        <span>{{ itemDef(e.r.output.item).name }}</span>
        <Button
          v-if="e.ok"
          size="xs"
          :data-testid="`order-${e.r.id}`"
          @click="order(e.r.id)"
        >
          Order ({{ e.price }} c, deposit {{ Math.ceil(e.price / 2) }})
        </Button>
        <span
          v-else
          class="text-xs text-muted-foreground"
        >no materials</span>
      </div>
    </div>
    <h3 class="mb-1 mt-3 text-xs font-semibold uppercase text-muted-foreground">
      Your orders
    </h3>
    <div
      v-for="o in d.orders"
      :key="o.id"
      class="flex items-center justify-between rounded border px-2 py-1 text-xs"
    >
      <span>{{ itemDef(o.itemId).name }} — {{ o.status === 'ready' ? 'ready' : `ready around ${formatClock(o.readyAt)}` }}</span>
      <Button
        v-if="o.status === 'ready'"
        size="xs"
        @click="collect(o.id)"
      >
        Collect (pay {{ o.price - o.paid }} c)
      </Button>
      <Button
        size="xs"
        variant="ghost"
        :data-testid="`cancel-${o.id}`"
        @click="cancel(o.id)"
      >
        Cancel
      </Button>
    </div>
  </PanelFrame>
</template>
