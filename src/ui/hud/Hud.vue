<script setup lang="ts">
import { useGameStrict } from '@/composables/useGame'
import ActivityBar from './ActivityBar.vue'
import ClockWeather from './ClockWeather.vue'
import MessageLog from './MessageLog.vue'
import ModeBar from './ModeBar.vue'
import StatusBars from './StatusBars.vue'
import TargetPrompt from './TargetPrompt.vue'
import ToastLine from './ToastLine.vue'

const { game } = useGameStrict()
</script>

<template>
  <div class="pointer-events-none absolute inset-0 select-none text-shadow">
    <div class="absolute left-3 top-3 flex flex-col gap-2">
      <StatusBars />
      <ModeBar />
    </div>
    <div class="absolute right-3 top-3">
      <ClockWeather />
    </div>
    <div class="absolute bottom-40 left-1/2 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-24">
      <ToastLine />
      <ActivityBar />
      <TargetPrompt />
    </div>
    <div
      v-if="!game.isTouch"
      class="absolute bottom-3 left-3 hidden w-[min(40vw,380px)] sm:block"
    >
      <MessageLog />
    </div>
    <div
      v-else
      class="absolute left-1/2 top-12 w-[min(46vw,360px)] -translate-x-1/2 opacity-90"
    >
      <MessageLog :limit="2" />
    </div>
    <div class="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
  </div>
</template>
