/**
 * Game orchestrator: loads/generates the world (cache), creates Sim + Renderer, runs the frame loop,
 * maps input to player intents and exposes high-level actions for UI and debug API.
 * @domain game
 */
import type { QualityProfile } from './render/Renderer'
import type { InteractOption, Target, TargetRef } from './sim/interact'
import type { SimEvent } from './sim/sim'
import type { GameState, ItemStack, WeaponKind } from './sim/types'
import type { WorldData } from './world/types'
import { Ambience } from './audio/ambience'
import { itemDef } from './data/items'
import { blueprintById, recipeById } from './data/recipes'
import { perf } from './diag/perf'
import { attachControls, input, type KeyAction, moveAxes, wantsRun } from './input/controls'
import { Renderer } from './render/Renderer'
import { checkWorldCompat, loadWorldCache, newSlotId, readSave, readSaveMeta, storeWorldCache, writeSave } from './save/db'
import { snapshot } from './save/snapshot'
import { consume, dropItem } from './sim/actions'
import { placeSite, startBuildWork } from './sim/build'
import { meleeAttack } from './sim/combat'
import { canCraft, craftTime } from './sim/craft'
import { findTargets, nextTarget, runOption, startSleep, targetKey, targetOptions, waterTarget } from './sim/interact'
import { addItem, removeStack } from './sim/inventory'
import { setPrimary, switchWeapon } from './sim/loadout'
import { clearWaypoint, setWaypoint } from './sim/navigation'
import { createNewGame } from './sim/newGame'
import { cancelActivity, playerInput, sleepComfort, startActivity } from './sim/player'
import { Sim } from './sim/sim'
import { installSystems } from './sim/worldSystems'
import { generateWorld } from './world/gen/generate'

export interface GameOptions {
  seed: number
  slot?: string
  quality?: QualityProfile
  onProgress?: (label: string) => void
}

export type Panel = null | 'settings' | 'inventory' | 'character' | 'craft' | 'quests' | 'trade' | 'storage' | 'build' | 'quick' | 'map' | 'dialog' | 'orders' | 'menu' | 'interact'

export async function loadWorld(seed: number, onProgress?: (l: string) => void): Promise<WorldData> {
  onProgress?.('Szukam świata w pamięci podręcznej…')
  const cached = await loadWorldCache(seed)
  if (cached) {
    perf.count('world.cacheHit')
    return cached
  }
  onProgress?.('Generuję świat (teren, rzeki, osady, drogi)…')
  await new Promise((r) => setTimeout(r, 30))
  const w = generateWorld(seed)
  perf.record('world.generate', w.genMs)
  storeWorldCache(w).catch((e) => console.warn('world cache write failed', e))
  return w
}

export class Game {
  sim: Sim
  renderer: Renderer
  canvas: HTMLCanvasElement
  target: Target | null = null
  options: InteractOption[] = []
  panel: Panel = null
  panelRef: TargetRef | null = null
  /** Target chosen with Tab (UI-06); kept while it stays in range. */
  pinnedTarget: string | null = null
  /** Interactive objects currently in range (for the Tab hint). */
  targetCount = 0
  slot: string
  /** Player-given name of the current save slot (UI-05). */
  saveName?: string
  running = false
  private raf = 0
  private last = 0
  private detach: () => void
  private uiListeners = new Set<() => void>()
  private uiTimer = 0
  showDiag = false
  toast = ''
  toastUntil = 0
  audio = new Ambience()
  private audioEvents: SimEvent[] = []
  isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  private constructor(canvas: HTMLCanvasElement, sim: Sim, renderer: Renderer, slot: string) {
    this.canvas = canvas
    this.sim = sim
    this.renderer = renderer
    this.slot = slot
    const unlockAudio = () => this.audio.start()
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    this.detach = attachControls(canvas, {
      onAction: (a) => this.onKey(a),
      onAttack: () => this.attack(),
      isUiOpen: () => this.panel !== null,
    })
  }

  static async create(canvas: HTMLCanvasElement, o: GameOptions): Promise<Game> {
    let state: GameState | null = null
    if (o.slot) {
      o.onProgress?.('Wczytuję zapis…')
      state = await readSave(o.slot)
    }
    const seed = state?.seed ?? o.seed
    const world = await loadWorld(seed, o.onProgress)
    if (state) checkWorldCompat(state, world)
    o.onProgress?.('Zasiedlam osady…')
    state ??= createNewGame(world)
    const sim = new Sim(world, state)
    installSystems(sim)
    const renderer = new Renderer(canvas, sim, o.quality ?? 'medium')
    const game = new Game(canvas, sim, renderer, o.slot ?? newSlotId(seed))
    if (o.slot) game.saveName = (await readSaveMeta(o.slot).catch(() => undefined))?.name
    renderer.resize(canvas.clientWidth, canvas.clientHeight)
    o.onProgress?.('Wczytuję modele…')
    await renderer.loadAssets(o.onProgress)
    return game
  }

  /** Player preferences (UI-05): quality switches at runtime, volumes go to the audio mixer. */
  applySettings(s: { quality: QualityProfile; volume: { master: number; ambient: number; effects: number } }) {
    this.renderer.setQuality(s.quality)
    this.audio.setVolumes(s.volume)
    this.notify()
  }

  onUi(fn: () => void) {
    this.uiListeners.add(fn)
    return () => this.uiListeners.delete(fn)
  }

  private notify() {
    for (const f of this.uiListeners) f()
  }

  start() {
    this.running = true
    this.last = performance.now()
    const loop = (t: number) => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      this.frame(Math.min(0.25, (t - this.last) / 1000))
      this.last = t
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.detach()
    this.audio.dispose()
    document.exitPointerLock?.()
    this.renderer.renderer.dispose()
    // Release the WebGL context now (in-game "new game" remounts; browsers cap live contexts).
    this.renderer.renderer.forceContextLoss()
  }

  /** One frame: input → sim → render → UI sync. Exposed for tests/benchmarks. */
  frame(dt: number) {
    perf.begin('frame')
    const sim = this.sim
    const rig = this.renderer.rig
    // Camera look.
    const sens = this.isTouch ? 0.006 : 0.0025
    rig.rotate(input.lookDX * sens, input.lookDY * sens)
    input.lookDX = input.lookDY = 0
    if (input.zoom) {
      rig.zoom(input.zoom)
      input.zoom = 0
    }
    // Movement intent relative to camera.
    const [ax, ay] = this.panel && this.panel !== 'quick' ? [0, 0] : moveAxes()
    const [fx, fz] = rig.forward()
    playerInput.mx = fx * ay - fz * ax
    playerInput.mz = fz * ay + fx * ax
    playerInput.run = wantsRun()
    playerInput.yaw = rig.yaw
    playerInput.pitch = rig.pitch * -0.6 + 0.12
    playerInput.drawing = input.primary && !this.panel
    // Combat facing follows camera.
    if (sim.player.combat && Math.hypot(ax, ay) < 0.1) sim.player.rot = rig.yaw
    sim.interruptReason = null
    // Game menu pauses the world (single-player).
    if (this.panel !== 'menu' && this.panel !== 'settings') sim.step(dt * sim.timeScale)
    if (sim.interruptReason && sim.timeScale > 1) sim.timeScale = 1
    this.renderer.markerAt = this.panel || sim.state.px.activity ? null : this.target
    this.renderer.render(dt)
    if (this.audioEvents.length < 200) this.audioEvents.push(...sim.events)
    sim.events.length = 0
    // Target & UI (5 Hz).
    this.uiTimer -= dt
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.2
      this.refreshTarget()
      perf.measure('audio.update', () => this.audio.update(0.2, sim, this.audioEvents))
      this.audioEvents.length = 0
      perf.gauge('ui.listeners', this.uiListeners.size)
      perf.measure('ui.sync', () => this.notify())
    }
    perf.end('frame')
  }

  toggleSneak() {
    this.sim.state.px.sneaking = !this.sim.state.px.sneaking
    this.notify()
  }

  showToast(msg: string) {
    if (!msg) return
    this.toast = msg
    this.toastUntil = performance.now() + 3500
  }

  // ---------------- Actions for UI ----------------

  private onKey(a: KeyAction) {
    switch (a) {
      case 'build':
        this.togglePanel('build')
        break
      case 'character':
        this.togglePanel('character')
        break
      case 'combat':
        this.toggleCombat()
        break
      case 'craft':
        this.togglePanel('craft')
        break
      case 'cycleTarget':
        this.cycleTarget()
        break
      case 'diag':
        this.showDiag = !this.showDiag
        break
      case 'escape':
        if (this.sim.state.px.activity) cancelActivity(this.sim, 'Przerwano.')
        else if (this.sim.state.px.autopilot) this.sim.state.px.autopilot = undefined
        else this.panel = this.panel ? null : 'menu'
        break
      case 'interact':
        this.interact()
        break
      case 'inventory':
        this.togglePanel('inventory')
        break
      case 'map':
        this.togglePanel('map')
        break
      case 'quests':
        this.togglePanel('quests')
        break
      case 'quick':
        this.togglePanel('quick')
        break
      case 'save':
        void this.save()
        break
      case 'sneak':
        this.toggleSneak()
        break
      case 'switchWeapon':
        this.switchWeapon()
        break
      case 'torch':
        this.toggleTorch()
        break
      case 'useBandage':
        this.useFirst(['bandage', 'salve'])
        break
    }
    if (this.panel) document.exitPointerLock?.()
    this.notify()
  }

  togglePanel(p: Panel) {
    this.panel = this.panel === p ? null : p
    if (this.panel) document.exitPointerLock?.()
    this.notify()
  }

  closePanel() {
    this.panel = null
    this.panelRef = null
    this.notify()
  }

  interact() {
    if (!this.target) return
    const enabled = this.options.filter((o) => o.enabled)
    if (this.options.length === 1 && enabled.length === 1) this.choose(enabled[0]!)
    else if (this.options.length) {
      this.panel = 'interact'
      this.panelRef = this.target.ref
      document.exitPointerLock?.()
    }
    this.notify()
  }

  choose(o: InteractOption, ref: TargetRef | null = this.target?.ref ?? null) {
    if (!ref || !o.enabled) {
      if (o.reason) this.showToast(o.reason)
      return
    }
    if (o.panel) {
      this.panel = o.panel
      this.panelRef = ref
      document.exitPointerLock?.()
    } else {
      if (o.id === 'build') {
        const site = this.sim.state.sites.find((s) => ref.type === 'site' && s.id === ref.id)
        if (site) this.showToast(startBuildWork(this.sim, site).msg)
      } else this.showToast(runOption(this.sim, ref, o.id))
      this.panel = null
    }
    this.notify()
  }

  attack() {
    const p = this.sim.player
    if (this.sim.state.px.activity || p.vitals.ko) return
    const w = p.eq.main ? itemDef(p.eq.main.id).weapon : undefined
    if (w?.kind === 'ranged') return // bow uses hold/release
    if (!p.combat) this.toggleCombat()
    p.rot = this.renderer.rig.yaw
    // Mobile aid (vision §27): wide auto-target cone and auto-facing the chosen target.
    const hit = meleeAttack(this.sim, p, this.isTouch ? 220 : 80)
    if (hit && this.isTouch) p.rot = Math.atan2(hit.x - p.x, hit.z - p.z)
  }

  private refreshTarget() {
    const sim = this.sim
    if (sim.player.vitals.ko && sim.player.vitals.ko.until > sim.state.time.play) {
      this.target = null
      this.pinnedTarget = null
      this.targetCount = 0
    } else {
      const list = findTargets(sim, sim.player.rot)
      this.targetCount = list.length
      const pinned = this.pinnedTarget ? list.find((t) => targetKey(t.ref) === this.pinnedTarget) : undefined
      if (!pinned) this.pinnedTarget = null
      this.target = pinned ?? list[0] ?? waterTarget(sim, sim.player.rot)
    }
    this.options = this.target ? targetOptions(sim, this.target.ref) : []
  }

  /** Tab / mobile "Cel": next interactive object in range (distance + facing order), pinned until out of range. */
  cycleTarget() {
    const list = findTargets(this.sim, this.sim.player.rot)
    const next = nextTarget(list, this.target ? targetKey(this.target.ref) : null)
    if (!next) return this.showToast('Brak celów w zasięgu.')
    this.pinnedTarget = targetKey(next.ref)
    this.refreshTarget()
    this.notify()
  }

  /** Quick switch between the primary melee and ranged weapon (X / mobile button). */
  switchWeapon(kind?: WeaponKind) {
    this.showToast(switchWeapon(this.sim, kind))
    this.notify()
  }

  setPrimaryWeapon(kind: WeaponKind, id: string | undefined) {
    this.showToast(setPrimary(this.sim, kind, id))
    this.notify()
  }

  toggleCombat() {
    const p = this.sim.player
    p.combat = !p.combat
    this.showToast(p.combat ? 'Broń dobyta (tryb walki)' : 'Broń schowana')
  }

  toggleTorch() {
    const p = this.sim.player
    if (p.eq.off?.id === 'torch') {
      addItem(p.inv, p.eq.off)
      p.eq.off = undefined
      this.showToast('Schowano pochodnię.')
      return
    }
    const t = p.inv.items.find((s) => s.id === 'torch')
    if (!t) return this.showToast('Nie masz pochodni.')
    if (p.eq.main && itemDef(p.eq.main.id).weapon?.twoHanded) return this.showToast('Obie ręce zajęte (broń dwuręczna).')
    p.eq.off = removeStack(p.inv, t, 1) ?? undefined
    this.showToast('Pochodnia w lewej ręce.')
  }

  dropTorchLit() {
    const p = this.sim.player
    if (p.eq.off?.id !== 'torch') return this.showToast('Nie trzymasz pochodni.')
    dropItem(this.sim, p.x + Math.sin(p.rot), p.z + Math.cos(p.rot), p.eq.off, true)
    p.eq.off = undefined
    this.showToast('Rzucono płonącą pochodnię.')
  }

  useFirst(ids: string[]) {
    const s = this.sim.player.inv.items.find((i) => ids.includes(i.id))
    if (!s) return this.showToast('Brak przedmiotu.')
    this.showToast(consume(this.sim, this.sim.player, s).msg)
  }

  useItem(s: ItemStack) {
    const p = this.sim.player
    const d = itemDef(s.id)
    if (d.weapon || (d.caps && d.caps.length && !d.waterCapacity)) {
      const moved = removeStack(p.inv, s)!
      if (p.eq.main) addItem(p.inv, p.eq.main)
      p.eq.main = moved
      this.showToast(`W ręce: ${d.name}`)
    } else if (d.armor) {
      const key = `${d.armor.slot}_${d.armor.layer}` as const
      const moved = removeStack(p.inv, s, 1)!
      const prev = p.eq.armor[key]
      if (prev) addItem(p.inv, prev)
      p.eq.armor[key] = moved
      this.showToast(`Założono: ${d.name}`)
    } else if (d.waterCapacity) {
      if ((s.water ?? 0) <= 0) return this.showToast('Pusty.')
      s.water! -= 1
      p.vitals.thirst = Math.min(100, p.vitals.thirst + 30)
      this.showToast('Łyk wody.')
    } else this.showToast(consume(this.sim, p, s).msg)
    this.notify()
  }

  unequip(slot: 'main' | 'off' | string) {
    const p = this.sim.player
    if (slot === 'main' && p.eq.main) {
      addItem(p.inv, p.eq.main)
      p.eq.main = undefined
    } else if (slot === 'off' && p.eq.off) {
      addItem(p.inv, p.eq.off)
      p.eq.off = undefined
    } else {
      const k = slot as keyof typeof p.eq.armor
      const a = p.eq.armor[k]
      if (a) {
        addItem(p.inv, a)
        delete p.eq.armor[k]
      }
    }
    this.notify()
  }

  drop(s: ItemStack) {
    const p = this.sim.player
    const moved = removeStack(p.inv, s)
    if (moved) dropItem(this.sim, p.x + Math.sin(p.rot) * 0.8, p.z + Math.cos(p.rot) * 0.8, moved)
    this.notify()
  }

  craft(recipeId: string) {
    const r = recipeById(recipeId)
    if (!r) return
    const c = canCraft(this.sim, this.sim.player, r)
    if (!c.ok) return this.showToast(c.reason!)
    startActivity(this.sim, { kind: 'craft', label: `Wytwarzanie: ${r.name}`, total: craftTime(this.sim.player, r), data: r.id })
    this.panel = null
    this.notify()
  }

  placeBlueprint(id: string) {
    const bp = blueprintById(id)
    const p = this.sim.player
    if (!bp) return
    const d = Math.max(bp.hw, bp.hd) + 1.8
    const x = p.x + Math.sin(p.rot) * d
    const z = p.z + Math.cos(p.rot) * d
    const r = placeSite(this.sim, id, x, z, p.rot)
    this.showToast(r.msg)
    if (r.ok) this.sim.rebuildBuildingIndex()
    this.panel = null
    this.notify()
  }

  quick(action: 'level' | 'dig' | 'raise' | 'sleep' | 'rest' | 'torch' | 'drop_torch' | 'campfire') {
    const p = this.sim.player
    const fx = p.x + Math.sin(p.rot) * 2
    const fz = p.z + Math.cos(p.rot) * 2
    switch (action) {
      case 'campfire':
        this.placeBlueprint('campfire')
        break
      case 'dig':
        startActivity(this.sim, { kind: 'dig', label: 'Kopanie', total: 4, data: `${fx},${fz}` })
        break
      case 'drop_torch':
        this.dropTorchLit()
        break
      case 'level':
        startActivity(this.sim, { kind: 'level', label: 'Wyrównywanie', total: 6, data: `${fx},${fz},${this.sim.terrain.heightAt(p.x, p.z)}` })
        break
      case 'raise':
        startActivity(this.sim, { kind: 'raise', label: 'Usypywanie', total: 4, data: `${fx},${fz}` })
        break
      case 'rest':
        startActivity(this.sim, { kind: 'rest', label: 'Odpoczynek', total: 150, accel: 20 })
        break
      case 'sleep':
        this.showToast(startSleep(this.sim, sleepComfort(this.sim, null)))
        break
      case 'torch':
        this.toggleTorch()
        break
    }
    this.panel = null
    this.notify()
  }

  /** Map waypoint (UI-04): shown on the map and by the minimap arrow until reached or cleared. */
  setWaypoint(x: number, z: number, label?: string) {
    this.showToast(setWaypoint(this.sim, x, z, label))
    this.notify()
  }

  clearWaypoint() {
    clearWaypoint(this.sim)
    this.notify()
  }

  /** Autopilot along the road towards a settlement (no teleport; time can be sped up 3×). */
  autopilotTo(settlementId: number): string {
    const sim = this.sim
    const p = sim.player
    for (const r of sim.world.roads) {
      if (r.from !== settlementId && r.to !== settlementId) continue
      let bi = -1
      let bd = Infinity
      r.points.forEach((pt, i) => {
        const d = Math.hypot(pt.x - p.x, pt.z - p.z)
        if (d < bd) {
          bd = d
          bi = i
        }
      })
      if (bd > 80) continue
      const dir: 1 | -1 = r.to === settlementId ? 1 : -1
      sim.state.px.autopilot = { roadId: r.id, idx: bi, dir }
      this.panel = null
      return `Autopilot: droga do ${sim.world.settlements[settlementId]!.name} (${Math.round(r.length)} m). Ruch lub Esc przerywa.`
    }
    return 'Musisz stać przy drodze prowadzącej do tej osady.'
  }

  /** Saves; on failure (e.g. quota) shows the reason and returns '' — never pretends success. */
  /** Nearest settlement name (save list metadata). */
  private placeName(): string | undefined {
    const p = this.sim.player
    let best: { name: string; d: number } | undefined
    for (const s of this.sim.world.settlements) {
      const d = Math.hypot(s.x - p.x, s.z - p.z) - s.radius
      if (!best || d < best.d) best = { name: s.name, d }
    }
    return best && (best.d < 150 ? best.name : `okolice: ${best.name}`)
  }

  /** Saves into a new slot under a player-given name; later quick saves go to that slot. */
  async saveAs(name: string): Promise<string> {
    const slot = newSlotId(this.sim.state.seed)
    const prev = { slot: this.slot, name: this.saveName }
    this.slot = slot
    this.saveName = name.trim() || undefined
    const ok = await this.save(slot)
    if (!ok) Object.assign(this, { slot: prev.slot, saveName: prev.name })
    return ok
  }

  async save(slot = this.slot): Promise<string> {
    try {
      await writeSave(slot, snapshot(this.sim), { name: this.saveName, place: this.placeName() })
    } catch (e) {
      this.showToast(e instanceof Error ? e.message : String(e))
      this.notify()
      return ''
    }
    this.showToast(this.saveName ? `Zapisano: ${this.saveName}` : 'Zapisano grę.')
    this.notify()
    return slot
  }

  recipeAvailable(id: string) {
    const r = recipeById(id)
    return r ? canCraft(this.sim, this.sim.player, r) : { ok: false }
  }

  get timeScale() {
    return this.sim.timeScale
  }

  debugTeleport(x: number, z: number) {
    const p = this.sim.player
    p.x = x
    p.z = z
    p.y = this.sim.terrain.heightAt(x, z)
    this.sim.actors.update(p)
  }
}
