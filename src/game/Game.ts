/**
 * Game orchestrator: loads/generates the world (cache), creates Sim + Renderer, runs the frame loop,
 * maps input to player intents and exposes high-level actions for UI and debug API.
 * @domain game
 */
import type { QualityProfile } from './render/Renderer'
import type { InteractOption, Target, TargetRef } from './sim/interact'
import type { SimEvent } from './sim/sim'
import type { Actor, Building, CompanionRisk, CompanionTask, GameState, Human, ItemStack, WeaponKind } from './sim/types'
import type { WorldData } from './world/types'
import { Ambience } from './audio/ambience'
import { COMBAT_LOCK, JUMP } from './config/calibration'
import { angleDiff } from './core/math'
import { itemDef } from './data/items'
import { blueprintById, recipeById } from './data/recipes'
import { perf } from './diag/perf'
import { attachControls, input, type KeyAction, moveAxes, wantsRun } from './input/controls'
import { Renderer } from './render/Renderer'
import { checkWorldCompat, loadWorldCache, newSlotId, readSave, readSaveMeta, storeWorldCache, writeSave } from './save/db'
import { snapshot } from './save/snapshot'
import { consume, dropItem } from './sim/actions'
import { canPlace, placeSite, startBuildWork } from './sim/build'
import { loadHeavy, parkCart, pushFromPack } from './sim/cart'
import { meleeAttack } from './sim/combat'
import { combatCandidates, lockedMove, lockInvalid, nextCombatTarget, turnToward } from './sim/combatTarget'
import { canCraft, craftTime } from './sim/craft'
import { requestDodge } from './sim/dodge'
import { plantTorch } from './sim/fire'
import { giveGift } from './sim/gifts'
import { findTargets, nextTarget, runOption, startSleep, targetKey, targetOptions, transferToStorage, warehouseDepositGain, warehouseTakeCost, waterTarget } from './sim/interact'
import { addItem, removeStack } from './sim/inventory'
import { setPrimary, switchWeapon } from './sim/loadout'
import { repairPlacement, requestJump } from './sim/motion'
import { autopilotToSettlement, clearWaypoint, isExplored, revealAround, setWaypoint, waypointToSettlement } from './sim/navigation'
import { createNewGame } from './sim/newGame'
import { hireCompanion } from './sim/npc/companions'
import { cancelOrder, collectOrder, placeOrder } from './sim/orders'
import { cancelActivity, playerInput, sleepComfort, startActivity } from './sim/player'
import { type JournalEntry, type NpcQuestIcon, npcQuestIcon, questChoose, type QuestChooseResult, questJournal, type QuestMarker, questMarkers, questSay, type QuestSay, type QuestTopic, questTopics } from './sim/questDialog'
import { acceptQuest } from './sim/quests'
import { tryApologize } from './sim/reputation'
import { Sim } from './sim/sim'
import { buyFromNpc, sellToNpc } from './sim/trade'
import { installSystems } from './sim/worldSystems'
import { generateWorld } from './world/gen/generate'
import { deserializeWorld } from './world/serialize'

export interface GameOptions {
  seed: number
  slot?: string
  quality?: QualityProfile
  onProgress?: (label: string) => void
}

export type Panel = null | 'settings' | 'inventory' | 'character' | 'craft' | 'quests' | 'trade' | 'storage' | 'build' | 'quick' | 'map' | 'dialog' | 'orders' | 'menu' | 'interact' | 'gift' | 'hire' | 'journal'

export async function loadWorld(seed: number, onProgress?: (l: string) => void): Promise<WorldData> {
  onProgress?.('Looking for the world in the cache…')
  const cached = await loadWorldCache(seed)
  if (cached) {
    perf.count('world.cacheHit')
    return cached
  }
  // Dev server only: the on-disk world cache (scripts/world-cache-plugin.mjs) — e2e/A/B/bench browsers start
  // with empty IndexedDB, this skips the in-browser generation. Stripped from production builds.
  if (import.meta.env.DEV) {
    try {
      const r = await fetch(`/__sv-world/${seed}`)
      if (r.status === 200) {
        const w = deserializeWorld(new Uint8Array(await r.arrayBuffer()))
        perf.count('world.devCacheHit')
        storeWorldCache(w).catch((e) => console.warn('world cache write failed', e))
        return w
      }
    } catch {
      // no dev cache — generate below
    }
  }
  onProgress?.('Generating the world (terrain, rivers, settlements, roads)…')
  await new Promise((r) => setTimeout(r, 30))
  const w = generateWorld(seed)
  perf.record('world.generate', w.genMs)
  storeWorldCache(w).catch((e) => console.warn('world cache write failed', e))
  return w
}

/** Labels and quest icons are drawn for villagers this near (m); the name fades in over the last part (NAME_FADE_*). */
const OVERLAY_RANGE_M = 30
export interface NpcOverlay {
  id: number
  name: string
  x: number
  y: number
  dist: number
  icon: NpcQuestIcon | null
}

export class Game {
  sim: Sim
  renderer: Renderer
  canvas: HTMLCanvasElement
  target: Target | null = null
  options: InteractOption[] = []
  panel: Panel = null
  private paced = false
  panelRef: TargetRef | null = null
  /** Target chosen with Tab (UI-06); kept while it stays in range. */
  pinnedTarget: string | null = null
  /** Combat target lock (combat--001): transient, never saved; null = free camera/aim only. */
  combatTargetId: number | null = null
  private lockAwayT = 0
  private manualLookT = 0
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

  /** Kept as a field so `stop()` can remove it if no gesture happened (no retained closure, review 009 F-05). */
  private unlockAudio = () => this.audio.start()

  private constructor(canvas: HTMLCanvasElement, sim: Sim, renderer: Renderer, slot: string) {
    this.canvas = canvas
    this.sim = sim
    this.renderer = renderer
    this.slot = slot
    window.addEventListener('pointerdown', this.unlockAudio, { once: true })
    window.addEventListener('keydown', this.unlockAudio, { once: true })
    this.detach = attachControls(canvas, {
      onAction: (a) => this.onKey(a),
      onAttack: () => this.attack(),
      isUiOpen: () => this.panel !== null,
    })
  }

  static async create(canvas: HTMLCanvasElement, o: GameOptions): Promise<Game> {
    let state: GameState | null = null
    if (o.slot) {
      o.onProgress?.('Loading save…')
      state = await readSave(o.slot)
    }
    const seed = state?.seed ?? o.seed
    const world = await loadWorld(seed, o.onProgress)
    if (state) checkWorldCompat(state, world)
    o.onProgress?.('Populating settlements…')
    state ??= createNewGame(world)
    const sim = new Sim(world, state)
    installSystems(sim)
    revealAround(sim) // the map around the start/save position is known right away (MAP-01)
    const renderer = new Renderer(canvas, sim, o.quality ?? 'medium')
    const game = new Game(canvas, sim, renderer, o.slot ?? newSlotId(seed))
    if (o.slot) game.saveName = (await readSaveMeta(o.slot).catch(() => undefined))?.name
    renderer.resize(canvas.clientWidth, canvas.clientHeight)
    o.onProgress?.('Loading models…')
    await renderer.loadAssets(o.onProgress)
    return game
  }

  /** Player preferences (UI-05): quality switches at runtime, volumes go to the audio mixer. */
  applySettings(s: { quality: QualityProfile; volume: { master: number; ambient: number; effects: number; voices: number } }) {
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
      // RAF pacing (PERF-02): time between callbacks, separate from the synchronous `frame` work.
      if (this.paced) perf.record('raf.interval', t - this.last)
      this.paced = true
      this.frame(Math.min(0.25, (t - this.last) / 1000))
      this.last = t
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.detach()
    window.removeEventListener('pointerdown', this.unlockAudio)
    window.removeEventListener('keydown', this.unlockAudio)
    this.audio.dispose()
    document.exitPointerLock?.()
    this.renderer.gpu.dispose()
    this.renderer.renderer.dispose()
    // Release the WebGL context now (in-game "new game" remounts; browsers cap live contexts).
    this.renderer.renderer.forceContextLoss()
    this.renderer.dispose()
  }

  /** One frame: input → sim → render → UI sync. Exposed for tests/benchmarks. */
  frame(dt: number) {
    perf.begin('frame')
    const sim = this.sim
    const rig = this.renderer.rig
    // Camera look.
    const sens = this.isTouch ? 0.006 : 0.0025
    const manualLook = input.lookDX !== 0 || input.lookDY !== 0
    rig.rotate(input.lookDX * sens, input.lookDY * sens)
    input.lookDX = input.lookDY = 0
    this.manualLookT = manualLook ? COMBAT_LOCK.cameraGraceS : Math.max(0, this.manualLookT - dt)
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
    playerInput.guard = input.secondary && !this.panel
    playerInput.facing = undefined
    const locked = this.updateLock(dt)
    if (locked) {
      // Target-relative controls (not while sprinting: D-COMBAT-1 #2): W/S approach/retreat, A/D orbit; facing stays on the target.
      const bearing = Math.atan2(locked.x - sim.player.x, locked.z - sim.player.z)
      if (!playerInput.run) {
        const m = lockedMove(bearing, ax, ay)
        playerInput.mx = m.mx
        playerInput.mz = m.mz
        playerInput.facing = bearing
      }
      if (Math.hypot(ax, ay) < 0.1) sim.player.rot = bearing
      if (this.manualLookT <= 0) rig.assistYaw(bearing, dt, COMBAT_LOCK.cameraRateRadS)
    } else if (sim.player.combat && Math.hypot(ax, ay) < 0.1) sim.player.rot = rig.yaw // combat facing follows camera
    // Guarding while moving: facing follows the camera so the block arc points where the player looks (strafe/back-pedal).
    if (playerInput.guard && sim.player.combat && playerInput.facing === undefined) playerInput.facing = rig.yaw
    sim.interruptReason = null
    // Game menu pauses the world (single-player).
    if (this.panel !== 'menu' && this.panel !== 'settings') sim.step(dt * sim.timeScale)
    if (sim.interruptReason && sim.timeScale > 1) sim.timeScale = 1
    const lockedActor = this.combatTargetId !== null ? sim.actor(this.combatTargetId) : undefined
    this.renderer.markerAt = this.panel || sim.state.px.activity || lockedActor ? null : this.target
    this.renderer.combatMarkerAt = lockedActor && !this.panel ? { x: lockedActor.x, z: lockedActor.z } : null
    this.renderer.ghostAt = this.panel === 'build' && this.buildPreviewId ? this.blueprintSpot(this.buildPreviewId) : null
    this.renderer.render(dt)
    this.audio.frame(dt, sim)
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
        if (this.sim.state.px.activity) cancelActivity(this.sim, 'Interrupted.')
        else if (this.sim.state.px.autopilot) this.sim.state.px.autopilot = undefined
        else this.panel = this.panel ? null : 'menu'
        break
      case 'interact':
        this.interact()
        break
      case 'inventory':
        this.togglePanel('inventory')
        break
      case 'journal':
        this.togglePanel('journal')
        break
      case 'jump':
        this.jump()
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

  /** Voice line of the NPC behind a panel reference (greeting / farewell). */
  private npcVoice(ref: TargetRef | null, situation: 'greeting' | 'farewell') {
    if (ref?.type !== 'npc') return
    const npc = this.sim.state.npcs.find((n) => n.id === ref.id)
    if (npc) this.audio.voiceLine(npc, situation, this.sim)
  }

  closePanel() {
    if (this.panel === 'dialog') this.npcVoice(this.panelRef, 'farewell')
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
      if (o.panel === 'dialog') this.npcVoice(ref, 'greeting')
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
    if (this.sim.state.px.cart) return this.showToast('Both hands are on the cart — park it first.')
    const w = p.eq.main ? itemDef(p.eq.main.id).weapon : undefined
    if (w?.kind === 'ranged') return // bow uses hold/release
    if (!p.combat) this.toggleCombat()
    const locked = this.combatTargetId !== null ? this.sim.actor(this.combatTargetId) : undefined
    if (locked) {
      // Locked: face the target (D-COMBAT-1) and prefer it; range and cone still apply.
      p.rot = Math.atan2(locked.x - p.x, locked.z - p.z)
      meleeAttack(this.sim, p, this.isTouch ? 220 : 80, locked.id)
      return
    }
    p.rot = this.renderer.rig.yaw
    if (!this.isTouch) this.softAssist()
    // Mobile aid (vision §27): wide auto-target cone and auto-facing the chosen target.
    const hit = meleeAttack(this.sim, p, this.isTouch ? 220 : 80)
    if (hit && this.isTouch) p.rot = Math.atan2(hit.x - p.x, hit.z - p.z)
  }

  /** Unlocked desktop melee: turn at most COMBAT_LOCK.softAssistDeg toward the best target in reach (spatial query, only on a swing). */
  private softAssist() {
    const sim = this.sim
    const p = sim.player
    const list = combatCandidates(sim, p, p.rot)
    const best = list.find((c) => c.dist <= 3 && c.angle < Math.PI / 2)
    if (!best) return
    const want = Math.atan2(best.actor.x - p.x, best.actor.z - p.z)
    p.rot = turnToward(p.rot, want, (COMBAT_LOCK.softAssistDeg * Math.PI) / 180)
    perf.count('combat.softAssist.used')
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

  /** Space / mobile Jump: a small traversal jump (outside panels; combat dodge replaces it in combat once combat--003 exists). */
  jump() {
    if (this.panel) return
    if (this.sim.player.combat) return this.dodge()
    if (!requestJump(this.sim)) {
      const p = this.sim.player
      if (p.vitals.stamina < JUMP.staminaCost) this.showToast('Too tired to jump.')
    }
  }

  /** Combat Space / mobile button: dodge along the pressed direction (camera- or target-relative), backward when none. */
  dodge() {
    const sim = this.sim
    const p = sim.player
    const [ax, ay] = moveAxes()
    const locked = this.combatTargetId !== null ? sim.actor(this.combatTargetId) : undefined
    const [fx, fz] = locked ? [Math.sin(Math.atan2(locked.x - p.x, locked.z - p.z)), Math.cos(Math.atan2(locked.x - p.x, locked.z - p.z))] : this.renderer.rig.forward()
    let dx = fx * ay - fz * ax
    let dz = fz * ay + fx * ax
    if (Math.hypot(ax, ay) < 0.1) {
      dx = -fx // no direction: backward / away from the locked target
      dz = -fz
    }
    const refusal = requestDodge(sim, dx, dz)
    if (refusal && refusal !== 'Not yet.') this.showToast(refusal)
  }

  /** Valid locked actor this frame (drops the lock when it ends), or null. */
  private updateLock(dt: number): Actor | null {
    const id = this.combatTargetId
    if (id === null) return null
    const sim = this.sim
    const p = sim.player
    if (!p.combat) return this.dropLock('combat-off')
    if (p.vitals.ko || p.vitals.dead) return this.dropLock('ko')
    const bad = lockInvalid(sim, p, id)
    if (bad) return this.dropLock(bad)
    const a = sim.actor(id)!
    const away = Math.abs(angleDiff(this.renderer.rig.yaw, Math.atan2(a.x - p.x, a.z - p.z))) > (COMBAT_LOCK.lookAwayDeg * Math.PI) / 180
    this.lockAwayT = away ? this.lockAwayT + dt : 0
    if (this.lockAwayT > COMBAT_LOCK.lookAwayGraceS) return this.dropLock('look-away')
    return a
  }

  private dropLock(reason: string): null {
    if (this.combatTargetId !== null) perf.count(`combat.lock.drop.${reason}`)
    this.combatTargetId = null
    this.lockAwayT = 0
    return null
  }

  /** Combat-mode Tab / mobile Target: acquires or cycles the combat lock (the interaction cycle is untouched outside combat). */
  cycleCombatTarget() {
    const sim = this.sim
    const list = combatCandidates(sim, sim.player, this.renderer.rig.yaw)
    const next = nextCombatTarget(list, this.combatTargetId)
    if (!next) {
      this.dropLock('none')
      return this.showToast('No combat targets in range.')
    }
    perf.count(this.combatTargetId === null ? 'combat.lock.acquire' : 'combat.lock.switch')
    this.combatTargetId = next.actor.id
    this.lockAwayT = 0
    if (sim.state.px.autopilot) sim.state.px.autopilot = undefined // D-COMBAT-1 #7
    this.notify()
  }

  /** Tab / mobile "Cel": next interactive object in range (distance + facing order), pinned until out of range. */
  cycleTarget() {
    if (this.sim.player.combat) return this.cycleCombatTarget()
    const list = findTargets(this.sim, this.sim.player.rot)
    const next = nextTarget(list, this.target ? targetKey(this.target.ref) : null)
    if (!next) return this.showToast('No targets in range.')
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
    if (!p.combat) this.dropLock('combat-off')
    this.showToast(p.combat ? 'Weapon drawn (combat mode)' : 'Weapon sheathed')
  }

  toggleTorch() {
    const p = this.sim.player
    if (p.eq.off?.id === 'torch') {
      addItem(p.inv, p.eq.off)
      p.eq.off = undefined
      this.showToast('Torch put away.')
      return
    }
    const t = p.inv.items.find((s) => s.id === 'torch')
    if (this.sim.state.px.cart) return this.showToast('Both hands are on the cart — park it first.')
    if (!t) return this.showToast('You don\'t have a torch.')
    if (p.eq.main && itemDef(p.eq.main.id).weapon?.twoHanded) return this.showToast('Both hands are busy (two-handed weapon).')
    p.eq.off = removeStack(p.inv, t, 1) ?? undefined
    this.showToast('Torch in your left hand.')
  }

  dropTorchLit() {
    const p = this.sim.player
    if (p.eq.off?.id !== 'torch') return this.showToast('You aren\'t holding a torch.')
    dropItem(this.sim, p.x + Math.sin(p.rot), p.z + Math.cos(p.rot), p.eq.off, true)
    p.eq.off = undefined
    this.showToast('You throw the burning torch.')
  }

  useFirst(ids: string[]) {
    const s = this.sim.player.inv.items.find((i) => ids.includes(i.id))
    if (!s) return this.showToast('No such item.')
    this.showToast(consume(this.sim, this.sim.player, s).msg)
  }

  useItem(s: ItemStack) {
    const p = this.sim.player
    const d = itemDef(s.id)
    if (d.cart) {
      this.showToast(pushFromPack(this.sim, p, s))
      this.closePanel()
      return
    }
    if (this.sim.state.px.cart && (d.weapon || d.caps?.length)) return this.showToast('Both hands are on the cart — park it first.')
    if (d.defence) {
      if (p.eq.main && itemDef(p.eq.main.id).weapon?.twoHanded) return this.showToast('Both hands are busy (two-handed weapon).')
      const moved = removeStack(p.inv, s, 1)!
      if (p.eq.off) addItem(p.inv, p.eq.off) // a torch goes back to the pack
      p.eq.off = moved
      this.showToast(`${d.name} in your off hand — hold right mouse to block.`)
    } else if (d.weapon || (d.caps && d.caps.length && !d.waterCapacity)) {
      const moved = removeStack(p.inv, s)!
      if (p.eq.main) addItem(p.inv, p.eq.main)
      p.eq.main = moved
      this.showToast(`In hand: ${d.name}`)
    } else if (d.armor) {
      const key = `${d.armor.slot}_${d.armor.layer}` as const
      const moved = removeStack(p.inv, s, 1)!
      const prev = p.eq.armor[key]
      if (prev) addItem(p.inv, prev)
      p.eq.armor[key] = moved
      this.showToast(`Equipped: ${d.name}`)
    } else if (d.waterCapacity) {
      if ((s.water ?? 0) <= 0) return this.showToast('It\'s empty.')
      s.water! -= 1
      p.vitals.thirst = Math.min(100, p.vitals.thirst + 30)
      this.showToast('A sip of water.')
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
    startActivity(this.sim, { kind: 'craft', label: `Crafting: ${r.name}`, total: craftTime(this.sim.player, r), data: r.id })
    this.panel = null
    this.notify()
  }

  /** Blueprint highlighted in the building panel (its placement ghost is drawn), or null. */
  buildPreviewId: string | null = null

  /** The one place where a blueprint is put: ahead of the player, clear of the body (ghost and placement share it). */
  blueprintSpot(id: string): { x: number; z: number; rot: number; hw: number; hd: number; ok: boolean } | null {
    const bp = blueprintById(id)
    if (!bp) return null
    const p = this.sim.player
    const d = Math.max(bp.hw, bp.hd) + 2.4
    const x = p.x + Math.sin(p.rot) * d
    const z = p.z + Math.cos(p.rot) * d
    return { x, z, rot: p.rot, hw: bp.hw, hd: bp.hd, ok: canPlace(this.sim, bp, x, z).ok }
  }

  previewBlueprint(id: string | null) {
    if (this.buildPreviewId === id) return
    this.buildPreviewId = id
    this.notify()
  }

  placeBlueprint(id: string) {
    const spot = this.blueprintSpot(id)
    if (!spot) return
    const r = placeSite(this.sim, id, spot.x, spot.z, spot.rot)
    this.showToast(r.msg)
    if (r.ok) this.sim.rebuildBuildingIndex()
    this.panel = null
    this.notify()
  }

  /** Cart actions while pushing (TRANS-01). */
  parkCart() {
    this.showToast(parkCart(this.sim, this.sim.player))
    this.notify()
  }

  loadPushedCart() {
    const c = this.sim.state.px.cart
    if (!c) return this.showToast('You are not pushing a cart.')
    const kg = loadHeavy(this.sim.player, c)
    this.showToast(kg ? `Loaded ${Math.round(kg)} kg into the cart.` : 'No heavy goods to load, or the cart is full.')
    this.notify()
  }

  quick(action: 'level' | 'dig' | 'raise' | 'sleep' | 'rest' | 'torch' | 'drop_torch' | 'plant_torch' | 'campfire') {
    const p = this.sim.player
    const fx = p.x + Math.sin(p.rot) * 2
    const fz = p.z + Math.cos(p.rot) * 2
    switch (action) {
      case 'campfire':
        this.placeBlueprint('campfire')
        break
      case 'dig':
        startActivity(this.sim, { kind: 'dig', label: 'Digging', total: 4, data: `${fx},${fz}` })
        break
      case 'drop_torch':
        this.dropTorchLit()
        break
      case 'level':
        startActivity(this.sim, { kind: 'level', label: 'Leveling', total: 6, data: `${fx},${fz},${this.sim.terrain.heightAt(p.x, p.z)}` })
        break
      case 'plant_torch':
        this.showToast(plantTorch(this.sim, p).msg)
        break
      case 'raise':
        startActivity(this.sim, { kind: 'raise', label: 'Raising ground', total: 4, data: `${fx},${fz}` })
        break
      case 'rest':
        startActivity(this.sim, { kind: 'rest', label: 'Resting', total: 150, accel: 20 })
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

  // ---------------- Authored quests (quests--001) ----------------

  /** Quest topics this NPC offers right now (one per quest). */
  questTopics(npcId: number): QuestTopic[] {
    return questTopics(this.sim, npcId)
  }

  questSay(questId: string, nodeId: string): QuestSay | null {
    return questSay(this.sim, questId, nodeId)
  }

  /** Applies the option's effects; returns the follow-up node (none = the dialog closes). */
  questChoose(questId: string, nodeId: string, optionId: string): QuestChooseResult | null {
    const r = questChoose(this.sim, questId, nodeId, optionId)
    this.notify()
    return r
  }

  /** Journal: authored quests and the active notice-board quests. */
  journal(): { authored: JournalEntry[]; board: GameState['quests'] } {
    return { authored: questJournal(this.sim), board: this.sim.state.quests.filter((q) => q.status === 'active') }
  }

  /** Name labels and quest icons of the villagers near the player, in canvas pixels (fog: unexplored cells hide them). */
  npcOverlays(): NpcOverlay[] {
    const sim = this.sim
    const p = sim.player
    const out: NpcOverlay[] = []
    for (const a of sim.actors.query(p.x, p.z, OVERLAY_RANGE_M)) {
      if (a.kind !== 'npc' || (a as Human).vitals.dead || a === p || !isExplored(sim, a.x, a.z)) continue
      const dist = Math.hypot(a.x - p.x, a.z - p.z)
      const pt = this.renderer.project(a.x, a.y + (a.age === 'child' ? 1.3 : 2.1), a.z)
      if (!pt.visible) continue
      out.push({ id: a.id, name: (a as Human).name, x: pt.x, y: pt.y, dist, icon: npcQuestIcon(sim, a.id) })
    }
    return out
  }

  questMarkers(): QuestMarker[] {
    return questMarkers(this.sim)
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

  // ---------------- Panel mutations (C-07: UI never calls sim mutators directly) ----------------

  /** Runs a mutation that reports a message, shows it and refreshes the UI. */
  private act(msg: string): string {
    this.showToast(msg)
    this.notify()
    return msg
  }

  buyFrom(npc: Human, stack: ItemStack) {
    this.act(buyFromNpc(this.sim, npc, stack).msg)
  }

  sellTo(npc: Human, stack: ItemStack) {
    this.act(sellToNpc(this.sim, npc, stack).msg)
  }

  giftTo(npc: Human, stack: ItemStack) {
    this.act(giveGift(this.sim, npc, stack, 1).msg)
  }

  orderFrom(smith: Human, recipeId: string) {
    this.act(placeOrder(this.sim, smith, recipeId))
  }

  cancelSmithOrder(orderId: string) {
    this.act(cancelOrder(this.sim, orderId))
  }

  collectSmithOrder(orderId: string) {
    this.act(collectOrder(this.sim, orderId))
  }

  acceptBoardQuest(questId: string) {
    this.act(acceptQuest(this.sim, questId))
  }

  apologize(badgeId: string) {
    this.act(tryApologize(this.sim, badgeId))
  }

  /** Moves `qty` pieces (default the whole stack) between backpack and storage. */
  moveStorage(b: Building, stackIdx: number, toStorage: boolean, qty?: number) {
    this.act(transferToStorage(this.sim, b, stackIdx, toStorage, qty))
  }

  /** Reputation shown before a storage move: warehouse take cost / deposit gain for `qty` pieces (null when none applies). */
  storageRepPreview(b: Building, stack: ItemStack, qty: number, toStorage: boolean): { helpfulness: number; honesty: number } | null {
    if (toStorage) {
      const g = warehouseDepositGain(b, stack, qty)
      return g > 0 ? { helpfulness: g, honesty: 0 } : null
    }
    const c = warehouseTakeCost(this.sim, b, stack, qty)
    return c && (c.helpfulness > 0 || c.honesty > 0) ? c : null
  }

  /** Hires a companion; closes the panel on success. */
  hire(npc: Human, task: CompanionTask, risk: CompanionRisk, days: number) {
    const res = hireCompanion(this.sim, npc, task, risk, days)
    if (res.ok) this.closePanel()
    this.act(res.msg)
  }

  cancelPlayerActivity() {
    cancelActivity(this.sim, 'Cancelled.')
    this.notify()
  }

  /** Waypoint on a known settlement (MAP-01: unknown ones are refused). */
  targetSettlement(settlementId: number) {
    this.showToast(waypointToSettlement(this.sim, settlementId))
    this.notify()
  }

  /** Autopilot along the road towards a known settlement (no teleport; time can be sped up 3×). */
  autopilotTo(settlementId: number): string {
    const before = this.sim.state.px.autopilot
    const msg = autopilotToSettlement(this.sim, settlementId)
    if (this.sim.state.px.autopilot !== before) this.panel = null
    return msg
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
    return best && (best.d < 150 ? best.name : `near ${best.name}`)
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
    this.showToast(this.saveName ? `Saved: ${this.saveName}` : 'Game saved.')
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
    repairPlacement(this.sim, x, z)
    this.sim.state.px.cave = 0
  }
}
