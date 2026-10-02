<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { formatCoins } from '@/game/data/items'
import { hirePrice, hireRefusal, RISK_NAMES, TASK_NAMES } from '@/game/sim/npc/companions'
import PanelFrame from './PanelFrame.vue'
import type { CompanionRisk, CompanionTask } from '@/game/sim/types'

const DAYS = [1, 3, 7] as const
const TASKS: CompanionTask[] = ['escort', 'guard']
const RISKS: CompanionRisk[] = ['low', 'medium', 'high']

const { game, version } = useGameStrict()
const days = ref<number>(1)
const task = ref<CompanionTask>('escort')
const risk = ref<CompanionRisk>('low')

const d = computed(() => {
  void version.value
  const g = game.value
  const r = g.panelRef
  const npc = r?.type === 'npc' ? g.sim.human(r.id) : undefined
  if (!npc) return null
  const price = hirePrice(npc, task.value, risk.value, days.value)
  return { npc, price, refusal: hireRefusal(g.sim, npc, task.value, risk.value), money: g.sim.player.money }
})

function hire() {
  game.value.hire(d.value!.npc, task.value, risk.value, days.value)
}
</script>

<template>
  <PanelFrame
    v-if="d"
    :title="`Hire ${d.npc.name}`"
    @close="game.closePanel()"
  >
    <div class="grid gap-3 text-sm">
      <div>
        <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Duration
        </div>
        <div class="flex gap-1">
          <Button
            v-for="n in DAYS"
            :key="n"
            size="xs"
            :variant="days === n ? 'default' : 'outline'"
            :data-testid="`hire-days-${n}`"
            @click="days = n"
          >
            {{ n }} {{ n === 1 ? 'day' : 'days' }}
          </Button>
        </div>
      </div>
      <div>
        <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Task
        </div>
        <div class="flex gap-1">
          <Button
            v-for="t in TASKS"
            :key="t"
            size="xs"
            :variant="task === t ? 'default' : 'outline'"
            :data-testid="`hire-task-${t}`"
            @click="task = t"
          >
            {{ TASK_NAMES[t] }}
          </Button>
        </div>
      </div>
      <div>
        <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Risk
        </div>
        <div class="flex gap-1">
          <Button
            v-for="r in RISKS"
            :key="r"
            size="xs"
            :variant="risk === r ? 'default' : 'outline'"
            :data-testid="`hire-risk-${r}`"
            @click="risk = r"
          >
            {{ RISK_NAMES[r] }}
          </Button>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <span>Price: <b class="text-quest">{{ formatCoins(d.price) }}</b> (you have {{ formatCoins(d.money) }})</span>
        <Button
          size="sm"
          :disabled="!!d.refusal || d.money < d.price"
          data-testid="hire-confirm"
          @click="hire"
        >
          Hire
        </Button>
      </div>
      <p
        v-if="d.refusal"
        class="text-xs text-destructive"
      >
        {{ d.refusal }}
      </p>
    </div>
  </PanelFrame>
</template>
