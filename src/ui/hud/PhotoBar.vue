<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'

const { game } = useGameStrict()
</script>

<template>
  <div
    class="pointer-events-auto absolute bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-sm text-white"
    data-testid="photo-bar"
  >
    <span>Photo mode · drag/mouse to look · wheel to zoom</span>
    <Button
      size="sm"
      data-testid="photo-save"
      @click="game.takePhoto()"
    >
      Save PNG
    </Button>
    <Button
      size="sm"
      variant="outline"
      data-testid="photo-exit"
      @click="game.togglePhotoMode()"
    >
      Exit
    </Button>
  </div>
</template>
