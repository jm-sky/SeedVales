<script setup lang="ts">
import { computed } from 'vue'
import { itemDef } from '@/game/data/items'
import { itemParams } from '@/lib/inventoryView'
import type { ItemStack } from '@/game/sim/types'

const props = defineProps<{ stack: ItemStack }>()
const d = computed(() => itemDef(props.stack.id))
const params = computed(() => itemParams(props.stack))
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
  </div>
</template>
