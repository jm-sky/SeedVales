/**
 * Sky dome (render--002 step 2): horizon–zenith gradient with a sun disc and glow, drawn behind
 * everything and following the camera. Uses the same colours as the fog (horizon) and the sun
 * direction of the shadow-casting light. Tone mapped like the rest of the scene. Cheap on every
 * profile: one sphere, one fragment pass over the visible sky only.
 * @domain render
 * @subdomain sky
 */
import * as THREE from 'three'
import type { Atmosphere } from './atmosphere'

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
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
  // Below the horizon: keep the horizon colour (fog hides the far terrain there anyway).
  if (d.y < 0.0) col = uHorizon;
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunDisc * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.18);
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

  update(a: Atmosphere, camPos: THREE.Vector3) {
    const u = this.mat.uniforms
    ;(u.uZenith!.value as THREE.Color).copy(a.zenith)
    ;(u.uHorizon!.value as THREE.Color).copy(a.horizon)
    ;(u.uSunColor!.value as THREE.Color).copy(a.sunColor)
    ;(u.uSunDir!.value as THREE.Vector3).copy(a.sunDir)
    u.uSunDisc!.value = a.sunDisc
    this.mesh.position.copy(camPos)
  }
}
