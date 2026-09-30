<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { navGoal } from '@/game/sim/navigation'
import { drawArrow, worldMapImage } from '@/ui/map/worldMapImage'

/** North-up minimap around the player (UI-04) with an arrow to the waypoint / active quest. */
const props = withDefaults(defineProps<{ size?: number; radius?: number }>(), { size: 160, radius: 220 })
const { game, version } = useGameStrict()
const canvas = ref<HTMLCanvasElement>()

const info = computed(() => {
  void version.value
  const sim = game.value.sim
  const g = navGoal(sim)
  const p = sim.player
  return { goal: g, dist: g ? Math.hypot(g.x - p.x, g.z - p.z) : 0, x: p.x, z: p.z, rot: p.rot }
})

function draw() {
  const c = canvas.value
  if (!c) return
  const sim = game.value.sim
  const N = props.size
  const R = props.radius
  const ctx = c.getContext('2d')!
  const img = worldMapImage(sim.world)
  const sc = img.width / sim.world.size
  const { x, z, rot, goal } = info.value
  const k = N / (2 * R) // canvas px per metre
  ctx.save()
  ctx.clearRect(0, 0, N, N)
  ctx.beginPath()
  ctx.arc(N / 2, N / 2, N / 2 - 1, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#28466e'
  ctx.fillRect(0, 0, N, N)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, (x - R) * sc, (z - R) * sc, 2 * R * sc, 2 * R * sc, 0, 0, N, N)
  const toC = (wx: number, wz: number): [number, number] => [N / 2 + (wx - x) * k, N / 2 + (wz - z) * k]
  ctx.fillStyle = '#5a3b22'
  for (const b of sim.buildingsNear(x, z, R * 1.42)) {
    if (b.kind === 'field' || b.kind === 'bridge') continue
    const [bx, by] = toC(b.x, b.z)
    const s = Math.max(2, Math.max(b.hw, b.hd) * 2 * k)
    ctx.fillRect(bx - s / 2, by - s / 2, s, s)
  }
  if (goal) {
    const [gx, gy] = toC(goal.x, goal.z)
    const r = N / 2 - 9
    const d = Math.hypot(gx - N / 2, gy - N / 2)
    if (d < r) {
      ctx.strokeStyle = '#4fc3ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(gx, gy, 5, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      const a = Math.atan2(goal.x - x, goal.z - z)
      drawArrow(ctx, N / 2 + Math.sin(a) * r, N / 2 + Math.cos(a) * r, a, 7, '#4fc3ff')
    }
  }
  drawArrow(ctx, N / 2, N / 2, rot, 6, '#ff4040')
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(N / 2, N / 2, N / 2 - 1, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText('N', N / 2 - 3, 11)
}

onMounted(() => {
  canvas.value!.width = props.size
  canvas.value!.height = props.size
  draw()
})
watch(info, draw)
</script>

<template>
  <div
    class="flex flex-col items-center gap-0.5"
    data-testid="minimap"
  >
    <canvas
      ref="canvas"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <div
      v-if="info.goal"
      class="max-w-full truncate rounded bg-black/50 px-1.5 text-[11px] text-sky-200"
      data-testid="minimap-goal"
    >
      {{ info.goal.label }} · {{ info.dist < 1000 ? `${Math.round(info.dist)} m` : `${(info.dist / 1000).toFixed(1)} km` }}
    </div>
  </div>
</template>
