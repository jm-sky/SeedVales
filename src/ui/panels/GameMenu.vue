<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import PanelFrame from './PanelFrame.vue'

const emit = defineEmits<{ quit: [] }>()
const { game } = useGameStrict()
async function saveQuit() {
  await game.value.save()
  emit('quit')
}
</script>

<template>
  <PanelFrame
    title="Menu"
    @close="game.closePanel()"
  >
    <div class="grid gap-2">
      <Button
        data-testid="menu-save"
        @click="game.save()"
      >
        Zapisz grę
      </Button>
      <Button
        variant="outline"
        data-testid="menu-save-quit"
        @click="saveQuit"
      >
        Zapisz i wyjdź do menu
      </Button>
      <Button
        variant="ghost"
        @click="emit('quit')"
      >
        Wyjdź bez zapisu
      </Button>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <Button
          v-for="p in (['inventory', 'craft', 'build', 'quests', 'map', 'quick'] as const)"
          :key="p"
          variant="secondary"
          size="sm"
          @click="game.togglePanel(p)"
        >
          {{ { inventory: 'Ekwipunek', craft: 'Wytwarzanie', build: 'Budowa', quests: 'Zadania', map: 'Mapa', quick: 'Szybkie akcje' }[p] }}
        </Button>
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        WASD/strzałki — ruch · mysz — kamera (kliknij w grę) · kółko — zoom · Shift — bieg · E — interakcja · LPM — atak
        (przytrzymaj z łukiem) · R — walka · Z — skradanie · T — pochodnia · H — bandaż · F3 — diagnostyka · F5 — zapis.
      </p>
    </div>
  </PanelFrame>
</template>
