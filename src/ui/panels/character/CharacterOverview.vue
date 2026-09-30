<script setup lang="ts">
import { computed } from 'vue'
import { useGameStrict } from '@/composables/useGame'
import { BODY_PARTS, type BodyPart, type IllnessKind } from '@/game/sim/types'
import { hp } from '@/game/sim/vitals'
import BodyDiagram from './BodyDiagram.vue'

const ILLNESS: Record<IllnessKind, string> = { stomach: 'Zatrucie pokarmowe', poison: 'Zatrucie trucizną', rabies: 'Wścieklizna' }
const PART: Record<BodyPart, string> = { head: 'Głowa', torso: 'Tułów', gut: 'Brzuch', larm: 'Lewa ręka', rarm: 'Prawa ręka', lleg: 'Lewa noga', rleg: 'Prawa noga' }

const { game, version } = useGameStrict()
const v = computed(() => {
  void version.value
  const p = game.value.sim.player
  const vit = p.vitals
  const damage = Object.fromEntries(BODY_PARTS.map((b) => [b, vit.parts[b] / (vit.maxHp * 0.35)])) as Record<BodyPart, number>
  return {
    name: p.name,
    money: p.money,
    hp: Math.max(0, hp(vit)),
    maxHp: vit.maxHp,
    damage,
    hurt: BODY_PARTS.filter((b) => vit.parts[b] > 0.5).map((b) => `${PART[b]} (${Math.round(vit.parts[b])})`),
    needs: [
      ['Sytość', vit.hunger],
      ['Nawodnienie', vit.thirst],
      ['Wigor', vit.vigor],
      ['Stamina', vit.stamina],
    ] as const,
    illness: vit.illness ? `${ILLNESS[vit.illness.kind]} — ${Math.round(vit.illness.severity)}%, jeszcze ok. ${Math.ceil(vit.illness.hoursLeft)} h` : '',
    bleeding: vit.bleeding > 0,
    convalescence: vit.convalescenceH > 0 ? Math.ceil(vit.convalescenceH) : 0,
  }
})
</script>

<template>
  <div
    class="flex flex-wrap gap-4"
    data-testid="character-overview"
  >
    <BodyDiagram :damage="v.damage" />
    <div class="min-w-48 flex-1 space-y-2">
      <div class="text-lg font-semibold">
        {{ v.name }}
      </div>
      <div class="text-muted-foreground">
        Zdrowie {{ Math.round(v.hp) }} / {{ v.maxHp }} · Pieniądze {{ v.money }} m
      </div>
      <div
        v-for="[label, val] in v.needs"
        :key="label"
        class="flex items-center gap-2"
      >
        <span class="w-24">{{ label }}</span>
        <div class="h-1.5 flex-1 overflow-hidden rounded bg-white/15">
          <div
            class="h-full bg-primary"
            :style="{ width: `${Math.max(0, Math.min(100, val))}%` }"
          />
        </div>
      </div>
      <h3 class="pt-2 text-xs font-semibold uppercase text-muted-foreground">
        Stan zdrowia
      </h3>
      <p data-testid="character-illness">
        {{ v.illness || 'Brak chorób.' }}
      </p>
      <p v-if="v.bleeding">
        Krwawienie — opatrz rany (bandaż).
      </p>
      <p v-if="v.convalescence">
        Rekonwalescencja: jeszcze ok. {{ v.convalescence }} h.
      </p>
      <p v-if="v.hurt.length">
        Obrażenia: {{ v.hurt.join(', ') }}
      </p>
    </div>
  </div>
</template>
