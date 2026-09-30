<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
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
  const traits = [b.e > 0.65 ? 'towarzyski' : b.e < 0.35 ? 'małomówny' : '', b.a > 0.65 ? 'życzliwy' : b.a < 0.35 ? 'nieufny' : '', b.c > 0.65 ? 'pracowity' : b.c < 0.35 ? 'niedbały' : '', b.n > 0.65 ? 'nerwowy' : '', b.o > 0.65 ? 'ciekawy świata' : ''].filter(Boolean)
  const mood = n.opinion > 30 ? 'Miło cię widzieć!' : n.opinion < -30 ? 'Czego chcesz?' : 'Dzień dobry, wędrowcze.'
  const quests = g.sim.state.quests.filter((q) => q.giverId === n.id && q.status === 'available')
  return { n, title: `${n.name} — ${professionName(n.profession) || (n.age === 'child' ? 'dziecko' : n.age === 'elder' ? 'starzec' : 'mieszkaniec')}`, traits, mood, activity: n.ai.label, quests }
})
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="d.title"
    @close="game.closePanel()"
  >
    <p class="italic">
      „{{ d.mood }}{{ d.quests.length ? ' Mamy kłopot — zajrzyj na tablicę ogłoszeń albo porozmawiaj o zadaniach.' : '' }}”
    </p>
    <p class="mt-2 text-xs text-muted-foreground">
      Teraz: {{ d.activity || '—' }} · Nastawienie do ciebie: {{ Math.round(d.n.opinion) }}
      <span v-if="d.traits.length"> · Charakter: {{ d.traits.join(', ') }}</span>
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <Button
        size="sm"
        @click="game.choose({ id: 'trade', label: '', enabled: true, panel: 'trade' }, { type: 'npc', id: d.n.id })"
      >
        Handel
      </Button>
      <Button
        v-if="d.quests.length"
        size="sm"
        variant="outline"
        @click="game.choose({ id: 'quests', label: '', enabled: true, panel: 'quests' }, { type: 'npc', id: d.n.id })"
      >
        Zadania ({{ d.quests.length }})
      </Button>
    </div>
  </PanelFrame>
</template>
