<script setup lang="ts">
import type { BodyPart } from '@/game/sim/types'

/** Simple character preview: silhouette with body parts coloured by damage (0 = healthy, 1 = critical). */
const props = defineProps<{ damage: Record<BodyPart, number> }>()
const color = (p: BodyPart) => {
  const d = Math.min(1, Math.max(0, props.damage[p]))
  const r = Math.round(90 + d * 150)
  const g = Math.round(170 - d * 130)
  return `rgb(${r},${g},70)`
}
</script>

<template>
  <svg
    viewBox="0 0 100 200"
    class="h-56 w-28"
    role="img"
    aria-label="Stan części ciała"
  >
    <circle
      cx="50"
      cy="20"
      r="15"
      :fill="color('head')"
    />
    <rect
      x="30"
      y="38"
      width="40"
      height="42"
      rx="6"
      :fill="color('torso')"
    />
    <rect
      x="32"
      y="82"
      width="36"
      height="26"
      rx="5"
      :fill="color('gut')"
    />
    <rect
      x="12"
      y="40"
      width="14"
      height="62"
      rx="6"
      :fill="color('rarm')"
    />
    <rect
      x="74"
      y="40"
      width="14"
      height="62"
      rx="6"
      :fill="color('larm')"
    />
    <rect
      x="33"
      y="111"
      width="15"
      height="80"
      rx="6"
      :fill="color('rleg')"
    />
    <rect
      x="52"
      y="111"
      width="15"
      height="80"
      rx="6"
      :fill="color('lleg')"
    />
  </svg>
</template>
