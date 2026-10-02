/**
 * Sky dome (render--002 step 2): horizon–zenith gradient with a sun disc and glow, drawn behind
 * everything and following the camera. Uses the same colours as the fog (horizon) and the sun
 * direction of the shadow-casting light. Tone mapped like the rest of the scene. Cheap on every
 * profile: one sphere, one fragment pass over the visible sky only.
 * Clouds (render--001 step 2, WEATHER-01): one generated tiling noise texture sampled twice (two scales) on a
 * virtual cloud plane, scrolled with the wind; coverage from the weather (clear = scattered, overcast/rain =
 * closed), darker underside with more cover, dimmed at night; the sun disc fades behind clouds.
 * @domain render
 * @subdomain sky
 */
import * as THREE from 'three'
import type { Atmosphere } from './atmosphere'

/** Tiling value noise (R: large blobs, G: detail), generated once. */
function cloudTexture(n = 256): THREE.DataTexture {
  const d = new Uint8Array(n * n * 4)
  let seed = 0x2545f491
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const lattice = (cells: number) => {
    const g = Float32Array.from({ length: cells * cells }, rnd)
    return (x: number, y: number) => {
      const fx = (x / n) * cells
      const fy = (y / n) * cells
      const i = Math.floor(fx)
      const j = Math.floor(fy)
      const sx = (fx - i) * (fx - i) * (3 - 2 * (fx - i))
      const sy = (fy - j) * (fy - j) * (3 - 2 * (fy - j))
      const at = (a: number, b: number) => g[((b % cells) * cells + (a % cells)) % (cells * cells)]!
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx
      const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
      return a + (b - a) * sy
    }
  }
  const o1 = lattice(4)
  const o2 = lattice(8)
  const o3 = lattice(16)
  const o4 = lattice(32)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = (y * n + x) * 4
      d[k] = Math.round((o1(x, y) * 0.55 + o2(x, y) * 0.3 + o3(x, y) * 0.15) * 255)
      d[k + 1] = Math.round((o3(x, y) * 0.5 + o4(x, y) * 0.5) * 255)
      d[k + 2] = 0
      d[k + 3] = 255
    }
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`

const FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunDisc;
uniform sampler2D uClouds;
uniform float uCover;
uniform vec2 uCloudOff;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
  // Below the horizon: keep the horizon colour (fog hides the far terrain there anyway).
  if (d.y < 0.0) col = uHorizon;
  // Clouds on a virtual plane: uv = d.xz / d.y (perspective towards the horizon), two scales scrolled by the wind.
  float cloud = 0.0;
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.06);
    float n1 = texture2D(uClouds, uv * 0.11 + uCloudOff).r;
    float n2 = texture2D(uClouds, uv * 0.37 + uCloudOff * 1.7).g;
    float n = n1 * 0.75 + n2 * 0.25;
    float edge = 1.0 - uCover;
    cloud = smoothstep(edge - 0.08, edge + 0.18, n) * smoothstep(0.0, 0.12, d.y);
    float dayB = clamp(dot(uHorizon, vec3(0.3333)) * 1.5, 0.04, 1.0);
    vec3 lit = mix(vec3(1.0), uSunColor, 0.25) * dayB;
    // Thicker cover = darker underside; the densest parts of each cloud are a bit darker too.
    vec3 cCol = lit * mix(1.0, 0.55, uCover) * (1.0 - 0.18 * smoothstep(edge, 1.0, n));
    col = mix(col, cCol, cloud * 0.92);
  }
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunDisc * (1.0 - cloud * 0.9) * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.18);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export class SkyDome {
  mesh: THREE.Mesh
  private mat: THREE.ShaderMaterial

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uSunColor: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunDisc: { value: 0 },
        uClouds: { value: cloudTexture() },
        uCover: { value: 0.3 },
        uCloudOff: { value: new THREE.Vector2() },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 12), this.mat)
    this.mesh.renderOrder = -10
    this.mesh.frustumCulled = false
    this.mesh.matrixAutoUpdate = true
  }

  private cover = 0.3

  /**
   * `cover` 0..1 target cloud cover (smoothed here, ~3 s), `wind` = unit direction × strength, `dt` render seconds.
   * Clouds drift with the wind (render time, never the ×24 calendar).
   */
  update(a: Atmosphere, camPos: THREE.Vector3, dt = 0, cover = 0.3, wind = { x: 1, y: 0, z: 0.3 }) {
    const u = this.mat.uniforms
    this.cover += (cover - this.cover) * Math.min(1, dt * 0.3)
    u.uCover!.value = this.cover
    const off = u.uCloudOff!.value as THREE.Vector2
    off.x += wind.x * (0.002 + wind.z * 0.004) * dt
    off.y += wind.y * (0.002 + wind.z * 0.004) * dt
    ;(u.uZenith!.value as THREE.Color).copy(a.zenith)
    ;(u.uHorizon!.value as THREE.Color).copy(a.horizon)
    ;(u.uSunColor!.value as THREE.Color).copy(a.sunColor)
    ;(u.uSunDir!.value as THREE.Vector3).copy(a.sunDir)
    u.uSunDisc!.value = a.sunDisc
    this.mesh.position.copy(camPos)
  }
}
