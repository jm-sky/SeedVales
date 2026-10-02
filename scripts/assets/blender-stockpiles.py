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


class HeightField:
    """Top surface of everything already placed (max z per 2.5 cm cell) so new rocks can be dropped onto real geometry."""
    CELL = 0.025

    def __init__(self):
        self.d = {}

    def _k(self, x, y):
        return (math.floor(x / self.CELL + 0.5), math.floor(y / self.CELL + 0.5))

    def h(self, x, y):
        return self.d.get(self._k(x, y), 0.0)

    def add_tri(self, a, b, c):
        n = max(2, int(max((a - b).length, (b - c).length, (c - a).length) / (self.CELL * 0.6)))
        for i in range(n + 1):
            for j in range(n + 1 - i):
                u, v = i / n, j / n
                p = a * (1 - u - v) + b * u + c * v
                k = self._k(p.x, p.y)
                if p.z > self.d.get(k, 0.0):
                    self.d[k] = p.z


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

    def log(self, mat, r, length, bark, seg=10):
        """Firewood log: bark furrows (valleys darker, running the whole length) + end grain (dark bark rim, pale sapwood, medium heart)."""
        rnd = self.rnd
        end_sap = shade((0.82, 0.66, 0.44), rnd, 0.06)
        end_heart = shade((0.64, 0.45, 0.26), rnd, 0.06)
        end_bark = (bark[0] * 0.72, bark[1] * 0.72, bark[2] * 0.72, 1)
        before = set(self.bm.faces)
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r * rnd.uniform(0.84, 0.95), depth=length)
        long_edges = list({e for v in res['verts'] for e in v.link_edges if abs(e.verts[0].co.z - e.verts[1].co.z) > length * 0.5})
        bmesh.ops.subdivide_edges(self.bm, edges=long_edges, cuts=2, use_grid_fill=False)
        caps = [f for f in self.bm.faces if f not in before and abs(f.normal.z) > 0.9]
        for cap in caps:  # concentric end grain: thin bark rim, sapwood ring, heart (the cap face itself ends up as the heart)
            bmesh.ops.inset_region(self.bm, faces=[cap], thickness=r * 0.13, depth=0, use_even_offset=True)
            bmesh.ops.inset_region(self.bm, faces=[cap], thickness=r * 0.36, depth=0, use_even_offset=True)
        new = [f for f in self.bm.faces if f not in before]
        end_r = {}
        for f in new:
            if abs(f.normal.z) > 0.9:
                key = f.verts[0].co.z > 0
                end_r[key] = max(end_r.get(key, 0), max(math.hypot(v.co.x, v.co.y) for v in f.verts))
        zone = {}
        for f in new:
            if abs(f.normal.z) > 0.9:
                key = f.verts[0].co.z > 0
                zone[f] = 'heart' if len(f.verts) == seg else 'bark' if max(math.hypot(v.co.x, v.co.y) for v in f.verts) >= 0.97 * end_r[key] else 'sap'
        verts = list({v for f in new for v in f.verts})
        # furrows: one random depth per bark column, shared by all rings so grooves run along the log
        cols = [rnd.uniform(-1, 1) for _ in range(seg)]
        bend = (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05))
        phase = rnd.uniform(0, math.tau)
        furrow = {}
        for v in verts:
            t = v.co.z / length + 0.5
            idx = round(math.atan2(v.co.y, v.co.x) / (math.tau / seg)) % seg
            fur = cols[idx] + 0.25 * math.sin(t * 9 + idx)  # slight drift along the length
            furrow[v] = fur
            rad = (1 + 0.09 * fur) * (1 + 0.1 * math.sin(t * math.pi + phase)) * (1 + rnd.uniform(-0.04, 0.04))
            v.co.x = v.co.x * rad + bend[0] * math.sin(t * math.pi)
            v.co.y = v.co.y * rad + bend[1] * math.sin(t * math.pi)
        cap_set = {f for f in new if abs(f.normal.z) > 0.9}
        lay = self.lay
        for f in new:
            if f in cap_set:
                front = sum(v.co.z for v in f.verts) > 0
                c = {'heart': end_heart, 'sap': end_sap, 'bark': end_bark}[zone[f]]
                if not front:
                    c = tuple(x * 0.88 for x in c[:3]) + (1,)
                self._paint([f], c)
            else:
                for l in f.loops:  # per-vertex bark tone from the furrow depth: valleys dark, ridges light
                    k = 0.78 + 0.24 * (furrow[l.vert] + 1.25) / 2.5
                    l[lay] = (min(1, bark[0] * k), min(1, bark[1] * k), min(1, bark[2] * k), 1)
        bmesh.ops.transform(self.bm, matrix=mat, verts=verts)

    def _lathe(self, mat, rings, cols, apexes, shade_fn):
        """rings: list of vertex rings (same seg); cols: per-ring colour; apexes: (first, last) cap vertices or None."""
        bm, seg = self.bm, len(rings[0])
        faces = []
        for r in range(len(rings) - 1):
            for i in range(seg):
                j = (i + 1) % seg
                faces.append((rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]))
        if apexes[0]:
            faces += [(rings[0][(i + 1) % seg], rings[0][i], apexes[0]) for i in range(seg)]
        if apexes[1]:
            faces += [(rings[-1][i], rings[-1][(i + 1) % seg], apexes[1]) for i in range(seg)]
        owner = {v: (ri, i) for ri, rg in enumerate(rings) for i, v in enumerate(rg)}
        for vs in faces:
            f = bm.faces.new(vs)
            for l in f.loops:
                ri, i = owner.get(l.vert, (0 if l.vert is apexes[0] else len(rings) - 1, 0))
                l[self.lay] = shade_fn(ri, i, cols[ri])
        allv = [v for rg in rings for v in rg] + [a for a in apexes if a]
        bmesh.ops.transform(bm, matrix=mat, verts=allv)

    def sack(self, mat, L, W, H, cloth, seg=8):
        """Lying sack: tied neck on the -X end (rope + tuft), stuffed belly, flat sewn seam on the +X end."""
        rnd, bm = self.rnd, self.bm
        rope = (0.34, 0.26, 0.16, 1)
        # (x fraction, radius factor, colour kind)
        prof = [(-1.0, 0.20, 'tuft'), (-0.84, 0.26, 'rope'), (-0.58, 0.82, 'c'), (-0.2, 0.98, 'c'), (0.25, 1.0, 'c'), (0.68, 0.92, 'c'), (1.0, 0.50, 'seam')]
        rings, cols, vmin = [], [], 9
        for (u, rf, kind) in prof:
            ring = []
            for i in range(seg):
                a = math.tau * i / seg
                j = 1 + rnd.uniform(-0.07, 0.07)
                y, z = math.cos(a) * W * rf * j, max(math.sin(a), -0.55) * H * rf * j
                ring.append(bm.verts.new((u * L + rnd.uniform(-0.02, 0.02), y, z)))
                vmin = min(vmin, z)
            rings.append(ring)
            cols.append((kind, rf))
        for rg in rings:  # sit on the ground
            for v in rg:
                v.co.z -= vmin
        tip = bm.verts.new((-L * 1.12, 0, rings[0][0].co.z * 0.5 + rings[3][0].co.z * 0.3))
        end = bm.verts.new((L * 1.02, 0, sum(v.co.z for v in rings[-1]) / seg))

        def paint(ri, i, col):
            kind = col[0]
            if kind == 'rope':
                return rope
            top = 0.5 + 0.5 * math.sin(math.tau * i / seg)  # 0 underneath .. 1 on top
            k = 0.70 + 0.34 * top  # baked-looking height gradient
            if kind == 'tuft':
                k *= 0.85
            if kind == 'seam':
                k *= 0.78  # stitched seam end is darker
            return (min(1, cloth[0] * k), min(1, cloth[1] * k), min(1, cloth[2] * k), 1)
        self._lathe(mat, rings, cols, (tip, end), paint)

    def barrel(self, mat, r, h, wood, seg=8):
        """Bulging barrel: alternating stave tones, lighter lid, iron hoops."""
        rnd, bm = self.rnd, self.bm
        prof = [(0.82, 0.0), (0.95, 0.25), (1.0, 0.5), (0.95, 0.75), (0.82, 1.0)]
        rings = [[bm.verts.new((math.cos(math.tau * i / seg) * r * rf, math.sin(math.tau * i / seg) * r * rf, hf * h)) for i in range(seg)] for rf, hf in prof]
        top = bm.verts.new((0, 0, h))
        bot = bm.verts.new((0, 0, 0))

        def paint(ri, i, col):
            if ri == len(prof) - 1 and True:
                pass
            k = 1.0 if i % 2 else 0.84  # alternating staves
            return (wood[0] * k, wood[1] * k, wood[2] * k, 1)
        self._lathe(mat, rings, [None] * len(prof), (bot, top), paint)
        for hf in (0.18, 0.82):
            rf = 0.9 + 0.1 * math.sin(hf * math.pi)
            self.cylinder(mat @ Matrix.Translation((0, 0, hf * h)), r * rf * 1.04, 0.045, (0.22, 0.22, 0.24, 1), seg=seg)

    def rock_shape(self, sx, sy, sz):
        """Local geometry of one angular rock: jittered icosphere with a flat bottom. Returns (coords, faces)."""
        rnd = self.rnd
        tmp = bmesh.new()
        res = bmesh.ops.create_icosphere(tmp, subdivisions=1, radius=1.0)
        sq = [rnd.uniform(0.85, 1.15) for _ in range(3)]
        for v in res['verts']:
            j = 1 + rnd.uniform(-0.22, 0.22)
            v.co = Vector((v.co.x * sx * j * sq[0], v.co.y * sy * j * sq[1], max(v.co.z * sz * j * sq[2], -0.5 * sz)))
        tmp.verts.index_update()
        coords = [v.co.copy() for v in tmp.verts]
        faces = [tuple(v.index for v in f.verts) for f in tmp.faces]
        tmp.free()
        return coords, faces

    @staticmethod
    def rock_rest(field, coords, x, y, yaw):
        """Centre height at which the rock (yawed, at x/y) rests on the field: lowest vertex touches the surface below it."""
        c, sn = math.cos(yaw), math.sin(yaw)
        return max(field.h(x + v.x * c - v.y * sn, y + v.x * sn + v.y * c) - v.z for v in coords) - 0.035

    @staticmethod
    def rock_snug(field, coords, x, y, yaw, z, sz):
        """(mean gap, max gap, stable) for the rock's lower vertices vs the surface below.
        stable = at least 3 contact points whose spread straddles the centre of mass in both X and Y (otherwise it would tip over)."""
        c, sn = math.cos(yaw), math.sin(yaw)
        low = [v for v in coords if v.z < -0.25 * sz]
        gaps, contact = [], []
        for v in low:
            wx, wy = x + v.x * c - v.y * sn, y + v.x * sn + v.y * c
            g = max(0.0, (z + v.z) - field.h(wx, wy))
            gaps.append(g)
            if g <= 0.03:
                contact.append((wx, wy))
        stable = len(contact) >= 3 and min(p[0] for p in contact) < x < max(p[0] for p in contact) and min(p[1] for p in contact) < y < max(p[1] for p in contact)
        return sum(gaps) / len(gaps), max(gaps), stable

    def rock_place(self, field, shape, x, y, z, yaw, sz, base, moss=0.0):
        """Add the rock at its resting height, paint it (light top / dark underside, optional moss) and register it in the field."""
        coords, faces = shape
        c, sn = math.cos(yaw), math.sin(yaw)
        green = (0.27, 0.33, 0.19)
        vs = []
        for v in coords:
            vs.append(self.bm.verts.new((x + v.x * c - v.y * sn, y + v.x * sn + v.y * c, z + v.z)))
        for fi in faces:
            f = self.bm.faces.new([vs[i] for i in fi])
            for l, i in zip(f.loops, fi):
                zn = coords[i].z / sz
                k = 0.66 + 0.46 * (zn + 1) / 2
                col = [base[0] * k, base[1] * k, base[2] * k]
                if moss and zn < 0.1:
                    t = moss * min(1, (0.1 - zn) * 1.4)
                    col = [col[q] * (1 - t) + green[q] * k * t for q in range(3)]
                l[self.lay] = (min(1, col[0]), min(1, col[1]), min(1, col[2]), 1)
            field.add_tri(*[vs[i].co.copy() for i in fi])

    def body(self, mat, prof, seg, rx, ry, h, paint, bottom=True, top_z=None, zoff=0.0):
        """Vertical lathe: prof = [(radius factor, height fraction)], closed with apexes at the ends."""
        bm = self.bm
        rings = [[bm.verts.new((math.cos(math.tau * i / seg) * rx * rf, math.sin(math.tau * i / seg) * ry * rf, hf * h + zoff)) for i in range(seg)] for rf, hf in prof]
        top = bm.verts.new((0, 0, (prof[-1][1] if top_z is None else top_z) * h + zoff))
        bot = bm.verts.new((0, 0, prof[0][1] * h + zoff)) if bottom else None
        self._lathe(mat, rings, [None] * len(prof), (bot, top), paint)

    def apple(self, mat, r):
        rnd = self.rnd
        red = rnd.choice([(0.72, 0.14, 0.10), (0.64, 0.12, 0.09), (0.78, 0.30, 0.12)])

        def paint(ri, i, col):
            blush = 0.35 if i < 2 else 0.0  # one yellowish cheek
            k = 0.72 + 0.12 * ri
            c = (red[0] * (1 - blush) + 0.75 * blush, red[1] * (1 - blush) + 0.62 * blush, red[2] * (1 - blush) + 0.2 * blush)
            return (min(1, c[0] * k), min(1, c[1] * k), min(1, c[2] * k), 1)
        self.body(mat, [(0.55, 0.0), (0.98, 0.30), (1.0, 0.62), (0.62, 0.92)], 7, r, r, r * 1.8, paint, top_z=0.78)

    def cabbage(self, mat, r):
        def paint(ri, i, col):
            k = 0.72 + 0.14 * ri + (0.0 if i % 2 else -0.1)  # outer leaves alternate dark/light
            return (min(1, 0.40 * k), min(1, 0.58 * k), min(1, 0.24 * k), 1)
        self.body(mat, [(0.6, 0.0), (0.98, 0.28), (1.0, 0.6), (0.7, 0.92)], 8, r, r, r * 1.6, paint, top_z=1.0)

    def loaf(self, mat, length, w, hgt):
        def paint(ri, i, col):
            up = (math.cos(math.tau * i / 6) + 1) / 2  # local +X is up after the rotation below
            k = 0.62 + 0.5 * up
            if ri in (0, 4):
                k *= 1.1
            return (min(1, 0.80 * k), min(1, 0.55 * k), min(1, 0.27 * k), 1)
        m = mat @ Euler((0, -math.pi / 2, 0)).to_matrix().to_4x4()
        self.body(m, [(0.35, 0.0), (0.88, 0.15), (1.0, 0.5), (0.88, 0.85), (0.35, 1.0)], 6, hgt, w, length, paint, zoff=-length / 2)

    def carrot(self, mat):
        def fn():
            res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=6, radius1=0.034, radius2=0.008, depth=0.3)
            return res['verts']
        self._add(fn, mat, (0.88, 0.44, 0.12, 1))
        self.box(mat @ Matrix.Translation((0, 0, -0.17)), 0.05, 0.05, 0.06, (0.28, 0.5, 0.17, 1))

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
    barks = [(0.40, 0.27, 0.17), (0.48, 0.33, 0.20), (0.34, 0.24, 0.16), (0.52, 0.40, 0.27), (0.57, 0.52, 0.45)]
    weights = [3, 3, 2, 2, 1]  # the last is pale birch-like bark, rare
    z = r
    while left > 0 and w > 0:
        cnt = min(w, left)
        for i in range(cnt):
            y = (i - (cnt - 1) / 2) * (r * 2.1) + b.rnd.uniform(-0.015, 0.015)
            x = b.rnd.uniform(-0.08, 0.08)
            rr = r * b.rnd.uniform(0.8, 1.15)
            bark = b.rnd.choices(barks, weights)[0]
            yaw = b.rnd.uniform(-0.07, 0.07)
            # Euler Y=90 lays the cone along X; Z-yaw then wobbles it on the ground plane, X-tilt a hair off level
            mat = T(x, y, z + b.rnd.uniform(-0.01, 0.02), b.rnd.uniform(-0.03, 0.03), math.pi / 2, yaw)
            b.log(mat, rr, ln * b.rnd.uniform(0.82, 1.0), bark)
        left -= cnt
        w -= 1
        z += r * 1.72
    return b.finish(f'pile_firewood_{n}')


def stone(n, seed):
    b = Builder(seed)
    field = HeightField()
    greys = [(0.50, 0.49, 0.47), (0.58, 0.55, 0.50), (0.44, 0.45, 0.47), (0.55, 0.50, 0.44)]  # neutral, warm, bluish, sandy
    radius = {1: 0.25, 6: 0.28, 15: 0.38, 30: 0.5}[n]
    peak = {1: 0.15, 6: 0.25, 15: 0.75, 30: 1.2}[n]  # extra height allowed at the centre of the mound
    count = n if n > 1 else 3  # a single "stone" is a small cluster so it still reads as a pile
    sizes = sorted((b.rnd.uniform(0.17, 0.28) * (1.35 if n == 1 and i == 0 else 0.8 if n == 1 else 1.0) for i in range(count)), reverse=True)
    for i, s in enumerate(sizes):  # largest first; each rock drops onto the real surface below it
        shape = b.rock_shape(s * 1.25, s, s * 0.8)
        yaw = b.rnd.uniform(0, math.tau)
        # try a few spots and settle into the lowest one (gaps fill first, then the mound grows); a pull towards the centre
        best = None
        for _ in range(90):
            a = b.rnd.uniform(0, math.tau)
            d = radius * math.sqrt(b.rnd.random()) if (n > 1 or i) else 0.0
            x, y = math.cos(a) * d, math.sin(a) * d
            z = b.rock_rest(field, shape[0], x, y, yaw)
            mean_gap, max_gap, stable = b.rock_snug(field, shape[0], x, y, yaw, z, s * 0.8)
            if i > 0 and (max_gap > 0.07 or not stable):  # perched on a slope / a point: it would tip over, reads as hanging in the air
                continue
            if z > 0.2 + peak * max(0.0, 1 - d / (radius * 1.05)):  # mound profile: no towers, the sides stay low
                continue
            score = z + 0.9 * d + 5.0 * mean_gap
            if best is None or score < best[0]:
                best = (score, x, y, z)
        if best is None:  # nothing seated well inside the mound: lay it on bare ground in a ring that widens until a free spot is found
            for k in range(14):
                cands = []
                for _ in range(10):
                    a = b.rnd.uniform(0, math.tau)
                    d = radius * (1.0 + 0.08 * k)
                    x, y = math.cos(a) * d, math.sin(a) * d
                    cands.append((b.rock_rest(field, shape[0], x, y, yaw), x, y))
                zc, x, y = min(cands)
                if zc <= 0.5 * s:  # touching the ground, not another rock
                    best = (0, x, y, zc)
                    break
            if best is None:
                best = (0, x, y, zc)
        _, x, y, z = best
        b.rock_place(field, shape, x, y, z, yaw, s * 0.8, b.rnd.choice(greys), moss=0.55 if b.rnd.random() < 0.3 else 0.0)
    if n > 1:  # loose gravel on the ground around the base
        for _ in range(n // 3 + 2):
            a, d = b.rnd.uniform(0, math.tau), radius * b.rnd.uniform(1.0, 1.4)
            sg = b.rnd.uniform(0.04, 0.07)
            shape = b.rock_shape(sg * 1.2, sg, sg * 0.8)
            x, y, yaw = math.cos(a) * d, math.sin(a) * d, b.rnd.uniform(0, 3)
            b.rock_place(field, shape, x, y, b.rock_rest(field, shape[0], x, y, yaw), yaw, sg * 0.8, b.rnd.choice(greys))
    return b.finish(f'pile_stone_{n}')


def grain(n, seed):
    b = Builder(seed)
    L, W, H = 0.36, 0.2, 0.13  # half-length (X), half-depth (Y), half-height of one lying sack
    cloths = [(0.80, 0.74, 0.58), (0.74, 0.62, 0.42), (0.66, 0.58, 0.44)]  # flour, tan, grey-brown burlap
    layout = {1: [1], 5: [3, 2], 15: [5, 4, 3, 2, 1], 30: [5, 4, 3, 2, 1]}[n]
    cols = 2 if n == 30 else 1  # the biggest tier has two sacks end to end per slot
    left, z = n, 0.0
    for cnt in layout:
        cnt = min(cnt * cols, left)
        for i in range(cnt):
            slot, c = i // cols, i % cols
            x = (slot - (cnt / cols - 1) / 2) * (W * 2 * 0.9) + b.rnd.uniform(-0.015, 0.015)  # pile width runs along X (seen from the front)
            y = (c - (cols - 1) / 2) * (L * 2.05) + b.rnd.uniform(-0.07, 0.07)  # sacks lie along Y, tied end towards the viewer or away
            flip = math.pi / 2 if b.rnd.random() < 0.5 else -math.pi / 2
            b.sack(T(x, y, z, 0, 0, flip + b.rnd.uniform(-0.12, 0.12)), L, W, H, b.rnd.choice(cloths))
        left -= cnt
        z += H * 1.05  # next layer nests into the valleys of the one below (sacks touch and overlap a little)
        if left <= 0:
            break
    return b.finish(f'pile_grain_{n}')


def food(n, seed):
    b = Builder(seed)
    wood = (0.55, 0.42, 0.26)
    dark = (0.40, 0.29, 0.18)
    cw, cd, ch = 0.62, 0.46, 0.40

    def crate(x, y, z, goods=False):
        base = shade(wood, b.rnd, 0.08)
        yaw, ox, oy = b.rnd.uniform(-0.06, 0.06), b.rnd.uniform(-0.02, 0.02), b.rnd.uniform(-0.02, 0.02)
        m = T(x + ox, y + oy, z, 0, 0, yaw)
        planks = (0.92, 1.06) if goods else (0.92, 1.06, 0.84)  # an open crate has no top plank
        core = ch * 0.62 if goods else ch - 0.02
        b.box(m @ Matrix.Translation((0, 0, core / 2)), cw - 0.04, cd - 0.04, core, (0.22, 0.15, 0.09, 1))  # dark core shows through the plank gaps
        for k, f in enumerate(planks):
            b.box(m @ Matrix.Translation((0, 0, ch * (k + 0.5) / 3)), cw, cd, ch / 3 * 0.84, (base[0] * f, base[1] * f, base[2] * f, 1))
        for dx in (-cw / 2 + 0.035, cw / 2 - 0.035):  # dark end battens (corner posts of an open crate)
            b.box(m @ Matrix.Translation((dx, 0, ch / 2)), 0.07, cd + 0.03, ch + 0.015, dark)
        if goods:
            fill = ch * 0.62
            b.box(m @ Matrix.Translation((0, 0, fill)), cw - 0.1, cd - 0.08, 0.03, (0.52, 0.42, 0.22, 1))  # straw bed
            kind = b.rnd.choice(('apple', 'cabbage', 'loaf', 'carrot'))

            def J(a=0.015):
                return b.rnd.uniform(-a, a)
            if kind == 'apple':
                for (px, py, pz) in ((-0.17, -0.09, 0), (0.0, -0.1, 0), (0.17, -0.09, 0), (-0.08, 0.1, 0), (0.1, 0.1, 0), (0.0, 0.0, 0.1)):
                    b.apple(m @ T(px + J(), py + J(), fill + 0.015 + pz), 0.075)
            elif kind == 'cabbage':
                for (px, py, pz) in ((-0.16, 0.0, 0), (0.16, 0.0, 0), (0.0, 0.02, 0.07)):
                    b.cabbage(m @ T(px + J(), py + J(), fill + 0.015 + pz), 0.11)
            elif kind == 'loaf':
                for (px, py, pz, yw) in ((-0.1, -0.1, 0, 0.1), (0.1, 0.1, 0, -0.1), (-0.1, 0.1, 0, 0.05), (0.0, 0.0, 0.1, 0.0)):
                    b.loaf(m @ T(px + J(), py + J(), fill + 0.015 + pz + 0.06, 0, 0, yw), 0.34, 0.09, 0.075)
            else:
                for (py, pz) in ((-0.14, 0), (-0.07, 0), (0.0, 0), (0.07, 0), (0.14, 0), (-0.1, 0.06), (0.0, 0.06), (0.1, 0.06)):
                    b.carrot(m @ T(J(0.03), py, fill + 0.04 + pz, 0, math.pi / 2, J(0.08)))

    def barrel(x, y, z):
        b.barrel(T(x, y, z, 0, 0, b.rnd.uniform(0, 1)), 0.27, 0.68, shade((0.46, 0.32, 0.19), b.rnd, 0.06))

    if n == 1:
        crate(0, 0, 0, goods=True)
    elif n == 8:
        for i in range(3):
            crate((i - 1) * (cw + 0.04), 0, 0)
        crate(-0.33, 0, ch)
        crate(0.33, 0, ch)
        crate(0, 0, ch * 2, goods=True)
    elif n == 20:
        for i in range(4):
            crate((i - 1.5) * (cw + 0.04), 0, 0)
            if i < 3:
                crate((i - 1) * (cw + 0.04), 0, ch)
        for i in range(2):
            crate((i - 0.5) * (cw + 0.04), 0, ch * 2, goods=True)
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
                crate((i - 1) * (cw + 0.04), row * (cd + 0.04), ch * 2, goods=True)
        for k in range(3):
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
