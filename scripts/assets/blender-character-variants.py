"""
Blender (dev-only, D-REN-8) — authors the extra character outfit variants that glTF Transform alone cannot
produce, from the CC0 "Modular Character Outfits - Fantasy [Source]" pack (render--005 step 4):

  <Sex>_Peasant_Boots  Peasant Arms/Body/Legs + Ranger boots decimated to BOOT_TRIS (replaces the bare Peasant feet)
  <Sex>_Blacksmith     Peasant + a small charcoal apron mesh (~224 tris) draped on Body+Legs with a shrinkwrap
  <Sex>_Herbalist      Peasant + Ranger hood in a muted olive (flat colour material)

Everything stays on the shared 65-bone UBC skeleton (same vertex-group names; the apron gets its weights from
Body+Legs by nearest-face transfer). The boots sample a uniform leather-brown swatch of the Peasant atlas (UV
collapsed to one block), apron and hood use a flat-colour material (the Peasant atlas has no black or green):
Blacksmith/Herbalist therefore have 3 materials (atlas, skin, flat). Textures are replaced by 512 px
base-colour-only copies (no normal/ORM), so the .raw.glb files stay small.

Output: assets-src/characters/<Sex>_<Variant>.raw.glb (Y-up, skinned, deform bones only, no animations).
Post-process with `node scripts/assets/build-characters.mjs --raw` (512 px, simplify, meshopt ->
public/assets/characters/). The .blend files are never saved; the scene is restored to its previous state.

Run (Blender 5.x, no UI state assumed): open the Scripting workspace, load this file and press Run, or via the
Blender MCP `execute_blender_code`: exec(open(r'<repo>/scripts/assets/blender-character-variants.py').read()).
Env SV_ROOT overrides the repo root, SV_VARIANTS="Male,Female" limits the sexes.
"""
import os

import bmesh
import bpy
import numpy as np

ROOT = os.environ.get('SV_ROOT', r'D:\Projekty\private\SeedVales')
PACK = os.path.join(ROOT, '_temp', 'extracted', 'Modular Character Outfits - Fantasy[Source]')
OUT = os.path.join(ROOT, 'assets-src', 'characters')
TEX = 512
BOOT_TRIS = 1800
APRON_GRID = (8, 14)  # columns x rows of quads -> 2*8*14 = 224 tris
APRON_OFFSET = 0.012  # metres above the body surface
# Boots: scene-linear target colour searched among the uniform blocks of the Peasant atlas (dark leather).
BOOT_TARGET = (0.10, 0.055, 0.026)
# Flat materials (scene-linear RGBA): there is no black or green swatch in the atlas.
FLAT_COLORS = {'apron': (0.02, 0.02, 0.022, 1.0), 'hood': (0.065, 0.075, 0.032, 1.0)}
ID_TYPES = ('objects', 'meshes', 'armatures', 'materials', 'images', 'node_groups', 'actions')


def snapshot():
    return {t: set(getattr(bpy.data, t)) for t in ID_TYPES}


def restore(snap):
    for t in ID_TYPES:
        coll = getattr(bpy.data, t)
        for idb in [i for i in coll if i not in snap[t]]:
            coll.remove(idb)


def load_parts(sex, names):
    blend = os.path.join(PACK, f'All_{sex}.blend')
    with bpy.data.libraries.load(blend, link=False) as (src, dst):
        missing = [n for n in names if n not in src.objects]
        if missing:
            raise RuntimeError(f'{blend}: missing objects {missing}')
        dst.objects = list(names)
    for o in dst.objects:
        bpy.context.scene.collection.objects.link(o)
    return {o.name: o for o in dst.objects}


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def small_material(src, name):
    """Base-colour-only copy of `src` with the texture scaled to TEX px; returns (material, image)."""
    img = principled(src).inputs['Base Color'].links[0].from_node.image.copy()
    img.name = name
    img.scale(TEX, TEX)
    img.pack()
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = principled(mat)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 1.0
    return mat, img


def flat_material(name, rgba):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = principled(mat)
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 1.0
    return mat


def find_swatch(img, target):
    """UV (u, v) at the centre of the uniform 8x8-px block (3x3-block neighbourhood uniform) nearest `target`."""
    px = np.empty(TEX * TEX * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(TEX, TEX, 4)[:, :, :3]
    n = TEX // 8
    blocks = px.reshape(n, 8, n, 8, 3)
    mean = blocks.mean(axis=(1, 3))
    flat = blocks.std(axis=(1, 3)).max(axis=2) < 0.012
    ok = flat.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ok &= np.roll(np.roll(flat, dy, axis=0), dx, axis=1)
    ok[0, :] = ok[-1, :] = ok[:, 0] = ok[:, -1] = False
    dist = np.linalg.norm(mean - np.array(target, dtype=np.float32), axis=2)
    dist[~ok] = np.inf
    r, c = np.unravel_index(np.argmin(dist), dist.shape)
    print(f'  swatch {target} -> block r{r} c{c} colour {tuple(round(float(x), 3) for x in mean[r, c])}')
    return ((c + 0.5) * 8 / TEX, (r + 0.5) * 8 / TEX)  # image row 0 is v = 0


def collapse_uv(obj, uv):
    for layer in obj.data.uv_layers:
        for d in layer.data:
            d.uv = uv


def own_mesh(obj):
    obj.data = obj.data.copy()
    return obj.data


def apply_mod(obj, mod):
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def skin_to(obj, arm):
    for m in [m for m in obj.modifiers if m.type == 'ARMATURE']:
        obj.modifiers.remove(m)
    obj.parent = arm
    obj.modifiers.new('Armature', 'ARMATURE').object = arm


def tris(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def decimate_to(obj, target_tris):
    own_mesh(obj)
    for m in [m for m in obj.modifiers if m.type in ('ARMATURE', 'NODES')]:
        obj.modifiers.remove(m)
    mod = obj.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = min(1.0, target_tris / tris(obj))
    apply_mod(obj, mod)


def torso_front_sign(feet):
    """+1 if the character faces +Y (soles/toes extend towards +Y relative to the ankle), else -1."""
    vs = [feet.matrix_world @ v.co for v in feet.data.vertices]
    zmin = min(v.z for v in vs)
    sole = [v.y for v in vs if v.z < zmin + 0.04]
    ankle = [v.y for v in vs if zmin + 0.10 < v.z < zmin + 0.25]
    return 1.0 if sum(sole) / len(sole) > sum(ankle) / len(ankle) else -1.0


def combined_target(body, legs, arm):
    """Temporary Body+Legs mesh with the shared vertex groups (shrinkwrap + weight-transfer source)."""
    bm = bmesh.new()
    for o in (body, legs):
        bm.from_mesh(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh())
    me = bpy.data.meshes.new('sv_tmp_target')
    bm.to_mesh(me)
    bm.free()
    tmp = bpy.data.objects.new('sv_tmp_target', me)
    bpy.context.scene.collection.objects.link(tmp)
    names = [vg.name for vg in body.vertex_groups]
    if names != [vg.name for vg in legs.vertex_groups]:
        raise RuntimeError('Body/Legs vertex groups differ')
    for n in names:
        tmp.vertex_groups.new(name=n)
    return tmp


def make_apron(sex, body, legs, feet, arm, mat):
    target = combined_target(body, legs, arm)
    front = torso_front_sign(feet)
    bv = [v.co for v in body.data.vertices if abs(v.co.x) < 0.3]
    lv = [v.co for v in legs.data.vertices]
    z_top = max(v.z for v in bv) - 0.36 * (max(v.z for v in bv) - min(v.z for v in bv))
    lz0, lz1 = min(v.z for v in lv), max(v.z for v in lv)
    z_bot = lz0 + 0.40 * (lz1 - lz0)
    ally = [v.y for v in bv]
    y_far = front * (max(abs(y) for y in ally) + 0.15)
    pts = [v for v in bv + lv if abs(v.x) < 0.3]

    def half_width(z):
        xs = [v.x for v in pts if abs(v.z - z) < 0.04]
        return max(0.10, 0.75 * (max(xs) - min(xs)) / 2) if xs else 0.12

    nx, nz = APRON_GRID
    bm = bmesh.new()
    grid = []
    for j in range(nz + 1):
        z = z_top + (z_bot - z_top) * j / nz
        hw = half_width(z)
        grid.append([bm.verts.new((-hw + 2 * hw * i / nx, y_far, z)) for i in range(nx + 1)])
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for lp in f.loops:
            lp[uvl].uv = (0.0, 0.0)
    me = bpy.data.meshes.new(f'{sex}_Apron')
    bm.to_mesh(me)
    bm.free()
    apron = bpy.data.objects.new(f'{sex}_Apron', me)
    bpy.context.scene.collection.objects.link(apron)
    me.materials.append(mat)
    for vg in target.vertex_groups:  # the modifier only fills groups that already exist by name
        apron.vertex_groups.new(name=vg.name)

    sw = apron.modifiers.new('Shrink', 'SHRINKWRAP')
    sw.target = target
    sw.wrap_method = 'PROJECT'
    sw.wrap_mode = 'ABOVE_SURFACE'
    sw.offset = APRON_OFFSET
    sw.use_project_y = True
    sw.use_positive_direction = front < 0  # rays go from the front plane back towards the body
    sw.use_negative_direction = front > 0
    apply_mod(apron, sw)
    # Rays between the thighs hit nothing and stay on the start plane: bridge them at the depth of the row's hit neighbours.
    vs = me.vertices
    for j in range(nz + 1):
        row = [vs[j * (nx + 1) + i] for i in range(nx + 1)]
        hit = [v for v in row if abs(v.co.y - y_far) > 1e-4]
        for v in row:
            if abs(v.co.y - y_far) <= 1e-4 and hit:
                near = sorted(hit, key=lambda h: abs(h.co.x - v.co.x))[:2]
                v.co.y = sum(h.co.y for h in near) / len(near)
    dt = apron.modifiers.new('Weights', 'DATA_TRANSFER')
    dt.object = target
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    apply_mod(apron, dt)
    me.shade_smooth()
    skin_to(apron, arm)
    return apron


def export(path, parts, arm):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in [arm, *parts]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_animations=False,
        export_skins=True, export_def_bones=True, export_yup=True, export_normals=True, export_tangents=False,
        export_texcoords=True, export_materials='EXPORT', export_image_format='AUTO', export_cameras=False,
        export_lights=False, export_extras=False, export_vertex_color='NONE',
    )
    print(f'  wrote {os.path.relpath(path, ROOT)}  {os.path.getsize(path) // 1024} KB  tris {sum(tris(p) for p in parts)}')


def build(sex):
    pre = f'{sex}_'
    peasant = [f'{pre}Peasant_{p}' for p in ('Arms', 'Body', 'Feet', 'Legs')]
    boots_name = f'{pre}Ranger_Feet' + ('_Boots' if sex == 'Male' else '')  # naming differs in the pack
    names = ['Armature', *peasant, boots_name, f'{pre}Ranger_Head_Hood']
    snap = snapshot()
    try:
        objs = load_parts(sex, names)
        arm = objs['Armature']
        arms, body, feet, legs = (objs[n] for n in peasant)
        # 512 px base-colour-only materials (Peasant atlas + skin for the hands)
        small = {}
        atlas_img = None
        for o in (arms, body, feet, legs):
            for slot in o.material_slots:
                src = slot.material
                if src.name not in small:
                    small[src.name] = small_material(src, f'SV_{src.name}')
                    if src.name == 'MI_Peasant':
                        atlas_img = small[src.name][1]
                slot.material = small[src.name][0]
        atlas = small['MI_Peasant'][0]
        boot_uv = find_swatch(atlas_img, BOOT_TARGET)
        flat = {k: flat_material(f'SV_{k}', c) for k, c in FLAT_COLORS.items()}

        boots = objs[boots_name]
        decimate_to(boots, BOOT_TRIS)
        boots.data.materials.clear()
        boots.data.materials.append(atlas)
        collapse_uv(boots, boot_uv)
        skin_to(boots, arm)

        hood = objs[f'{pre}Ranger_Head_Hood']
        own_mesh(hood)
        hood.data.materials.clear()
        hood.data.materials.append(flat['hood'])
        skin_to(hood, arm)

        apron = make_apron(sex, body, legs, feet, arm, flat['apron'])

        os.makedirs(OUT, exist_ok=True)
        base = [arms, body, legs]
        export(os.path.join(OUT, f'{pre}Peasant_Boots.raw.glb'), [*base, boots], arm)
        export(os.path.join(OUT, f'{pre}Blacksmith.raw.glb'), [*base, feet, apron], arm)
        export(os.path.join(OUT, f'{pre}Herbalist.raw.glb'), [*base, feet, hood], arm)
    finally:
        for o in list(bpy.data.objects):
            if o.name.startswith('sv_tmp_'):
                bpy.data.objects.remove(o)
        restore(snap)


for _sex in os.environ.get('SV_VARIANTS', 'Male,Female').split(','):
    print(_sex)
    build(_sex)
