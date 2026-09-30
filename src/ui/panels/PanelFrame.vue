<script setup lang="ts">
defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="pointer-events-auto absolute inset-x-2 top-2 bottom-2 z-20 mx-auto flex max-w-[min(96vw,var(--w))] flex-col rounded-xl border bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[86vh] sm:w-[var(--w)] sm:-translate-x-1/2 sm:-translate-y-1/2"
    :style="{ '--w': wide ? '820px' : '560px' }"
    data-testid="panel"
  >
    <div class="flex items-center justify-between border-b px-4 py-2">
      <h2 class="font-semibold text-primary">
        {{ title }}
      </h2>
      <button
        class="rounded px-2 py-1 text-lg leading-none hover:bg-accent"
        data-testid="panel-close"
        aria-label="Zamknij"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>
    <div class="panel-scroll min-h-0 flex-1 p-3 text-sm">
      <slot />
    </div>
  </div>
</template>
