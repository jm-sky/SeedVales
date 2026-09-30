<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { type GameSettings, loadSettings, saveSettings, type Volumes } from '@/lib/settings'
import PanelFrame from './PanelFrame.vue'
import type { QualityProfile } from '@/game/render/quality'

const { game } = useGameStrict()
const s = ref<GameSettings>({ ...loadSettings(game.value.isTouch), quality: game.value.renderer.quality })
const QUALITIES: { id: QualityProfile; label: string; hint: string }[] = [
  { id: 'low', label: 'Niska', hint: 'bez cieni, krótszy zasięg — telefony' },
  { id: 'medium', label: 'Średnia', hint: 'cienie, zasięg 1 km' },
  { id: 'high', label: 'Wysoka', hint: 'więcej roślinności i detali, zasięg 1,4 km' },
]
const VOLUMES: { id: keyof Volumes; label: string }[] = [
  { id: 'master', label: 'Głośność ogólna' },
  { id: 'ambient', label: 'Otoczenie (wiatr, fale, deszcz)' },
  { id: 'effects', label: 'Efekty (walka, zwierzęta, ptaki)' },
]

watch(s, (v) => {
  saveSettings(v)
  game.value.applySettings(v)
}, { deep: true })
</script>

<template>
  <PanelFrame
    title="Ustawienia"
    @close="game.togglePanel('menu')"
  >
    <div class="grid gap-4 text-sm">
      <section>
        <h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Jakość grafiki
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
          Zmiana działa od razu (wygładzanie krawędzi — po ponownym uruchomieniu gry).
        </p>
      </section>
      <section class="grid gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dźwięk
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
