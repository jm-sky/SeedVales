/**
 * Meadow colour patches (render--007, user feedback 2026-10-02: "grass colour should vary — generally green,
 * yellowish splashes (= flowers) here and there, darker splashes too, matching the ground"). One world-space
 * function in two identical forms: GLSL for the terrain fragment shader, TypeScript for the grass tiles
 * (evaluated once per clump at tile build and passed as instance data — per-vertex noise in the grass shader
 * cost ≈ +2 ms GPU on medium). The lattice hash is integer-only so both forms give the same patches.
 * @domain render
 * @subdomain grass
 */

/** Flower patch species colours (linear RGB): yellow (most), white, violet. */
export const FLOWER_COLOURS: [number, number, number][] = [[0.95, 0.78, 0.08], [0.92, 0.92, 0.86], [0.55, 0.42, 0.85]]

const mix32 = (x: number) => {
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return x >>> 0
}

/** Lattice hash → [0,1), identical to `gpHash` in GLSL. */
export function gpHash(ix: number, iy: number): number {
  return (mix32((Math.imul(ix >>> 0, 0x27d4eb2d) ^ mix32((iy + 0x165667b1) >>> 0)) >>> 0) >>> 8) / 16777216
}

function gpNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = gpHash(ix, iy) + (gpHash(ix + 1, iy) - gpHash(ix, iy)) * fx
  const b = gpHash(ix, iy + 1) + (gpHash(ix + 1, iy + 1) - gpHash(ix, iy + 1)) * fx
  return a + (b - a) * fy
}

const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * [flower, dark, soil] weights (0..1) at a world position. Soil = small bare-earth patches between tufts
 * (flax-meadow reference, research 003 §6.2): the ground turns brown and grass clumps thin out there.
 */
export function groundPatch(x: number, z: number): [number, number, number] {
  const n1 = gpNoise(x / 22, z / 22) * 0.6 + gpNoise(x / 7 + 3.7, z / 7 + 3.7) * 0.4
  const n2 = gpNoise(x / 34 + 17.3, z / 34 + 17.3) * 0.7 + gpNoise(x / 9 + 41.1, z / 9 + 41.1) * 0.3
  const n3 = gpNoise(x / 5 + 71.3, z / 5 + 71.3) * 0.6 + gpNoise(x / 2 + 13.1, z / 2 + 13.1) * 0.4
  const flower = sstep(0.56, 0.76, n1)
  return [flower, sstep(0.55, 0.78, n2) * (1 - flower), sstep(0.62, 0.8, n3) * (1 - flower)]
}

/** Species of the flower patch at a world position: index into FLOWER_COLOURS (40 m cells). */
export function flowerType(x: number, z: number): number {
  const h = gpHash(Math.floor(x / 40) + 7, Math.floor(z / 40) + 7)
  return h < 0.68 ? 0 : h < 0.88 ? 1 : 2
}

const v3 = (c: [number, number, number]) => `vec3(${c.map((v) => v.toFixed(3)).join(', ')})`

/**
 * GLSL (WebGL2) twin of `groundPatch` / `flowerType`: `vec3 groundPatch(vec2 xz)`, `vec3 flowerColour(vec2 xz)`,
 * `vec3 flowerColourOf(float type)`. `uFlowers` (0..1, season) is declared here and bound by the material.
 */
export const GROUND_PATCH_GLSL = `
uniform float uFlowers;
uint gpMix(uint x) { x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u; return x; }
float gpHash(ivec2 i) { return float(gpMix((uint(i.x) * 0x27d4eb2du) ^ gpMix(uint(i.y) + 0x165667b1u)) >> 8u) / 16777216.0; }
float gpNoise(vec2 p) {
  vec2 fl = floor(p);
  ivec2 i = ivec2(fl);
  vec2 f = p - fl;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gpHash(i), gpHash(i + ivec2(1, 0)), f.x), mix(gpHash(i + ivec2(0, 1)), gpHash(i + ivec2(1, 1)), f.x), f.y);
}
vec3 groundPatch(vec2 xz) {
  float n1 = gpNoise(xz / 22.0) * 0.6 + gpNoise(xz / 7.0 + 3.7) * 0.4;
  float n2 = gpNoise(xz / 34.0 + 17.3) * 0.7 + gpNoise(xz / 9.0 + 41.1) * 0.3;
  float n3 = gpNoise(xz / 5.0 + 71.3) * 0.6 + gpNoise(xz / 2.0 + 13.1) * 0.4;
  float flower = smoothstep(0.56, 0.76, n1);
  return vec3(flower, smoothstep(0.55, 0.78, n2) * (1.0 - flower), smoothstep(0.62, 0.8, n3) * (1.0 - flower));
}
vec3 flowerColourOf(float t) { return t < 0.5 ? ${v3(FLOWER_COLOURS[0]!)} : t < 1.5 ? ${v3(FLOWER_COLOURS[1]!)} : ${v3(FLOWER_COLOURS[2]!)}; }
vec3 flowerColour(vec2 xz) {
  float h = gpHash(ivec2(floor(xz / 40.0)) + ivec2(7));
  return flowerColourOf(h < 0.68 ? 0.0 : h < 0.88 ? 1.0 : 2.0);
}
`
