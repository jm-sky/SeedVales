<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { buildingName } from '@/game/sim/interact'
import ItemRow from './ItemRow.vue'
import PanelFrame from './PanelFrame.vue'
import type { ItemStack } from '@/game/sim/types'

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
function move(i: number, toStorage: boolean, qty?: number) {
  game.value.moveStorage(d.value!.b, i, toStorage, qty)
}
const fmt = (n: number) => (Math.round(n * 10) / 10).toString()
/** Reputation line shown before the action: "1 piece: −0.3 · all 6: −1.8 Helpfulness". */
function repHint(s: ItemStack, toStorage: boolean): string {
  const g = game.value
  const one = g.storageRepPreview(d.value!.b, s, 1, toStorage)
  if (!one) return ''
  const all = g.storageRepPreview(d.value!.b, s, s.qty, toStorage)!
  const sign = toStorage ? '+' : '−'
  const honesty = !toStorage && all.honesty ? `, Honesty −${all.honesty}` : ''
  return s.qty > 1
    ? `1: ${sign}${fmt(one.helpfulness)} · all ${s.qty}: ${sign}${fmt(all.helpfulness)} Helpfulness${honesty}`
    : `${sign}${fmt(one.helpfulness)} Helpfulness${honesty}`
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
          <div
            v-for="(s, i) in d.items"
            :key="i + s.id"
          >
            <ItemRow :stack="s">
              <Button
                size="xs"
                :data-testid="`take-${s.id}`"
                @click="move(i, false, 1)"
              >
                Take 1
              </Button>
              <Button
                v-if="s.qty > 1"
                size="xs"
                variant="outline"
                :data-testid="`take-all-${s.id}`"
                @click="move(i, false)"
              >
                All
              </Button>
            </ItemRow>
            <p
              v-if="repHint(s, false)"
              class="px-2 text-[11px] text-bad"
              :data-testid="`take-cost-${s.id}`"
            >
              {{ repHint(s, false) }}
            </p>
          </div>
          <p
            v-if="!d.items.length"
            class="text-xs text-muted-foreground"
            data-testid="storage-empty"
          >
            Empty.
          </p>
        </div>
      </div>
      <div>
        <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Your backpack
        </h3>
        <div class="grid gap-1">
          <div
            v-for="(s, i) in d.mine"
            :key="i + s.id"
          >
            <ItemRow :stack="s">
              <Button
                size="xs"
                variant="outline"
                :data-testid="`put-${s.id}`"
                @click="move(i, true, 1)"
              >
                Put 1
              </Button>
              <Button
                v-if="s.qty > 1"
                size="xs"
                variant="outline"
                :data-testid="`put-all-${s.id}`"
                @click="move(i, true)"
              >
                All
              </Button>
            </ItemRow>
            <p
              v-if="repHint(s, true)"
              class="px-2 text-[11px] text-good"
            >
              {{ repHint(s, true) }}
            </p>
          </div>
          <p
            v-if="!d.mine.length"
            class="text-xs text-muted-foreground"
          >
            Empty.
          </p>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
