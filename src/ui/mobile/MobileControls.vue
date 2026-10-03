<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { itemDef } from '@/game/data/items'
import { guardPress, guardRelease, input } from '@/game/input/controls'
import Joystick from './Joystick.vue'

const { game, version } = useGameStrict()
let lookId: number | null = null
let last = { x: 0, y: 0 }

function lookDown(e: PointerEvent) {
  lookId = e.pointerId
  last = { x: e.clientX, y: e.clientY }
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // synthetic or already-released pointer
  }
}
function lookMove(e: PointerEvent) {
  if (e.pointerId !== lookId) return
  input.lookDX += (e.clientX - last.x) * 1.1
  input.lookDY += (e.clientY - last.y) * 1.1
  last = { x: e.clientX, y: e.clientY }
}
function lookUp(e: PointerEvent) {
  if (e.pointerId === lookId) lookId = null
}
const ranged = computed(() => {
  void version.value
  const m = game.value.sim.player.eq.main
  return !!m && itemDef(m.id).weapon?.kind === 'ranged'
})
const state = computed(() => {
  void version.value
  const g = game.value
  return { run: input.run, combat: g.sim.player.combat, sneak: g.sim.state.px.sneaking, hasTarget: !!g.target, panel: g.panel }
})
function attackDown() {
  input.primary = true
  if (!ranged.value) game.value.attack()
}
function attackUp() {
  input.primary = false
}
function blockDown() {
  guardPress()
}
function blockUp() {
  guardRelease()
}
onBeforeUnmount(() => {
  input.secondary = false
})
function toggleRun() {
  input.run = !input.run
  version.value++
}
const MENU = [
  ['inventory', 'Inv.'], ['character', 'Char.'], ['craft', 'Craft'], ['build', 'Build'], ['quick', 'Actions'], ['journal', 'Journal'], ['quests', 'Quests'], ['map', 'Map'], ['menu', 'Menu'],
] as const
</script>

<template>
  <div
    v-if="!state.panel"
    class="pointer-events-none absolute inset-0 z-[5]"
  >
    <div
      class="pointer-events-auto absolute right-0 top-24 bottom-44 w-1/2"
      data-testid="touch-look"
      @pointerdown="lookDown"
      @pointermove="lookMove"
      @pointerup="lookUp"
      @pointercancel="lookUp"
    />
    <div class="absolute bottom-5 left-5">
      <Joystick />
    </div>
    <button
      class="pointer-events-auto absolute bottom-5 right-[16.5rem] h-14 w-14 rounded-full bg-black/40 text-xs font-semibold text-white"
      data-testid="touch-jump"
      @click="game.jump()"
    >
      {{ state.combat ? 'Dodge' : 'Jump' }}
    </button>
    <div class="pointer-events-auto absolute bottom-5 right-4 grid grid-cols-3 gap-2">
      <button
        class="h-14 w-14 rounded-full bg-black/40 text-xs font-semibold text-white"
        :class="state.sneak ? 'ring-2 ring-sky-400' : ''"
        data-testid="touch-sneak"
        @click="game.toggleSneak()"
      >
        Sneak
      </button>
      <button
        class="h-14 w-14 rounded-full bg-black/40 text-xs font-semibold text-white"
        :class="state.combat ? 'ring-2 ring-red-400' : ''"
        @click="game.toggleCombat(); version++"
      >
        Combat
      </button>
      <button
        class="h-14 w-14 rounded-full bg-black/40 text-xs font-semibold text-white"
        :class="state.run ? 'ring-2 ring-yellow-400' : ''"
        @click="toggleRun"
      >
        Run
      </button>
      <button
        class="h-12 w-14 rounded-full bg-black/40 text-xs font-semibold text-white"
        data-testid="touch-weapon"
        @click="game.switchWeapon(); version++"
      >
        Weapon
      </button>
      <button
        class="h-12 w-14 rounded-full bg-black/40 text-xs font-semibold text-white"
        data-testid="touch-next-target"
        @click="game.cycleTarget()"
      >
        Target
      </button>
      <button
        v-if="state.combat"
        class="h-12 w-14 rounded-full bg-sky-700/80 text-xs font-semibold text-white"
        data-testid="touch-block"
        @pointerdown="blockDown"
        @pointerup="blockUp"
        @pointercancel="blockUp"
        @pointerleave="blockUp"
      >
        Block
      </button>
      <button
        class="col-span-2 h-16 rounded-full bg-primary/85 text-sm font-bold text-primary-foreground disabled:opacity-40"
        :disabled="!state.hasTarget"
        data-testid="touch-interact"
        @click="game.interact()"
      >
        Action
      </button>
      <button
        class="h-16 w-16 rounded-full bg-red-700/80 text-sm font-bold text-white"
        data-testid="touch-attack"
        @pointerdown="attackDown"
        @pointerup="attackUp"
        @pointercancel="attackUp"
      >
        {{ ranged ? 'Draw' : 'Attack' }}
      </button>
    </div>
    <div class="pointer-events-auto absolute left-1/2 top-2 flex max-w-[56vw] -translate-x-1/2 flex-wrap justify-center gap-0.5">
      <button
        v-for="[p, l] in MENU"
        :key="p"
        class="rounded bg-black/45 px-1.5 py-1 text-[10px] text-white"
        :data-testid="`touch-menu-${p}`"
        @click="game.togglePanel(p)"
      >
        {{ l }}
      </button>
    </div>
  </div>
</template>
