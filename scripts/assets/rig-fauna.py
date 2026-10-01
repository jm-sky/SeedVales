"""
Rigs and animates the static boar, bear, moose and sheep models and chicken (the chicken is a biped with its own bones, weights and clips) (Blender 5.2, run in Blender's Python, e.g. via
Blender MCP execute_blender_code or `blender -b -P scripts/assets/rig-boar-bear.py`).

Input:  _temp/extracted/Extra_Animals/{Boar,Bear,Moose,Sheep,Chicken}.glb (normalised static meshes, head towards -Y in
        Blender = +Z in glTF, feet at z=0).
Output: _temp/extracted/Extra_Animals/{Boar,Bear,Moose,Sheep,Chicken}_rigged.glb with clips Idle/Walk/Gallop/Attack/Eating/Death
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
ONLY = globals().get('ONLY', ('Boar', 'Bear', 'Moose', 'Sheep', 'Chicken'))  # set ONLY before exec to rig a subset

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

def quad(spine, legs):
    """Shared quadruped layout: Root/Hips/Spine/Chest/Neck/Head + 2-bone legs. legs = (front upper head x/y/z, knee, foot, rear ...)."""
    d = {'Root': ((0, 0, 0), (0, 0.15, 0), None)}
    d.update(spine)
    for s_, x in (('L', -1), ('R', 1)):
        for part, (up, mid, low) in legs.items():
            parent = 'Chest' if part == 'Front' else 'Hips'
            d[f'{part}Upper.{s_}'] = ((up[0] * x, up[1], up[2]), (mid[0] * x, mid[1], mid[2]), parent)
            d[f'{part}Lower.{s_}'] = ((mid[0] * x, mid[1], mid[2]), (low[0] * x, low[1], low[2]), f'{part}Upper.{s_}')
    return d


# Poly Pizza "Black bear" (666 tris), normalised to 1 m tall, 1.58 m long.
BEAR = quad({
    'Hips': ((0, 0.3, 0.7), (0, 0.7, 0.65), 'Root'),
    'Spine': ((0, 0.3, 0.7), (0, -0.2, 0.75), 'Root'),
    'Chest': ((0, -0.2, 0.75), (0, -0.45, 0.75), 'Spine'),
    'Neck': ((0, -0.45, 0.75), (0, -0.6, 0.72), 'Chest'),
    'Head': ((0, -0.6, 0.72), (0, -0.8, 0.62), 'Neck'),
}, {'Front': ((0.17, -0.05, 0.62), (0.2, -0.15, 0.27), (0.19, -0.27, 0.0)),
    'Rear': ((0.2, 0.62, 0.6), (0.16, 0.56, 0.27), (0.17, 0.48, 0.0))})

# Poly Pizza "Elk" (1644 tris, used as the moose), normalised to 2.3 m with antlers.
MOOSE = quad({
    'Hips': ((0, 0.45, 1.35), (0, 1.1, 1.3), 'Root'),
    'Spine': ((0, 0.45, 1.35), (0, -0.2, 1.5), 'Root'),
    'Chest': ((0, -0.2, 1.5), (0, -0.5, 1.7), 'Spine'),
    'Neck': ((0, -0.5, 1.7), (0, -0.85, 1.8), 'Chest'),
    'Head': ((0, -0.85, 1.8), (0, -1.15, 1.7), 'Neck'),
    'Antler.L': ((-0.15, -0.8, 2.0), (-0.45, -0.35, 2.3), 'Head'),
    'Antler.R': ((0.15, -0.8, 2.0), (0.45, -0.35, 2.3), 'Head'),
}, {'Front': ((0.2, -0.08, 1.4), (0.22, -0.07, 0.95), (0.15, -0.09, 0.0)),
    'Rear': ((0.2, 0.85, 1.3), (0.2, 1.0, 0.8), (0.18, 0.89, 0.0))})

# Quaternius "Sheep" (610 tris, CC0; its own skeleton is dropped, only the Idle frame-0 mesh is kept), 0.9 m tall.
SHEEP = quad({
    'Hips': ((0, 0.3, 0.68), (0, 0.58, 0.65), 'Root'),
    'Spine': ((0, 0.3, 0.68), (0, -0.2, 0.7), 'Root'),
    'Chest': ((0, -0.2, 0.7), (0, -0.35, 0.72), 'Spine'),
    'Neck': ((0, -0.35, 0.72), (0, -0.5, 0.78), 'Chest'),
    'Head': ((0, -0.5, 0.78), (0, -0.62, 0.66), 'Neck'),
}, {'Front': ((0.17, -0.1, 0.5), (0.17, -0.1, 0.25), (0.17, -0.15, 0.0)),
    'Rear': ((0.17, 0.33, 0.55), (0.15, 0.45, 0.27), (0.15, 0.45, 0.0))})


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
    if 'Tail1' in pb:
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
    pb['FrontUpper.L'].rotation_euler.x = 0.2 * swipe
    pb['FrontLower.L'].rotation_euler.x = 0.7 * rise
    if 'FrontPaw.R' in pb:
        pb['FrontPaw.R'].rotation_euler.x = 0.5 * rise
        pb['FrontPaw.L'].rotation_euler.x = 0.4 * rise
    for s in 'LR':
        pb['RearUpper.' + s].rotation_euler.x = 0.25 * rise
        pb['RearLower.' + s].rotation_euler.x = 0.1 * rise
        if 'RearPaw.' + s in pb:
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

    def eating(pb, t):  # head down to the ground, chewing/grazing bobs, weight on the front legs
        down = ease(0.0, 0.2, t) * (1 - ease(0.85, 1.0, t))
        bob = 0.5 + 0.5 * math.sin(TAU * t * 4)
        pb['Neck'].rotation_euler.x = cfg['eatNeck'] * down
        pb['Head'].rotation_euler.x = (cfg['eatHead'] + 0.12 * bob) * down
        pb['Head'].rotation_euler.z = 0.1 * math.sin(TAU * t * 2) * down
        pb['Chest'].rotation_euler.x = cfg.get('eatChest', 0.06) * down
        pb['Root'].location.z = -cfg.get('eatDrop', 0.01) * H * down
        if paws:
            for s in 'LR':
                pb['FrontUpper.' + s].rotation_euler.x = 0.08 * down
        if tail:
            pb['Tail1'].rotation_euler.z = 0.25 * math.sin(TAU * t * 4)
            pb['Tail2'].rotation_euler.z = 0.3 * math.sin(TAU * t * 4 - 0.8)

    def death(pb, t):  # topples onto its right side; the last frames are a held pose (the renderer clamps it)
        fall = ease(0.0, 0.55, t)
        settle = ease(0.55, 0.8, t)
        pb['Root'].rotation_euler.y = cfg['deathRoll'] * fall
        pb['Root'].location.x = cfg['deathX'] * H * fall
        pb['Root'].location.z = cfg['deathZ'] * H * fall - 0.01 * H * settle
        pb['Neck'].rotation_euler.x = 0.25 * settle
        pb['Neck'].rotation_euler.z = 0.2 * settle
        pb['Head'].rotation_euler.x = 0.2 * settle
        for leg in LEGS:
            front = leg.startswith('Front')
            pb[leg].rotation_euler.x = (0.35 if front else -0.35) * fall - 0.1 * settle
            pb[leg.replace('Upper', 'Lower')].rotation_euler.x = 0.5 * fall + 0.2 * settle
        if tail:
            pb['Tail1'].rotation_euler.x = 0.3 * settle

    bake(arm, 'Idle', cfg['idleT'], idle, 2)
    bake(arm, 'Walk', cfg['walkT'], walk)
    bake(arm, 'Gallop', cfg['runT'], gallop)
    bake(arm, 'Attack', cfg['atkT'], lambda pb, t: cfg['attack'](pb, t, H, L))
    bake(arm, 'Eating', cfg['eatT'], eating)
    bake(arm, 'Death', cfg['deathT'], death)


# ---------- chicken (biped bird; Poly Pizza "chicken" by Maf'j Alvarez, 462 tris, 0.4 m tall, head towards -Y) ----------

CHICKEN = {
    'Root': ((0, 0, 0), (0, 0.05, 0), None),
    'Body': ((0, 0.02, 0.17), (0, 0.09, 0.2), 'Root'),
    'Neck': ((0, -0.07, 0.24), (0, -0.1, 0.33), 'Body'),
    'Head': ((0, -0.1, 0.33), (0, -0.14, 0.37), 'Neck'),
    'Tail': ((0, 0.08, 0.2), (0, 0.14, 0.26), 'Body'),
    'Wing.L': ((-0.1, 0.0, 0.18), (-0.11, 0.09, 0.15), 'Body'),
    'Wing.R': ((0.1, 0.0, 0.18), (0.11, 0.09, 0.15), 'Body'),
    'Leg.L': ((-0.052, 0.0, 0.1), (-0.052, 0.0, 0.0), 'Root'),
    'Leg.R': ((0.052, 0.0, 0.1), (0.052, 0.0, 0.0), 'Root'),
}


def weigh_chicken(mesh, arm):
    n = len(mesh.data.vertices)
    co = np.empty(n * 3)
    mesh.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    names = [b for b in CHICKEN if b != 'Root']
    W = np.zeros((n, len(names)))
    col = {b: i for i, b in enumerate(names)}
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    clip = lambda a: np.clip(a, 0, 1)  # noqa: E731
    leg = clip((0.11 - z) / 0.03)
    for s_, sign in (('L', -1), ('R', 1)):
        W[:, col['Leg.' + s_]] = leg * (x * sign > 0)
        wing = clip((np.abs(x) - 0.09) / 0.02) * (x * sign > 0) * (z > 0.1)
        W[:, col['Wing.' + s_]] = wing * (1 - leg)
    tail = clip((y - 0.07) / 0.04) * (z > 0.1)
    neck = clip((z - 0.23) / 0.03) * (y < -0.03)
    head = clip((z - 0.3) / 0.04) * (y < -0.03)
    W[:, col['Tail']] = tail * (1 - leg)
    W[:, col['Head']] = head * (1 - leg)
    W[:, col['Neck']] = np.maximum(neck - head, 0) * (1 - leg)
    W[:, col['Body']] = np.maximum(1 - W.sum(1), 0)
    W /= W.sum(1, keepdims=True)
    groups = [mesh.vertex_groups.new(name=b) for b in names]
    for i in range(n):
        for j in np.nonzero(W[i] > 0.02)[0]:
            groups[j].add([i], float(W[i, j]), 'REPLACE')
    mod = mesh.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    mesh.parent = arm
    mesh.matrix_parent_inverse = arm.matrix_world.inverted()


def animate_chicken(arm):
    arm.animation_data_create()

    def stride(pb, t, A, lift):
        for s_, ph in (('L', 0.0), ('R', 0.5)):
            p = (t + ph) % 1
            pb['Leg.' + s_].rotation_euler.x = A * math.sin(TAU * p)
            pb['Leg.' + s_].location.z = lift * max(0, math.sin(TAU * p + 1.2))

    def idle(pb, t):
        br = math.sin(TAU * t * 3)
        pb['Body'].rotation_euler.x = 0.015 * br
        pb['Root'].location.z = -0.002 * (br + 1)
        peck = max(0, math.sin(TAU * (t * 2 - 0.15))) ** 6  # two quick head dips per loop
        pb['Neck'].rotation_euler.x = 0.45 * peck
        pb['Head'].rotation_euler.x = 0.25 * peck
        pb['Head'].rotation_euler.z = 0.25 * math.sin(TAU * t)
        pb['Tail'].rotation_euler.z = 0.1 * math.sin(TAU * t * 2)

    def walk(pb, t):
        stride(pb, t, 0.55, 0.0)
        pb['Root'].location.z = 0.004 * math.sin(TAU * t * 4)
        pb['Neck'].rotation_euler.x = 0.18 * math.sin(TAU * (t * 2 + 0.25))  # the head bobs forward/back with the steps
        pb['Body'].rotation_euler.z = 0.06 * math.sin(TAU * t)
        pb['Tail'].rotation_euler.z = 0.15 * math.sin(TAU * t)

    def run(pb, t):
        stride(pb, t, 0.9, 0.0)
        pb['Root'].location.z = 0.012 * abs(math.sin(TAU * t * 2))
        pb['Body'].rotation_euler.x = 0.25  # leans forward
        pb['Neck'].rotation_euler.x = -0.2
        for s_, sign in (('L', 1), ('R', -1)):  # wings held out and flapping
            pb['Wing.' + s_].rotation_euler.y = sign * (0.7 + 0.3 * math.sin(TAU * t * 4))
        pb['Tail'].rotation_euler.x = -0.3

    def peck(pb, t, n, depth):
        d = max(0, math.sin(TAU * t * n)) ** 2
        pb['Body'].rotation_euler.x = depth * d
        pb['Neck'].rotation_euler.x = 0.5 * depth * d
        pb['Head'].rotation_euler.x = 0.3 * depth * d
        pb['Tail'].rotation_euler.x = -0.4 * depth * d

    def death(pb, t):
        fall = ease(0.0, 0.5, t)
        flap = math.sin(TAU * t * 3) * (1 - ease(0.3, 0.7, t))
        pb['Root'].rotation_euler.y = 1.5 * fall
        pb['Root'].location.x = -0.43 * 0.4 * fall
        pb['Root'].location.z = 0.3 * 0.4 * fall
        pb['Neck'].rotation_euler.x = 0.3 * fall
        pb['Neck'].rotation_euler.z = 0.4 * fall
        for s_ in 'LR':
            pb['Leg.' + s_].rotation_euler.x = -0.7 * fall
            pb['Wing.' + s_].rotation_euler.y = (1.0 if s_ == 'L' else -1.0) * 0.5 * (fall + 0.4 * flap)

    bake(arm, 'Idle', 90, idle, 2)
    bake(arm, 'Walk', 24, walk)
    bake(arm, 'Gallop', 12, run)
    bake(arm, 'Attack', 18, lambda pb, t: peck(pb, t, 2, 0.8))
    bake(arm, 'Eating', 48, lambda pb, t: peck(pb, t, 3, 0.7))
    bake(arm, 'Death', 30, death)



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
                 cfg=dict(idleT=120, walkT=30, runT=16, atkT=24, walkA=0.32, walkB=0.6, runA=0.55, runB=1.0, flex=0.08, attack=boar_attack,
                 eatT=90, eatNeck=0.85, eatHead=0.8, deathT=40, deathRoll=1.5, deathX=-0.45, deathZ=0.43)),
    'Bear': dict(defs=BEAR, H=1.0, L=1.58, belly=0.35,
                 cfg=dict(idleT=120, walkT=36, runT=20, atkT=30, walkA=0.3, walkB=0.7, runA=0.5, runB=1.1, flex=0.1, attack=bear_attack,
                 eatT=90, eatNeck=0.8, eatHead=0.8, deathT=40, deathRoll=1.5, deathX=-0.45, deathZ=0.4)),
    'Moose': dict(defs=MOOSE, H=2.3, L=2.3, belly=1.0,
                  cfg=dict(idleT=120, walkT=36, runT=20, atkT=30, walkA=0.28, walkB=0.6, runA=0.45, runB=0.9, flex=0.06, attack=boar_attack,
                  eatT=90, eatNeck=0.75, eatHead=0.3, eatChest=0.3, eatDrop=0.04, deathT=40, deathRoll=1.5, deathX=-0.45, deathZ=0.25)),
    'Sheep': dict(defs=SHEEP, H=0.9, L=1.22, belly=0.4,
                  cfg=dict(idleT=120, walkT=30, runT=16, atkT=24, walkA=0.35, walkB=0.6, runA=0.55, runB=1.0, flex=0.08, attack=boar_attack,
                  eatT=90, eatNeck=0.7, eatHead=0.6, deathT=40, deathRoll=1.5, deathX=-0.45, deathZ=0.4)),
}

if 'Chicken' in ONLY:
    mesh = import_mesh('Chicken')
    arm = build_armature('Chicken', mesh, CHICKEN)
    weigh_chicken(mesh, arm)
    animate_chicken(arm)
    export(mesh, arm, 'Chicken')
    print('Chicken_rigged.glb exported')

for name, a in ANIMALS.items():
    if name not in ONLY:
        continue
    mesh = import_mesh(name)
    arm = build_armature(name, mesh, a['defs'])
    weigh(mesh, arm, a['defs'], a['belly'], a['H'])
    animate(arm, a['H'], a['L'], a['cfg'])
    export(mesh, arm, name)
    print(f'{name}_rigged.glb exported')
