<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'
import { type AmmoKind, itemDef } from '@/game/data/items'
import { weaponChoices } from '@/game/sim/loadout'
import type { WeaponKind } from '@/game/sim/types'

const KINDS: { kind: WeaponKind; label: string }[] = [
  { kind: 'melee', label: 'Broń do walki wręcz' },
  { kind: 'ranged', label: 'Broń dystansowa' },
]
const AMMO_NAMES: Record<AmmoKind, string> = { arrow: 'strzały', bolt: 'bełty', stone: 'kamienie' }
const { game, version } = useGameStrict()
const v = computed(() => {
  void version.value
  const sim = game.value.sim
  return { choices: weaponChoices(sim), primary: sim.state.px.primary ?? {}, main: sim.player.eq.main?.id }
})
const stats = (id: string) => {
  const w = itemDef(id).weapon!
  return w.kind === 'melee' ? `obr. ${w.damage}, zasięg ${w.reach} m` : `obr. ${w.damage}, amunicja: ${w.ammo ? AMMO_NAMES[w.ammo] : '—'}`
}
</script>

<template>
  <div
    class="space-y-4"
    data-testid="character-weapons"
  >
    <p class="text-xs text-muted-foreground">
      Klawisz X (mobile: przycisk „Broń”) przełącza między bronią podstawową wręcz i dystansową.
    </p>
    <div
      v-for="k in KINDS"
      :key="k.kind"
    >
      <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        {{ k.label }}
      </h3>
      <p v-if="!v.choices[k.kind].length">
        Nie masz takiej broni.
      </p>
      <div
        v-for="id in v.choices[k.kind]"
        :key="id"
        class="flex items-center justify-between gap-2 border-b py-1"
      >
        <span>{{ itemDef(id).name }} <span class="text-xs text-muted-foreground">({{ stats(id) }}){{ v.main === id ? ' · w ręce' : '' }}</span></span>
        <Button
          size="xs"
          :variant="v.primary[k.kind] === id ? 'default' : 'outline'"
          :data-testid="`primary-${k.kind}-${id}`"
          @click="game.setPrimaryWeapon(k.kind, id)"
        >
          {{ v.primary[k.kind] === id ? 'Podstawowa' : 'Ustaw jako podstawową' }}
        </Button>
      </div>
    </div>
  </div>
</template>
