/**
 * NPC voice-line scheduling (audio--001 step 5): at most one voice at a time near the player, a per-NPC
 * cooldown, and an audible-range gate. Pure logic (unit-tested); the clip choice is catalogue.voiceId.
 * @domain audio
 */

export const VOICE_RANGE_M = 25
export const VOICE_NPC_COOLDOWN_S = 20

export class VoiceDirector {
  private busyUntil = 0
  private lastByNpc = new Map<number, number>()
  /** Urgent lines may cut in front of a normal one that is still playing (never of another urgent one). */
  private urgent = false

  /** True when `npcId` may speak now (distance in m, time in s); the caller then plays the clip and calls `started`. */
  canSpeak(npcId: number, distM: number, now: number, urgent = false): boolean {
    if (distM > VOICE_RANGE_M) return false
    const last = this.lastByNpc.get(npcId)
    if (last !== undefined && now - last < VOICE_NPC_COOLDOWN_S && !urgent) return false
    if (now < this.busyUntil && !(urgent && !this.urgent)) return false
    return true
  }

  started(npcId: number, now: number, durationS: number, urgent = false) {
    this.lastByNpc.set(npcId, now)
    this.busyUntil = now + durationS
    this.urgent = urgent
  }
}

export type NpcVoiceTrigger = { goal: string | null; callForHelpAt?: number }

/** Voice situation for a change of an NPC's goal / call for help (null = nothing to say). */
export function situationOnChange(prev: NpcVoiceTrigger | undefined, now: NpcVoiceTrigger): 'combat_start' | 'danger_alert' | 'weather_shelter' | 'call_for_help' | null {
  if (now.callForHelpAt !== undefined && now.callForHelpAt !== prev?.callForHelpAt) return 'call_for_help'
  if (prev?.goal === now.goal) return null
  if (now.goal === 'fight') return 'combat_start'
  if (now.goal === 'flee') return 'danger_alert'
  if (now.goal === 'shelter') return 'weather_shelter'
  return null
}
