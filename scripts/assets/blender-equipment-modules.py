"""
Blender (dev-only, D-REN-8) — equipment-module candidates from the CC0 "Modular Character Outfits - Fantasy [Source]"
pack (render--011 stage-2 exploration; contract of render--012). Research: docs/research/2026-10-03--007--quaternius-outfit-blend-modular-variants.md

What it does (per sex): loads the pristine parts from a *copy* of All_<Sex>.blend (the source file is never saved,
and Blender refuses to load from the file that is currently open, hence the copy under _temp/work/), cuts single-item
modules out of the Ranger/Knight/Peasant meshes by loose parts and weights, re-uses the original 65-bone UBC skeleton
and vertex-group names (Outfits rest pose: it equals the Outfits/*.gltf rest pose bone for bone), gives every module one
512 px base-colour-only material and exports assets-src/characters/eq/<Module>_<Sex>.raw.glb (render--012 contract).
The scene is restored afterwards (no change to the open file).

Modes (env SV_MODE): 'lib' (only define helpers, used by exploration scripts), 'build' (default: build every module and write
blend-modules.json), 'all' (build + the posed fit sheets docs/state/frames/render--011/blend-fit-<Module>-<sex>.png).
Wrap the call in contextlib.redirect_stdout to silence the glTF importer/exporter logs. Env SV_ROOT overrides the repo root, SV_SEXES="Male,Female" limits sexes,
SV_MODULES="Bracers,Ranger_Plain" limits modules, SV_OUT overrides the export directory.

Run: Blender MCP `execute_blender_code`: exec(open(r'<repo>/scripts/assets/blender-equipment-modules.py').read()),
or the Scripting workspace of any Blender 5.x. Post-processing (simplify, meshopt) is a later step (build-equipment-modules.mjs
`raw` source, not wired yet): these files are candidates.
"""
import math
import os
import shutil

import bmesh
import bpy
import mathutils
import numpy as np

ROOT = os.environ.get('SV_ROOT', r'D:\Projekty\private\SeedVales')
PACK = os.path.join(ROOT, '_temp', 'extracted', 'Modular Character Outfits - Fantasy[Source]')
WORK = os.path.join(ROOT, '_temp', 'work')
OUT = os.environ.get('SV_OUT', os.path.join(ROOT, 'assets-src', 'characters', 'eq'))
FRAMES = os.path.join(ROOT, 'docs', 'state', 'frames', 'render--011')
TEX = 512
ID_TYPES = ('objects', 'meshes', 'armatures', 'materials', 'images', 'node_groups', 'actions', 'collections', 'scenes', 'cameras', 'worlds')


def snapshot():
    return {t: set(getattr(bpy.data, t)) for t in ID_TYPES}


def restore(snap):
    for t in ID_TYPES:
        coll = getattr(bpy.data, t)
        for idb in [i for i in coll if i not in snap[t]]:
            try:
                coll.remove(idb)
            except Exception as e:  # e.g. the scene shown in the window
                print('restore skip', t, idb.name, e)


def begin():
    """Remember the untouched state of the open file once per Blender session (survives separate MCP calls)."""
    ns = bpy.app.driver_namespace
    if 'sv_snap' not in ns:
        ns['sv_snap'] = snapshot()
    return ns['sv_snap']


def end():
    """Remove everything this script created (objects, meshes, materials, images, scenes...)."""
    ns = bpy.app.driver_namespace
    ns.pop('sv_mats', None)
    if 'sv_snap' in ns:
        restore(ns.pop('sv_snap'))


def work_copy(sex):
    os.makedirs(WORK, exist_ok=True)
    dst = os.path.join(WORK, f'work_{sex}.blend')
    src = os.path.join(PACK, f'All_{sex}.blend')
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        shutil.copyfile(src, dst)
    return dst


def load_all(sex):
    """Load every object of the pristine pack (from a work copy) into the current scene; returns {name: obj} (".001"
    suffixes added by Blender when the open file already holds the same names are stripped from the keys)."""
    snap = begin()
    snap_images, snap_mats = snap['images'], snap['materials']
    with bpy.data.libraries.load(work_copy(sex), link=False) as (src, dst):
        dst.objects = [n for n in src.objects if not n.startswith('WGT-')]
    for img in bpy.data.images:  # textures are stored relative to the source folder: point the copies back at the pack
        fp = img.filepath.replace('\\', '/')
        if 'Textures/' in fp and img not in snap_images:
            img.filepath = os.path.join(PACK, 'Textures', fp.split('Textures/', 1)[1])
            img.reload()
    for mat in bpy.data.materials:  # Workbench "Texture" shows the *active* image node: make it the base-colour one
        if mat.use_nodes and mat.node_tree and mat not in snap_mats:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            link = bsdf.inputs['Base Color'].links[0] if bsdf and bsdf.inputs['Base Color'].links else None
            if link and link.from_node.type == 'TEX_IMAGE':
                mat.node_tree.nodes.active = link.from_node
    out = {}
    for o in dst.objects:
        if o is None:
            continue
        bpy.context.scene.collection.objects.link(o)
        out[strip(o.name)] = o
    # the file holds a 382-bone control rig under the name "Armature"; its 65 deform bones carry the UBC names
    arm = out['Armature']
    arm.data.pose_position = 'REST'
    if arm.animation_data:
        arm.animation_data.action = None
    return out


def strip(name):
    import re
    return re.sub(r'\.\d{3}$', '', name)


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def evaluated_copy(obj, name=None, keep_armature=True):
    """Real mesh object with the modifiers (mirror, geometry nodes...) applied, armature modifier kept; the original is untouched."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    me.transform(obj.matrix_world)  # bake: skinned glTF meshes ignore their node transform, so the data must hold armature space
    new = bpy.data.objects.new(name or strip(obj.name), me)
    bpy.context.scene.collection.objects.link(new)
    for vg in obj.vertex_groups:
        new.vertex_groups.new(name=vg.name)
    # new_from_object keeps the vertex-group weights in the mesh; the groups are re-created by name above
    arm = next((m.object for m in obj.modifiers if m.type == 'ARMATURE'), None)
    if arm and keep_armature:
        new.parent = arm
        new.modifiers.new('Armature', 'ARMATURE').object = arm
    return new


def tri_count(obj):
    me = obj.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def bounds(objs):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    mn = [min(p[i] for p in pts) for i in range(3)]
    mx = [max(p[i] for p in pts) for i in range(3)]
    return mn, mx


def front_sign(feet):
    """+1 when the character faces +Y (toes in front of the ankle), else -1."""
    vs = [feet.matrix_world @ v.co for v in feet.data.vertices]
    zmin = min(v.z for v in vs)
    sole = [v.y for v in vs if v.z < zmin + 0.04]
    ankle = [v.y for v in vs if zmin + 0.10 < v.z < zmin + 0.25]
    return 1.0 if sum(sole) / len(sole) > sum(ankle) / len(ankle) else -1.0


def loose_parts(obj):
    """List of vertex-index sets (connected components by edges)."""
    me = obj.data
    parent = list(range(len(me.vertices)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for e in me.edges:
        a, b = find(e.vertices[0]), find(e.vertices[1])
        if a != b:
            parent[a] = b
    groups = {}
    for i in range(len(me.vertices)):
        groups.setdefault(find(i), set()).add(i)
    return sorted(groups.values(), key=len, reverse=True)


def dominant_group(obj, vidx):
    acc = {}
    for i in vidx:
        for g in obj.data.vertices[i].groups:
            acc[obj.vertex_groups[g.group].name] = acc.get(obj.vertex_groups[g.group].name, 0.0) + g.weight
    return sorted(acc.items(), key=lambda kv: -kv[1])[:3]


def extract(obj, keep_vertex, name):
    """New mesh object with only the faces whose every vertex satisfies keep_vertex(index, co_world) (weights, UVs, materials kept)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    mw = obj.matrix_world
    drop = [f for f in bm.faces if not all(keep_vertex(v.index, mw @ v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=drop, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in obj.data.materials:
        me.materials.append(m)
    new = bpy.data.objects.new(name, me)
    new.matrix_world = obj.matrix_world
    bpy.context.scene.collection.objects.link(new)
    for vg in obj.vertex_groups:
        new.vertex_groups.new(name=vg.name)
    arm = next((m.object for m in obj.modifiers if m.type == 'ARMATURE'), None)
    if arm:
        new.parent = arm
        new.modifiers.new('Armature', 'ARMATURE').object = arm
    return new


# ---------------------------------------------------------------- previews (Workbench, temporary scene)
def render_sheet(specs, path, res=420, focus=None, front=-1.0, bg=(0.42, 0.45, 0.5), cols=None):
    """Workbench texture render. specs = [(objects, view)] with view in front/back/side/side_l/top; each spec is one tile,
    tiles are stitched left to right (wrapped after `cols`) into one PNG. focus=(centre_xyz, ortho_size) frames a detail,
    default frames the bounds of all objects."""
    all_objs = [o for spec in specs for o in spec[0]]
    sc = bpy.data.scenes.new('sv_tmp_scene')
    for o in set(all_objs):
        sc.collection.objects.link(o)
    try:  # dynamic enum: RNA under-reports engines, the TypeError lists the accepted identifiers
        sc.render.engine = 'BLENDER_WORKBENCH'
    except TypeError as e:
        raise RuntimeError(f'no Workbench engine: {e}')
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'
    sh = sc.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'TEXTURE'
    sh.show_cavity = False
    sc.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('sv_tmp_world')
    world.color = bg
    sc.world = world
    mn, mx = bounds(all_objs)
    centre = focus[0] if focus else [(mn[i] + mx[i]) / 2 for i in range(3)]
    size = focus[1] if focus else max(mx[2] - mn[2], mx[0] - mn[0], mx[1] - mn[1]) * 1.12
    cam_data = bpy.data.cameras.new('sv_tmp_cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = size
    cam_data.clip_end = 50
    cam = bpy.data.objects.new('sv_tmp_cam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    dirs = {'front': (0, front, 0), 'back': (0, -front, 0), 'side': (1, 0, 0), 'side_l': (-1, 0, 0), 'top': (0, 0, 1)}
    tiles = []
    tmp = os.path.join(WORK, 'sv_tmp_render.png')
    cen = mathutils.Vector(centre)
    for spec in specs:
        objs, view = spec[0], spec[1]
        if len(spec) > 2:
            spec[2](sc)  # per-tile setup (pose: action + frame)
        for o in all_objs:
            o.hide_render = o not in objs
        pos = cen + mathutils.Vector(dirs[view]) * 6
        cam.location = pos
        up = 'Y'
        cam.rotation_euler = (cen - pos).to_track_quat('-Z', 'Y' if view != 'top' else 'X').to_euler()
        sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True, scene=sc.name)
        img = bpy.data.images.load(tmp)
        px = np.empty(res * res * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        tiles.append(px.reshape(res, res, 4).copy())
        bpy.data.images.remove(img)
    for o in all_objs:
        o.hide_render = False
    cols = cols or len(tiles)
    rows = []
    for i in range(0, len(tiles), cols):
        row = tiles[i:i + cols]
        while len(row) < cols:
            row.append(np.zeros_like(tiles[0]))
        rows.append(np.concatenate(row, axis=1))
    sheet = np.concatenate(rows[::-1], axis=0)  # image rows start at the bottom
    out = bpy.data.images.new('sv_tmp_sheet', sheet.shape[1], sheet.shape[0])
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = path
    out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)
    for o in set(all_objs):
        sc.collection.objects.unlink(o)
    bpy.data.scenes.remove(sc)
    bpy.data.objects.remove(cam)
    bpy.data.cameras.remove(cam_data)
    bpy.data.worlds.remove(world)
    print('wrote', os.path.relpath(path, ROOT), os.path.getsize(path) // 1024, 'KB')


# ---------------------------------------------------------------- fit measurement (rest pose)
def part(o, sex, name):
    """Source object of `sex` by its male-style name; the pack names differ slightly between the sexes."""
    alias = {'Male': {}, 'Female': {'Ranger_Feet_Boots': 'Ranger_Feet', 'Ranger_Acc_Pauldron': 'Ranger_Acc_Pauldrons',
                                    'Knight_Acc_Pauldron_Round': 'Knight_Acc_Pauldrons_Round', 'Wizard_Body_BeltOrnament': 'Wizard_Body_Belt_Ornament'}}
    return o[f'{sex}_{alias[sex].get(name, name)}']


def base_bvh(o, sex, parts=('Arms', 'Body', 'Legs', 'Feet')):
    """BVH tree of the evaluated Peasant base (world space) for penetration tests."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    verts, polys = [], []
    for p in parts:
        ev = o[f'{sex}_Peasant_{p}'].evaluated_get(dg)
        me = ev.to_mesh()
        off = len(verts)
        verts += [ev.matrix_world @ v.co for v in me.vertices]
        me.calc_loop_triangles()
        polys += [tuple(off + i for i in t.vertices) for t in me.loop_triangles]
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(verts, polys)


def fit_report(mod_objs, bvh, near=0.10):
    """Depth (m) by which module vertices lie *inside* the base surface: only vertices within `near` of it are counted."""
    depths = []
    for ob in mod_objs:
        for v in ob.data.vertices:
            loc, nor, _idx, dist = bvh.find_nearest(ob.matrix_world @ v.co)
            if loc is None or dist > near:
                continue
            inside = (ob.matrix_world @ v.co - loc).dot(nor) < 0
            depths.append(dist if inside else -dist)
    d = np.array(depths) if depths else np.zeros(1)
    inside = d[d > 0]
    return dict(n_near=len(depths), inside_pct=round(100 * len(inside) / max(1, len(d)), 1),
                p50=round(float(np.percentile(inside, 50)), 4) if len(inside) else 0.0,
                p95=round(float(np.percentile(inside, 95)), 4) if len(inside) else 0.0, max=round(float(inside.max()), 4) if len(inside) else 0.0)


def inflate(obj, metres):
    """Push every vertex out along its normal; normals of vertices sharing a position (UV / hard-edge splits) are averaged, so seams stay closed."""
    me = obj.data
    acc = {}
    for v in me.vertices:
        acc.setdefault(tuple(round(c, 5) for c in v.co), mathutils.Vector((0, 0, 0)))
        acc[tuple(round(c, 5) for c in v.co)] += v.normal
    for v in me.vertices:
        n = acc[tuple(round(c, 5) for c in v.co)]
        if n.length > 1e-6:
            v.co += n.normalized() * metres


def decimate_to(obj, target_tris):
    """Collapse-decimate to ~target_tris (the armature modifier is lifted off while it runs, weights are interpolated)."""
    arm_mods = [m.object for m in obj.modifiers if m.type == 'ARMATURE']
    for m in [m for m in obj.modifiers if m.type == 'ARMATURE']:
        obj.modifiers.remove(m)
    mod = obj.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = min(1.0, target_tris / max(1, tri_count(obj)))
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for a in arm_mods:
        obj.modifiers.new('Armature', 'ARMATURE').object = a


def small_material(src, name):
    """Base-colour-only copy of `src` with its texture scaled to TEX px (materials are cached per name)."""
    cache = bpy.app.driver_namespace.setdefault('sv_mats', {})
    if name in cache and cache[name].name in bpy.data.materials:
        return cache[name]
    tex_node = principled(src).inputs['Base Color'].links[0].from_node
    img = tex_node.image.copy()
    img.name = name
    img.scale(TEX, TEX)
    img.pack()
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = principled(mat)
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 1.0
    cache[name] = mat
    return mat


def shrink_materials(objs):
    for ob in objs:
        for i, slot in enumerate(ob.material_slots):
            if slot.material:
                ob.data.materials[i] = small_material(slot.material, 'SV_' + strip(slot.material.name))


def export_module(path, objs, arm):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in [arm, *objs]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_animations=False,
        export_skins=True, export_def_bones=True, export_yup=True, export_normals=True, export_tangents=False,
        export_texcoords=True, export_materials='EXPORT', export_image_format='AUTO', export_cameras=False,
        export_lights=False, export_extras=False, export_vertex_color='NONE',
    )
    return sum(tri_count(o) for o in objs)


# ---------------------------------------------------------------- derived pieces (gloves from hands, cap from hood)
FINGERS = ('thumb_', 'index_', 'middle_', 'ring_', 'pinky_', 'hand_')


def region_weight(obj, v, prefixes):
    return sum(g.weight for g in v.groups if obj.vertex_groups[g.group].name.startswith(prefixes))


def find_swatch(img, target, size=TEX, flat_std=0.012):
    """UV (u, v) at the centre of the uniform 8x8-px block (3x3-block neighbourhood uniform) nearest `target` (scene-linear RGB)."""
    px = np.empty(size * size * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(size, size, 4)[:, :, :3]
    n = size // 8
    blocks = px.reshape(n, 8, n, 8, 3)
    mean = blocks.mean(axis=(1, 3))
    flat = blocks.std(axis=(1, 3)).max(axis=2) < flat_std
    ok = flat.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ok &= np.roll(np.roll(flat, dy, axis=0), dx, axis=1)
    ok[0, :] = ok[-1, :] = ok[:, 0] = ok[:, -1] = False
    dist = np.linalg.norm(mean - np.array(target, dtype=np.float32), axis=2)
    dist[~ok] = np.inf
    r, c = np.unravel_index(np.argmin(dist), dist.shape)
    print(f'  swatch {target} -> block r{r} c{c} colour {tuple(round(float(x), 3) for x in mean[r, c])} dist {dist[r, c]:.3f}')
    return ((c + 0.5) * 8 / size, (r + 0.5) * 8 / size)


def collapse_uv(obj, uv):
    for layer in obj.data.uv_layers:
        for d in layer.data:
            d.uv = uv


# ---------------------------------------------------------------- fit check (posed, over the game's Peasant base)
CLIPS = (('Idle_Loop', 20), ('Walk_Loop', 8), ('Crouch_Idle_Loop', 30), ('Sword_Attack', 14))
DETAIL = {  # module -> (focus centre, ortho size) of the close-ups
    'Bracers': ((0.25, 0, 1.0), 0.8), 'Gloves': ((0.25, 0, 0.95), 0.8), 'LeatherJerkin': ((0, 0, 1.30), 0.85),
    'PaddedJacket': ((0, 0, 1.30), 0.85), 'LeatherTrousers': ((0, 0, 0.70), 1.15), 'LeatherPauldron': ((0.15, 0, 1.40), 0.6),
}


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def rebind(meshes, arm):
    for m in meshes:
        for mod in [x for x in m.modifiers if x.type == 'ARMATURE']:
            m.modifiers.remove(mod)
        m.parent = arm
        m.matrix_parent_inverse = mathutils.Matrix.Identity(4)
        m.modifiers.new('Armature', 'ARMATURE').object = arm


def pose_setup(arm, action, frame):
    def setup(sc):
        ad = arm.animation_data_create()
        ad.action = action
        if action is not None:  # Blender 5 slotted actions: the slot must be picked explicitly
            ad.action_slot = ad.action_suitable_slots[0]
        sc.frame_current = frame
    return setup


def fit_check(sex, key, inflate_m=0.0, tag='', base_glb=None, with_base=True, base_keep=None):
    """Candidate `key` (assets-src/characters/eq/<key>_<sex>.raw.glb) over the game's <Sex>_Peasant base, posed with anims.glb
    clips; writes docs/state/frames/render--011/blend-fit-<key>-<sex>.png (rest front, four clips, two close-ups)."""
    chars = os.path.join(ROOT, 'public', 'assets', 'characters')
    begin()
    base = import_glb(base_glb or os.path.join(chars, f'{sex}_Peasant.glb'))
    base_arm = next(o for o in base if o.type == 'ARMATURE')
    skinned = lambda objs: [o for o in objs if o.type == 'MESH' and o.vertex_groups]  # the importer also adds a bone-shape icosphere
    base_meshes = skinned(base) if with_base else []
    if base_keep:  # e.g. ('Arms', 'Feet'): the candidate replaces the other base parts (torso / legs)
        base_meshes = [m for m in base_meshes if any(k in m.name for k in base_keep)]
    cand = import_glb(os.path.join(OUT, f'{key}_{sex}.raw.glb'))
    cand_arm = next(o for o in cand if o.type == 'ARMATURE')
    cand_meshes = skinned(cand)
    if inflate_m:
        for m in cand_meshes:
            inflate(m, inflate_m)
    rebind(cand_meshes, base_arm)
    bpy.data.objects.remove(cand_arm)
    before_actions = set(bpy.data.actions)
    anim = import_glb(os.path.join(chars, 'anims.glb'))
    actions = {strip(a.name): a for a in bpy.data.actions if a not in before_actions}
    for o in anim:
        bpy.data.objects.remove(o)
    objs = base_meshes + cand_meshes
    specs = [(objs, 'front', pose_setup(base_arm, None, 1))]
    for clip, frame in CLIPS:
        specs.append((objs, 'side_l' if clip.startswith('Walk') else 'front', pose_setup(base_arm, actions[clip], frame)))
    centre, size = DETAIL.get(key, ((0, 0, 0.95), 2.0))
    specs.append((objs, 'front', pose_setup(base_arm, actions['Idle_Loop'], 20)))
    specs.append((objs, 'side_l', pose_setup(base_arm, actions['Idle_Loop'], 20)))
    # five whole-body tiles (rest + four clips), then two close-ups in the Idle pose (collar / hips / forearm)
    path = os.path.join(FRAMES, f'blend-fit-{key}{tag}-{sex.lower()}.png')
    render_sheet(specs[:5], path.replace('.png', '_a.png'), res=300, focus=((0, 0, 0.95), 2.0), front=-1, cols=5)
    render_sheet(specs[5:], path.replace('.png', '_b.png'), res=390, focus=(centre, size), front=-1, cols=2)
    stack_pngs([path.replace('.png', '_a.png'), path.replace('.png', '_b.png')], path)
    return path


def stack_pngs(paths, out):
    """Stack PNGs vertically (centred, padded with the background colour) into `out` and delete the inputs."""
    imgs = []
    for p in paths:
        im = bpy.data.images.load(p)
        w, h = im.size
        a = np.empty(w * h * 4, dtype=np.float32)
        im.pixels.foreach_get(a)
        imgs.append(a.reshape(h, w, 4).copy())
        bpy.data.images.remove(im)
    width = max(i.shape[1] for i in imgs)
    rows = []
    for a in imgs:
        full = np.empty((a.shape[0], width, 4), dtype=np.float32)
        full[:] = a[-1, 0]  # background colour (top-left pixel; image rows start at the bottom)
        x0 = (width - a.shape[1]) // 2
        full[:, x0:x0 + a.shape[1]] = a
        rows.append(full)
    sheet = np.concatenate(rows[::-1], axis=0)  # image rows start at the bottom: the first PNG ends up on top
    img = bpy.data.images.new('sv_tmp_stack', sheet.shape[1], sheet.shape[0])
    img.pixels.foreach_set(sheet.ravel())
    img.filepath_raw = out
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    for p in paths:
        os.remove(p)


# ---------------------------------------------------------------- modules
# Target colours searched among the uniform blocks of an atlas (scene-linear RGB).
BRACER_TRIS = 600               # source 3636 (both forearms); the glTF simplify cannot reach the 600 budget on its own
PADDED = (0.30, 0.22, 0.12)      # undyed linen / ochre (Peasant atlas)


def atlas_pixels(mat):
    img = principled(mat).inputs['Base Color'].links[0].from_node.image
    px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(img.size[1], img.size[0], 4)[:, :, :3], img


def remap_faces(obj, slot_index, classify, uv):
    """Collapse the UVs of every face of material slot `slot_index` whose atlas colour satisfies classify(r, g, b) onto `uv`."""
    px, img = atlas_pixels(obj.material_slots[slot_index].material)
    h, w = px.shape[:2]
    layer = obj.data.uv_layers.active
    n = 0
    for poly in obj.data.polygons:
        if poly.material_index != slot_index:
            continue
        loops = [layer.data[i] for i in poly.loop_indices]
        cu = sum(l.uv[0] for l in loops) / len(loops)
        cv = sum(l.uv[1] for l in loops) / len(loops)
        r, g, b = px[int(cv * h) % h, int(cu * w) % w]
        if classify(r, g, b):
            for l in loops:
                l.uv = uv
            n += 1
    return n


def brown_uv(obj, mat):
    """UV of a typical leather-brown face of `obj` (colour read from the 512 px material `mat`): the Ranger atlas has no flat brown block."""
    px, _img = atlas_pixels(mat)
    h, w = px.shape[:2]
    layer = obj.data.uv_layers.active
    found = []
    for poly in obj.data.polygons:
        loops = [layer.data[i] for i in poly.loop_indices]
        cu = sum(l.uv[0] for l in loops) / len(loops)
        cv = sum(l.uv[1] for l in loops) / len(loops)
        r, g, b = px[int(cv * h) % h, int(cu * w) % w]
        if r > 1.25 * g and g > 1.1 * b and 0.04 < r < 0.35:
            found.append(((cu, cv), np.array([r, g, b])))
    mean = np.mean([c for _, c in found], axis=0)
    uv, col = min(found, key=lambda f: np.linalg.norm(f[1] - mean))
    print(f'  leather uv {tuple(round(x, 3) for x in uv)} colour {tuple(round(float(x), 3) for x in col)} from {len(found)} faces')
    return uv


def swatch_for(obj, slot_index, target, flat_std=0.05):
    mat = obj.material_slots[slot_index].material
    return find_swatch(principled(mat).inputs['Base Color'].links[0].from_node.image, target, TEX, flat_std)


def is_green(r, g, b):
    return g > 1.25 * r and g > 1.1 * b and g > 0.02


def hand_shell(src_obj, arm, cut_x, tris, thickness):
    """Glove: the faces of the arm mesh beyond |x| >= cut_x (hand + fingers), decimated to `tris`, pushed out by `thickness`."""
    g = extract(src_obj, lambda i, co: abs(co.x) >= cut_x, 'Gloves')
    decimate_to(g, tris)
    inflate(g, thickness)
    return g


def build_modules(sex, o, only=None):
    """Create the module objects of `sex`. Returns {module: [objects]} (new evaluated copies, source objects untouched)."""
    arm = o['Armature']
    ev = lambda n, nm=None: evaluated_copy(part(o, sex, n), nm or n)
    mods = {}
    mods['Bracers'] = [ev('Ranger_Arms_Bracer', 'Bracers')]
    # meshopt cannot go below ~750 tris here (the strap islands keep their borders): collapse-decimate in Blender first
    decimate_to(mods['Bracers'][0], BRACER_TRIS)
    boots = ev('Ranger_Feet_Boots')
    decimate_to(boots, 1800)
    plain = [ev('Ranger_Arms'), ev('Ranger_Body'), ev('Ranger_Body_Belt_1'), ev('Ranger_Body_Belt_2'), ev('Ranger_Legs'), boots]
    mods['Ranger_Plain'] = plain
    hood = ev('Ranger_Head_Hood')
    mods['Ranger_Plain_Hood'] = [*[ev(n) for n in ('Ranger_Arms', 'Ranger_Body', 'Ranger_Body_Belt_1', 'Ranger_Body_Belt_2', 'Ranger_Legs')],
                                 evaluated_copy(part(o, sex, 'Ranger_Feet_Boots'), 'boots2'), hood]
    decimate_to(mods['Ranger_Plain_Hood'][5], 1800)
    mods['LeatherJerkin'] = [ev('Ranger_Body', 'LeatherJerkin'), ev('Ranger_Body_Belt_1', 'LeatherJerkin_Belt')]
    mods['LeatherTrousers'] = [ev('Ranger_Legs', 'LeatherTrousers')]
    mods['PaddedJacket'] = [ev('Knight_Body_Cloth', 'PaddedJacket')]
    mods['LeatherPauldron'] = [ev('Ranger_Acc_Pauldron', 'LeatherPauldron')]
    pa = ev('Peasant_Arms', 'sv_tmp_pa')
    wrist = arm.data.bones['hand_l'].head_local.x - 0.02
    gl = hand_shell(pa, arm, wrist, 560, 0.004)
    gl.name = gl.data.name = 'Gloves'
    bpy.data.objects.remove(pa)
    mods['Gloves'] = [gl]
    return {k: v for k, v in mods.items() if not only or k in only}


def finish_module(key, objs, o, sex, leather_uv):
    """512 px base-colour-only materials, plus the colour remaps that turn Ranger/Knight parts into leather / linen."""
    shrink_materials(objs)
    if key == 'LeatherJerkin':
        body = objs[0]
        for i, _ in enumerate(body.material_slots):
            print('  jerkin green faces ->', remap_faces(body, i, is_green, leather_uv))
    elif key == 'LeatherTrousers':
        collapse_uv(objs[0], leather_uv)
    elif key == 'PaddedJacket':
        ob = objs[0]
        peasant = small_material(o[f'{sex}_Peasant_Body'].material_slots[0].material, 'SV_MI_Peasant')
        ob.data.materials.clear()
        ob.data.materials.append(peasant)
        uv = swatch_for(ob, 0, PADDED)
        collapse_uv(ob, uv)
    elif key == 'Gloves':
        gl = objs[0]
        gl.data.materials.clear()
        rng = bpy.data.materials.get('SV_MI_Ranger') or None
        if rng is None:
            raise RuntimeError('SV_MI_Ranger missing: build a Ranger module first')
        gl.data.materials.append(rng)
        collapse_uv(gl, leather_uv)


def build(sexes, only=None):
    report = {}
    for sex in sexes:
        o = load_all(sex)
        arm = o['Armature']
        bvh = base_bvh(o, sex)
        mods = build_modules(sex, o, only)
        rbody = part(o, sex, 'Ranger_Body')
        leather_uv = brown_uv(rbody, small_material(rbody.material_slots[0].material, 'SV_MI_Ranger'))
        # Gloves need the Ranger atlas material: shrink the Ranger modules first
        order = sorted(mods, key=lambda k: k == 'Gloves')
        for key in order:
            objs = mods[key]
            finish_module(key, objs, o, sex, leather_uv)
            for ob in objs:
                ob.name = f'{key}.{ob.name}' if not ob.name.startswith(key) else ob.name
            fit = fit_report(objs, bvh)
            path = os.path.join(OUT, f'{key}_{sex}.raw.glb')
            tris = export_module(path, objs, arm)
            mn, mx = bounds(objs)
            rec = max(0.01, math.ceil((fit['p95'] + 0.004) * 200) / 200)  # p95 penetration + 4 mm, rounded up to 5 mm
            report[f'{key}_{sex}'] = dict(tris=tris, inflate_rec=rec, size_kb=os.path.getsize(path) // 1024, fit=fit,
                                          materials=sorted({s.material.name for ob in objs for s in ob.material_slots if s.material}),
                                          bbox=[[round(x, 3) for x in mn], [round(x, 3) for x in mx]])
            print(f'{key}_{sex}: {tris} tris, {report[f"{key}_{sex}"]["size_kb"]} KB, fit {fit}')
        end()
    return report


def fit_all(report, sexes):
    """Fit sheets for every module of the report: modules over the Peasant base at their recommended inflate, base outfits alone."""
    for sex in sexes:
        for key in ('Bracers', 'LeatherJerkin', 'LeatherTrousers', 'PaddedJacket', 'LeatherPauldron', 'Gloves', 'Ranger_Plain', 'Ranger_Plain_Hood'):
            if f'{key}_{sex}' not in report:
                continue
            outfit = key.startswith('Ranger_Plain')
            end()
            fit_check(sex, key, inflate_m=0.0 if outfit or key == 'Gloves' else report[f'{key}_{sex}']['inflate_rec'], with_base=not outfit)
    end()


if os.environ.get('SV_MODE', 'build') in ('build', 'all'):
    import json
    try:
        _rep = build(os.environ.get('SV_SEXES', 'Male,Female').split(','), os.environ.get('SV_MODULES', '').split(',') if os.environ.get('SV_MODULES') else None)
    finally:
        end()
    os.makedirs(FRAMES, exist_ok=True)
    _path = os.path.join(FRAMES, 'blend-modules.json')
    _all = json.load(open(_path)) if os.path.exists(_path) else {}
    _all.update(_rep)  # partial runs (SV_MODULES / SV_SEXES) keep the other entries
    with open(_path, 'w') as _f:
        json.dump(_all, _f, indent=1)
    if os.environ.get('SV_MODE') == 'all':
        fit_all(_all, os.environ.get('SV_SEXES', 'Male,Female').split(','))
