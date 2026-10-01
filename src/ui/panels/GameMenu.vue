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
        Save game{{ game.saveName ? ` (“${game.saveName}”)` : '' }}
      </Button>
      <form
        class="flex gap-2"
        @submit.prevent="saveAs"
      >
        <Input
          v-model="name"
          maxlength="40"
          placeholder="Save name"
          data-testid="save-name"
        />
        <Button
          type="submit"
          variant="outline"
          data-testid="menu-save-as"
        >
          Save as new
        </Button>
      </form>
      <Button
        variant="outline"
        data-testid="menu-save-quit"
        @click="saveQuit"
      >
        Save and quit to menu
      </Button>
      <Button
        variant="outline"
        data-testid="menu-settings"
        @click="game.togglePanel('settings')"
      >
        Settings
      </Button>
      <Button
        v-if="!confirmNew"
        variant="outline"
        data-testid="menu-new-game"
        @click="confirmNew = true"
      >
        New game…
      </Button>
      <div
        v-else
        class="grid gap-2 rounded border border-destructive/50 p-2"
      >
        <p class="text-xs">
          Unsaved progress will be lost. Start over?
        </p>
        <div class="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            data-testid="new-game-same"
            @click="emit('restart', game.sim.state.seed)"
          >
            Same world
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="new-game-random"
            @click="emit('restart', null)"
          >
            Random world
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          @click="confirmNew = false"
        >
          Cancel
        </Button>
      </div>
      <Button
        variant="ghost"
        @click="emit('quit')"
      >
        Quit without saving
      </Button>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <Button
          v-for="p in (['inventory', 'character', 'craft', 'build', 'quests', 'map', 'quick'] as const)"
          :key="p"
          variant="secondary"
          size="sm"
          @click="game.togglePanel(p)"
        >
          {{ { inventory: 'Inventory', character: 'Character', craft: 'Crafting', build: 'Building', quests: 'Quests', map: 'Map', quick: 'Quick actions' }[p] }}
        </Button>
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        WASD/arrows — move · mouse — camera (click the game) · wheel — zoom · Shift — run · E — interact · Tab — next target · LMB — attack
        (hold with a bow) · X — switch weapon · K — character · R — combat · Z — sneak · T — torch · H — bandage · F3 — diagnostics · F5 — save.
      </p>
    </div>
  </PanelFrame>
</template>
