<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { buildingName } from '@/game/sim/interact'
import ItemRow from './ItemRow.vue'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const d = computed(() => {
  void version.value
  const g = game.value
  const ref = g.panelRef
  const b = ref?.type === 'building' ? g.sim.building(ref.id) : undefined
  if (!b?.inv) return null
  const foreign = b.owner.startsWith('household')
  return { b, title: `${buildingName(b)}${foreign ? ' (someone else\'s property!)' : ''}`, items: [...b.inv.items], mine: [...g.sim.player.inv.items], foreign }
})
function move(i: number, toStorage: boolean) {
  game.value.moveStorage(d.value!.b, i, toStorage)
}
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="d.title"
    wide
    @close="game.closePanel()"
  >
    <p
      v-if="d.foreign"
      class="mb-2 text-xs text-bad"
    >
      Taking from someone else's chest is theft — if anyone sees you (night and sneaking help), you will lose reputation.
    </p>
    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Contents
        </h3>
        <div class="grid gap-1">
          <ItemRow
            v-for="(s, i) in d.items"
            :key="i + s.id"
            :stack="s"
          >
            <Button
              size="xs"
              :data-testid="`take-${s.id}`"
              @click="move(i, false)"
            >
              Take
            </Button>
          </ItemRow>
        </div>
      </div>
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Your backpack
        </h3>
        <div class="grid gap-1">
          <ItemRow
            v-for="(s, i) in d.mine"
            :key="i + s.id"
            :stack="s"
          >
            <Button
              size="xs"
              variant="outline"
              :data-testid="`put-${s.id}`"
              @click="move(i, true)"
            >
              Put
            </Button>
          </ItemRow>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
