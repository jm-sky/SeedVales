<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import BuildPanel from './BuildPanel.vue'
import CraftPanel from './CraftPanel.vue'
import DialogPanel from './DialogPanel.vue'
import GameMenu from './GameMenu.vue'
import InteractMenu from './InteractMenu.vue'
import InventoryPanel from './InventoryPanel.vue'
import MapPanel from './MapPanel.vue'
import OrdersPanel from './OrdersPanel.vue'
import QuestsPanel from './QuestsPanel.vue'
import QuickPanel from './QuickPanel.vue'
import StoragePanel from './StoragePanel.vue'
import TradePanel from './TradePanel.vue'

const emit = defineEmits<{ quit: [] }>()
const { game, version } = useGameStrict()
const panel = computed(() => {
  void version.value
  return game.value.panel
})
</script>

<template>
  <div
    v-if="panel"
    class="absolute inset-0 z-10 bg-black/25"
    @click.self="game.closePanel()"
  >
    <InteractMenu v-if="panel === 'interact'" />
    <InventoryPanel v-else-if="panel === 'inventory'" />
    <CraftPanel v-else-if="panel === 'craft'" />
    <TradePanel v-else-if="panel === 'trade'" />
    <StoragePanel v-else-if="panel === 'storage'" />
    <QuestsPanel v-else-if="panel === 'quests'" />
    <BuildPanel v-else-if="panel === 'build'" />
    <QuickPanel v-else-if="panel === 'quick'" />
    <MapPanel v-else-if="panel === 'map'" />
    <DialogPanel v-else-if="panel === 'dialog'" />
    <OrdersPanel v-else-if="panel === 'orders'" />
    <GameMenu
      v-else-if="panel === 'menu'"
      @quit="emit('quit')"
    />
  </div>
</template>
