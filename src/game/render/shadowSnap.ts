/**
 * Shadow stabilisation (render--002 step 2): the directional light's shadow camera follows the player,
 * and every sub-texel move re-rasterises shadow edges differently (shimmer). Snapping the camera centre
 * to whole texels in light space keeps the shadow map still until the player moves a full texel.
 * The basis matches Three's `lookAt` for the shadow camera (camera up = +Y).
 * @domain render
 * @subdomain lighting
 */
import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)
const right = new THREE.Vector3()
const up = new THREE.Vector3()

/** `toLight` = unit vector from the target towards the light; `texel` = shadow frustum width / map size. */
export function snapShadowCenter(center: THREE.Vector3, toLight: THREE.Vector3, texel: number, out: THREE.Vector3): THREE.Vector3 {
  right.crossVectors(UP, toLight)
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
  right.normalize()
  up.crossVectors(toLight, right)
  const r = center.dot(right)
  const u = center.dot(up)
  return out.copy(center)
    .addScaledVector(right, Math.round(r / texel) * texel - r)
    .addScaledVector(up, Math.round(u / texel) * texel - u)
}
