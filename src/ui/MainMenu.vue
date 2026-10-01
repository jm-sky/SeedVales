<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseSeed } from '@/game/core/rng'
import { deleteSave, listSaves, type SaveMeta } from '@/game/save/db'
import { formatClock, formatDate } from '@/game/sim/time'
import { GEN_VERSION } from '@/game/world/types'
import { loadSettings, saveSettings } from '@/lib/settings'
import type { StartRequest } from './types'
import type { QualityProfile } from '@/game/render/Renderer'

const emit = defineEmits<{ start: [StartRequest] }>()
const seedText = ref(new URLSearchParams(location.search).get('seed') ?? '1337')
const touch = matchMedia('(pointer: coarse)').matches
const quality = ref<QualityProfile>(loadSettings(touch).quality)
const saves = ref<SaveMeta[]>([])
/** Known generator mismatch → the save cannot be loaded (checked again on load). */
const incompatible = (s: SaveMeta) => s.genVersion !== GEN_VERSION

onMounted(async () => {
  try {
    saves.value = await listSaves()
  } catch {
    saves.value = []
  }
})

function begin(slot?: string, seed?: number) {
  saveSettings({ ...loadSettings(touch), quality: quality.value })
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
        A medieval world simulation with RPG elements.
      </p>
      <div class="mt-6 space-y-3">
        <label class="block text-sm font-medium">World seed</label>
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
            New game
          </Button>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Quality:</span>
          <Button
            v-for="q in (['low', 'medium', 'high'] as const)"
            :key="q"
            size="xs"
            :variant="quality === q ? 'default' : 'outline'"
            @click="quality = q"
          >
            {{ { low: 'low', medium: 'medium', high: 'high' }[q] }}
          </Button>
        </div>
      </div>
      <div
        v-if="saves.length"
        class="mt-6"
      >
        <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Saves
        </h2>
        <ul class="space-y-2">
          <li
            v-for="s in saves"
            :key="s.slot"
            class="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
          >
            <div>
              <div class="font-medium">
                {{ s.name ?? `Seed ${s.seed}` }} — {{ formatDate(s.cal) }} {{ formatClock(s.cal) }}
              </div>
              <div
                v-if="s.name || s.place"
                class="text-xs text-muted-foreground"
              >
                {{ [s.name ? `seed ${s.seed}` : '', s.place].filter(Boolean).join(' · ') }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ new Date(s.savedAt).toLocaleString() }} · {{ Math.round(s.bytes / 1024) }} KB
              </div>
              <div
                v-if="incompatible(s)"
                class="text-xs text-destructive"
              >
                Incompatible world version (v{{ s.genVersion }}) — cannot load
              </div>
            </div>
            <div class="flex gap-1">
              <Button
                size="sm"
                data-testid="load-save"
                :data-slot-name="s.name ?? ''"
                :disabled="incompatible(s)"
                @click="begin(s.slot, s.seed)"
              >
                Load
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
        Controls: WASD + mouse (click to capture the cursor), Shift run, E interact, Tab next target, LMB attack / hold — bow, X switch weapon, K character,
        I inventory, C crafting, B building, Q quick actions, J quests, M map, R combat, Z sneak, T torch,
        F5 save, F3 diagnostics, Esc cancel/menu.
      </p>
    </div>
  </div>
</template>
