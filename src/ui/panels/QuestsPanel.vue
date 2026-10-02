<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { BADGES, REP_NAMES } from '@/game/sim/reputation'
import { REP_DIMS } from '@/game/sim/types'
import BoardQuestObjectives from './BoardQuestObjectives.vue'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const STATUS = { available: 'available', active: 'in progress', done: 'completed', expired: 'expired' }
const d = computed(() => {
  void version.value
  const s = game.value.sim.state
  return {
    quests: [...s.quests].reverse(),
    reps: s.settlements.map((st) => ({ name: st.name, rep: st.rep, pending: st.pendingRep.length })),
    badges: BADGES.filter((b) => s.px.badges[b.id]),
  }
})
function accept(id: string) {
  game.value.acceptBoardQuest(id)
}
function apologize(id: string) {
  game.value.apologize(id)
}
</script>

<template>
  <PanelFrame
    title="Quests and reputation"
    wide
    @close="game.closePanel()"
  >
    <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
      Notices and quests
    </h3>
    <p
      v-if="!d.quests.length"
      class="text-muted-foreground"
    >
      No notices. Settlement troubles (e.g. rats in neglected buildings, wolves) appear over time.
    </p>
    <div class="grid gap-2">
      <div
        v-for="q in d.quests"
        :key="q.id"
        class="rounded-md border p-2"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-semibold">{{ q.title }}</span>
          <span class="text-xs text-muted-foreground">{{ STATUS[q.status] }}</span>
        </div>
        <p class="mt-1 text-xs">
          {{ q.desc }}
        </p>
        <div class="mt-1 flex items-end justify-between text-xs">
          <BoardQuestObjectives :quest="q" />
          <Button
            v-if="q.status === 'available'"
            size="xs"
            :data-testid="`accept-${q.kind}`"
            @click="accept(q.id)"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
    <h3 class="mb-1 mt-4 text-xs font-semibold uppercase text-muted-foreground">
      Reputation
    </h3>
    <table class="w-full text-xs">
      <thead>
        <tr class="text-muted-foreground">
          <th class="text-left">
            Settlement
          </th>
          <th
            v-for="k in REP_DIMS"
            :key="k"
          >
            {{ REP_NAMES[k] }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in d.reps"
          :key="r.name"
          class="border-t"
        >
          <td class="py-1">
            {{ r.name }}<span
              v-if="r.pending"
              class="text-muted-foreground"
            > (news on the way)</span>
          </td>
          <td
            v-for="k in REP_DIMS"
            :key="k"
            class="text-center"
            :class="r.rep[k] > 0 ? 'text-good' : r.rep[k] < 0 ? 'text-bad' : ''"
          >
            {{ r.rep[k].toFixed(1) }}
          </td>
        </tr>
      </tbody>
    </table>
    <h3 class="mb-1 mt-4 text-xs font-semibold uppercase text-muted-foreground">
      Badges
    </h3>
    <div class="flex flex-wrap gap-2">
      <span
        v-for="b in d.badges"
        :key="b.id"
        class="rounded px-2 py-1 text-xs"
        :class="b.positive ? 'bg-good/30' : 'bg-bad/30'"
      >
        {{ b.name }}
        <button
          v-if="!b.positive"
          class="ml-1 underline"
          @click="apologize(b.id)"
        >apologize</button>
      </span>
      <span
        v-if="!d.badges.length"
        class="text-xs text-muted-foreground"
      >None.</span>
    </div>
  </PanelFrame>
</template>
