<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import BoardQuestObjectives from './BoardQuestObjectives.vue'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const STATUS = { offered: 'a rumour', active: 'in progress', done: 'completed', lapsed: 'lapsed', refused: 'put off' }
const d = computed(() => {
  void version.value
  const j = game.value.journal()
  return {
    open: j.authored.filter((q) => q.status === 'active' || q.status === 'offered' || q.status === 'refused'),
    finished: j.authored.filter((q) => q.status === 'done' || q.status === 'lapsed'),
    board: j.board,
  }
})
</script>

<template>
  <PanelFrame
    title="Journal"
    wide
    @close="game.closePanel()"
  >
    <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
      Quests
    </h3>
    <p
      v-if="!d.open.length && !d.board.length"
      class="text-muted-foreground"
      data-testid="journal-empty"
    >
      Nothing to write down yet. Talk to the villagers — somebody always has a worry.
    </p>
    <div class="grid gap-2">
      <div
        v-for="q in d.open"
        :key="q.id"
        class="rounded-md border p-2"
        :data-testid="`journal-quest-${q.id}`"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-semibold">{{ q.title }}</span>
          <span class="text-xs text-muted-foreground">{{ STATUS[q.status] }}</span>
        </div>
        <p
          class="mt-1 text-xs"
          :data-testid="`journal-text-${q.id}`"
        >
          {{ q.text }}
        </p>
        <p
          v-if="q.decision"
          class="mt-1 text-xs italic"
        >
          Decision: {{ q.decision }}
        </p>
      </div>
    </div>
    <h3
      v-if="d.board.length"
      class="mb-1 mt-4 text-xs font-semibold uppercase text-muted-foreground"
    >
      Notice-board quests (in progress)
    </h3>
    <div class="grid gap-2">
      <div
        v-for="q in d.board"
        :key="q.id"
        class="rounded-md border p-2"
        :data-testid="`journal-board-${q.kind}`"
      >
        <span class="font-semibold">{{ q.title }}</span>
        <p class="mt-1 text-xs">
          {{ q.desc }}
        </p>
        <BoardQuestObjectives :quest="q" />
      </div>
    </div>
    <details
      v-if="d.finished.length"
      class="mt-4"
      data-testid="journal-finished"
    >
      <summary class="cursor-pointer text-xs font-semibold uppercase text-muted-foreground">
        Finished ({{ d.finished.length }})
      </summary>
      <div class="mt-2 grid gap-2">
        <div
          v-for="q in d.finished"
          :key="q.id"
          class="rounded-md border p-2"
          :data-testid="`journal-quest-${q.id}`"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold">{{ q.title }}</span>
            <span class="text-xs text-muted-foreground">{{ STATUS[q.status] }}</span>
          </div>
          <p class="mt-1 text-xs">
            {{ q.text }}
          </p>
          <p
            v-if="q.decision"
            class="mt-1 text-xs italic"
          >
            Decision: {{ q.decision }}
          </p>
        </div>
      </div>
    </details>
  </PanelFrame>
</template>
