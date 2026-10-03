<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { SPOILED_FRAC } from '@/game/config/calibration'
import { itemDef } from '@/game/data/items'
import { stackLabel } from '@/game/sim/inventory'
import { knownToxic } from '@/game/sim/knowledge'
import type { ItemStack } from '@/game/sim/types'

const props = defineProps<{ stack: ItemStack; price?: number }>()
const { game } = useGameStrict()
const info = computed(() => {
  const d = itemDef(props.stack.id)
  const parts: string[] = [`${(d.weight * props.stack.qty).toFixed(1)} kg`, d.size]
  if (props.stack.dur !== undefined && d.durability) parts.push(`${Math.round((props.stack.dur / d.durability) * 100)}%`)
  if (props.stack.fresh !== undefined && d.food) parts.push(props.stack.fresh < d.food.spoilH * SPOILED_FRAC ? 'rotten — may make you ill' : props.stack.fresh < d.food.spoilH * 0.2 ? 'spoiling' : `fresh ${Math.round(props.stack.fresh)}h`)
  if (knownToxic(game.value.sim, props.stack.id)) parts.push('known toxic')
  if (props.stack.water !== undefined) parts.push(`water ${props.stack.water}/${d.waterCapacity}`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
    <div class="min-w-0">
      <div class="truncate font-medium">
        {{ stackLabel(stack) }}
      </div>
      <div
        class="truncate text-[11px]"
        :class="info.includes('rotten') || info.includes('toxic') ? 'text-bad' : 'text-muted-foreground'"
      >
        {{ info }}
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <span
        v-if="price !== undefined"
        class="mr-1 text-xs text-quest"
      >{{ price }} c</span>
      <slot />
    </div>
  </div>
</template>
