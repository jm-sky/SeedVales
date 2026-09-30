<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import CharacterOverview from './character/CharacterOverview.vue'
import CharacterReputation from './character/CharacterReputation.vue'
import CharacterSkills from './character/CharacterSkills.vue'
import CharacterWeapons from './character/CharacterWeapons.vue'
import { CHARACTER_TABS, type CharacterTab } from './character/types'
import PanelFrame from './PanelFrame.vue'

const tab = ref<CharacterTab>('overview')
const { game } = useGameStrict()
</script>

<template>
  <PanelFrame
    title="Postać"
    wide
    @close="game.closePanel()"
  >
    <div class="mb-3 flex flex-wrap gap-2">
      <Button
        v-for="t in CHARACTER_TABS"
        :key="t.id"
        size="sm"
        :variant="tab === t.id ? 'default' : 'outline'"
        :data-testid="`char-tab-${t.id}`"
        @click="tab = t.id"
      >
        {{ t.label }}
      </Button>
    </div>
    <CharacterOverview v-if="tab === 'overview'" />
    <CharacterSkills v-else-if="tab === 'skills'" />
    <CharacterReputation v-else-if="tab === 'reputation'" />
    <CharacterWeapons v-else />
  </PanelFrame>
</template>
