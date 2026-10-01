# Rigging and animating static animal models with Blender MCP: lessons learned

Date: 2026-10-01 · Type: implementation notes · Status: informational (boar + bear done)

What we did: added a rig and procedural clips (Idle/Walk/Gallop/Attack) to the static `Boar.glb` and `Bear.glb` entirely through Blender MCP (Python), with no manual work in the Blender UI. The reproducible result is `scripts/assets/rig-boar-bear.py`. This doc collects what to reuse for the next models (rat/hare extra clips, Death/Eating, new animals).

## Pipeline (works, reuse it)

1. Static source in `_temp/extracted/Extra_Animals/<Name>.glb` (normalised: head → glTF +Z = Blender **−Y**, feet at z=0, transforms applied).
2. Blender script → `<Name>_rigged.glb` next to it (one NLA track per clip; the track name becomes the glTF clip name).
3. `node scripts/assets/build-extra-animals.mjs`: add `file: '<Name>_rigged', clips: RIGGED_CLIPS` to the `ANIMALS` entry. **Unlisted clips are dropped** (an empty `clips` map = no animations at all).
4. Verify the output with gltf-transform (skins, `JOINTS_0/WEIGHTS_0`, clip list). `prune: Removed ... Skin (1)` in the log is a duplicate skin, not a loss. Check it anyway.
5. `pnpm check`. `render/actors.ts` needs no changes as long as clip names are `Idle`, `Walk`, `Gallop`, `Attack` (plus optional `Death`, `Eating`). Missing clips fall back via `CLIP_FALLBACK` and then to `Idle`.

## What worked

- **Measure the mesh first, then place bones by hand-picked coordinates.** Use a per-Y-slice profile (z/x ranges) plus a "leg trace": the centroid of vertices in z bands around each foot cluster. This took about 2 tool calls and gave good joint positions. A generic auto-rigger isn't worth building for 2–3 models.
- **Geometric skin weights instead of bone heat.** `parent_set(ARMATURE_AUTO)` failed on both meshes ("Bone Heat Weighting: failed", 0 weighted verts). Low-poly flat-shaded assets are unwelded, with split vertices and separate parts. Working replacement (numpy, about 1 s for 24k verts):
  - weight = 1/d⁴ to each bone segment, keep the top 3, normalise, drop weights below 0.04;
  - leg bones are masked to their side (x vs. the pair's centre) and their half (front/rear of the mid-Y between leg pairs);
  - leg distance is multiplied by `1 + 3·max(0, (z − belly)/(legTop − belly))`, so flanks follow the spine, not the legs;
  - tail bones only take vertices behind the tail root.
- **Bone roll 0 gives predictable axes.** Leg bones (pointing down): `+X` rotation swings the foot **backward** (+Y), and `+X` on the lower bone flexes the knee naturally. Bones pointing forward (−Y: spine, neck, head): `+X` **lowers** the front, so use a negative value to rear up. The root bone (pointing +Y): location y/z = world y/z.
- **Procedural gait functions** (no hand keying):
  - leg phase `p`: in the stance part (fraction `s`) the upper bone goes linearly from −A to +A; in swing it returns on a cosine with knee = `B·sin(πq)`;
  - walk = lateral sequence with phases (FL .25, FR .75, RL 0, RR .5), s≈0.62;
  - gallop = transverse gallop with phases (FL .5, FR .58, RL 0, RR .08), s≈0.42, plus spine flex and a root bob;
  - loops: key frames 0..T inclusive, where frame T = frame 0.
  - Tuned values: boar walk 30 f / gallop 16 f / attack 24 f; bear 36/20/30 (30 fps). Attack ≈ 0.8–1 s, because the renderer plays it while `now - action.at < 0.8`, and loops it.
- **Visual check without the viewport:** render with Workbench through an orthographic side camera to the scratchpad, stitch N frames per clip into a contact sheet (numpy on `bpy.data.images`), then `Read` the PNG. One image per animal covers all clips, which is much cheaper than viewport screenshots. `get_viewport_screenshot` ignored our view changes, so don't rely on it.
- **Export:** `export_scene.gltf(use_selection=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True)`, with the NLA tracks unmuted and the active action set to None.

## Pitfalls hit

- The bear source mesh is posed mid-stride and slightly twisted, with an asymmetric x per leg. Trace each leg separately; never assume mirror symmetry.
- A rotation sign guessed for a forward-pointing bone was wrong on the first try (the bear's chest dropped instead of rising). Always render the attack mid-frame before exporting.
- Scripts that run through `exec` in MCP keep state in Blender between calls (e.g. stash helpers on `builtins`). The committed script must still be standalone. Re-run it in a cleaned scene to prove it (`exec(compile(open(p).read(), p, 'exec'), {'__file__': p})`).
- gltf-transform `prune` removes TEXCOORD_0 when the material has no texture (the boar). That's harmless.
- Size grows with animation data (boar 45 → 112 KB). Sampled clips at 30 fps × 48 channels. If it matters, export at `export_frame_step=2` or let `resample()` thin out linear segments.

## Next steps / ideas

- Death (fall onto the side: root roll + legs folding) and Eating (head down, the Idle sniff amplified) for boar/bear. Add them in `animate()` and in `RIGGED_CLIPS`.
- Hare has only Idle/Walk (Gallop falls back to Walk). It already has a rig, so add clips by importing it and appending NLA tracks with the same gait helpers (check its bone names/axes first).
- For a new animal: copy a defs dict, measure, place bones, reuse `weigh()` and `animate()`, and tune A/B/T from the contact sheet.
