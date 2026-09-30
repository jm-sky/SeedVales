<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { isVisited, navGoal, questGoal } from '@/game/sim/navigation'
import { drawArrow, worldMapImage } from '@/ui/map/worldMapImage'
import PanelFrame from './PanelFrame.vue'

const { game, version } = useGameStrict()
const canvas = ref<HTMLCanvasElement>()
const S = 512

const view = computed(() => {
  void version.value
  const sim = game.value.sim
  const p = sim.player
  return {
    goal: navGoal(sim),
    settlements: sim.world.settlements.map((s) => ({ ...s, visited: isVisited(sim, s.id), km: (Math.hypot(s.x - p.x, s.z - p.z) / 1000).toFixed(1) })),
    quests: sim.state.quests.filter((q) => q.status === 'active').map((q) => questGoal(sim, q)).filter((g) => !!g),
  }
})

function draw() {
  const c = canvas.value
  if (!c) return
  const sim = game.value.sim
  const w = sim.world
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(worldMapImage(w), 0, 0, S, S)
  const sc = S / w.size
  ctx.font = 'bold 12px sans-serif'
  for (const s of view.value.settlements) {
    ctx.fillStyle = s.visited ? '#f5d88a' : '#b8b0a0'
    ctx.fillRect(s.x * sc - 4, s.z * sc - 4, 8, 8)
    ctx.fillStyle = s.visited ? '#fff' : '#ddd'
    ctx.fillText(`${s.name}${s.visited ? '' : ' ?'}`, s.x * sc + 6, s.z * sc - 6)
  }
  for (const q of view.value.quests) {
    ctx.fillStyle = '#ff5a3c'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('!', q.x * sc - 3, q.z * sc + 6)
  }
  const g = view.value.goal
  if (g) {
    ctx.strokeStyle = '#4fc3ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(g.x * sc, g.z * sc, 7, 0, Math.PI * 2)
    ctx.stroke()
  }
  const p = sim.player
  drawArrow(ctx, p.x * sc, p.z * sc, p.rot, 8, '#ff4040')
}

onMounted(() => {
  canvas.value!.width = S
  canvas.value!.height = S
  draw()
})
watch(view, draw)

function pick(e: MouseEvent) {
  const c = canvas.value!
  const r = c.getBoundingClientRect()
  const size = game.value.sim.world.size
  game.value.setWaypoint(((e.clientX - r.left) / r.width) * size, ((e.clientY - r.top) / r.height) * size)
}

function auto(id: number) {
  game.value.showToast(game.value.autopilotTo(id))
}
</script>

<template>
  <PanelFrame
    title="Mapa (wiedza podróżnika)"
    wide
    @close="game.closePanel()"
  >
    <div class="flex flex-col gap-3 sm:flex-row">
      <canvas
        ref="canvas"
        class="aspect-square w-full max-w-[512px] cursor-crosshair rounded border"
        data-testid="map-canvas"
        @click="pick"
      />
      <div class="flex-1 space-y-2">
        <p class="text-xs text-muted-foreground">
          Podróż tylko fizyczna. Kliknij mapę, by wyznaczyć cel — strzałka na minimapie wskaże kierunek. Autopilot prowadzi po drodze (czas może płynąć ×3), zagrożenie go przerywa.
        </p>
        <div
          v-if="view.goal"
          class="flex items-center justify-between rounded border border-sky-400/60 p-2 text-xs"
          data-testid="map-goal"
        >
          <span>Cel: {{ view.goal.label }}</span>
          <Button
            v-if="view.goal.kind === 'waypoint'"
            size="xs"
            variant="outline"
            data-testid="map-clear-goal"
            @click="game.clearWaypoint()"
          >
            Usuń
          </Button>
        </div>
        <div
          v-for="s in view.settlements"
          :key="s.id"
          class="flex items-center justify-between gap-1 rounded border p-2 text-xs"
        >
          <span>{{ s.name }} ({{ s.size }}) · {{ s.km }} km<span
            v-if="!s.visited"
            class="text-muted-foreground"
          > · nieodwiedzona</span></span>
          <span class="flex gap-1">
            <Button
              size="xs"
              variant="outline"
              :data-testid="`waypoint-${s.id}`"
              @click="game.setWaypoint(s.x, s.z, s.name)"
            >
              Cel
            </Button>
            <Button
              size="xs"
              :data-testid="`autopilot-${s.id}`"
              @click="auto(s.id)"
            >
              Autopilot
            </Button>
          </span>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
