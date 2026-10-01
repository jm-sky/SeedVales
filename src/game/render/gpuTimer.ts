/**
 * Optional GPU frame timer (PERF-02) on EXT_disjoint_timer_query_webgl2. Queries are read back
 * asynchronously a few frames later; disjoint results (GPU clock reset) are dropped. Without the
 * extension there is simply no data (`available = false`) — never reported as 0 ms.
 * Results go to the `gpu.frame` timer in diag/perf. On SwiftShader (headless) numbers are meaningless.
 * @domain render
 * @subdomain diag
 */
import { perf } from '../diag/perf'

interface TimerExt {
  TIME_ELAPSED_EXT: number
  GPU_DISJOINT_EXT: number
}

export class GpuTimer {
  readonly available: boolean
  private gl: WebGL2RenderingContext
  private ext: TimerExt | null
  private pending: WebGLQuery[] = []
  private active: WebGLQuery | null = null
  dropped = 0

  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.gl = gl as WebGL2RenderingContext
    const isGl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    this.ext = isGl2 ? (gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null) : null
    this.available = !!this.ext
    perf.gauge('gpu.timerAvailable', this.available ? 1 : 0)
  }

  begin() {
    if (!this.ext || this.active || this.pending.length > 4) return
    const q = this.gl.createQuery()
    if (!q) return
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q)
    this.active = q
  }

  end() {
    if (!this.ext || !this.active) return
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT)
    this.pending.push(this.active)
    this.active = null
  }

  /** Reads finished queries (call once per frame, outside begin/end). */
  poll() {
    if (!this.ext) return
    const gl = this.gl
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean
    while (this.pending.length) {
      const q = this.pending[0]!
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break
      this.pending.shift()
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number
      gl.deleteQuery(q)
      if (disjoint) this.dropped++
      else perf.record('gpu.frame', ns / 1e6)
    }
  }

  dispose() {
    for (const q of this.pending) this.gl.deleteQuery(q)
    this.pending = []
  }
}
