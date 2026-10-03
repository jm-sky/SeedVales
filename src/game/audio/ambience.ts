/**
 * Procedural ambience (WebAudio, no sample files yet): wind (mountains/storm), waves (coast), rain,
 * birds by day on meadows/forests, owl at night, animal calls and combat cues from sim events.
 * Placeholder synthesis — real recordings to be added later (docs/assets/README.md).
 * @domain audio
 */
import type { Sim, SimEvent } from '../sim/sim'
import type { Animal, Human } from '../sim/types'
import { perf } from '../diag/perf'
import { daylight, isNight } from '../sim/time'
import { Biome } from '../world/types'
import { ACTIVITY_SOUNDS, footstepId, KIND_SAMPLES, surfaceFor, voiceId, type VoiceSituation } from './catalogue'
import { SamplePlayer } from './samples'
import { type NpcVoiceTrigger, situationOnChange, VoiceDirector } from './voiceDirector'
import { DEFAULT_RULES, VoiceLimiter } from './voices'

export class Ambience {
  private ctx: AudioContext | null = null

  /** Closes the AudioContext (Game.stop) — browsers limit the number of live contexts. */
  dispose() {
    void this.ctx?.close()
    this.ctx = null
  }
  private master!: GainNode
  private wind!: GainNode
  private waves!: GainNode
  private rain!: GainNode
  private limiter = new VoiceLimiter(DEFAULT_RULES, 4)
  private samples: SamplePlayer | null = null
  private busFx!: GainNode
  private busAmb!: GainNode
  private busVoice!: GainNode
  private director = new VoiceDirector()
  private npcSeen = new Map<number, NpcVoiceTrigger>()
  private stepT = 0
  private actT = 0
  private lastAct = ''
  private t = 0
  enabled = true
  /** Player volume settings (UI-05), 0..1 each. */
  private vol = { master: 0.8, ambient: 1, effects: 1, voices: 1 }

  setVolumes(v: { master: number; ambient: number; effects: number; voices: number }) {
    this.vol = { ...v }
    if (this.ctx) {
      this.master.gain.setTargetAtTime(0.6 * v.master, this.ctx.currentTime, 0.05)
      this.busFx.gain.setTargetAtTime(v.effects, this.ctx.currentTime, 0.05)
      this.busAmb.gain.setTargetAtTime(v.ambient, this.ctx.currentTime, 0.05)
      this.busVoice.gain.setTargetAtTime(v.voices, this.ctx.currentTime, 0.05)
    }
  }

  /** Must be called from a user gesture (autoplay policy). */
  start() {
    if (this.ctx || typeof AudioContext === 'undefined') return
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.6 * this.vol.master
    this.master.connect(ctx.destination)
    const bus = (v: number) => {
      const g = ctx.createGain()
      g.gain.value = v
      g.connect(this.master)
      return g
    }
    this.busFx = bus(this.vol.effects)
    this.busAmb = bus(this.vol.ambient)
    this.busVoice = bus(this.vol.voices)
    this.samples = new SamplePlayer(ctx, this.busFx)
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const loop = (freq: number, q: number, type: BiquadFilterType) => {
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      const f = ctx.createBiquadFilter()
      f.type = type
      f.frequency.value = freq
      f.Q.value = q
      const g = ctx.createGain()
      g.gain.value = 0
      src.connect(f).connect(g).connect(this.master)
      src.start()
      return g
    }
    this.wind = loop(400, 0.5, 'lowpass')
    this.waves = loop(700, 0.8, 'bandpass')
    this.rain = loop(3000, 0.4, 'highpass')
  }

  private tone(freqs: number[], dur: number, type: OscillatorType, vol: number, when = 0) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = type
    const g = ctx.createGain()
    const t0 = ctx.currentTime + when
    o.frequency.setValueAtTime(freqs[0]!, t0)
    freqs.slice(1).forEach((f, i) => o.frequency.linearRampToValueAtTime(f, t0 + ((i + 1) / freqs.length) * dur))
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(Math.max(0.0002, vol * this.vol.effects), t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(this.master)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  private play(kind: string, level = 1) {
    const now = this.t
    const dur = { bird: 0.4, owl: 1.2, gull: 0.8, howl: 2.5, moo: 1.4, bleat: 0.7, bark: 0.4, hit: 0.15, swing: 0.2, treefall: 1.2, fire: 1, thunder: 2.5 }[kind] ?? 0.5
    if (!this.limiter.request(kind, now, dur)) {
      perf.count('audio.suppressed')
      return
    }
    perf.count('audio.played')
    const sid = KIND_SAMPLES[kind]
    if (sid && this.samples?.play(sid, 0.8 * level, 0.96 + Math.random() * 0.08)) return
    switch (kind) {
      case 'bark':
        this.tone([500, 300], 0.15, 'square', 0.04)
        break
      case 'bird':
        this.tone([2800 + Math.random() * 1500, 3600 + Math.random() * 1200, 2600], 0.25, 'sine', 0.05)
        this.tone([3200, 4100], 0.12, 'sine', 0.04, 0.3)
        break
      case 'bleat':
        this.tone([520, 480, 500, 470], 0.6, 'square', 0.02)
        break
      case 'gull':
        this.tone([1400, 1900, 1200], 0.6, 'triangle', 0.04)
        break
      case 'hit':
        this.tone([180, 60], 0.12, 'square', 0.06)
        break
      case 'howl':
        this.tone([350, 700, 650, 400], 2.4, 'sine', 0.07)
        break
      case 'moo':
        this.tone([160, 140, 120], 1.3, 'sawtooth', 0.04)
        break
      case 'owl':
        this.tone([420, 400], 0.4, 'sine', 0.08)
        this.tone([430, 380], 0.6, 'sine', 0.08, 0.55)
        break
      case 'swing':
        this.tone([900, 300], 0.15, 'triangle', 0.02)
        break
      case 'thunder':
        this.tone([80, 30, 50], 2.4, 'sawtooth', 0.1)
        break
      case 'treefall':
        this.tone([120, 40], 1.1, 'sawtooth', 0.08)
        break
      default:
        break
    }
  }

  /** Called ~5 Hz with elapsed seconds; reads sim, handles events already collected. */
  update(dt: number, sim: Sim, events: SimEvent[]) {
    if (!this.ctx || !this.enabled) return
    this.t += dt
    this.simRef = sim
    const p = sim.player
    const t = sim.terrain
    const cal = sim.state.time.cal
    const w = sim.weather
    const biome = t.biomeAt(p.x, p.z)
    const mountain = biome === Biome.Mountain || biome === Biome.Snow || p.y > 90
    let coast = 0
    for (const [dx, dz] of [[60, 0], [-60, 0], [0, 60], [0, -60]]) if (t.isSeaAt(p.x + dx!, p.z + dz!)) coast = 1
    const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v * this.vol.ambient, this.ctx!.currentTime, 0.8)
    const day = daylight(cal)
    const beds = this.bedSamples(biome, mountain, coast, day)
    set(this.wind, beds.wind ? 0 : (mountain ? 0.35 : 0.06) + (w.kind === 'storm' ? 0.35 : 0) * 1)
    set(this.waves, beds.waves ? 0 : coast * 0.25)
    set(this.rain, beds.rain ? 0 : w.kind === 'rain' || w.kind === 'storm' ? 0.12 + w.intensity * 0.15 : 0)
    const r = Math.random()
    if (day > 0.5 && w.kind !== 'rain' && w.kind !== 'storm' && (biome === Biome.Meadow || biome >= Biome.ForestDeciduous && biome <= Biome.ForestConifer) && r < 0.25) this.play('bird')
    if (isNight(cal) && r < 0.02) this.play('owl')
    if (coast && r < 0.05) this.play('gull')
    if (w.kind === 'storm' && r < 0.02) this.play('thunder')
    // Animal calls near the player.
    if (r < 0.08) {
      for (const a of sim.actors.query(p.x, p.z, 120)) {
        if (a.kind !== 'animal') continue
        const sp = (a as Animal).species
        const kind = sp === 'wolf' && isNight(cal) ? 'howl' : sp === 'cow' ? 'moo' : sp === 'sheep' ? 'bleat' : sp === 'dog' ? 'bark' : null
        if (kind) {
          this.play(kind)
          break
        }
      }
    }
    for (const e of events) {
      if (e.type === 'hit') this.play('hit')
      else if (e.type === 'swing') this.play('swing')
      else if (e.type === 'sound') this.play(e.kind, Math.max(0.15, 1 - Math.hypot(e.x - p.x, e.z - p.z) / 80))
    }
    this.updateVoices(sim)
    perf.gauge('audio.activeVoices', this.limiter.activeCount)
  }

  /** Recorded ambience beds by biome / time / weather; returns which of the synthetic beds they replace. */
  private bedSamples(biome: number, mountain: boolean, coast: number, day: number): { wind: boolean; waves: boolean; rain: boolean } {
    const sp = this.samples
    if (!sp) return { wind: false, waves: false, rain: false }
    const w = this.simRef!.weather
    const storm = w.kind === 'storm'
    const wet = storm || w.kind === 'rain'
    const forest = biome >= Biome.ForestDeciduous && biome <= Biome.ForestConifer
    const bed = (id: string, level: number) => sp.setLoop(id, level, this.busAmb)
    bed('ambient-forest-loop', forest && day > 0.4 ? 0.5 : 0)
    bed('ambient-meadow-loop', (biome === Biome.Meadow || biome === Biome.Steppe) && day > 0.4 ? 0.5 : 0)
    bed('ambient-night-crickets-loop', day <= 0.4 && !mountain && !wet ? 0.4 : 0)
    bed('ambient-lake-frogs-loop', biome === Biome.Swamp || biome === Biome.Water ? 0.4 : 0)
    // Fire loop: the nearest lit fire within earshot (spatial query, 5 Hz).
    const p = this.simRef!.player
    let fire = 0
    for (const b of this.simRef!.buildingsNear(p.x, p.z, 14)) {
      if (!b.lit) continue
      fire = Math.max(fire, 1 - Math.hypot(b.x - p.x, b.z - p.z) / 14)
    }
    bed('ambient-fire-loop', fire * 0.5)
    const level = wet ? 0.3 + w.intensity * 0.3 : 0
    const stormBed = bed('ambient-rain-storm', storm ? level : 0)
    const rainBed = bed('ambient-rain-loop', storm ? 0 : level) || stormBed
    return {
      wind: bed('ambient-wind-loop', (mountain ? 0.5 : 0.08) + (storm ? 0.3 : 0)),
      waves: bed('ambient-coast-seagulls-waves', coast ? 0.45 : 0),
      rain: rainBed,
    }
  }

  private simRef: Sim | null = null

  /** Per-frame cues: footsteps by surface and gait, player activity sounds. */
  frame(dt: number, sim: Sim) {
    if (!this.ctx || !this.enabled || !this.samples) return
    this.simRef = sim
    const p = sim.player
    const act = sim.state.px.activity
    if (act) {
      const m = ACTIVITY_SOUNDS[act.kind]
      if (m) {
        this.actT -= dt
        const fresh = this.lastAct !== `${act.kind}:${act.ref ?? ''}:${act.total}`
        if (fresh || (m.periodS > 0 && this.actT <= 0)) {
          this.actT = m.periodS
          this.samples.play(m.id, 0.7, 0.97 + Math.random() * 0.06, this.busFx)
        }
        this.lastAct = `${act.kind}:${act.ref ?? ''}:${act.total}`
      }
      return
    }
    this.lastAct = ''
    const gait = p.moving
    if (gait === 'walk' || gait === 'run' || gait === 'sneak') {
      this.stepT -= dt
      if (this.stepT <= 0) {
        this.stepT = gait === 'run' ? 0.32 : gait === 'sneak' ? 0.75 : 0.5
        const surface = surfaceFor(sim.terrain.biomeAt(p.x, p.z), sim.terrain.roadAt(p.x, p.z))
        this.samples.play(footstepId(surface, gait === 'run'), gait === 'sneak' ? 0.25 : 0.45, 0.94 + Math.random() * 0.12, this.busFx)
      }
    } else this.stepT = 0
  }

  /** UI / small interaction one-shots (panel open, pick-up, drop) on the effects bus. */
  ui(id: 'ui-click' | 'inventory-pick-up' | 'inventory-drop') {
    this.samples?.play(id, 0.5, 1, this.busFx)
  }

  /** Plays an NPC voice line if the director allows it (distance gate, one voice at a time, per-NPC cooldown). */
  voiceLine(npc: Human, situation: VoiceSituation, sim: Sim, urgent = false) {
    if (!this.samples || !this.enabled) return
    const p = sim.player
    const d = Math.hypot(npc.x - p.x, npc.z - p.z)
    if (!this.director.canSpeak(npc.id, d, this.t, urgent)) return
    const id = voiceId(npc.profession, npc.male ? 'male' : 'female', situation)
    if (!id) return
    const len = this.samples.play(id, Math.max(0.3, 1 - d / 30), 1, this.busVoice)
    if (len > 0) this.director.started(npc.id, this.t, len, urgent)
  }

  /** NPC voices from goal changes near the player (5 Hz): combat, fleeing, sheltering, calls for help. */
  private updateVoices(sim: Sim) {
    const p = sim.player
    const seen = new Set<number>()
    for (const a of sim.actors.query(p.x, p.z, 25)) {
      if (a.kind !== 'npc') continue
      const h = a as Human
      seen.add(h.id)
      const now: NpcVoiceTrigger = { goal: h.ai.goal as string | null, callForHelpAt: h.callForHelpAt }
      const sit = situationOnChange(this.npcSeen.get(h.id), now)
      this.npcSeen.set(h.id, now)
      if (sit) this.voiceLine(h, sit, sim, sit === 'combat_start' || sit === 'call_for_help' || sit === 'danger_alert')
    }
    for (const id of this.npcSeen.keys()) if (!seen.has(id)) this.npcSeen.delete(id)
  }
}
