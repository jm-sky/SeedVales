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
import { allOf, applyEffects, ctxOf, firstName, homeId, humanOf, type QuestCtx, resolveAnchor } from './questCore'
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
    const c = ctxOf(sim, def, st)
    const t = def.topics.find((tp) => st.cast[tp.slot] === npcId && talkable(st, !!tp.done) && allOf(c, tp.when))
    if (t) out.push({ questId: def.id, label: t.label, node: t.node })
  }
  return out
}

function placeholders(c: QuestCtx): Record<string, string> {
  const m: Record<string, string> = { H: c.sim.state.settlements[homeId(c.sim)]?.name ?? 'the village' }
  const home = c.sim.world.settlements[homeId(c.sim)]!
  let best: { name: string; d: number } | undefined
  for (const s of c.sim.world.settlements) {
    if (s.id === home.id) continue
    const d = Math.hypot(s.x - home.x, s.z - home.z)
    if (!best || d < best.d) best = { name: c.sim.state.settlements[s.id]?.name ?? s.name, d }
  }
  m.V = best?.name ?? 'the next village'
  for (const [slot, spec] of Object.entries(c.def.cast)) {
    const h = humanOf(c, slot)
    m[slot] = h ? firstName(h) : (spec.fallbackName ?? 'someone')
  }
  return m
}

const fill = (text: string, ph: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => ph[k] ?? `{${k}}`)

/** Resolved lines and options of a node. */
export function questSay(sim: Sim, questId: string, nodeId: string): QuestSay | null {
  const def = questDef(sim, questId)
  const st = sim.state.authoredQuests[questId]
  const node = def?.nodes[nodeId]
  if (!def || !st || !node) return null
  const c = ctxOf(sim, def, st)
  const ph = placeholders(c)
  const lines = node.lines
    .filter((l) => allOf(c, l.when))
    .map((l) => ({ who: l.who === 'player' ? 'You' : l.who === 'self' ? '' : (ph[l.who] ?? l.who), text: fill(l.text, ph), self: l.who === 'self' }))
  const options: QuestSayOption[] = []
  for (const o of node.options) {
    if (!allOf(c, o.when)) continue
    const ok = allOf(c, o.needs)
    options.push({ id: o.id, text: fill(o.text, ph), enabled: ok, reason: ok ? undefined : o.reason })
  }
  return { title: def.title, lines, options }
}

/** Applies the effects of an enabled option; returns the follow-up node (if any). */
export function questChoose(sim: Sim, questId: string, nodeId: string, optionId: string): QuestChooseResult | null {
  const def = questDef(sim, questId)
  const st = sim.state.authoredQuests[questId]
  const opt = def?.nodes[nodeId]?.options.find((o) => o.id === optionId)
  if (!def || !st || !opt) return null
  const c = ctxOf(sim, def, st)
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
    const ph = placeholders(ctxOf(sim, def, st))
    out.push({ id: def.id, title: def.title, status: st.status, text: fill(journalText(def, st), ph), decision: st.choice ? def.choiceLabels?.[st.choice] : undefined })
  }
  return out
}

function journalText(def: QuestDef, st: AuthoredQuestState): string {
  if (st.status === 'done') return def.endings.find((e) => e.id === st.ending)?.journal ?? ''
  if (st.status === 'lapsed') return def.lapse?.journal ?? 'The matter was settled without you.'
  return def.stages[Math.min(st.stage, def.stages.length - 1)]?.journal ?? ''
}

/** Map markers of active quests, only in explored cells (MAP-01). */
export function questMarkers(sim: Sim): QuestMarker[] {
  const out: QuestMarker[] = []
  for (const def of questDefs(sim)) {
    const st = sim.state.authoredQuests[def.id]
    if (st?.status !== 'active') continue
    const c = ctxOf(sim, def, st)
    const anchor = def.stages[st.stage]?.anchor
    const pos = anchor ? resolveAnchor(c, anchor) : resolveAnchor(c, { k: 'actor', slot: def.giver })
    if (pos && isExplored(sim, pos.x, pos.z)) out.push({ questId: def.id, title: def.title, x: pos.x, z: pos.z })
  }
  return out
}

