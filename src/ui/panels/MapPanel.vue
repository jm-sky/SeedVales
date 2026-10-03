<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { isExplored, isVisited, journeyEstimate, knownSettlements, navGoal, questGoal } from '@/game/sim/navigation'
import { placeLabel } from '@/ui/map/labelPlacement'
import { drawArrow, fogMask, worldMapImage } from '@/ui/map/worldMapImage'
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
    journey: (() => {
      const g = navGoal(sim)
      return g ? journeyEstimate(sim, g) : null
    })(),
    settlements: knownSettlements(sim).map((s) => ({ ...s, visited: isVisited(sim, s.id), km: (Math.hypot(s.x - p.x, s.z - p.z) / 1000).toFixed(1) })),
    quests: sim.state.quests.filter((q) => q.status === 'active').map((q) => questGoal(sim, q)).filter((g) => !!g),
    authored: game.value.questMarkers(),
    pins: sim.state.px.pins ?? [],
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
  ctx.drawImage(fogMask(sim), 0, 0, S, S)
  const sc = S / w.size
  ctx.font = 'bold 12px sans-serif'
  for (const s of view.value.settlements) {
    ctx.fillStyle = s.visited ? '#f5d88a' : '#b8b0a0'
    ctx.fillRect(s.x * sc - 4, s.z * sc - 4, 8, 8)
    ctx.fillStyle = s.visited ? '#fff' : '#ddd'
    const text = `${s.name}${s.visited ? '' : ' ?'}`
    const at = placeLabel(s.x * sc, s.z * sc, ctx.measureText(text).width, S)
    ctx.fillText(text, at.x, at.y)
  }
  // Landmarks (WORLD-11) appear once their cell is explored (fog of war, MAP-01).
  ctx.font = '11px sans-serif'
  for (const l of w.landmarks) {
    if (!isExplored(sim, l.x, l.z)) continue
    const lx = l.x * sc
    const lz = l.z * sc
    ctx.fillStyle = '#9ec5d8'
    ctx.beginPath()
    ctx.moveTo(lx, lz - 5)
    ctx.lineTo(lx + 5, lz)
    ctx.lineTo(lx, lz + 5)
    ctx.lineTo(lx - 5, lz)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#d6e6ee'
    const at = placeLabel(lx, lz, ctx.measureText(l.name).width, S, 8, 4)
    ctx.fillText(l.name, at.x, at.y)
  }
  // Caves (WORLD-05): entrance marker, only in explored cells.
  for (const cv of w.caves) {
    if (!isExplored(sim, cv.x, cv.z)) continue
    const cx = cv.x * sc
    const cz = cv.z * sc
    ctx.fillStyle = '#3a3128'
    ctx.beginPath()
    ctx.arc(cx, cz, 5, Math.PI, 0)
    ctx.lineTo(cx + 5, cz + 4)
    ctx.lineTo(cx - 5, cz + 4)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#d9c9a8'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#e6d9bf'
    ctx.fillText(cv.name, cx + 8, cz + 4)
  }
  for (const q of view.value.quests) {
    ctx.fillStyle = '#ff5a3c'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('!', q.x * sc - 3, q.z * sc + 6)
  }
  // Authored quests (quests--001): the current stage's place, only in explored cells (filtered by the sim).
  for (const q of view.value.authored) {
    ctx.fillStyle = '#ffd24a'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('?', q.x * sc - 4, q.z * sc + 6)
  }
  // Player notes (P-08): drawn only in explored cells (always true for where they were dropped; kept as the fog rule).
  ctx.font = '11px sans-serif'
  for (const n of view.value.pins) {
    if (!isExplored(sim, n.x, n.z)) continue
    ctx.fillStyle = '#7fe08a'
    ctx.fillRect(n.x * sc - 3, n.z * sc - 3, 6, 6)
    ctx.fillStyle = '#d6f5da'
    const at = placeLabel(n.x * sc, n.z * sc, ctx.measureText(n.label).width, S, 8, 4)
    ctx.fillText(n.label, at.x, at.y)
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

const pinLabel = ref('')

function addPin() {
  game.value.addMapPin(pinLabel.value)
  pinLabel.value = ''
}

function auto(id: number) {
  game.value.showToast(game.value.autopilotTo(id))
}
</script>

<template>
  <PanelFrame
    title="Map (traveller's knowledge)"
    wide
    @close="game.closePanel()"
  >
    <div class="flex flex-col gap-3 sm:flex-row">
      <canvas
        ref="canvas"
        class="aspect-square w-[min(100%,512px,52dvh)] shrink-0 self-start cursor-crosshair rounded border"
        data-testid="map-canvas"
        @click="pick"
      />
      <div class="flex-1 space-y-2">
        <p class="text-xs text-muted-foreground">
          The map shows only explored land. Travel is on foot only. Click the map to set a target — the minimap arrow points the way. Autopilot follows the road (time may run ×3); danger interrupts it.
        </p>
        <div
          v-if="view.goal"
          class="flex items-center justify-between rounded border border-sky-400/60 p-2 text-xs"
          data-testid="map-goal"
        >
          <span>
            Target: {{ view.goal.label }}
            <span
              v-if="view.journey"
              class="block text-muted-foreground"
              :class="view.journey.covered ? '' : 'text-bad'"
              data-testid="map-journey"
            >
              ~{{ view.journey.km.toFixed(1) }} km · {{ Math.round(view.journey.hours) }} h on foot · costs ≈ −{{ Math.round(view.journey.hungerCost) }} hunger, −{{ Math.round(view.journey.thirstCost) }} thirst · you carry food for +{{ view.journey.foodPoints }} and {{ view.journey.drinks }} drinks{{ view.journey.covered ? '' : ' — not enough for the way' }}
            </span>
          </span>
          <Button
            v-if="view.goal.kind === 'waypoint'"
            size="xs"
            variant="outline"
            data-testid="map-clear-goal"
            @click="game.clearWaypoint()"
          >
            Clear
          </Button>
        </div>
        <div class="space-y-1 rounded border p-2 text-xs">
          <div class="flex gap-1">
            <input
              v-model="pinLabel"
              class="min-w-0 flex-1 rounded border bg-background px-1"
              maxlength="24"
              placeholder="Note for this spot"
              data-testid="map-pin-label"
              @keydown.stop
            />
            <Button
              size="xs"
              variant="outline"
              data-testid="map-pin-add"
              @click="addPin()"
            >
              Mark here
            </Button>
          </div>
          <div
            v-for="n in view.pins"
            :key="n.id"
            class="flex items-center justify-between gap-1"
          >
            <span>{{ n.label }} · {{ (Math.hypot(n.x - game.sim.player.x, n.z - game.sim.player.z) / 1000).toFixed(1) }} km</span>
            <span class="flex gap-1">
              <Button
                size="xs"
                variant="outline"
                @click="game.setWaypoint(n.x, n.z, n.label)"
              >
                Target
              </Button>
              <Button
                size="xs"
                variant="outline"
                :data-testid="`map-pin-remove-${n.id}`"
                @click="game.removeMapPin(n.id)"
              >
                ×
              </Button>
            </span>
          </div>
        </div>
        <div
          v-for="s in view.settlements"
          :key="s.id"
          class="flex items-center justify-between gap-1 rounded border p-2 text-xs"
        >
          <span>{{ s.name }} ({{ s.size }}) · {{ s.km }} km<span
            v-if="!s.visited"
            class="text-muted-foreground"
          > · not visited</span></span>
          <span class="flex gap-1">
            <Button
              size="xs"
              variant="outline"
              :data-testid="`waypoint-${s.id}`"
              @click="game.targetSettlement(s.id)"
            >
              Target
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
