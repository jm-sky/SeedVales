<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import PanelFrame from './PanelFrame.vue'

type QuickId = 'journal' | 'park_cart' | 'load_cart' | 'level' | 'dig' | 'raise' | 'sleep' | 'rest' | 'torch' | 'drop_torch' | 'plant_torch' | 'campfire'
const { game } = useGameStrict()
const GROUPS: { name: string; items: { id: QuickId | `bp:${string}`; label: string }[] }[] = [
  { name: 'Fire', items: [{ id: 'campfire', label: 'Build a campfire' }, { id: 'torch', label: 'Light / stow torch' }, { id: 'drop_torch', label: 'Drop burning torch' }, { id: 'plant_torch', label: 'Plant torch' }, { id: 'bp:hearth', label: 'Build a stone hearth' }] },
  { name: 'Building', items: [{ id: 'bp:well', label: 'Build a well' }, { id: 'bp:trough', label: 'Build a trough' }, { id: 'bp:house', label: 'Build a house' }, { id: 'bp:palisade', label: 'Palisade' }] },
  { name: 'Terrain', items: [{ id: 'level', label: 'Level ground' }, { id: 'dig', label: 'Dig a hole' }, { id: 'raise', label: 'Raise ground' }] },
  { name: 'Cart', items: [{ id: 'load_cart', label: 'Load heavy goods into the cart' }, { id: 'park_cart', label: 'Park the cart' }] },
  { name: 'Camp', items: [{ id: 'sleep', label: 'Sleep here' }, { id: 'rest', label: 'Rest' }] },
  { name: 'Notes', items: [{ id: 'journal', label: 'Open the journal' }] },
]
function run(id: string) {
  if (id === 'journal') game.value.togglePanel('journal')
  else if (id === 'park_cart') game.value.parkCart()
  else if (id === 'load_cart') game.value.loadPushedCart()
  else if (id.startsWith('bp:')) game.value.placeBlueprint(id.slice(3))
  else game.value.quick(id as Exclude<QuickId, 'journal' | 'park_cart' | 'load_cart'>)
}
</script>

<template>
  <PanelFrame
    title="Quick actions"
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
