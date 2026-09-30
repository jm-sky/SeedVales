<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { ATTR_NAMES, SKILL_NAMES } from '@/game/data/skills'
import { carriedWeight, carryCapacity } from '@/game/sim/inventory'
import ItemRow from './ItemRow.vue'
import PanelFrame from './PanelFrame.vue'

type Tab = 'items' | 'character'
const tab = ref<Tab>('items')
const { game, version } = useGameStrict()
const v = computed(() => {
  void version.value
  const p = game.value.sim.player
  return {
    items: [...p.inv.items],
    eq: [
      ...(p.eq.main ? [['main', p.eq.main] as const] : []),
      ...(p.eq.off ? [['off', p.eq.off] as const] : []),
      ...Object.entries(p.eq.armor).filter((e) => e[1]).map(([k, s]) => [k, s!] as const),
    ],
    weight: carriedWeight(p),
    cap: carryCapacity(p),
    attrs: p.attrs,
    skills: p.skills,
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
    <div class="mb-3 flex gap-2">
      <Button
        size="sm"
        :variant="tab === 'items' ? 'default' : 'outline'"
        @click="tab = 'items'"
      >
        Przedmioty
      </Button>
      <Button
        size="sm"
        :variant="tab === 'character' ? 'default' : 'outline'"
        @click="tab = 'character'"
      >
        Postać
      </Button>
      <span class="ml-auto self-center text-xs text-muted-foreground">Udźwig {{ v.weight.toFixed(1) }} / {{ v.cap.toFixed(0) }} kg</span>
    </div>
    <div
      v-if="tab === 'items'"
      class="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Plecak
        </h3>
        <div class="grid gap-1">
          <ItemRow
            v-for="(s, i) in v.items"
            :key="i + s.id"
            :stack="s"
          >
            <Button
              v-if="useLabel(s.id)"
              size="xs"
              :data-testid="`use-${s.id}`"
              @click="game.useItem(s)"
            >
              {{ useLabel(s.id) }}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              @click="game.drop(s)"
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
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Wyposażenie
        </h3>
        <div class="grid gap-1">
          <ItemRow
            v-for="[slot, s] in v.eq"
            :key="slot"
            :stack="s"
          >
            <span class="text-[10px] text-muted-foreground">{{ slot }}</span>
            <Button
              size="xs"
              variant="outline"
              @click="game.unequip(slot)"
            >
              Zdejmij
            </Button>
          </ItemRow>
        </div>
      </div>
    </div>
    <div
      v-else
      class="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Atrybuty
        </h3>
        <div
          v-for="(val, k) in v.attrs"
          :key="k"
          class="flex justify-between border-b py-1"
        >
          <span>{{ ATTR_NAMES[k] }}</span><span>{{ val }}</span>
        </div>
      </div>
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Umiejętności (rosną z użyciem)
        </h3>
        <div
          v-for="(val, k) in v.skills"
          :key="k"
          class="flex items-center justify-between gap-2 border-b py-1"
        >
          <span>{{ SKILL_NAMES[k] }}</span>
          <div class="h-1.5 w-24 overflow-hidden rounded bg-white/15">
            <div
              class="h-full bg-primary"
              :style="{ width: `${val}%` }"
            />
          </div>
          <span class="w-10 text-right">{{ val.toFixed(1) }}</span>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
