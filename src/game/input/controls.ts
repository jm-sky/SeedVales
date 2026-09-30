/**
 * Input: keyboard/mouse (pointer-lock look) and touch (virtual joystick + camera drag, set by UI).
 * Produces intents; never mutates the simulation directly except through Game actions.
 * @domain input
 */

export interface InputState {
  keys: Set<string>
  /** Analog stick from mobile UI (-1..1). */
  stickX: number
  stickY: number
  run: boolean
  primary: boolean
  lookDX: number
  lookDY: number
  zoom: number
}

export const input: InputState = { keys: new Set(), stickX: 0, stickY: 0, run: false, primary: false, lookDX: 0, lookDY: 0, zoom: 0 }

export type KeyAction = 'interact' | 'inventory' | 'craft' | 'quests' | 'map' | 'combat' | 'sneak' | 'escape' | 'diag' | 'quick' | 'save' | 'build' | 'torch' | 'useBandage'

export interface ControlHandlers {
  onAction(a: KeyAction): void
  onAttack(): void
  isUiOpen(): boolean
}

const KEYMAP: Record<string, KeyAction> = {
  KeyE: 'interact',
  KeyI: 'inventory',
  KeyC: 'craft',
  KeyJ: 'quests',
  KeyM: 'map',
  KeyR: 'combat',
  KeyZ: 'sneak',
  Escape: 'escape',
  F3: 'diag',
  KeyQ: 'quick',
  F5: 'save',
  KeyB: 'build',
  KeyT: 'torch',
  KeyH: 'useBandage',
}

export function attachControls(canvas: HTMLCanvasElement, h: ControlHandlers): () => void {
  const typing = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
  }
  const kd = (e: KeyboardEvent) => {
    if (typing(e)) return
    const a = KEYMAP[e.code]
    if (a) {
      if (e.code === 'F3' || e.code === 'F5') e.preventDefault()
      if (!e.repeat) h.onAction(a)
    }
    input.keys.add(e.code)
  }
  const ku = (e: KeyboardEvent) => input.keys.delete(e.code)
  const md = (e: MouseEvent) => {
    if (h.isUiOpen()) return
    if (e.button === 0) {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.()
        return
      }
      input.primary = true
      h.onAttack()
    }
    if (e.button === 2) canvas.requestPointerLock?.()
  }
  const mu = (e: MouseEvent) => {
    if (e.button === 0) input.primary = false
  }
  const mm = (e: MouseEvent) => {
    if (document.pointerLockElement === canvas) {
      input.lookDX += e.movementX
      input.lookDY += e.movementY
    }
  }
  const wheel = (e: WheelEvent) => {
    if (h.isUiOpen()) return
    input.zoom += Math.sign(e.deltaY) * 0.12
  }
  const blur = () => {
    input.keys.clear()
    input.primary = false
  }
  const ctx = (e: Event) => e.preventDefault()
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  canvas.addEventListener('mousedown', md)
  window.addEventListener('mouseup', mu)
  window.addEventListener('mousemove', mm)
  canvas.addEventListener('wheel', wheel, { passive: true })
  canvas.addEventListener('contextmenu', ctx)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', kd)
    window.removeEventListener('keyup', ku)
    canvas.removeEventListener('mousedown', md)
    window.removeEventListener('mouseup', mu)
    window.removeEventListener('mousemove', mm)
    canvas.removeEventListener('wheel', wheel)
    canvas.removeEventListener('contextmenu', ctx)
    window.removeEventListener('blur', blur)
  }
}

/** Movement vector from keys or stick, in camera space: [right, forward]. */
export function moveAxes(): [number, number] {
  const k = input.keys
  let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
  let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
  if (Math.abs(input.stickX) > 0.08 || Math.abs(input.stickY) > 0.08) {
    x = input.stickX
    y = input.stickY
  }
  const l = Math.hypot(x, y)
  return l > 1 ? [x / l, y / l] : [x, y]
}

export const wantsRun = () => input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || input.run
