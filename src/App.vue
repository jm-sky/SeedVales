<script setup lang="ts">
import { ref } from 'vue'
import GameView from '@/ui/GameView.vue'
import MainMenu from '@/ui/MainMenu.vue'
import type { StartRequest } from '@/ui/types'

const start = ref<StartRequest | null>(null)
/** Bumped on "new game" from the in-game menu so GameView remounts (old Game is stopped). */
const run = ref(0)

function restart(seed: number | null) {
  start.value = { seed: seed ?? Math.floor(Math.random() * 1e9), quality: start.value?.quality ?? 'medium' }
  run.value++
}
</script>

<template>
  <MainMenu
    v-if="!start"
    @start="start = $event"
  />
  <GameView
    v-else
    :key="run"
    :request="start"
    @quit="start = null"
    @restart="restart"
  />
</template>
