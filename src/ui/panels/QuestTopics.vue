<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useGameStrict } from '@/composables/useGame'

/** Authored quest topics of one NPC (quests--001): one button per quest; picking one plays the dialog node by node. */
const props = defineProps<{ npcId: number }>()
const { game, version } = useGameStrict()
const open = ref<{ questId: string; nodeId: string } | null>(null)

const topics = computed(() => {
  void version.value
  return game.value.questTopics(props.npcId)
})
const say = computed(() => {
  void version.value
  const o = open.value
  return o ? game.value.questSay(o.questId, o.nodeId) : null
})

function pick(questId: string, nodeId: string) {
  open.value = { questId, nodeId }
}
function choose(optionId: string) {
  const o = open.value
  if (!o) return
  const r = game.value.questChoose(o.questId, o.nodeId, optionId)
  open.value = r?.next ? { questId: o.questId, nodeId: r.next } : null
}
</script>

<template>
  <div
    v-if="say && open"
    class="mt-3 rounded-md border p-2"
    data-testid="quest-dialog"
  >
    <h3 class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
      {{ say.title }}
    </h3>
    <p
      v-for="(l, i) in say.lines"
      :key="i"
      class="mt-1"
      :class="l.self ? 'italic text-muted-foreground' : ''"
    >
      <span
        v-if="l.who"
        class="font-semibold"
      >{{ l.who }}: </span>{{ l.text }}
    </p>
    <div class="mt-2 grid gap-1">
      <Button
        v-for="o in say.options"
        :key="o.id"
        size="sm"
        variant="outline"
        class="h-auto justify-start whitespace-normal text-left"
        :disabled="!o.enabled"
        :title="o.reason"
        :data-testid="`quest-opt-${o.id}`"
        @click="choose(o.id)"
      >
        {{ o.text }}<span
          v-if="!o.enabled && o.reason"
          class="ml-1 text-xs text-muted-foreground"
        >({{ o.reason }})</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        data-testid="quest-leave"
        @click="open = null"
      >
        Leave it
      </Button>
    </div>
  </div>
  <div
    v-else-if="topics.length"
    class="mt-3 flex flex-wrap gap-2"
  >
    <Button
      v-for="t in topics"
      :key="t.questId"
      size="sm"
      variant="secondary"
      :data-testid="`quest-topic-${t.questId}`"
      @click="pick(t.questId, t.node)"
    >
      {{ t.label }}
    </Button>
  </div>
</template>
