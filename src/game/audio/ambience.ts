/**
 * Procedural ambience (WebAudio, no sample files yet): wind (mountains/storm), waves (coast), rain,
 * birds by day on meadows/forests, owl at night, animal calls and combat cues from sim events.
 * Placeholder synthesis — real recordings to be added later (docs/assets/README.md).
 * @domain audio
 */
import type { Sim, SimEvent } from '../sim/sim'
import type { Animal } from '../sim/types'
import { perf } from '../diag/perf'
import { daylight, isNight } from '../sim/time'
import { Biome } from '../world/types'
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
  private t = 0
  enabled = true

  /** Must be called from a user gesture (autoplay policy). */
  start() {
    if (this.ctx || typeof AudioContext === 'undefined') return
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.5
    this.master.connect(ctx.destination)
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
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(this.master)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  private play(kind: string) {
    const now = this.t
    const dur = { bird: 0.4, owl: 1.2, gull: 0.8, howl: 2.5, moo: 1.4, bleat: 0.7, bark: 0.4, hit: 0.15, swing: 0.2, treefall: 1.2, fire: 1, thunder: 2.5 }[kind] ?? 0.5
    if (!this.limiter.request(kind, now, dur)) {
      perf.count('audio.suppressed')
      return
    }
    perf.count('audio.played')
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
    const p = sim.player
    const t = sim.terrain
    const cal = sim.state.time.cal
    const w = sim.weather
    const biome = t.biomeAt(p.x, p.z)
    const mountain = biome === Biome.Mountain || biome === Biome.Snow || p.y > 90
    let coast = 0
    for (const [dx, dz] of [[60, 0], [-60, 0], [0, 60], [0, -60]]) if (t.isSeaAt(p.x + dx!, p.z + dz!)) coast = 1
    const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.8)
    set(this.wind, (mountain ? 0.35 : 0.06) + (w.kind === 'storm' ? 0.35 : 0) * 1)
    set(this.waves, coast * 0.25)
    set(this.rain, w.kind === 'rain' || w.kind === 'storm' ? 0.12 + w.intensity * 0.15 : 0)
    const day = daylight(cal)
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
      else if (e.type === 'sound') this.play(e.kind)
    }
    perf.gauge('audio.activeVoices', this.limiter.activeCount)
  }
}
