<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { FILTERS, type ItemFilter, type ItemSort, SORTS } from '@/lib/inventoryView'

const filter = defineModel<ItemFilter>('filter', { required: true })
const sort = defineModel<ItemSort>('sort', { required: true })
</script>

<template>
  <div class="mb-2 flex flex-wrap items-center gap-1">
    <Button
      v-for="f in FILTERS"
      :key="f.id"
      size="xs"
      :variant="filter === f.id ? 'default' : 'outline'"
      :data-testid="`filter-${f.id}`"
      @click="filter = f.id"
    >
      {{ f.label }}
    </Button>
    <label class="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
      Sortuj
      <select
        v-model="sort"
        class="rounded border bg-background px-1 py-0.5 text-xs text-foreground"
        data-testid="inventory-sort"
      >
        <option
          v-for="s in SORTS"
          :key="s.id"
          :value="s.id"
        >
          {{ s.label }}
        </option>
      </select>
    </label>
  </div>
</template>
