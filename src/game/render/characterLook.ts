/**
 * Character variety (CHAR-01): a deterministic look per actor id — hair colour, cloth tint, body scale jitter.
 * Applied as cached tinted material variants (shared per colour, never per character), so draw calls and shader
 * programs are unchanged.
 * @domain render
 * @subdomain actors
 */
import * as THREE from 'three'
import type { AgeGroup } from '../sim/types'
import { CHARACTER_LOOK as L } from '../config/calibration'
import { hash01 } from '../core/rng'

export interface CharacterLook {
  hair: number
  cloth: number
  scale: readonly [number, number, number]
}

const HAIR_SALT = 101
const CLOTH_SALT = 102

/** Pure: the same id always gives the same look. Elders go grey more often. */
export function characterLook(id: number, age: AgeGroup): CharacterLook {
  const grey = L.hair.length - 1
  const hair = age === 'elder' && hash01(id, HAIR_SALT + 5) < 0.7 ? grey : Math.floor(hash01(id, HAIR_SALT) * (L.hair.length - 1))
  const cloth = Math.floor(hash01(id, CLOTH_SALT) * L.cloth.length)
  const j = (salt: number, k: number) => 1 + (hash01(id, salt) * 2 - 1) * k
  return { hair, cloth, scale: [j(103, L.scaleXZ), j(104, L.scaleY), j(105, L.scaleXZ)] }
}

const variants = new Map<string, THREE.Material>()

function variant(m: THREE.Material, kind: 'hair' | 'cloth', idx: number, hex: number): THREE.Material {
  const key = `${m.uuid}:${kind}:${idx}`
  let v = variants.get(key)
  if (!v) {
    v = m.clone()
    ;(v as THREE.MeshStandardMaterial).color?.multiply(new THREE.Color(hex))
    variants.set(key, v)
  }
  return v
}

/** Swap the hair / outfit materials of a cloned character for the tinted shared variants (skin and eyes stay). */
export function applyLook(root: THREE.Object3D, look: CharacterLook) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || Array.isArray(mesh.material)) return
    const name = mesh.material.name
    if (name.startsWith('MI_Hair')) mesh.material = variant(mesh.material, 'hair', look.hair, L.hair[look.hair]!)
    else if (look.cloth > 0 && !name.startsWith('MI_Eyes') && !name.startsWith('MI_Regular') && !name.startsWith('MI_Superhero')) mesh.material = variant(mesh.material, 'cloth', look.cloth, L.cloth[look.cloth]!)
  })
}

/** FAUNA-09: prime animals (alpha/strong) are ~10 % darker; shared per source material, never per animal. */
export const PRIME_DARKEN: Partial<Record<string, number>> = { alpha: 0xe6e6e6, strong: 0xd9d9d9 }

export function darkenPrime(root: THREE.Object3D, variantName: string) {
  const hex = PRIME_DARKEN[variantName]
  if (hex === undefined) return
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh && !Array.isArray(mesh.material)) mesh.material = variant(mesh.material, 'cloth', hex, hex)
  })
}
