<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { needsSharpening } from '@/game/sim/edge'
import { findTool } from '@/game/sim/inventory'
import { itemParams } from '@/lib/inventoryView'
import type { ItemStack } from '@/game/sim/types'

const props = defineProps<{ stack: ItemStack }>()
const d = computed(() => itemDef(props.stack.id))
const params = computed(() => itemParams(props.stack))
const { game, version } = useGameStrict()
const canSharpen = computed(() => {
  void version.value
  return needsSharpening(props.stack) && !!findTool(game.value.sim.player, 'sharpen')
})
</script>

<template>
  <div
    class="rounded-md border bg-background/40 p-2"
    data-testid="item-details"
  >
    <div class="mb-1 font-semibold">
      {{ d.name }}
    </div>
    <div
      v-for="p in params"
      :key="p.label"
      class="flex justify-between gap-2 text-xs"
    >
      <span class="text-muted-foreground">{{ p.label }}</span><span class="text-right">{{ p.value }}</span>
    </div>
    <button
      v-if="canSharpen"
      class="mt-1 rounded border px-2 py-1 text-xs"
      data-testid="sharpen"
      @click="game.sharpen(stack)"
    >
      Sharpen (whetstone)
    </button>
    <button
      v-if="stack.id === 'letter' && stack.tag === 'sealed'"
      class="mt-1 rounded border px-2 py-1 text-xs"
      data-testid="break-seal"
      @click="game.breakSeal(stack)"
    >
      Break the seal
    </button>
  </div>
</template>
