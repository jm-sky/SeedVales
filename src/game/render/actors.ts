/**
 * Actor rendering: skinned glTF characters (UBC head + outfit, UAL animations) and animals near the
 * player; cheap procedural placeholders further away or when no model exists (rat, hare, boar,
 * bear, sheep, chicken, moose). Renderer only reads simulation state.
 * @domain render
 * @subdomain actors
 */
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Sim } from '../sim/sim'
import type { Actor, Animal, Human } from '../sim/types'
import type { QualitySettings } from './quality'
import { PROFESSIONS } from '../data/professions'
import { SPECIES, VARIANT_MULT } from '../data/species'
import { perf } from '../diag/perf'
import { isDown } from '../sim/combat'
import { loadGltf, sharedColorMat } from './assets'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

const PLACEHOLDER_DIST = 320

interface Visual {
  id: number
  root: THREE.Object3D
  mixer?: THREE.AnimationMixer
  actions?: Map<string, THREE.AnimationAction>
  current?: string
  model: boolean
  kindKey: string
  pos: THREE.Vector3
  rot: number
}

type CharKey = 'Male_Peasant' | 'Female_Peasant' | 'Male_Ranger' | 'Female_Ranger'

function placeholderHuman(shirt: number, child: boolean): THREE.Object3D {
  const g = new THREE.Group()
  const s = child ? 0.65 : 1
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 3, 6), sharedColorMat(shirt))
  body.position.y = 1.05
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), sharedColorMat(0xd9a67e))
  head.position.y = 1.65
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.7, 0.2), sharedColorMat(0x4a3b2c))
  legs.position.y = 0.35
  g.add(body, head, legs)
  g.scale.setScalar(s)
  return g
}

function placeholderAnimal(a: Animal): THREE.Object3D {
  const sp = SPECIES[a.species]
  const g = new THREE.Group()
  const col = a.variant === 'albino' ? 0xf4f1ea : sp.color
  const h = sp.height
  const l = sp.length
  const body = new THREE.Mesh(new THREE.BoxGeometry(l * 0.35, h * 0.5, l * 0.8), sharedColorMat(col))
  body.position.y = h * 0.55
  const head = new THREE.Mesh(new THREE.BoxGeometry(l * 0.22, h * 0.3, l * 0.28), sharedColorMat(col))
  head.position.set(0, h * 0.8, l * 0.45)
  g.add(body, head)
  const legH = h * 0.35
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(l * 0.07, legH, l * 0.07), sharedColorMat(col))
    leg.position.set((x! * l) / 8, legH / 2, (z! * l) / 3)
    g.add(leg)
  }
  if (a.species === 'stag' || a.species === 'moose') {
    const ant = new THREE.Mesh(new THREE.BoxGeometry(l * 0.4, 0.05, 0.05), sharedColorMat(0xd8cba8))
    ant.position.set(0, h * 1.02, l * 0.45)
    g.add(ant)
  }
  g.scale.setScalar(VARIANT_MULT[a.variant].size)
  return g
}

export class Actors {
  group = new THREE.Group()
  private visuals = new Map<number, Visual>()
  private chars = new Map<string, GLTF>()
  private heads = new Map<string, GLTF>()
  private animals = new Map<string, GLTF>()
  private clips: THREE.AnimationClip[] = []
  private loading = new Set<string>()
  private sim: Sim
  private q: QualitySettings
  skinnedCount = 0

  constructor(sim: Sim, q: QualitySettings) {
    this.sim = sim
    this.q = q
  }

  async load() {
    try {
      const [anims, mh, fh] = await Promise.all([loadGltf('characters/anims.glb'), loadGltf('characters/Male_Head.glb'), loadGltf('characters/Female_Head.glb')])
      this.clips = anims.animations
      this.heads.set('Male', mh)
      this.heads.set('Female', fh)
      await Promise.all((['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger'] as CharKey[]).map(async (k) => this.chars.set(k, await loadGltf(`characters/${k}.glb`))))
    } catch (e) {
      console.warn('character assets failed', e)
    }
    for (const v of this.visuals.values()) this.dropVisual(v)
    this.visuals.clear()
  }

  private loadAnimal(model: string) {
    if (this.animals.has(model) || this.loading.has(model)) return
    this.loading.add(model)
    loadGltf(`animals/${model}.glb`)
      .then((g) => {
        this.animals.set(model, g)
        // Force re-creation of placeholders for this model.
        for (const v of this.visuals.values()) if (v.kindKey.startsWith(`a:${model}`)) v.kindKey = 'stale'
      })
      .catch(() => undefined)
  }

  private charKey(h: Human): CharKey {
    const ranger = h.kind === 'player' || h.profession === 'hunter' || h.profession === 'guard'
    return `${h.male ? 'Male' : 'Female'}_${ranger ? 'Ranger' : 'Peasant'}` as CharKey
  }

  private buildHuman(h: Human): Visual | null {
    const key = this.charKey(h)
    const outfit = this.chars.get(key)
    const head = this.heads.get(h.male ? 'Male' : 'Female')
    if (!outfit || !head) return null
    const root = SkeletonUtils.clone(outfit.scene)
    const headClone = SkeletonUtils.clone(head.scene)
    // Rebind head skinned meshes to the outfit skeleton (same UBC bone names).
    const bones = new Map<string, THREE.Bone>()
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone)
    })
    const headMeshes: THREE.SkinnedMesh[] = []
    headClone.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) headMeshes.push(o as THREE.SkinnedMesh)
    })
    for (const m of headMeshes) {
      const sk = m.skeleton
      const newBones = sk.bones.map((b) => bones.get(b.name) ?? b)
      const skeleton = new THREE.Skeleton(newBones, sk.boneInverses)
      m.removeFromParent()
      root.add(m)
      m.bind(skeleton, m.bindMatrix)
    }
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.frustumCulled = false
      }
    })
    if (h.age === 'child') root.scale.setScalar(0.68)
    if (h.age === 'elder') root.scale.setScalar(0.96)
    const mixer = new THREE.AnimationMixer(root)
    const actions = new Map<string, THREE.AnimationAction>()
    for (const c of this.clips) actions.set(c.name, mixer.clipAction(c))
    this.skinnedCount++
    return { id: h.id, root, mixer, actions, model: true, kindKey: `h:${key}:${h.age}`, pos: new THREE.Vector3(h.x, h.y, h.z), rot: h.rot }
  }

  private buildAnimal(a: Animal): Visual {
    const sp = SPECIES[a.species]
    const g = sp.model ? this.animals.get(sp.model) : undefined
    if (sp.model && !g) this.loadAnimal(sp.model)
    if (!g) return { id: a.id, root: placeholderAnimal(a), model: false, kindKey: `a:${sp.model ?? a.species}:ph`, pos: new THREE.Vector3(a.x, a.y, a.z), rot: a.rot }
    const root = SkeletonUtils.clone(g.scene)
    const box = new THREE.Box3().setFromObject(g.scene)
    const scale = (sp.height / Math.max(0.01, box.max.y - box.min.y)) * VARIANT_MULT[a.variant].size
    root.scale.setScalar(scale)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.frustumCulled = false
        if (a.variant === 'albino') {
          m.material = (m.material as THREE.Material).clone()
          ;(m.material as THREE.MeshStandardMaterial).color?.set(0xf8f6f0)
        }
      }
    })
    const mixer = new THREE.AnimationMixer(root)
    const actions = new Map<string, THREE.AnimationAction>()
    for (const c of g.animations) actions.set(c.name, mixer.clipAction(c))
    return { id: a.id, root, mixer, actions, model: true, kindKey: `a:${sp.model}:${a.variant}`, pos: new THREE.Vector3(a.x, a.y, a.z), rot: a.rot }
  }

  private dropVisual(v: Visual) {
    this.group.remove(v.root)
    v.mixer?.stopAllAction()
    if (v.model && v.kindKey.startsWith('h:')) this.skinnedCount--
  }

  private play(v: Visual, name: string, fade = 0.2, once = false) {
    if (!v.actions || v.current === name) return
    const next = v.actions.get(name) ?? v.actions.get('Idle_Loop') ?? v.actions.get('Idle')
    if (!next) return
    const prev = v.current ? v.actions.get(v.current) : undefined
    next.reset()
    if (once) {
      next.setLoop(THREE.LoopOnce, 1)
      next.clampWhenFinished = true
    } else next.setLoop(THREE.LoopRepeat, Infinity)
    next.play()
    if (prev && prev !== next) prev.crossFadeTo(next, fade, false)
    v.current = name
  }

  private humanAnim(h: Human): [string, boolean] {
    const sim = this.sim
    const now = sim.state.time.play
    if (h.vitals.dead || (h.vitals.ko && h.vitals.ko.until > now)) return ['Death01', true]
    const act = h.action
    if (act && (act.kind === 'swing') && now - act.at < 0.7) return ['Sword_Attack', true]
    if (act && act.kind === 'shoot' && now - act.at < 0.6) return ['Spell_Simple_Shoot', true]
    if (h.kind === 'player') {
      const pa = sim.state.px.activity
      if (pa) {
        if (pa.kind === 'chop' || pa.kind === 'mine' || pa.kind === 'repair' || pa.kind === 'build') return ['Sword_Attack', false]
        if (pa.kind === 'sleep' || pa.kind === 'rest') return ['Sitting_Idle_Loop', false]
        return ['Fixing_Kneeling', false]
      }
      if (sim.state.px.bowDraw > 0) return ['Pistol_Aim_Neutral', false]
    }
    switch (h.moving) {
      case 'run':
        return ['Sprint_Loop', false]
      case 'sneak':
        return ['Crouch_Fwd_Loop', false]
      case 'swim':
        return [Math.hypot(h.vx, h.vz) > 0.1 ? 'Swim_Fwd_Loop' : 'Swim_Idle_Loop', false]
      case 'walk':
        return ['Walk_Loop', false]
      default:
        break
    }
    if (act && now - act.at < 60) {
      switch (act.kind) {
        case 'bow':
          return ['Pistol_Aim_Neutral', false]
        case 'chop':
        case 'hammer':
          return ['Sword_Attack', false]
        case 'eat':
          return ['Sitting_Idle_Loop', false]
        case 'interact':
          return ['Interact', false]
        case 'kneel':
          return ['Fixing_Kneeling', false]
        case 'talk':
          return ['Idle_Talking_Loop', false]
        default:
          break
      }
    }
    if (h.kind === 'npc' && h.ai.label === 'Rozmawia') return ['Idle_Talking_Loop', false]
    if (h.eq.off?.id === 'torch') return ['Idle_Torch_Loop', false]
    return ['Idle_Loop', false]
  }

  private animalAnim(a: Animal): string {
    const now = this.sim.state.time.play
    if (a.action && a.action.kind === 'swing' && now - a.action.at < 0.8) return a.species === 'wolf' || a.species === 'fox' || a.species === 'dog' ? 'Attack' : 'Attack_Headbutt'
    if (a.moving === 'run') return 'Gallop'
    if (a.moving === 'walk' || a.moving === 'swim') return 'Walk'
    if (a.ai.label === 'Żeruje' || a.ai.label === 'Pije' || a.ai.label === 'Pasie się') return 'Eating'
    return 'Idle'
  }

  update(dt: number, cam: THREE.Camera) {
    const sim = this.sim
    const p = sim.player
    const seen = new Set<number>()
    const list: Actor[] = []
    sim.actors.query(p.x, p.z, PLACEHOLDER_DIST, list)
    let mixers = 0
    for (const a of list) {
      const d = Math.hypot(a.x - p.x, a.z - p.z)
      const isHuman = a.kind !== 'animal'
      // Sleeping/sheltering NPCs are inside their houses.
      if (a.kind === 'npc') {
        const h = a as Human
        const w = h.ai.steps[h.ai.stepIdx]
        if (w?.op === 'work' && (w.act === 'sleep' || w.act === 'shelter') && !h.vitals.ko) continue
      }
      seen.add(a.id)
      let v = this.visuals.get(a.id)
      const wantModel = d < (isHuman ? this.q.humanModel : this.q.animalModel) || a.kind === 'player'
      if (v && (v.model !== wantModel || v.kindKey === 'stale')) {
        this.dropVisual(v)
        this.visuals.delete(a.id)
        v = undefined
      }
      if (!v) {
        if (isHuman) {
          const h = a as Human
          const shirt = h.profession ? PROFESSIONS[h.profession].shirt : h.kind === 'player' ? 0x3a5a7a : 0x8a7a6a
          v = (wantModel ? this.buildHuman(h) : null) ?? { id: a.id, root: placeholderHuman(shirt, h.age === 'child'), model: false, kindKey: 'h:ph', pos: new THREE.Vector3(a.x, a.y, a.z), rot: a.rot }
        } else {
          const an = a as Animal
          v = wantModel ? this.buildAnimal(an) : { id: a.id, root: placeholderAnimal(an), model: false, kindKey: `a:${SPECIES[an.species].model ?? an.species}:far`, pos: new THREE.Vector3(a.x, a.y, a.z), rot: a.rot }
        }
        v.pos.set(a.x, a.y, a.z)
        this.group.add(v.root)
        this.visuals.set(a.id, v)
      }
      // Smooth interpolation towards sim position (sim ticks at LOD rate).
      const k = Math.min(1, dt * (a.kind === 'player' ? 30 : 10))
      v.pos.lerp(new THREE.Vector3(a.x, a.y, a.z), k)
      if (v.pos.distanceTo(new THREE.Vector3(a.x, a.y, a.z)) > 6) v.pos.set(a.x, a.y, a.z)
      let dr = a.rot - v.rot
      while (dr > Math.PI) dr -= Math.PI * 2
      while (dr < -Math.PI) dr += Math.PI * 2
      v.rot += dr * Math.min(1, dt * 10)
      v.root.position.copy(v.pos)
      v.root.rotation.y = v.rot
      if (a.kind === 'animal' && a.moving === 'swim') v.root.position.y -= 0.4
      if (v.mixer) {
        if (isHuman) {
          const [name, once] = this.humanAnim(a as Human)
          this.play(v, name, 0.2, once)
        } else this.play(v, this.animalAnim(a as Animal))
        v.mixer.update(dt)
        mixers++
      } else if (!v.model && isDown(sim, a)) {
        v.root.rotation.z = Math.PI / 2
      }
    }
    for (const [id, v] of this.visuals) {
      if (!seen.has(id)) {
        this.dropVisual(v)
        this.visuals.delete(id)
      }
    }
    void cam
    perf.gauge('render.activeMixers', mixers)
    perf.gauge('render.actorVisuals', this.visuals.size)
  }

  /** Corpse visuals are placeholders lying on their side. */
  static corpseMesh(species: Animal['species']): THREE.Object3D {
    const fake = { species, variant: 'adult' } as Animal
    const o = placeholderAnimal(fake)
    o.rotation.z = Math.PI / 2
    return o
  }
}
