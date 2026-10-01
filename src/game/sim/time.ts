/**
 * Calendar helpers. `cal` = calendar seconds since world start (day 0 00:00, spring).
 * @domain time
 */
import { DAYS_PER_MONTH, DAYS_PER_SEASON, DAYS_PER_YEAR } from '../config/calibration'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
export const SEASON_NAMES: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }
const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February']

export const dayIndex = (cal: number) => Math.floor(cal / 86400)
export const hourOf = (cal: number) => (cal % 86400) / 3600
export const dayOfYear = (cal: number) => dayIndex(cal) % DAYS_PER_YEAR
export const yearOf = (cal: number) => Math.floor(dayIndex(cal) / DAYS_PER_YEAR) + 1
export const seasonOf = (cal: number): Season => SEASONS[Math.floor(dayOfYear(cal) / DAYS_PER_SEASON) % 4]!
export const monthName = (cal: number) => MONTHS[Math.floor(dayOfYear(cal) / DAYS_PER_MONTH)]!

/** Sunrise/sunset hours by season (day length varies). */
export function dayBounds(cal: number): [number, number] {
  // Smooth yearly curve: longest mid-summer.
  const t = (dayOfYear(cal) + 0.5) / DAYS_PER_YEAR // 0..1 starting spring
  const len = 12 + 3.5 * Math.sin((t - 0.125) * Math.PI * 2) // 8.5h .. 15.5h
  return [12 - len / 2, 12 + len / 2]
}

/** 0 at night, 1 at noon (smooth), used for lighting and AI. */
export function daylight(cal: number): number {
  const h = hourOf(cal)
  const [rise, set] = dayBounds(cal)
  if (h < rise - 0.75 || h > set + 0.75) return 0
  if (h < rise + 0.75) return (h - (rise - 0.75)) / 1.5
  if (h > set - 0.75) return (set + 0.75 - h) / 1.5
  return 1
}

export const isNight = (cal: number) => daylight(cal) < 0.2

export function formatClock(cal: number): string {
  const h = Math.floor(hourOf(cal))
  const m = Math.floor((cal % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDate(cal: number): string {
  const d = (dayOfYear(cal) % DAYS_PER_MONTH) + 1
  return `${d} ${monthName(cal)}, year ${yearOf(cal)}`
}

/** Seasonal growth factor for crops/forage. */
export function growthFactor(cal: number): number {
  return { spring: 1, summer: 1.2, autumn: 0.6, winter: 0 }[seasonOf(cal)]
}
