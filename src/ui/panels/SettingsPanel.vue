<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { applyUiPrefs, type GameSettings, loadSettings, saveSettings, type TextScale, type Volumes } from '@/lib/settings'
import PanelFrame from './PanelFrame.vue'
import type { QualityProfile } from '@/game/render/quality'

const { game } = useGameStrict()
const s = ref<GameSettings>({ ...loadSettings(game.value.isTouch), quality: game.value.renderer.quality })
const QUALITIES: { id: QualityProfile; label: string; hint: string }[] = [
  { id: 'low', label: 'Low', hint: 'no shadows, shorter view distance — phones' },
  { id: 'medium', label: 'Medium', hint: 'shadows, 1 km view distance' },
  { id: 'high', label: 'High', hint: 'more vegetation and detail, 1.4 km view distance' },
]
const TEXT_SIZES: { id: TextScale; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Large' },
  { id: 'xlarge', label: 'Extra large' },
]
const VOLUMES: { id: keyof Volumes; label: string }[] = [
  { id: 'master', label: 'Master volume' },
  { id: 'ambient', label: 'Ambient (wind, waves, rain)' },
  { id: 'effects', label: 'Effects (steps, work, combat, animals)' },
  { id: 'voices', label: 'Voices (villagers)' },
]

watch(s, (v) => {
  saveSettings(v)
  applyUiPrefs(v)
  game.value.applySettings(v)
}, { deep: true })
</script>

<template>
  <PanelFrame
    title="Settings"
    @close="game.togglePanel('menu')"
  >
    <div class="grid gap-4 text-sm">
      <section>
        <h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Graphics quality
        </h3>
        <div class="grid gap-1">
          <Button
            v-for="q in QUALITIES"
            :key="q.id"
            size="sm"
            class="justify-between"
            :variant="s.quality === q.id ? 'default' : 'outline'"
            :data-testid="`quality-${q.id}`"
            @click="s.quality = q.id"
          >
            <span>{{ q.label }}</span>
            <span class="text-xs opacity-70">{{ q.hint }}</span>
          </Button>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          Changes apply immediately (anti-aliasing — after restarting the game).
        </p>
      </section>
      <section>
        <h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Text size
        </h3>
        <div class="flex gap-1">
          <Button
            v-for="t in TEXT_SIZES"
            :key="t.id"
            size="sm"
            :variant="s.textScale === t.id ? 'default' : 'outline'"
            :data-testid="`textsize-${t.id}`"
            @click="s.textScale = t.id"
          >
            {{ t.label }}
          </Button>
        </div>
      </section>
      <section>
        <h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Controls
        </h3>
        <label class="flex items-center gap-2 text-xs">
          <input
            v-model="s.guardToggle"
            type="checkbox"
            data-testid="guard-toggle"
          />
          Block toggles on press (instead of holding)
        </label>
      </section>
      <section class="grid gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sound
        </h3>
        <label
          v-for="v in VOLUMES"
          :key="v.id"
          class="grid gap-1"
        >
          <span class="flex justify-between text-xs">
            <span>{{ v.label }}</span>
            <span>{{ Math.round(s.volume[v.id] * 100) }}%</span>
          </span>
          <input
            v-model.number="s.volume[v.id]"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="accent-primary"
            :data-testid="`volume-${v.id}`"
          />
        </label>
      </section>
    </div>
  </PanelFrame>
</template>
