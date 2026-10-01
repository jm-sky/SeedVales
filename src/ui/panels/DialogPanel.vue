<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { wantedItem } from '@/game/sim/gifts'
import { professionName } from '@/game/sim/newGame'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const d = computed(() => {
  void version.value
  const g = game.value
  const ref = g.panelRef
  const n = ref?.type === 'npc' ? g.sim.human(ref.id) : undefined
  if (!n) return null
  const b = n.big5
  const traits = [b.e > 0.65 ? 'sociable' : b.e < 0.35 ? 'taciturn' : '', b.a > 0.65 ? 'kind' : b.a < 0.35 ? 'distrustful' : '', b.c > 0.65 ? 'diligent' : b.c < 0.35 ? 'careless' : '', b.n > 0.65 ? 'nervous' : '', b.o > 0.65 ? 'curious' : ''].filter(Boolean)
  const mood = n.opinion > 30 ? 'Good to see you!' : n.opinion < -30 ? 'What do you want?' : 'Good day, traveller.'
  const quests = g.sim.state.quests.filter((q) => q.giverId === n.id && q.status === 'available')
  const want = wantedItem(n)
  // SOC-01: preferences are revealed in conversation (friendlier people say more).
  const wish = want && n.opinion > -30 ? `I've been hoping to get ${itemDef(want).name.toLowerCase()}.` : ''
  const comp = n.companion ? (n.companion.kind === 'hired' ? 'Travelling with you (hired).' : 'Travelling with you.') : ''
  return { wish, comp, n, title: `${n.name} — ${professionName(n.profession) || (n.age === 'child' ? 'child' : n.age === 'elder' ? 'elder' : 'villager')}`, traits, mood, activity: n.ai.label, quests }
})
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="d.title"
    @close="game.closePanel()"
  >
    <p class="italic">
      “{{ d.mood }}{{ d.quests.length ? ' We have a problem — check the notice board or ask about quests.' : '' }}”
    </p>
    <p
      v-if="d.wish"
      class="mt-1 italic"
      data-testid="dialog-wish"
    >
      “{{ d.wish }}”
    </p>
    <p
      v-if="d.comp"
      class="mt-1 text-xs text-good"
    >
      {{ d.comp }}
    </p>
    <p class="mt-2 text-xs text-muted-foreground">
      Now: {{ d.activity || '—' }} · Attitude towards you: {{ Math.round(d.n.opinion) }}
      <span v-if="d.traits.length"> · Character: {{ d.traits.join(', ') }}</span>
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <Button
        size="sm"
        @click="game.choose({ id: 'trade', label: '', enabled: true, panel: 'trade' }, { type: 'npc', id: d.n.id })"
      >
        Trade
      </Button>
      <Button
        size="sm"
        variant="outline"
        @click="game.choose({ id: 'gift', label: '', enabled: true, panel: 'gift' }, { type: 'npc', id: d.n.id })"
      >
        Give a gift
      </Button>
      <Button
        v-if="d.quests.length"
        size="sm"
        variant="outline"
        @click="game.choose({ id: 'quests', label: '', enabled: true, panel: 'quests' }, { type: 'npc', id: d.n.id })"
      >
        Quests ({{ d.quests.length }})
      </Button>
    </div>
  </PanelFrame>
</template>
