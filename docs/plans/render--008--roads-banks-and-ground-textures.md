# Roads with relief and cobbles, ground textures, river banks and waterside life

**Status:** draft  
**Model:** opus — look decisions, bank profile design (touches terrain shape); sonnet — implementation  
**Domain:** render  
**Sub domains:** terrain, roads, water, vegetation, textures  
**Roadmap:** wave 4c (after `render--001`/`render--007`; user notes 2026-10-02, treated as additions to the main plan)  
**Created:** 2026-10-02  
**Finished:** —

---

User notes (2026-10-02): (1) roads need a normal map / unevenness, sometimes stones and cobbles (also on town squares); (2) textures may be used in places: soil, road, rock, cave walls; (3) rivers need banks — sometimes flat sand/beach, sometimes steep (0.3–0.5 m) — and a channel (bed); waterside vegetation (reeds) and in-water plants (lilies etc.).

Constraints: D-REN-13 terrain shader path (uniforms, no chunk rebuild per setting), D-REN-5 effects behind quality profiles, D-PERF-3 gate on `render.prep`/chunk build, headless caveats D-PERF-2. Generator shape changes (bank profile, channel) = `GEN_VERSION` bump, batch with other generator changes (CLAUDE.md).

## Steps

1. **Ground textures (render-only).** Tiling textures (soil, grass-dirt, road dirt, cobble, rock) sampled in the terrain material (`terrainMaterial.ts`) blended by the existing masks (`aTint`/road mask/slope); triplanar or UV from world xz (no UV channel in chunks), mip-mapped, KTX2 only if a budget problem appears (`render--003`). Normal-from-height in the shader (no extra normal textures on low). Sources: CC0 only, recorded in `docs/assets/README.md` + credits. Profiles: low = albedo only, medium = + normal, high = + parallax-free detail normal at 2 scales to break tiling.
2. **Roads.** Road mask → dirt road with ruts/unevenness (normal), occasional stones; **cobbles/paving** on town squares and main roads inside LG/XL settlements (a `paved` flag derived from settlement size/structure kind, deterministic; sim does not care). Edges blend into grass with a noisy border. Acceptance: road frame before/after at normal camera distance; chunk build time inside the 8 ms budget.
3. **Rock and cave surfaces.** Rock texture on steep slopes (slope-based blend replaces the flat grey); cave walls need caves — only the texture set and a material hook now, caves themselves are not in the generator (❓ decision when/if caves are planned).
4. **River banks and channel (generator + render).** Bank profile per river segment: *beach* (flat sand, gentle slope, wider wet-sand band) or *cut bank* (steep 0.3–0.5 m drop), chosen deterministically from flow/curvature (outside of a bend = cut, inside = beach); an explicit channel (bed lower than the banks, depth from river width) so water sits in a trough rather than on a plane. `GEN_VERSION` bump; terrain/water tests (WORLD-*) extended: no water above its banks, banks within the slope band, walkability (wade depth rules `WADE_DEPTH_M`/`SWIM_DEPTH_M` unchanged or re-calibrated and recorded). Opus designs the profile first (short note), Sonnet implements.
5. **Waterside life.** Reeds/rushes along banks (extends the existing reeds in `render--007` water pass), shrubs and grass density gradient by distance to water, in-water lily pads (instanced, flat quads on the surface, only in calm shallow water, flowers sparsely), optional cattails. Wind shared module (`wind.ts`) for reeds; all instanced, behind quality profiles, `render.prep` gate.
6. **Exit:** frames (road, square, beach, cut bank, reeds+lilies) per profile; `bench:render` before/after; Opus keep/drop; ❓ user look.

## Dependencies / order
After `render--001` steps 1–5 (done) and `render--007` remaining water work (the bank profile changes what the water pass sits on — decide there whether planar reflection is still wanted). Step 4 shares a `GEN_VERSION` bump with any other pending generator change (e.g. `world--001`).
