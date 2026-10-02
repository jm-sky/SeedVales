<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { formatCoins } from '@/game/data/items'
import { professionName } from '@/game/sim/newGame'
import { buyPrice, sellPrice, tradeStock } from '@/game/sim/trade'
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
  return {
    npc,
    title: `Trade: ${npc.name} (${professionName(npc.profession) || 'villager'})`,
    // Shown with the quantity the NPC is willing to sell (TRADE-02: surplus only).
    theirs: tradeStock(g.sim, npc).map((e) => ({ s: e.stack, shown: { ...e.stack, qty: e.max }, price: buyPrice(g.sim, npc, e.stack) })),
    mine: g.sim.player.inv.items.map((s) => ({ s, price: sellPrice(g.sim, npc, s) })),
    money: g.sim.player.money,
    npcMoney: npc.money,
  }
})
function buy(s: ItemStack) {
  game.value.buyFrom(d.value!.npc, s)
}
function give(s: ItemStack) {
  game.value.giftTo(d.value!.npc, s)
}
function sell(s: ItemStack) {
  game.value.sellTo(d.value!.npc, s)
}
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="d.title"
    wide
    @close="game.closePanel()"
  >
    <div class="mb-2 flex justify-between text-xs">
      <span>Your money: <b class="text-quest">{{ formatCoins(d.money) }}</b></span>
      <span>{{ d.npc.name }}: {{ formatCoins(d.npcMoney) }}</span>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Buy
        </h3>
        <p
          v-if="!d.theirs.length"
          class="text-xs text-muted-foreground"
        >
          Nothing to spare.
        </p>
        <div class="grid gap-1">
          <ItemRow
            v-for="(e, i) in d.theirs"
            :key="i + e.s.id"
            :stack="e.shown"
            :price="e.price"
          >
            <Button
              size="xs"
              :disabled="d.money < e.price"
              :data-testid="`buy-${e.s.id}`"
              @click="buy(e.s)"
            >
              Buy 1
            </Button>
          </ItemRow>
        </div>
      </div>
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Sell / give
        </h3>
        <div class="grid gap-1">
          <ItemRow
            v-for="(e, i) in d.mine"
            :key="i + e.s.id"
            :stack="e.s"
            :price="e.price"
          >
            <Button
              size="xs"
              variant="outline"
              :disabled="e.price <= 0 || d.npcMoney < e.price"
              :data-testid="`sell-${e.s.id}`"
              @click="sell(e.s)"
            >
              Sell 1
            </Button>
            <Button
              size="xs"
              variant="ghost"
              :data-testid="`give-${e.s.id}`"
              @click="give(e.s)"
            >
              Give
            </Button>
          </ItemRow>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
