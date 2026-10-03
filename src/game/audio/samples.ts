/**
 * Recorded sound player (audio--001): lazy fetch + decode on first use, LRU of decoded buffers under a
 * memory budget, one-shots and crossfaded loops. Browser only; the pure choices live in catalogue.ts.
 * @domain audio
 */
import { pickFile, soundUrl } from './catalogue'

/** Decoded PCM budget (bytes) — roughly 32 MB. */
const BUDGET_BYTES = 32 * 1024 * 1024

export class SamplePlayer {
  private buffers = new Map<string, AudioBuffer>()
  private pending = new Set<string>()
  private bytes = 0
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>()

  private ctx: AudioContext
  private dest: AudioNode

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx
    this.dest = dest
  }

  private fetchBuffer(file: string) {
    if (this.pending.has(file) || this.buffers.has(file)) return
    this.pending.add(file)
    void fetch(soundUrl(file))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => this.store(file, buf))
      .catch(() => undefined)
      .finally(() => this.pending.delete(file))
  }

  private store(file: string, buf: AudioBuffer) {
    this.buffers.set(file, buf)
    this.bytes += buf.length * buf.numberOfChannels * 4
    const playing = new Set([...this.loops.keys()])
    for (const [k, b] of this.buffers) {
      if (this.bytes <= BUDGET_BYTES) break
      if (k === file || playing.has(k)) continue
      this.buffers.delete(k)
      this.bytes -= b.length * b.numberOfChannels * 4
    }
  }

  private touch(file: string): AudioBuffer | null {
    const b = this.buffers.get(file)
    if (!b) return null
    this.buffers.delete(file) // refresh LRU order
    this.buffers.set(file, b)
    return b
  }

  /** Plays one variant of `id` now on `dest`; returns its length in s, or 0 when it is not decoded yet (the fetch starts, the caller may fall back). */
  play(id: string, gain = 1, rate = 1, dest: AudioNode = this.dest): number {
    const file = pickFile(id)
    if (!file) return 0
    const buf = this.touch(file)
    if (!buf) {
      this.fetchBuffer(file)
      return 0
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = this.ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(dest)
    src.start()
    return buf.duration / rate
  }

  /** Sets the target level of a looping bed (0 stops it after the fade); starts it once decoded. Returns true while the bed plays. */
  setLoop(id: string, level: number, dest: AudioNode = this.dest): boolean {
    let l = this.loops.get(id)
    if (!l) {
      if (level <= 0.001) return false
      const file = pickFile(id)
      if (!file) return false
      const buf = this.touch(file)
      if (!buf) {
        this.fetchBuffer(file)
        return false
      }
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const gain = this.ctx.createGain()
      gain.gain.value = 0
      src.connect(gain).connect(dest)
      src.start()
      l = { src, gain }
      this.loops.set(id, l)
    }
    l.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 1.2)
    if (level <= 0.001) {
      const dead = l
      this.loops.delete(id)
      setTimeout(() => dead.src.stop(), 6000)
      return false
    }
    return true
  }

  get decodedBytes() {
    return this.bytes
  }
}
