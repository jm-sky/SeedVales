<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { questObjectives, questRewardText } from '@/game/sim/quests'
import type { Quest } from '@/game/sim/types'

const props = defineProps<{ quest: Quest }>()
const { game, version } = useGameStrict()
const objectives = computed(() => {
  void version.value
  return questObjectives(game.value.sim, props.quest)
})
</script>

<template>
  <ul
    class="mt-1 space-y-0.5 text-xs"
    :data-testid="`board-objectives-${quest.kind}`"
  >
    <li
      v-for="o in objectives"
      :key="o.id"
      :class="o.done ? 'text-good' : ''"
      :data-testid="`board-objective-${o.id}`"
    >
      {{ o.done ? '[x]' : '[ ]' }} {{ o.label }}
    </li>
    <li
      class="text-muted-foreground"
      data-testid="board-reward"
    >
      Reward: {{ questRewardText(quest) }}
    </li>
  </ul>
</template>
