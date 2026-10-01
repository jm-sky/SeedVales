/**
 * One parameter set for time of day and weather (render--002 step 2): sky gradient, fog, sun and
 * hemisphere light all come from here so the sky, the fog and the shadows always agree.
 * Pure function of (daylight, hour, weather) — no Three.js scene access.
 * @domain render
 * @subdomain lighting
 */
import * as THREE from 'three'
import type { WeatherState } from '../sim/types'

export interface Atmosphere {
  zenith: THREE.Color
  horizon: THREE.Color
  /** Fog colour = horizon, so distant terrain melts into the sky. */
  fog: THREE.Color
  sunColor: THREE.Color
  sunIntensity: number
  /** Unit vector towards the sun (or the moon at night — shadows follow the brighter light). */
  sunDir: THREE.Vector3
  /** 0..1 visibility of the sun disc. */
  sunDisc: number
  hemiSky: THREE.Color
  hemiGround: THREE.Color
  hemiIntensity: number
  overcast: number
}

const C = (hex: number) => new THREE.Color(hex)
const ZENITH_DAY = C(0x4f86c6)
const HORIZON_DAY = C(0xb9d3e8)
const ZENITH_NIGHT = C(0x050a18)
const HORIZON_NIGHT = C(0x16213a)
const HORIZON_DUSK = C(0xf0a46a)
const ZENITH_DUSK = C(0x55648f)
const STORM = C(0x5a6470)
const SUN_DAY = C(0xfff2dd)
const SUN_DUSK = C(0xffb27a)
const MOON = C(0x8899cc)

export function overcastOf(w: WeatherState): number {
  return w.kind === 'clear' ? 0 : w.kind === 'overcast' ? 0.4 : 0.7
}

/** `dl` = daylight 0..1, `hour` 0..24. */
export function atmosphere(dl: number, hour: number, w: WeatherState, out?: Atmosphere): Atmosphere {
  const a: Atmosphere = out ?? {
    zenith: new THREE.Color(), horizon: new THREE.Color(), fog: new THREE.Color(), sunColor: new THREE.Color(), sunIntensity: 0,
    sunDir: new THREE.Vector3(), sunDisc: 0, hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiIntensity: 0, overcast: 0,
  }
  const overcast = overcastOf(w)
  const dusk = Math.max(0, 1 - Math.abs(dl - 0.35) * 3) * (dl > 0 && dl < 1 ? 1 : 0)
  a.zenith.copy(ZENITH_NIGHT).lerp(ZENITH_DAY, dl).lerp(ZENITH_DUSK, dusk * 0.4)
  a.horizon.copy(HORIZON_NIGHT).lerp(HORIZON_DAY, dl).lerp(HORIZON_DUSK, dusk * 0.55)
  const storm = STORM.clone().multiplyScalar(0.25 + dl * 0.75)
  a.zenith.lerp(storm, overcast)
  a.horizon.lerp(storm, overcast * 0.9)
  a.fog.copy(a.horizon)
  // Sun path east → west (same as before: angle 0 at 6:00, π at 18:00); moon opposite at night.
  const ang = ((hour - 6) / 12) * Math.PI
  const elev = Math.sin(ang)
  if (elev > -0.05) a.sunDir.set(Math.cos(ang), Math.max(0.12, elev), 0.3).normalize()
  else a.sunDir.set(-Math.cos(ang), Math.max(0.25, -elev), 0.3).normalize()
  a.sunDisc = Math.max(0, Math.min(1, (elev + 0.03) * 8)) * (1 - overcast)
  a.sunColor.copy(dl > 0.2 ? SUN_DAY : MOON)
  if (dl > 0.2) a.sunColor.lerp(SUN_DUSK, dusk * 0.6)
  a.sunIntensity = dl * 2.2 * (1 - overcast * 0.6) + 0.12
  a.hemiSky.copy(a.zenith).lerp(C(0xbfd8ff), 0.5)
  a.hemiGround.set(0x5a4a30)
  a.hemiIntensity = 0.35 + dl * 0.9 * (1 - overcast * 0.3)
  a.overcast = overcast
  return a
}
