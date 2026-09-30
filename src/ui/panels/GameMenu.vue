<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGameStrict } from '@/composables/useGame'
import PanelFrame from './PanelFrame.vue'

const emit = defineEmits<{ quit: []; restart: [seed: number | null] }>()
const { game } = useGameStrict()
const name = ref(game.value.saveName ?? '')
const confirmNew = ref(false)
async function saveQuit() {
  await game.value.save()
  emit('quit')
}
async function saveAs() {
  if (await game.value.saveAs(name.value)) game.value.closePanel()
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
        Zapisz grę{{ game.saveName ? ` („${game.saveName}”)` : '' }}
      </Button>
      <form
        class="flex gap-2"
        @submit.prevent="saveAs"
      >
        <Input
          v-model="name"
          maxlength="40"
          placeholder="Nazwa zapisu"
          data-testid="save-name"
        />
        <Button
          type="submit"
          variant="outline"
          data-testid="menu-save-as"
        >
          Zapisz jako nowy
        </Button>
      </form>
      <Button
        variant="outline"
        data-testid="menu-save-quit"
        @click="saveQuit"
      >
        Zapisz i wyjdź do menu
      </Button>
      <Button
        variant="outline"
        data-testid="menu-settings"
        @click="game.togglePanel('settings')"
      >
        Ustawienia
      </Button>
      <Button
        v-if="!confirmNew"
        variant="outline"
        data-testid="menu-new-game"
        @click="confirmNew = true"
      >
        Nowa gra…
      </Button>
      <div
        v-else
        class="grid gap-2 rounded border border-destructive/50 p-2"
      >
        <p class="text-xs">
          Niezapisany postęp przepadnie. Zacząć od nowa?
        </p>
        <div class="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            data-testid="new-game-same"
            @click="emit('restart', game.sim.state.seed)"
          >
            Ten sam świat
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="new-game-random"
            @click="emit('restart', null)"
          >
            Losowy świat
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          @click="confirmNew = false"
        >
          Anuluj
        </Button>
      </div>
      <Button
        variant="ghost"
        @click="emit('quit')"
      >
        Wyjdź bez zapisu
      </Button>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <Button
          v-for="p in (['inventory', 'character', 'craft', 'build', 'quests', 'map', 'quick'] as const)"
          :key="p"
          variant="secondary"
          size="sm"
          @click="game.togglePanel(p)"
        >
          {{ { inventory: 'Ekwipunek', character: 'Postać', craft: 'Wytwarzanie', build: 'Budowa', quests: 'Zadania', map: 'Mapa', quick: 'Szybkie akcje' }[p] }}
        </Button>
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        WASD/strzałki — ruch · mysz — kamera (kliknij w grę) · kółko — zoom · Shift — bieg · E — interakcja · Tab — następny cel · LPM — atak
        (przytrzymaj z łukiem) · X — zmiana broni · K — postać · R — walka · Z — skradanie · T — pochodnia · H — bandaż · F3 — diagnostyka · F5 — zapis.
      </p>
    </div>
  </PanelFrame>
</template>
