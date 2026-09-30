<script setup lang="ts">
import { ref } from 'vue'
import GameView from '@/ui/GameView.vue'
import MainMenu from '@/ui/MainMenu.vue'
import type { StartRequest } from '@/ui/types'

const start = ref<StartRequest | null>(null)
</script>

<template>
  <MainMenu
    v-if="!start"
    @start="start = $event"
  />
  <GameView
    v-else
    :request="start"
    @quit="start = null"
  />
</template>
