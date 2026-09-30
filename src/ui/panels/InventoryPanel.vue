<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { carriedWeight, carryCapacity } from '@/game/sim/inventory'
import { type ItemFilter, type ItemSort, viewItems } from '@/lib/inventoryView'
import InventoryToolbar from './inventory/InventoryToolbar.vue'
import ItemDetails from './inventory/ItemDetails.vue'
import ItemRow from './ItemRow.vue'
import PanelFrame from './PanelFrame.vue'
import type { ItemStack } from '@/game/sim/types'

const filter = ref<ItemFilter>('all')
const sort = ref<ItemSort>('name')
const selected = ref<ItemStack | null>(null)
const { game, version } = useGameStrict()
const v = computed(() => {
  void version.value
  const p = game.value.sim.player
  const items = viewItems(p.inv.items, filter.value, sort.value)
  return {
    items,
    eq: [
      ...(p.eq.main ? [['main', p.eq.main] as const] : []),
      ...(p.eq.off ? [['off', p.eq.off] as const] : []),
      ...Object.entries(p.eq.armor).filter((e) => e[1]).map(([k, s]) => [k, s!] as const),
    ],
    weight: carriedWeight(p),
    cap: carryCapacity(p),
    selected: selected.value && (p.inv.items.includes(selected.value) || Object.values(p.eq).includes(selected.value)) ? selected.value : null,
  }
})
const useLabel = (id: string) => {
  const d = itemDef(id)
  if (d.weapon || (d.caps?.length && !d.waterCapacity)) return 'Weź do ręki'
  if (d.armor) return 'Załóż'
  if (d.waterCapacity) return 'Pij'
  if (d.food || d.herb || d.category === 'medical') return d.category === 'medical' ? 'Użyj' : 'Zjedz'
  return ''
}
</script>

<template>
  <PanelFrame
    title="Ekwipunek"
    wide
    @close="game.closePanel()"
  >
    <div class="mb-2 flex items-center gap-2">
      <Button
        size="xs"
        variant="outline"
        data-testid="open-character"
        @click="game.togglePanel('character')"
      >
        Postać (K)
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">Udźwig {{ v.weight.toFixed(1) }} / {{ v.cap.toFixed(0) }} kg</span>
    </div>
    <InventoryToolbar
      v-model:filter="filter"
      v-model:sort="sort"
    />
    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Plecak
        </h3>
        <div
          class="grid gap-1"
          data-testid="inventory-list"
        >
          <ItemRow
            v-for="(s, i) in v.items"
            :key="i + s.id"
            :stack="s"
            :class="v.selected === s ? 'ring-1 ring-primary' : ''"
            :data-testid="`item-${s.id}`"
            @click="selected = s"
          >
            <Button
              v-if="useLabel(s.id)"
              size="xs"
              :data-testid="`use-${s.id}`"
              @click.stop="game.useItem(s)"
            >
              {{ useLabel(s.id) }}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              @click.stop="game.drop(s)"
            >
              Upuść
            </Button>
          </ItemRow>
          <p
            v-if="!v.items.length"
            class="text-muted-foreground"
          >
            Pusto.
          </p>
        </div>
      </div>
      <div class="space-y-3">
        <ItemDetails
          v-if="v.selected"
          :stack="v.selected"
        />
        <p
          v-else
          class="text-xs text-muted-foreground"
        >
          Kliknij przedmiot, by zobaczyć jego parametry.
        </p>
        <div>
          <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Wyposażenie
          </h3>
          <div class="grid gap-1">
            <ItemRow
              v-for="[slot, s] in v.eq"
              :key="slot"
              :stack="s"
              @click="selected = s"
            >
              <span class="text-[10px] text-muted-foreground">{{ slot }}</span>
              <Button
                size="xs"
                variant="outline"
                @click.stop="game.unequip(slot)"
              >
                Zdejmij
              </Button>
            </ItemRow>
          </div>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
