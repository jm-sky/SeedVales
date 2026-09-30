/**
 * Weather: seasonal Markov rolls every few calendar hours. Fog can combine with any kind.
 * Rain raises ground wetness (waters fields); storms/rain make NPC/animals seek shelter.
 * @domain time
 * @subdomain weather
 */
import type { Rng } from '../core/rng'
import type { WeatherKind, WeatherState } from './types'
import { hourOf, seasonOf } from './time'

const TABLE: Record<string, [WeatherKind, number][]> = {
  spring: [['clear', 40], ['overcast', 25], ['rain', 28], ['storm', 7]],
  summer: [['clear', 55], ['overcast', 20], ['rain', 15], ['storm', 10]],
  autumn: [['clear', 25], ['overcast', 35], ['rain', 33], ['storm', 7]],
  winter: [['clear', 30], ['overcast', 30], ['snow', 35], ['storm', 5]],
}
const BASE_TEMP = { spring: 11, summer: 21, autumn: 9, winter: -3 }

export function initialWeather(cal: number): WeatherState {
  return { kind: 'clear', fog: 0.1, intensity: 0, until: cal + 4 * 3600, temp: BASE_TEMP[seasonOf(cal)], wetness: 0.3 }
}

export function updateWeather(w: WeatherState, cal: number, dtCalS: number, rng: Rng) {
  const season = seasonOf(cal)
  if (cal >= w.until) {
    const table = TABLE[season]!
    // Persistence: 35% keep current kind if allowed this season.
    const keep = table.some(([k]) => k === w.kind) && rng.chance(0.35)
    w.kind = keep ? w.kind : rng.weighted(table, (e) => e[1])[0]
    if (season === 'winter' && w.kind === 'rain') w.kind = 'snow'
    w.intensity = w.kind === 'clear' ? 0 : w.kind === 'overcast' ? 0.2 : rng.range(0.4, 1)
    const h = hourOf(cal)
    const morning = h > 4 && h < 9
    w.fog = rng.chance(morning ? 0.45 : 0.15) ? rng.range(0.3, 0.9) : rng.range(0, 0.15)
    w.until = cal + rng.range(3, 9) * 3600
  }
  const hDt = dtCalS / 3600
  const wetting = w.kind === 'rain' || w.kind === 'storm' ? 0.25 * w.intensity : w.kind === 'snow' ? 0.02 : 0
  const drying = w.kind === 'clear' ? 0.03 : 0.012
  w.wetness = Math.min(1, Math.max(0, w.wetness + (wetting - drying) * hDt))
  const h = hourOf(cal)
  const target = BASE_TEMP[season] + Math.sin(((h - 9) / 24) * Math.PI * 2) * 5 - (w.kind === 'storm' || w.kind === 'rain' ? 3 : 0)
  w.temp += (target - w.temp) * Math.min(1, hDt * 0.5)
}

export const isBadWeather = (w: WeatherState) => (w.kind === 'rain' && w.intensity > 0.5) || w.kind === 'storm' || (w.kind === 'snow' && w.intensity > 0.7)

export const WEATHER_NAMES: Record<WeatherKind, string> = {
  clear: 'Słonecznie',
  overcast: 'Pochmurno',
  rain: 'Deszcz',
  storm: 'Burza',
  snow: 'Śnieg',
}
