<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { Biome } from '@/game/world/types'
import PanelFrame from './PanelFrame.vue'

const { game } = useGameStrict()
const canvas = ref<HTMLCanvasElement>()
const COLORS: Record<number, [number, number, number]> = {
  [Biome.Ocean]: [40, 70, 110], [Biome.Beach]: [210, 195, 140], [Biome.Meadow]: [110, 150, 60], [Biome.Steppe]: [170, 160, 90],
  [Biome.Swamp]: [80, 90, 50], [Biome.ForestDeciduous]: [70, 115, 45], [Biome.ForestMixed]: [60, 100, 45], [Biome.ForestConifer]: [45, 80, 45],
  [Biome.Mountain]: [120, 115, 110], [Biome.Snow]: [235, 240, 245], [Biome.Water]: [60, 110, 160],
}

onMounted(() => {
  const g = game.value
  const w = g.sim.world
  const c = canvas.value!
  const S = 512
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(S, S)
  const step = (w.n - 1) / S
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const k = Math.floor(y * step) * w.n + Math.floor(x * step)
      const col = COLORS[w.biome[k]!] ?? [0, 0, 0]
      const shade = Math.max(0.6, Math.min(1.2, 0.85 + w.height[k]! / 400))
      const o = (y * S + x) * 4
      img.data[o] = col[0] * shade
      img.data[o + 1] = col[1] * shade
      img.data[o + 2] = col[2] * shade
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const sc = S / w.size
  ctx.strokeStyle = '#8b6a3e'
  ctx.lineWidth = 2
  for (const r of w.roads) {
    ctx.beginPath()
    r.points.forEach((p, i) => (i ? ctx.lineTo(p.x * sc, p.z * sc) : ctx.moveTo(p.x * sc, p.z * sc)))
    ctx.stroke()
  }
  ctx.font = 'bold 12px sans-serif'
  for (const s of w.settlements) {
    ctx.fillStyle = '#f5d88a'
    ctx.fillRect(s.x * sc - 4, s.z * sc - 4, 8, 8)
    ctx.fillStyle = '#fff'
    ctx.fillText(`${s.name} (${s.size})`, s.x * sc + 6, s.z * sc - 6)
  }
  const p = g.sim.player
  ctx.fillStyle = '#ff4040'
  ctx.beginPath()
  ctx.arc(p.x * sc, p.z * sc, 5, 0, Math.PI * 2)
  ctx.fill()
})

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
        class="aspect-square w-full max-w-[512px] rounded border"
      />
      <div class="flex-1 space-y-2">
        <p class="text-xs text-muted-foreground">
          Podróż tylko fizyczna. Autopilot prowadzi po drodze (czas może płynąć ×3), zagrożenie go przerywa.
        </p>
        <div
          v-for="s in game.sim.world.settlements"
          :key="s.id"
          class="flex items-center justify-between rounded border p-2 text-xs"
        >
          <span>{{ s.name }} ({{ s.size }}) · {{ (Math.hypot(s.x - game.sim.player.x, s.z - game.sim.player.z) / 1000).toFixed(1) }} km</span>
          <Button
            size="xs"
            :data-testid="`autopilot-${s.id}`"
            @click="auto(s.id)"
          >
            Autopilot
          </Button>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>
