<script setup lang="ts">
import { ref } from 'vue'
import { input } from '@/game/input/controls'

const R = 56
const knob = ref({ x: 0, y: 0 })
let pid: number | null = null
let origin = { x: 0, y: 0 }

function down(e: PointerEvent) {
  pid = e.pointerId
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // synthetic or already-released pointer
  }
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  move(e)
}
function move(e: PointerEvent) {
  if (e.pointerId !== pid) return
  let dx = e.clientX - origin.x
  let dy = e.clientY - origin.y
  const l = Math.hypot(dx, dy)
  if (l > R) {
    dx = (dx / l) * R
    dy = (dy / l) * R
  }
  knob.value = { x: dx, y: dy }
  input.stickX = dx / R
  input.stickY = -dy / R
  input.run = l > R * 0.95 && input.run
}
function up(e: PointerEvent) {
  if (e.pointerId !== pid) return
  pid = null
  knob.value = { x: 0, y: 0 }
  input.stickX = 0
  input.stickY = 0
}
</script>

<template>
  <div
    class="pointer-events-auto relative h-36 w-36 rounded-full border-2 border-white/30 bg-black/25"
    data-testid="joystick"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
  >
    <div
      class="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/45"
      :style="{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }"
    />
  </div>
</template>
