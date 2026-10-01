"""
Rigs and animates the static boar and bear models (Blender 5.2, run in Blender's Python, e.g. via
Blender MCP execute_blender_code or `blender -b -P scripts/assets/rig-boar-bear.py`).

Input:  _temp/extracted/Extra_Animals/{Boar,Bear}.glb (normalised static meshes, head towards -Y in
        Blender = +Z in glTF, feet at z=0).
Output: _temp/extracted/Extra_Animals/{Boar,Bear}_rigged.glb with clips Idle/Walk/Gallop/Attack
        (one NLA track per clip); then run `node scripts/assets/build-extra-animals.mjs`.

Skin weights are geometric (inverse distance to bone segments, legs masked by side and front/rear
half) because bone heat fails on these unwelded flat-shaded meshes. Pose sign conventions (roll 0):
leg bones +X swing the foot backward (+Y), spine/neck/head +X lower the front.
"""
import math
import os

import bpy
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..') if '__file__' in globals() else 'D:/Projekty/private/SeedVales'
SRC = os.path.join(ROOT, '_temp', 'extracted', 'Extra_Animals')
TAU = math.tau

# bone: (head, tail, parent) in Blender coordinates of the source mesh
BOAR = {
    'Root': ((0, 0, 0), (0, 0.4, 0), None),
    'Hips': ((0, 0.3, 1.05), (0, 1.1, 1.05), 'Root'),
    'Spine': ((0, 0.3, 1.05), (0, -0.4, 1.1), 'Root'),
    'Chest': ((0, -0.4, 1.1), (0, -0.95, 1.05), 'Spine'),
    'Neck': ((0, -0.95, 1.05), (0, -1.3, 1.0), 'Chest'),
    'Head': ((0, -1.3, 1.0), (0, -2.1, 0.6), 'Neck'),
    'Tail1': ((0, 1.35, 1.5), (0, 1.75, 1.5), 'Hips'),
    'Tail2': ((0, 1.75, 1.5), (0, 2.13, 1.47), 'Tail1'),
}
for s, x in (('L', -1), ('R', 1)):
    BOAR[f'FrontUpper.{s}'] = ((0.58 * x, -0.62, 0.9), (0.58 * x, -0.66, 0.4), 'Chest')
    BOAR[f'FrontLower.{s}'] = ((0.58 * x, -0.66, 0.4), (0.58 * x, -0.70, 0.0), f'FrontUpper.{s}')
    BOAR[f'RearUpper.{s}'] = ((0.6 * x, 0.95, 0.95), (0.61 * x, 1.10, 0.40), 'Hips')
    BOAR[f'RearLower.{s}'] = ((0.61 * x, 1.10, 0.40), (0.58 * x, 0.87, 0.0), f'RearUpper.{s}')

# The bear mesh is posed mid-stride and slightly twisted, hence per-leg coordinates.
BEAR = {
    'Root': ((0, 0, 0), (0, 0.15, 0), None),
    'Hips': ((0.03, 0.15, 0.45), (0.06, 0.48, 0.45), 'Root'),
    'Spine': ((0.03, 0.15, 0.45), (-0.02, -0.15, 0.48), 'Root'),
    'Chest': ((-0.02, -0.15, 0.48), (-0.04, -0.35, 0.50), 'Spine'),
    'Neck': ((-0.04, -0.35, 0.50), (-0.045, -0.45, 0.50), 'Chest'),
    'Head': ((-0.045, -0.45, 0.50), (-0.04, -0.62, 0.42), 'Neck'),
    'FrontUpper.L': ((-0.22, -0.11, 0.42), (-0.17, -0.15, 0.20), 'Chest'),
    'FrontLower.L': ((-0.17, -0.15, 0.20), (-0.19, -0.25, 0.05), 'FrontUpper.L'),
    'FrontPaw.L': ((-0.19, -0.25, 0.05), (-0.21, -0.35, 0.02), 'FrontLower.L'),
    'FrontUpper.R': ((0.09, -0.12, 0.42), (0.065, -0.13, 0.20), 'Chest'),
    'FrontLower.R': ((0.065, -0.13, 0.20), (0.05, -0.24, 0.05), 'FrontUpper.R'),
    'FrontPaw.R': ((0.05, -0.24, 0.05), (0.07, -0.35, 0.02), 'FrontLower.R'),
    'RearUpper.L': ((-0.11, 0.40, 0.42), (-0.09, 0.42, 0.18), 'Hips'),
    'RearLower.L': ((-0.09, 0.42, 0.18), (-0.06, 0.41, 0.05), 'RearUpper.L'),
    'RearPaw.L': ((-0.06, 0.41, 0.05), (-0.07, 0.30, 0.02), 'RearLower.L'),
    'RearUpper.R': ((0.15, 0.36, 0.42), (0.17, 0.30, 0.20), 'Hips'),
    'RearLower.R': ((0.17, 0.30, 0.20), (0.19, 0.33, 0.05), 'RearUpper.R'),
    'RearPaw.R': ((0.19, 0.33, 0.05), (0.18, 0.23, 0.02), 'RearLower.R'),
}


def import_mesh(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f'{name}.glb'))
    return next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')


def build_armature(name, mesh, defs):
    arm = bpy.data.armatures.new(f'{name}_Armature')
    ob = bpy.data.objects.new(f'{name}_Armature', arm)
    mesh.users_collection[0].objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for bn, (h, t, _p) in defs.items():
        b = arm.edit_bones.new(bn)
        b.head, b.tail, b.roll = h, t, 0
    for bn, (_h, _t, p) in defs.items():
        b = arm.edit_bones[bn]
        if p:
            b.parent = arm.edit_bones[p]
        b.use_deform = bn != 'Root'
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def weigh(mesh, arm, defs, belly, scale):
    n = len(mesh.data.vertices)
    co = np.empty(n * 3)
    mesh.data.vertices.foreach_get('co', co)
    M = np.array(mesh.matrix_world)
    co = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
    names = [b for b in defs if b != 'Root']
    top = lambda bn: np.array(defs[bn][0])  # noqa: E731
    midy = (top('FrontUpper.L')[1] + top('FrontUpper.R')[1] + top('RearUpper.L')[1] + top('RearUpper.R')[1]) / 4
    fcx = (top('FrontUpper.L')[0] + top('FrontUpper.R')[0]) / 2
    rcx = (top('RearUpper.L')[0] + top('RearUpper.R')[0]) / 2
    ltop = max(top(b)[2] for b in names if 'Upper' in b)
    D = np.empty((n, len(names)))
    for j, bn in enumerate(names):
        h, t = np.array(defs[bn][0]), np.array(defs[bn][1])
        ab = t - h
        u = np.clip(((co - h) @ ab) / (ab @ ab), 0, 1)
        d = np.maximum(np.linalg.norm(co - (h + u[:, None] * ab), axis=1), 0.01 * scale)
        if bn.startswith(('Front', 'Rear')):
            front, left = bn.startswith('Front'), bn.endswith('.L')
            cx = fcx if front else rcx
            ok = ((co[:, 1] < midy) if front else (co[:, 1] >= midy)) & ((co[:, 0] < cx) if left else (co[:, 0] >= cx))
            # Flank vertices above the belly prefer the spine bones over the legs.
            d = d * (1 + 3 * np.clip((co[:, 2] - belly) / (ltop - belly), 0, None))
            d[~ok] = 1e9
        if bn.startswith('Tail'):
            d[co[:, 1] < defs['Tail1'][0][1] - 0.05 * scale] = 1e9
        D[:, j] = d
    W = 1.0 / D**4
    idx = np.argsort(-W, axis=1)[:, :3]
    w3 = np.take_along_axis(W, idx, 1)
    w3 /= w3.sum(1, keepdims=True)
    groups = [mesh.vertex_groups.new(name=b) for b in names]
    for i in range(n):
        for k in range(3):
            if w3[i, k] > 0.04:
                groups[idx[i, k]].add([i], float(w3[i, k]), 'REPLACE')
    mod = mesh.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    mesh.parent = arm
    mesh.matrix_parent_inverse = arm.matrix_world.inverted()


# ---------- animation ----------

LEGS = ['FrontUpper.L', 'FrontUpper.R', 'RearUpper.L', 'RearUpper.R']


def ease(a, b, x):
    x = min(1, max(0, (x - a) / (b - a)))
    return x * x * (3 - 2 * x)


def leg_angles(p, A, B, s):
    """Stance (fraction s) sweeps the foot front→back; swing returns it with the knee flexed."""
    p %= 1.0
    if p < s:
        return -A + 2 * A * (p / s), 0.0
    q = (p - s) / (1 - s)
    return A - 2 * A * (0.5 - 0.5 * math.cos(math.pi * q)), B * math.sin(math.pi * q)


def gait(pb, t, phases, A, B, s, paws):
    for leg, ph in zip(LEGS, phases):
        up, kn = leg_angles(t + ph, A, B, s)
        pb[leg].rotation_euler.x = up
        pb[leg.replace('Upper', 'Lower')].rotation_euler.x = kn
        if paws:
            p = (t + ph) % 1
            pb[leg.replace('Upper', 'Paw')].rotation_euler.x = 0.6 * kn - (0.15 * math.sin(math.pi * p / s) if p < s else 0)


def bake(arm, name, T, posefn, step=1):
    act = bpy.data.actions.new(f'{arm.name}_{name}')
    act.use_fake_user = True
    arm.animation_data.action = act
    for f in range(0, T + 1, step):
        t = (f % T) / T
        for pb in arm.pose.bones:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)
        posefn(arm.pose.bones, t)
        for pb in arm.pose.bones:
            pb.keyframe_insert('rotation_euler', frame=f)
            if pb.name == 'Root':
                pb.keyframe_insert('location', frame=f)
    act.frame_range = (0, T)
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name  # NLA track name = glTF clip name
    tr.strips.new(name, 0, act)
    arm.animation_data.action = None


def boar_attack(pb, t, H, L):
    """Head-down wind-up, forward lunge with an upward tusk toss."""
    wind = ease(0.0, 0.35, t) * (1 - ease(0.35, 0.5, t))
    thrust = ease(0.35, 0.5, t) * (1 - ease(0.6, 1.0, t))
    pb['Root'].location.y = 0.08 * L * wind - 0.2 * L * thrust
    pb['Root'].location.z = -0.03 * H * wind + 0.02 * H * thrust
    pb['Neck'].rotation_euler.x = 0.25 * wind - 0.1 * thrust
    pb['Head'].rotation_euler.x = 0.35 * wind - 0.55 * thrust
    for s in 'LR':
        pb['FrontUpper.' + s].rotation_euler.x = -0.2 * wind + 0.35 * thrust
        pb['RearUpper.' + s].rotation_euler.x = 0.15 * wind + 0.3 * thrust
    pb['Tail1'].rotation_euler.x = 0.6 * (wind + thrust)


def bear_attack(pb, t, H, L):
    """Rise onto the hind legs, right paw raised, then a downward swipe with a forward lunge."""
    rise = ease(0.0, 0.4, t) * (1 - ease(0.45, 0.6, t))
    swipe = ease(0.42, 0.58, t) * (1 - ease(0.65, 1.0, t))
    pb['Root'].location.y = -0.15 * L * swipe
    pb['Root'].location.z = 0.03 * H * rise
    pb['Spine'].rotation_euler.x = -0.4 * rise + 0.12 * swipe
    pb['Chest'].rotation_euler.x = -0.15 * rise
    pb['Neck'].rotation_euler.x = 0.25 * rise + 0.15 * swipe
    pb['Head'].rotation_euler.x = 0.1 * rise + 0.15 * swipe
    pb['FrontUpper.R'].rotation_euler.x = -0.6 * rise + 0.5 * swipe
    pb['FrontLower.R'].rotation_euler.x = 1.0 * rise - 0.1 * swipe
    pb['FrontPaw.R'].rotation_euler.x = 0.5 * rise
    pb['FrontUpper.L'].rotation_euler.x = 0.2 * swipe
    pb['FrontLower.L'].rotation_euler.x = 0.7 * rise
    pb['FrontPaw.L'].rotation_euler.x = 0.4 * rise
    for s in 'LR':
        pb['RearUpper.' + s].rotation_euler.x = 0.25 * rise
        pb['RearLower.' + s].rotation_euler.x = 0.1 * rise
        pb['RearPaw.' + s].rotation_euler.x = -0.25 * rise


def animate(arm, H, L, cfg):
    arm.animation_data_create()
    paws = 'FrontPaw.L' in arm.pose.bones
    tail = 'Tail1' in arm.pose.bones

    def idle(pb, t):
        br = math.sin(TAU * t * 3)
        pb['Spine'].rotation_euler.x = 0.015 * br
        pb['Chest'].rotation_euler.x = -0.015 * br
        pb['Neck'].rotation_euler.z = 0.18 * math.sin(TAU * t)
        sniff = max(0, math.sin(TAU * (t * 2 - 0.1))) ** 3
        pb['Head'].rotation_euler.x = 0.12 * sniff + 0.03 * br
        pb['Head'].rotation_euler.z = 0.06 * math.sin(TAU * t * 2)
        pb['Root'].location.z = -0.004 * H * (br + 1)
        if tail:
            pb['Tail1'].rotation_euler.z = 0.25 * math.sin(TAU * t * 4)
            pb['Tail2'].rotation_euler.z = 0.3 * math.sin(TAU * t * 4 - 0.8)

    def walk(pb, t):  # lateral-sequence 4-beat walk
        gait(pb, t, (0.25, 0.75, 0.0, 0.5), cfg['walkA'], cfg['walkB'], 0.62, paws)
        pb['Root'].location.z = -0.012 * H * (1 - math.cos(TAU * t * 2))
        pb['Spine'].rotation_euler.y = 0.03 * math.sin(TAU * t)
        pb['Hips'].rotation_euler.y = 0.04 * math.sin(TAU * t)
        pb['Neck'].rotation_euler.x = 0.05 * math.sin(TAU * t * 2)
        pb['Head'].rotation_euler.z = 0.04 * math.sin(TAU * t)
        if tail:
            pb['Tail1'].rotation_euler.z = 0.2 * math.sin(TAU * t)
            pb['Tail2'].rotation_euler.z = 0.25 * math.sin(TAU * t - 0.7)

    def gallop(pb, t):  # transverse gallop with spine flex
        gait(pb, t, (0.5, 0.58, 0.0, 0.08), cfg['runA'], cfg['runB'], 0.42, paws)
        pb['Root'].location.z = 0.04 * H * math.sin(TAU * (t - 0.15))
        flex = cfg['flex'] * math.sin(TAU * (t + 0.1))
        pb['Spine'].rotation_euler.x = flex
        pb['Hips'].rotation_euler.x = flex
        pb['Chest'].rotation_euler.x = 0.5 * flex
        pb['Neck'].rotation_euler.x = 0.12 * math.sin(TAU * (t + 0.3))
        pb['Head'].rotation_euler.x = 0.08 * math.sin(TAU * (t + 0.4))
        if tail:
            pb['Tail1'].rotation_euler.x = 0.35 + 0.15 * math.sin(TAU * t)
            pb['Tail2'].rotation_euler.x = 0.2 * math.sin(TAU * t - 0.8)

    bake(arm, 'Idle', cfg['idleT'], idle, 2)
    bake(arm, 'Walk', cfg['walkT'], walk)
    bake(arm, 'Gallop', cfg['runT'], gallop)
    bake(arm, 'Attack', cfg['atkT'], lambda pb, t: cfg['attack'](pb, t, H, L))


def export(mesh, arm, name):
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=os.path.join(SRC, f'{name}_rigged.glb'), export_format='GLB', use_selection=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True)


ANIMALS = {
    # H = mesh height, L = mesh length (source units), belly = z below which leg bones dominate
    'Boar': dict(defs=BOAR, H=1.79, L=4.25, belly=0.45,
                 cfg=dict(idleT=120, walkT=30, runT=16, atkT=24, walkA=0.32, walkB=0.6, runA=0.55, runB=1.0, flex=0.08, attack=boar_attack)),
    'Bear': dict(defs=BEAR, H=0.66, L=1.23, belly=0.22,
                 cfg=dict(idleT=120, walkT=36, runT=20, atkT=30, walkA=0.3, walkB=0.7, runA=0.5, runB=1.1, flex=0.1, attack=bear_attack)),
}

for name, a in ANIMALS.items():
    mesh = import_mesh(name)
    arm = build_armature(name, mesh, a['defs'])
    weigh(mesh, arm, a['defs'], a['belly'], a['H'])
    animate(arm, a['H'], a['L'], a['cfg'])
    export(mesh, arm, name)
    print(f'{name}_rigged.glb exported')
