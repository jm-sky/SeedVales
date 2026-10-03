<script setup lang="ts">
/** `dock`: the panel leaves the screen centre free (bottom half on phones in portrait, left side otherwise) so the world stays visible, e.g. the build ghost. */
defineProps<{ title: string; wide?: boolean; dock?: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="pointer-events-auto absolute z-20 flex flex-col rounded-xl border bg-card shadow-2xl"
    :class="dock
      ? 'inset-x-2 bottom-2 top-[52%] sm:inset-x-auto sm:left-2 sm:top-2 sm:w-[min(46vw,460px)]'
      : 'inset-x-2 top-2 bottom-2 mx-auto max-w-[min(96vw,var(--w))] sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[86vh] sm:w-[var(--w)] sm:-translate-x-1/2 sm:-translate-y-1/2'"
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
        aria-label="Close"
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
