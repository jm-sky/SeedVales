<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseSeed } from '@/game/core/rng'
import { deleteSave, listSaves, type SaveMeta } from '@/game/save/db'
import { formatClock, formatDate } from '@/game/sim/time'
import type { StartRequest } from './types'
import type { QualityProfile } from '@/game/render/Renderer'

const emit = defineEmits<{ start: [StartRequest] }>()
const seedText = ref(new URLSearchParams(location.search).get('seed') ?? '1337')
const quality = ref<QualityProfile>((localStorage.getItem('sv-quality') as QualityProfile) || (matchMedia('(pointer: coarse)').matches ? 'low' : 'medium'))
const saves = ref<SaveMeta[]>([])

onMounted(async () => {
  try {
    saves.value = await listSaves()
  } catch {
    saves.value = []
  }
})

function begin(slot?: string, seed?: number) {
  localStorage.setItem('sv-quality', quality.value)
  emit('start', { seed: seed ?? parseSeed(seedText.value), slot, quality: quality.value })
}

async function remove(slot: string) {
  await deleteSave(slot)
  saves.value = await listSaves()
}
</script>

<template>
  <div class="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,#3b3226,#15120e)] p-4">
    <div class="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
      <h1 class="text-3xl font-bold tracking-wide text-primary">
        SeedVales
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Średniowieczna symulacja świata z elementami RPG.
      </p>
      <div class="mt-6 space-y-3">
        <label class="block text-sm font-medium">Ziarno świata (seed)</label>
        <div class="flex gap-2">
          <Input
            v-model="seedText"
            data-testid="seed-input"
            class="flex-1"
          />
          <Button
            data-testid="new-game"
            @click="begin()"
          >
            Nowa gra
          </Button>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Jakość:</span>
          <Button
            v-for="q in (['low', 'medium', 'high'] as const)"
            :key="q"
            size="xs"
            :variant="quality === q ? 'default' : 'outline'"
            @click="quality = q"
          >
            {{ { low: 'niska', medium: 'średnia', high: 'wysoka' }[q] }}
          </Button>
        </div>
      </div>
      <div
        v-if="saves.length"
        class="mt-6"
      >
        <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Zapisy
        </h2>
        <ul class="space-y-2">
          <li
            v-for="s in saves"
            :key="s.slot"
            class="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
          >
            <div>
              <div class="font-medium">
                Seed {{ s.seed }} — {{ formatDate(s.cal) }} {{ formatClock(s.cal) }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ new Date(s.savedAt).toLocaleString() }} · {{ Math.round(s.bytes / 1024) }} KB
              </div>
            </div>
            <div class="flex gap-1">
              <Button
                size="sm"
                data-testid="load-save"
                @click="begin(s.slot, s.seed)"
              >
                Wczytaj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                @click="remove(s.slot)"
              >
                ✕
              </Button>
            </div>
          </li>
        </ul>
      </div>
      <p class="mt-6 text-xs text-muted-foreground">
        Sterowanie: WASD + mysz (kliknij, by złapać kursor), Shift bieg, E interakcja, LPM atak / przytrzymaj — łuk,
        I ekwipunek, C wytwarzanie, B budowa, Q szybkie akcje, J zadania, M mapa, R walka, Z skradanie, T pochodnia,
        F5 zapis, F3 diagnostyka, Esc przerwij/menu.
      </p>
    </div>
  </div>
</template>
