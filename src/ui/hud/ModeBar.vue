<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { formatCoins } from '@/game/data/items'
import { cartLoad } from '@/game/sim/cart'

const { game, version } = useGameStrict()
const s = computed(() => {
  void version.value
  const g = game.value
  const p = g.sim.player
  return {
    main: p.eq.main ? itemDef(p.eq.main.id).name : 'fists',
    off: p.eq.off ? itemDef(p.eq.off.id).name : '',
    combat: p.combat,
    sneak: g.sim.state.px.sneaking,
    money: formatCoins(p.money),
    draw: g.sim.state.px.bowDraw,
    cart: g.sim.state.px.cart ? `${itemDef(g.sim.state.px.cart.item).name} ${Math.round(cartLoad(g.sim.state.px.cart))}/${itemDef(g.sim.state.px.cart.item).cart!.capacity} kg` : '',
  }
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 text-[11px]">
    <span class="rounded bg-black/40 px-1.5 py-0.5">🗡 {{ s.main }}</span>
    <span
      v-if="s.off"
      class="rounded bg-black/40 px-1.5 py-0.5"
    >✋ {{ s.off }}</span>
    <span
      v-if="s.combat"
      class="rounded bg-bad/70 px-1.5 py-0.5 font-semibold"
    >Combat</span>
    <span
      v-if="s.sneak"
      class="rounded bg-sky-800/80 px-1.5 py-0.5 font-semibold"
    >Sneak</span>
    <span class="rounded bg-black/40 px-1.5 py-0.5 text-quest">{{ s.money }}</span>
    <span
      v-if="s.cart"
      class="rounded bg-amber-900/70 px-1.5 py-0.5"
      data-testid="cart-status"
    >🛒 {{ s.cart }}</span>
    <span
      v-if="s.draw > 0"
      class="rounded bg-yellow-700/80 px-1.5 py-0.5"
    >Draw {{ Math.round(s.draw * 100) }}%</span>
  </div>
</template>
