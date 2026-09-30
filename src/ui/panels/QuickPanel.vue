<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import PanelFrame from './PanelFrame.vue'

type QuickId = 'level' | 'dig' | 'raise' | 'sleep' | 'rest' | 'torch' | 'drop_torch' | 'campfire'
const { game } = useGameStrict()
const GROUPS: { name: string; items: { id: QuickId | `bp:${string}`; label: string }[] }[] = [
  { name: 'Ogień', items: [{ id: 'campfire', label: 'Rozpal ognisko' }, { id: 'torch', label: 'Zapal / schowaj pochodnię' }, { id: 'drop_torch', label: 'Rzuć płonącą pochodnię' }] },
  { name: 'Budowa', items: [{ id: 'bp:well', label: 'Zbuduj studnię' }, { id: 'bp:trough', label: 'Zbuduj koryto' }, { id: 'bp:house', label: 'Zbuduj dom' }, { id: 'bp:palisade', label: 'Palisada' }] },
  { name: 'Teren', items: [{ id: 'level', label: 'Wyrównaj' }, { id: 'dig', label: 'Wykop dziurę' }, { id: 'raise', label: 'Zrób wyżej' }] },
  { name: 'Obóz', items: [{ id: 'sleep', label: 'Śpij tutaj' }, { id: 'rest', label: 'Odpocznij' }] },
]
function run(id: string) {
  if (id.startsWith('bp:')) game.value.placeBlueprint(id.slice(3))
  else game.value.quick(id as QuickId)
}
</script>

<template>
  <PanelFrame
    title="Szybkie akcje"
    @close="game.closePanel()"
  >
    <div class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="g in GROUPS"
        :key="g.name"
      >
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          {{ g.name }}
        </h3>
        <div class="grid gap-1">
          <Button
            v-for="i in g.items"
            :key="i.id"
            variant="outline"
            class="justify-start"
            :data-testid="`quick-${i.id}`"
            @click="run(i.id)"
          >
            {{ i.label }}
          </Button>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
