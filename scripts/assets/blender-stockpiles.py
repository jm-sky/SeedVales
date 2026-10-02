"""
Builds public/assets/stockpiles.glb (render--009 step 2) in Blender: tiered piles, one top-level node each,
named `pile_<kind>_<tier>` (docs/design/render-stockpile-assets-contract.md).
Run inside Blender (Blender MCP): exec(open(r'<this file>').read()). Only objects it creates are exported;
the user's existing scene objects are not touched.

Contract: 1 unit = 1 m, +Z = front, origin on the ground at the slot origin (pile footprint centred on it),
identity node transform (geometry baked: render/assets.ts mergeTemplate drops node transforms),
one material, vertex colours only (no textures).
"""
import math
import random

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

OUT = r'D:\Projekty\private\SeedVales\public\assets\stockpiles.glb'
COL = 'bpy_stockpiles'

# kind -> tiers (count thresholds, mirrored in render/stockpileTiers.ts)
TIERS = {'firewood': [1, 5, 7, 14, 20], 'stone': [1, 6, 15, 30], 'grain': [1, 5, 15, 30], 'food': [1, 8, 20, 40]}


def shade(c, rnd, k=0.08):
    f = 1 + rnd.uniform(-k, k)
    return (min(1, c[0] * f), min(1, c[1] * f), min(1, c[2] * f), 1)


class Builder:
    """Collects primitives into one bmesh with per-face colours."""

    def __init__(self, seed):
        self.bm = bmesh.new()
        self.rnd = random.Random(seed)
        self.lay = self.bm.loops.layers.color.new('Col')

    def _paint(self, faces, color):
        color = tuple(color) + (1,) * (4 - len(color))
        for f in faces:
            for l in f.loops:
                l[self.lay] = color

    def _add(self, geom_fn, mat, color):
        before = set(self.bm.faces)
        verts = geom_fn()
        bmesh.ops.transform(self.bm, matrix=mat, verts=verts)
        self._paint([f for f in self.bm.faces if f not in before], color)

    def cylinder(self, mat, r, length, color, seg=6):
        def fn():
            res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r * 0.92, depth=length)
            return res['verts']
        self._add(fn, mat, color)

    def box(self, mat, sx, sy, sz, color):
        def fn():
            res = bmesh.ops.create_cube(self.bm, size=1.0)
            bmesh.ops.scale(self.bm, vec=(sx, sy, sz), verts=res['verts'])
            return res['verts']
        self._add(fn, mat, color)

    def blob(self, mat, sx, sy, sz, color, subdiv=1):
        def fn():
            res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1.0)
            for v in res['verts']:
                j = 1 + self.rnd.uniform(-0.12, 0.12)
                v.co = Vector((v.co.x * sx * j, v.co.y * sy * j, v.co.z * sz * j))
            return res['verts']
        self._add(fn, mat, color)

    def finish(self, name):
        bm = self.bm
        # drop the hidden underside and put the origin on the ground
        low = min(v.co.z for v in bm.verts)
        bmesh.ops.translate(bm, vec=(0, 0, -low), verts=bm.verts)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = False
        ob = bpy.data.objects.new(name, me)
        return ob


T = lambda x, y, z, rx=0, ry=0, rz=0: Matrix.Translation((x, y, z)) @ Euler((rx, ry, rz)).to_matrix().to_4x4()  # noqa: E731
# Blender is Z-up; the glTF exporter converts to Y-up (+Y up in three.js, Blender -Y forward -> +Z).


def firewood(n, seed):
    b = Builder(seed)
    r, ln = 0.11, 1.15
    # rows from the bottom, widest first: pyramid of logs lying along X
    rows, left, w = [], n, None
    w = 1
    while sum(range(1, w + 1)) < n:
        w += 1
    # width of the base row: smallest w where a pyramid w, w-1, ... holds n logs (never wider than 6)
    w = min(6, w)
    z = r
    while left > 0 and w > 0:
        cnt = min(w, left)
        for i in range(cnt):
            y = (i - (cnt - 1) / 2) * (r * 2.05)
            x = b.rnd.uniform(-0.05, 0.05)
            c = shade((0.50, 0.35, 0.20), b.rnd, 0.12)
            b.cylinder(T(x, y, z, 0, math.pi / 2, 0), r * b.rnd.uniform(0.85, 1.1), ln * b.rnd.uniform(0.9, 1.0), c)
            # lighter cut ends are suggested by the next shade
        left -= cnt
        w -= 1
        z += r * 1.75
    # a single log lies on the ground a bit askew
    return b.finish(f'pile_firewood_{n}')


def stone(n, seed):
    b = Builder(seed)
    grey = [(0.46, 0.45, 0.43), (0.55, 0.53, 0.50), (0.40, 0.40, 0.40)]
    radius = {1: 0.0, 6: 0.32, 15: 0.5, 30: 0.68}[n]
    for i in range(n):
        if n == 1:
            x = y = 0
        else:
            a = b.rnd.uniform(0, math.tau)
            d = radius * math.sqrt(b.rnd.random())
            x, y = math.cos(a) * d, math.sin(a) * d
        h = max(0.0, 1 - math.hypot(x, y) / (radius + 0.01)) if n > 1 else 0
        s = b.rnd.uniform(0.17, 0.27) * (1.5 if n == 1 else 1)
        c = shade(b.rnd.choice(grey), b.rnd, 0.1)
        b.blob(T(x, y, s * 0.7 + h * 1.1 * radius, 0, 0, b.rnd.uniform(0, 3)), s * 1.2, s, s * 0.8, c)
    return b.finish(f'pile_stone_{n}')


def grain(n, seed):
    b = Builder(seed)
    sx, sy, sz = 0.36, 0.26, 0.17
    cloth = [(0.78, 0.68, 0.46), (0.72, 0.62, 0.42)]
    # pyramid layers; count per layer chosen to hold exactly n sacks
    layout = {1: [1], 5: [3, 2], 15: [5, 4, 3, 2, 1], 30: [5, 4, 3, 2, 1]}[n]
    rows = 2 if n == 30 else 1  # the biggest tier is two sacks deep so the pile stays ~4 m wide
    left, z = n, 0.0
    for cnt in layout:
        cnt = min(cnt * rows, left)
        for i in range(cnt):
            x = ((i // rows) - (cnt / rows - 1) / 2) * (sx * 2.15)
            y = b.rnd.uniform(-0.03, 0.03) + (0.19 if rows == 2 and i % 2 else -0.19 if rows == 2 else 0)
            b.blob(T(x, y, z + sz, 0, 0, b.rnd.uniform(-0.15, 0.15)), sx, sy, sz, shade(b.rnd.choice(cloth), b.rnd), subdiv=1)
            b.blob(T(x, y, z + sz * 2 - 0.02, 0, 0, 0), sx * 0.35, sy * 0.35, 0.04, (0.45, 0.36, 0.22, 1), subdiv=0)  # tied neck
        left -= cnt
        z += sz * 1.7
        if left <= 0:
            break
    return b.finish(f'pile_grain_{n}')


def food(n, seed):
    b = Builder(seed)
    wood = (0.55, 0.42, 0.26)
    dark = (0.40, 0.29, 0.18)
    cw, cd, ch = 0.62, 0.46, 0.40

    def crate(x, y, z):
        b.box(T(x, y, z + ch / 2), cw, cd, ch, shade(wood, b.rnd))
        for dx in (-cw / 2, cw / 2):
            b.box(T(x + dx, y, z + ch / 2), 0.04, cd + 0.02, ch + 0.02, dark)

    def barrel(x, y, z):
        b.cylinder(T(x, y, z + 0.33), 0.27, 0.66, shade((0.45, 0.32, 0.20), b.rnd), seg=8)
        for dz in (0.14, 0.52):
            b.cylinder(T(x, y, z + dz), 0.285, 0.04, (0.25, 0.25, 0.26, 1), seg=8)

    if n == 1:
        crate(0, 0, 0)
    elif n == 8:
        for i in range(3):
            crate((i - 1) * (cw + 0.04), 0, 0)
        crate(-0.33, 0, ch)
        crate(0.33, 0, ch)
        crate(0, 0, ch * 2)
    elif n == 20:
        for i in range(4):
            crate((i - 1.5) * (cw + 0.04), 0, 0)
            if i < 3:
                crate((i - 1) * (cw + 0.04), 0, ch)
        for i in range(2):
            crate((i - 0.5) * (cw + 0.04), 0, ch * 2)
        barrel(-1.45, 0.05, 0)
        barrel(-1.45, 0.62, 0)
        barrel(-0.9, 0.62, 0)
    else:  # 40
        for row in (0, 1):
            for i in range(5):
                crate((i - 2) * (cw + 0.04), row * (cd + 0.04), 0)
                if i < 4:
                    crate((i - 1.5) * (cw + 0.04), row * (cd + 0.04), ch)
            for i in range(3):
                crate((i - 1) * (cw + 0.04), row * (cd + 0.04), ch * 2)
        for k in range(4):
            barrel(-1.9 + (k % 2) * 0.56, -0.62 - (k // 2) * 0.56, 0)
    return b.finish(f'pile_food_{n}')


BUILD = {'firewood': firewood, 'stone': stone, 'grain': grain, 'food': food}

# fresh collection holding only our objects
if COL in bpy.data.collections:
    for o in list(bpy.data.collections[COL].objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(bpy.data.collections[COL])
col = bpy.data.collections.new(COL)
bpy.context.scene.collection.children.link(col)

mat = bpy.data.materials.get('stockpiles_vc') or bpy.data.materials.new('stockpiles_vc')
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
out = nt.nodes.new('ShaderNodeOutputMaterial')
bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
vc = nt.nodes.new('ShaderNodeVertexColor')
vc.layer_name = 'Col'
bsdf.inputs['Roughness'].default_value = 0.9
nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

names, tris = [], {}
xoff = 0.0
for kind, tiers in TIERS.items():
    for i, t in enumerate(tiers):
        ob = BUILD[kind](t, (sum(map(ord, kind)) * 31 + t) % 1000)
        ob.data.materials.append(mat)
        col.objects.link(ob)
        ob.location = (0, 0, 0)  # exported at the origin; laid out for the preview below
        names.append(ob.name)
        tris[ob.name] = sum(len(p.vertices) - 2 for p in ob.data.polygons)

bpy.ops.object.select_all(action='DESELECT')
for nme in names:
    bpy.data.objects[nme].select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects[names[0]]
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_vertex_color='ACTIVE',
                          export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
print(tris)
print('exported', OUT)

# preview layout (after export; the exported file keeps every node at the origin)
x = 0.0
for kind, tiers in TIERS.items():
    x = 0.0
    for t in tiers:
        ob = bpy.data.objects[f'pile_{kind}_{t}']
        ob.location = (x, list(TIERS).index(kind) * 4.0, 0)
        x += 3.2
