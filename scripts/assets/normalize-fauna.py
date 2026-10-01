"""
Normalises downloaded static/skinned fauna sources for rig-fauna.py (Blender 5.2, run in Blender's Python,
e.g. via Blender MCP execute_blender_code).

Input:  _temp/fauna/<poly.pizza id>.glb (see docs/assets/README.md for the id → licence/credit table).
Output: _temp/extracted/Extra_Animals/<Name>.glb: one mesh object, no armature/vertex groups, applied transforms,
        head towards -Y in Blender (= +Z in glTF), feet at z=0, centred on x/y, scaled to the target height in metres.
"""
import math
import os

import bpy
from mathutils import Matrix, Vector

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..') if '__file__' in globals() else 'D:/Projekty/private/SeedVales'
SRC = os.path.join(ROOT, '_temp', 'fauna')
DST = os.path.join(ROOT, '_temp', 'extracted', 'Extra_Animals')

# name: (poly.pizza id, rotation about Z in degrees to bring the head to -Y, target height in metres)
SOURCES = {
    'Moose': ('bO8XPdrAb5G', 0, 2.3),
    'Bear': ('56ym_pyVnel', 0, 1.0),
    'Chicken': ('87XZ2kDlAhh', 90, 0.4),
    'Sheep': ('C39AUXUUes', 0, 0.9),
}


def clean_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions, bpy.data.images, bpy.data.materials):
        for d in list(coll):
            coll.remove(d)


def normalise(name, pid, rot, height):
    before = {o.name for o in bpy.data.objects}
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f'{pid}.glb'))
    for n in {o.name for o in bpy.data.objects} - before:
        if n.startswith('Icosphere'):  # the importer's bone display shape
            bpy.data.objects.remove(bpy.data.objects[n])
    new = [bpy.data.objects[n] for n in {o.name for o in bpy.data.objects} - before]
    meshes = [o for o in new if o.type == 'MESH']
    for m in meshes:
        if m.modifiers:  # skinned source (sheep): bake the Idle frame-0 pose in world space (this source's rest pose is lying down), then drop rig data
            ev = m.evaluated_get(bpy.context.evaluated_depsgraph_get())
            me = bpy.data.meshes.new_from_object(ev)
            me.transform(ev.matrix_world)
            m.data = me
            for mod in list(m.modifiers):
                m.modifiers.remove(mod)
            m.parent = None
            m.matrix_world = Matrix.Identity(4)
        else:
            mw = m.matrix_world.copy()
            m.parent = None
            m.matrix_world = mw
        m.vertex_groups.clear()
    for n in [o.name for o in new if o not in meshes]:
        bpy.data.objects.remove(bpy.data.objects[n])
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    for v in me.vertices:
        v.co = Vector((v.co.x * math.cos(math.radians(rot)) - v.co.y * math.sin(math.radians(rot)),
                       v.co.x * math.sin(math.radians(rot)) + v.co.y * math.cos(math.radians(rot)), v.co.z))
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    k = height / (max(zs) - min(zs))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    for v in me.vertices:
        v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - min(zs)) * k))
    me.update()
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(DST, f'{name}.glb'), export_format='GLB', use_selection=True)
    print(name, 'tris', sum(len(p.vertices) - 2 for p in me.polygons), 'size', [round(d, 2) for d in ob.dimensions])


for n, (pid, rot, h) in SOURCES.items():
    clean_scene()
    normalise(n, pid, rot, h)
clean_scene()
