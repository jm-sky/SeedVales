/**
 * Authored quest dialog, journal and map markers (docs/design/quests-engine.md §10). Read-only except
 * `questChoose`, which applies the effects of the chosen option. Logic never reads label text: nodes and
 * options are matched by id.
 * @domain quests
 */
import type { QuestDef } from '../data/quests/types'
import type { Sim } from './sim'
import type { AuthoredQuestState } from './types'
import { isExplored } from './navigation'
import { allOf, applyEffects, ctxOf, fillQuestText as fill, questPlaceholders as placeholders, type QuestCtx, readCtxOf, resolveAnchor } from './questCore'
import { questDef, questDefs } from './questEngine'

export interface QuestTopic {
  questId: string
  label: string
  node: string
}

export interface QuestSayLine {
  who: string
  text: string
  /** Narration (no speaker). */
  self: boolean
}

export interface QuestSayOption {
  id: string
  text: string
  enabled: boolean
  reason?: string
}

export interface QuestSay {
  title: string
  lines: QuestSayLine[]
  options: QuestSayOption[]
}

export interface QuestChooseResult {
  /** Node to show next; undefined closes the dialog. */
  next?: string
}

export interface JournalEntry {
  id: string
  title: string
  status: AuthoredQuestState['status']
  /** Text of the current stage (or the ending / lapse for finished quests). */
  text: string
  decision?: string
}

export interface QuestMarker {
  questId: string
  title: string
  x: number
  z: number
}

const talkable = (st: AuthoredQuestState, done: boolean) => st.status === 'offered' || st.status === 'active' || st.status === 'refused' || (st.status === 'done' && done)

/** First matching topic of every quest the NPC takes part in (one button per quest). */
export function questTopics(sim: Sim, npcId: number): QuestTopic[] {
  const out: QuestTopic[] = []
  for (const def of questDefs(sim)) {
    const st = sim.state.authoredQuests[def.id]
    if (!st) continue
    const c = readCtxOf(sim, def, st)
    const t = def.topics.find((tp) => st.cast[tp.slot] === npcId && talkable(st, !!tp.done) && allOf(c, tp.when))
    if (t) out.push({ questId: def.id, label: fill(t.label, placeholders(c)), node: t.node })
  }
  return out
}

/** Resolved lines and options of a node. */
export function questSay(sim: Sim, questId: string, nodeId: string): QuestSay | null {
  const def = questDef(sim, questId)
  const st = sim.state.authoredQuests[questId]
  const node = def?.nodes[nodeId]
  if (!def || !st || !node) return null
  const c = readCtxOf(sim, def, st)
  const ph = placeholders(c)
  const lines = node.lines
    .filter((l) => allOf(c, l.when))
    .map((l) => ({ who: l.who === 'player' ? 'You' : l.who === 'self' ? '' : (ph[l.who] ?? l.who), text: fill(l.text, ph), self: l.who === 'self' }))
  const options: QuestSayOption[] = []
  for (const o of node.options) {
    if (!allOf(c, o.when)) continue
    const ok = allOf(c, o.needs)
    options.push({ id: o.id, text: fill(o.text, ph), enabled: ok, reason: ok ? undefined : o.reason && fill(o.reason, ph) })
  }
  return { title: def.title, lines, options }
}

/** Nodes the quest can be in right now: those of the currently valid topics plus everything their options lead to. */
function reachable(c: QuestCtx): Set<string> {
  const { def, st } = c
  const seen = new Set<string>()
  const todo = def.topics.filter((tp) => talkable(st, !!tp.done) && allOf(c, tp.when)).map((tp) => tp.node)
  while (todo.length) {
    const id = todo.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const o of def.nodes[id]?.options ?? []) if (o.next) todo.push(o.next)
  }
  return seen
}

/** Applies the effects of an enabled option; returns the follow-up node (if any). */
export function questChoose(sim: Sim, questId: string, nodeId: string, optionId: string): QuestChooseResult | null {
  const def = questDef(sim, questId)
  const st = sim.state.authoredQuests[questId]
  const opt = def?.nodes[nodeId]?.options.find((o) => o.id === optionId)
  if (!def || !st || !opt) return null
  const c = ctxOf(sim, def, st)
  // Only a node the current topics can reach, and only while the quest is still talkable (review 014 #3): a stale
  // open dialog or a scripted call cannot replay an option (and its reward) of a settled quest.
  if (!reachable(c).has(nodeId)) return null
  if (!allOf(c, opt.when) || !allOf(c, opt.needs)) return null
  applyEffects(c, opt.effects)
  return { next: opt.next }
}

/** Journal entries of the authored quests (offered quests are rumours: only the title and stage 0). */
export function questJournal(sim: Sim): JournalEntry[] {
  const out: JournalEntry[] = []
  for (const def of questDefs(sim)) {
    const st = sim.state.authoredQuests[def.id]
    if (!st) continue
    if ((st.status === 'done' || st.status === 'lapsed') && st.startedAt === undefined) continue // never accepted: no journal entry
    const ph = placeholders(readCtxOf(sim, def, st))
    out.push({ id: def.id, title: def.title, status: st.status, text: fill(journalText(def, st, readCtxOf(sim, def, st)), ph), decision: st.choice && def.choiceLabels?.[st.choice] ? fill(def.choiceLabels[st.choice]!, ph) : undefined })
  }
  return out
}

function journalText(def: QuestDef, st: AuthoredQuestState, c: QuestCtx): string {
  if (st.status === 'done') return def.endings.find((e) => e.id === st.ending)?.journal ?? ''
  if (st.status === 'lapsed') return def.lapse?.journal ?? 'The matter was settled without you.'
  const stage = def.stages[Math.min(st.stage, def.stages.length - 1)]
  if (!stage) return ''
  const done = (stage.progress ?? []).filter((p) => allOf(c, p.when)).map((p) => p.text)
  const left = timeLeftText(def, st, c)
  if (left) done.push(left)
  return done.length ? `${stage.journal} ${done.join(' ')}` : stage.journal
}

/** E7: "Time left: 1 day 6 h." for an accepted, timed quest (read-only, from the calendar). */
export function timeLeftText(def: QuestDef, st: AuthoredQuestState, c: QuestCtx): string {
  if (def.deadlineHours === undefined || st.startedAt === undefined || st.status !== 'active') return ''
  const hours = def.deadlineHours - (c.sim.state.time.cal - st.startedAt) / 3600
  if (hours <= 0) return 'The time is up.'
  const total = Math.ceil(hours)
  const d = Math.floor(total / 24)
  const h = total - d * 24
  return `Time left: ${[d > 0 ? `${d} ${d === 1 ? 'day' : 'days'}` : '', h > 0 || d === 0 ? `${h} h` : ''].filter(Boolean).join(' ')}.`
}

/** Map markers of active quests, only in explored cells (MAP-01). */
export function questMarkers(sim: Sim): QuestMarker[] {
  const out: QuestMarker[] = []
  for (const def of questDefs(sim)) {
    const st = sim.state.authoredQuests[def.id]
    if (st?.status !== 'active') continue
    const c = readCtxOf(sim, def, st)
    const anchor = def.stages[st.stage]?.anchor
    const pos = anchor ? resolveAnchor(c, anchor) : resolveAnchor(c, { k: 'actor', slot: def.giver })
    if (pos && isExplored(sim, pos.x, pos.z)) out.push({ questId: def.id, title: def.title, x: pos.x, z: pos.z })
  }
  return out
}


/** Icon above an NPC's head: `!` has a quest to offer, `?` takes part in an active quest, `done` finished a quest with the player. */
export type NpcQuestIcon = 'offer' | 'turnin' | 'done'

/** A finished quest keeps its tick above the NPC for one game day. */
const DONE_ICON_S = 86400

/** Quest icon for one NPC (authored quests via their topics, board quests via the giver); null when none applies. */
export function npcQuestIcon(sim: Sim, npcId: number): NpcQuestIcon | null {
  let icon: NpcQuestIcon | null = null
  for (const def of questDefs(sim)) {
    const st = sim.state.authoredQuests[def.id]
    if (!st) continue
    if (st.status === 'done') {
      // The quest finished with this cast member: a tick for a day.
      if (!icon && st.startedAt !== undefined && sim.state.time.cal - (st.endedAt ?? 0) < DONE_ICON_S && Object.values(st.cast).includes(npcId)) icon = 'done'
      continue
    }
    const c = readCtxOf(sim, def, st)
    const t = def.topics.find((tp) => st.cast[tp.slot] === npcId && talkable(st, !!tp.done) && allOf(c, tp.when))
    if (!t) continue
    if (st.status === 'offered' || st.status === 'refused') return 'offer'
    if (st.status === 'active') icon = 'turnin'
  }
  if (icon) return icon
  const hasBoard = sim.state.quests.some((q) => q.status === 'available' && q.giverId === npcId && q.settlementId === sim.state.npcs.find((n) => n.id === npcId)?.settlementId)
  return hasBoard ? 'offer' : null
}
