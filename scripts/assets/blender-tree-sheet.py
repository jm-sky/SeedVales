"""Dev-only verification sheet (Blender 4.2+/5.x, headless): imports public/assets/trees.glb and renders, per variant,
LOD0 | LOD1 | impostor (view picked for the camera azimuth, textured quad, alpha clip) side by side, from a game-like
third-person camera at several distances.
  blender -b -P scripts/assets/blender-tree-sheet.py -- <assets-dir> <out-dir>
Nothing is saved to a .blend; the scene is created from scratch."""
import bpy, sys, os, json, math
from mathutils import Vector

assets, out = sys.argv[sys.argv.index('--') + 1:][:2]
os.makedirs(out, exist_ok=True)
meta = json.load(open(os.path.join(assets, 'trees-impostors.json')))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(assets, 'trees.glb'))
roots = {o.name: o for o in bpy.data.objects if o.name in [r['name'] for r in meta['rows']]}
img = bpy.data.images.load(os.path.join(assets, 'trees-impostors.png'))
img.colorspace_settings.name = 'sRGB'
nrows = len(meta['rows'])

def impostor_mat(row, view):
    m = bpy.data.materials.new(f'imp{row}_{view}')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Linear'; tex.extension = 'EXTEND'
    mp = nt.nodes.new('ShaderNodeMapping')
    c = nt.nodes.new('ShaderNodeTexCoord')
    mp.inputs['Scale'].default_value = (1 / meta['views'], 1 / nrows, 1)
    mp.inputs['Location'].default_value = (view / meta['views'], row / nrows, 0)
    nt.links.new(c.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
    em = nt.nodes.new('ShaderNodeBsdfDiffuse')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader'); o = nt.nodes.new('ShaderNodeOutputMaterial')
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.4
    nt.links.new(tex.outputs['Alpha'], gt.inputs[0]); nt.links.new(tex.outputs['Color'], em.inputs['Color'])
    nt.links.new(gt.outputs[0], mix.inputs['Fac']); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], o.inputs['Surface'])
    return m

# arrange: x = variant, y = LOD0 / LOD1 / impostor in depth-staggered columns (Blender Z up; glTF Y up is converted)
spacing = 16.0
for i, row in enumerate(meta['rows']):
    r = roots[row['name']]
    for lod_i, lod in enumerate(['LOD0', 'LOD1']):
        for c in r.children:
            if c.name.startswith(lod):
                pass
    kids = {c.name.split('.')[0]: c for c in r.children}
    base = Vector((i * spacing, 0, 0))
    r.location = base
    kids['LOD0'].location = (0, 0, 0)
    kids['LOD1'].location = (0, -spacing, 0)
    hw, h = row['halfWidth'], row['maxY'] - row['minY']
    bpy.ops.mesh.primitive_plane_add(size=1, rotation=(math.pi / 2, 0, 0))
    q = bpy.context.object; q.name = f'imp_{row["name"]}'
    q.scale = (2 * hw, h, 1); q.location = (i * spacing, -2 * spacing, h / 2 + row['minY'])
    q.data.materials.append(impostor_mat(i, 0))   # view 0 looks from +Y(glTF +Z) = Blender -Y: matches the camera below

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.55, 0.68, 0.85, 1); bg.inputs[1].default_value = 1.0
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'
sc.render.resolution_x, sc.render.resolution_y = 2400, 1400
# side-by-side per LOD column: view the three LOD rows along -Y from +Y... each row placed at different Y, orthographic along Y => overlap.
# so render each LOD set separately and compose with PIL-free approach: three renders (LOD0, LOD1, impostor) by hiding the others.
def show(only):
    for r in roots.values():
        for c in r.children: c.hide_render = not c.name.startswith(only) if only in ('LOD0', 'LOD1') else True
    for o in bpy.data.objects:
        if o.name.startswith('imp_'): o.hide_render = only != 'imp'
cam.location = (spacing * (nrows - 1) / 2, 60, 9); cam.rotation_euler = (math.pi / 2, 0, math.pi)
cam.data.ortho_scale = spacing * nrows + 4
for only in ['LOD0', 'LOD1', 'imp']:
    show(only)
    # shift the camera along Y so that the row being rendered is centred is unnecessary for ortho, only depth order matters
    sc.render.filepath = os.path.join(out, f'blender-{only}.png')
    bpy.ops.render.render(write_still=True)
print('done', out)
