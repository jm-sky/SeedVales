/** RENDER-05 (wind): the shared module is weather-driven, pure, and the injected chunk is gated by strength. */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { applyWind, updateWind, WIND_GLSL_DECL, windAngle, windStrength, windUniforms } from './wind'

const SHADER = '#include <common>\nvoid main(){\n#include <begin_vertex>\n}'

describe('wind', () => {
  it('strength grows with weather severity and is deterministic', () => {
    const calm = windStrength({ kind: 'clear', intensity: 0 })
    const storm = windStrength({ kind: 'storm', intensity: 1 })
    expect(calm).toBeGreaterThan(0)
    expect(storm).toBeGreaterThan(calm * 2)
    expect(windStrength({ kind: 'rain', intensity: 0.5 })).toBe(windStrength({ kind: 'rain', intensity: 0.5 }))
    expect(windAngle(1000)).toBe(windAngle(1000))
  })

  it('updateWind writes a unit direction, strength and render time into the shared uniforms', () => {
    updateWind(12.5, { kind: 'storm', intensity: 1 }, 5 * 86400)
    const u = windUniforms.uWind.value
    expect(Math.hypot(u.x, u.y)).toBeCloseTo(1, 6)
    expect(u.z).toBeCloseTo(windStrength({ kind: 'storm', intensity: 1 }), 6)
    expect(windUniforms.uWindTime.value).toBe(12.5)
  })

  it('applyWind injects the chunk into the shader and shares the uniform objects', () => {
    const m = new THREE.MeshLambertMaterial()
    applyWind(m, { amplitude: 0.4, heightScale: 2 })
    const sh = { uniforms: {} as Record<string, { value: unknown }>, vertexShader: SHADER, fragmentShader: '' }
    m.onBeforeCompile(sh as never, undefined as never)
    expect(sh.vertexShader).toContain('svWindOffset')
    expect(sh.vertexShader).toContain('position.y / 2.000')
    expect(sh.uniforms.uWind).toBe(windUniforms.uWind)
    expect(sh.uniforms.uWindTime).toBe(windUniforms.uWindTime)
    expect((sh.uniforms.uWindAmp as { value: number }).value).toBe(0.4)
    expect(m.customProgramCacheKey()).toContain('wind:2')
  })

  it('strength 0 gives no displacement: the offset is a product with uWind.z, and the mask is 0 at the root', () => {
    expect(WIND_GLSL_DECL).toMatch(/\* uWind\.z \* uWindAmp \* mask \* mask/)
    expect(WIND_GLSL_DECL).toContain('vec3(d.x, -0.15 * abs(s), d.y) * s')
  })
})
