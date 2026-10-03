"""
Blender (dev-only, D-REN-8) — modest women's dress modules from the CC0 Quaternius "Modular Character Outfits - Fantasy [Source]"
pack (render--011 stage 2 follow-up: the female outfits had no skirts or dresses, and showed strong bust/waist shaping).

Female only. Source part: Female_Noble_Body (bodice + a mid-thigh split skirt); the sleeves/hands stay with the base outfit (the Noble arms have bare skin). The short skirt
is cut away, a long skirt (lofted ring mesh, ankle length, flared, with a gold hem band) is generated, and the bust / waist are
flattened (MODEST). Exports assets-src/characters/eq/<Module>_Female.raw.glb with the 65-bone UBC skeleton (same contract as
blender-equipment-modules.py, whose helpers are re-used):

  NobleBodice_Female  bodice with puffed shoulders, no skirt (arms come from the base outfit)
  LongSkirt_Female    ankle-length skirt only           (wear it with any top)
  Dress_Female        bodice + long skirt                   (complete dress)
  PeasantSkirt_Female plain calf-length wool skirt, layered over the Peasant base (waist at the base bodice, no hem band)

Run: Blender MCP `execute_blender_code`: exec(open(r'<repo>/scripts/assets/blender-dress-modules.py').read()). Env SV_ROOT / SV_OUT as in the other script.
"""
import contextlib
import io
import os

os.environ['SV_MODE'] = 'lib'
_here = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.join(os.environ.get('SV_ROOT', r'D:\Projekty\private\SeedVales'), 'scripts', 'assets')
exec(open(os.path.join(_here, 'blender-equipment-modules.py')).read())  # helpers only (SV_MODE=lib builds nothing)

CUT_Z = 1.09           # the bodice ends here (the original skirt hangs below)
HEM_Z = 0.13           # skirt hem (ankle)
HEM_BAND = 0.07        # height of the gold hem band
SEGMENTS = 28
HEM_RX, HEM_RY = 0.38, 0.40   # hem half-axes (x = sideways, y = front/back)
THIGH_MAX = 0.9        # share of the skirt weight that follows the thighs (calves below the knee) at hem level
# modesty: how much the bust relief is flattened (0 = untouched) and how much the corset waist is loosened
DETAIL['Dress'] = ((0, 0, 1.10), 0.9)   # waist close-up of the fit sheet
PEASANT_CUT_Z, PEASANT_HEM_Z = 1.02, 0.42   # PeasantSkirt: waist line over the base bodice, hem at mid-calf
PEASANT_WOOL = (0.20, 0.14, 0.09)             # dark undyed wool brown (nearest flat block of the Peasant atlas)
BUST_FLATTEN = 0.0     # 0.65 made a hole at the sternum (the gold trim sank into the body): left off, original bust shape
WAIST_LOOSEN = 1.10    # scale of the waist cross-section (the corset is loosened)


def body_axis(obj):
    """Torso centre line y (median of the chest vertices)."""
    ys = [(obj.matrix_world @ v.co).y for v in obj.data.vertices if 1.20 < (obj.matrix_world @ v.co).z < 1.45 and abs((obj.matrix_world @ v.co).x) < 0.12]
    return float(np.median(ys))


def flatten_bust(obj, strength):
    """Pull the front relief of the chest (bust) back towards the plane of the chest sides, with a smooth falloff in z and x."""
    me = obj.data
    mw = obj.matrix_world
    vs = [mw @ v.co for v in me.vertices]
    sign = front_sign_from_body(obj)
    # reference front plane: typical front depth of the chest outside the bust (|x| between 0.14 and 0.20) in the chest band
    ref = [v.y * sign for v in vs if 1.20 < v.z < 1.42 and 0.14 < abs(v.x) < 0.20]
    plane = float(np.median(ref)) if ref else 0.0
    n = 0
    for i, v in enumerate(vs):
        w = vs[i]
        if w.y * sign <= plane:
            continue
        fz = np.clip(1 - abs(w.z - 1.31) / 0.16, 0, 1)   # 1.15 .. 1.47, peak 1.31
        fx = np.clip(1 - abs(w.x) / 0.17, 0, 1)
        k = strength * fz * fx
        if k <= 0:
            continue
        w.y = plane * sign + (w.y * sign - plane) * (1 - k) if sign > 0 else -(plane + (w.y * -1 - plane) * (1 - k))
        me.vertices[i].co = mw.inverted() @ w
        n += 1
    return n


def front_sign_from_body(obj):
    """+1 when the character faces +Y, else -1 (the bust protrudes towards the front: the larger |y| extent of the chest)."""
    ys = [(obj.matrix_world @ v.co).y for v in obj.data.vertices if 1.20 < (obj.matrix_world @ v.co).z < 1.42]
    return 1.0 if max(ys) > -min(ys) else -1.0


def loosen_waist(obj, factor):
    me = obj.data
    mw = obj.matrix_world
    cy = body_axis(obj)
    for v in me.vertices:
        w = mw @ v.co
        if 1.04 < w.z < 1.24:
            f = np.clip(1 - abs(w.z - 1.14) / 0.10, 0, 1)
            s = 1 + (factor - 1) * f
            w.x *= s
            w.y = cy + (w.y - cy) * s
            v.co = mw.inverted() @ w


def cut_skirt(obj, z):
    """Delete the faces below z (the short split skirt)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    mw = obj.matrix_world
    drop = [f for f in bm.faces if (mw @ f.calc_center_median()).z < z]
    bmesh.ops.delete(bm, geom=drop, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


def face_uv_by_colour(obj, classify):
    """Median-coloured face UV of the faces of `obj` whose atlas colour satisfies classify (colour read from the original atlas)."""
    px, _img = atlas_pixels(obj.material_slots[0].material)
    h, w = px.shape[:2]
    layer = obj.data.uv_layers.active
    found = []
    for poly in obj.data.polygons:
        loops = [layer.data[i] for i in poly.loop_indices]
        cu = sum(l.uv[0] for l in loops) / len(loops)
        cv = sum(l.uv[1] for l in loops) / len(loops)
        r, g, b = px[int(cv * h) % h, int(cu * w) % w]
        if classify(r, g, b):
            found.append(((cu, cv), np.array([r, g, b])))
    if not found:
        raise RuntimeError('no face of that colour')
    mean = np.mean([c for _, c in found], axis=0)
    uv, col = min(found, key=lambda f: np.linalg.norm(f[1] - mean))
    print(f'  uv {tuple(round(x, 3) for x in uv)} colour {tuple(round(float(x), 3) for x in col)} from {len(found)} faces')
    return uv


def is_red(r, g, b):
    return r > 1.5 * g and r > 1.5 * b and r > 0.25


def is_gold(r, g, b):
    return r > 0.5 and g > 0.3 and b < 0.25 and r > 1.3 * b + 0.2


def build_skirt(arm, bodice, red_uv, gold_uv, name='LongSkirt', cut_z=None, hem_z=None, band=None, hem_rx=None, hem_ry=None, grow=0.006, thigh_max=None):
    """Skirt: lofted rings from the waist (the reference mesh `bodice`, at cut_z) to the hem, flared, weights pelvis / thighs / calves.
    Defaults = the long dress skirt; band = height of the hem band (0 = none)."""
    cut_z = CUT_Z if cut_z is None else cut_z
    hem_z = HEM_Z if hem_z is None else hem_z
    band = HEM_BAND if band is None else band
    hem_rx = HEM_RX if hem_rx is None else hem_rx
    hem_ry = HEM_RY if hem_ry is None else hem_ry
    thigh_max = THIGH_MAX if thigh_max is None else thigh_max
    mw = bodice.matrix_world
    pts = [mw @ v.co for v in bodice.data.vertices]
    ring = [p for p in pts if cut_z - 0.01 <= p.z <= cut_z + 0.03]
    cy = float(np.mean([p.y for p in ring]))

    def radii(zlo, zhi, grow):
        """Per segment: radius (from the centre line) of the bodice in the z band, so the skirt top follows its real hem line."""
        out = []
        for k in range(SEGMENTS):
            ang = 2 * math.pi * k / SEGMENTS
            best = 0.0
            for p in pts:
                if not zlo <= p.z <= zhi:
                    continue
                a = math.atan2(p.x, p.y - cy)
                d = abs((a - ang + math.pi) % (2 * math.pi) - math.pi)
                if d <= 1.6 * math.pi / SEGMENTS:
                    best = max(best, math.hypot(p.x, p.y - cy))
            out.append(best + grow)
        for k in range(SEGMENTS):   # fill angular gaps from the neighbours
            if out[k] <= grow:
                out[k] = max(out[(k - 1) % SEGMENTS], out[(k + 1) % SEGMENTS])
        return out

    hem_r = lambda k: 1 / math.hypot(math.sin(2 * math.pi * k / SEGMENTS) / hem_rx, math.cos(2 * math.pi * k / SEGMENTS) / hem_ry)
    r_hem = radii(cut_z - 0.01, cut_z + 0.02, grow)    # the bodice's cut edge: the skirt starts just outside it
    r_in = radii(cut_z + 0.03, cut_z + 0.07, -0.012)    # hidden inside the bodice (overlap, no gap)
    prof = [(cut_z + 0.06, r_in), (cut_z, r_hem)]
    zs = [cut_z - 0.08 - (cut_z - 0.08 - hem_z - band) * i / 5 for i in range(6)] + ([hem_z] if band else [])
    for z in zs:
        t = float(np.clip((cut_z - z) / (cut_z - hem_z), 0, 1)) ** 0.85
        prof.append((z, [r + (hem_r(k) - r) * t for k, r in enumerate(r_hem)]))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    rows = []
    for z, rad in prof:
        rows.append([bm.verts.new((rad[k] * math.sin(2 * math.pi * k / SEGMENTS), cy + rad[k] * math.cos(2 * math.pi * k / SEGMENTS), z)) for k in range(SEGMENTS)])
    for r in range(len(rows) - 1):
        is_band = bool(band) and r == len(rows) - 2
        for k in range(SEGMENTS):
            a, b = rows[r][k], rows[r][(k + 1) % SEGMENTS]
            c, d = rows[r + 1][(k + 1) % SEGMENTS], rows[r + 1][k]
            f = bm.faces.new((a, d, c, b))   # normals outwards
            for lp in f.loops:
                lp[uvl].uv = gold_uv if is_band else red_uv
    bm.normal_update()
    # make sure the normals point outwards
    bm.faces.ensure_lookup_table()
    f0 = bm.faces[0]
    if (f0.calc_center_median() - mathutils.Vector((0, cy, f0.calc_center_median().z))).dot(f0.normal) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for vg in bodice.vertex_groups:
        ob.vertex_groups.new(name=vg.name)
    g = {n: ob.vertex_groups[n] for n in ('pelvis', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r')}
    for v in me.vertices:
        s = float(np.clip(v.co.x / 0.12, -1, 1))
        wt = thigh_max * float(np.clip((cut_z - 0.05 - v.co.z) / 0.6, 0, 1))
        wc = 0.5 * wt * float(np.clip((0.55 - v.co.z) / 0.3, 0, 1))   # below the knee part of the swing comes from the calves
        wth = wt - wc
        g['thigh_l'].add([v.index], wth * (0.5 + 0.5 * s), 'REPLACE')
        g['thigh_r'].add([v.index], wth * (0.5 - 0.5 * s), 'REPLACE')
        g['calf_l'].add([v.index], wc * (0.5 + 0.5 * s), 'REPLACE')
        g['calf_r'].add([v.index], wc * (0.5 - 0.5 * s), 'REPLACE')
        g['pelvis'].add([v.index], 1 - wt, 'REPLACE')
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob.parent = arm
    ob.modifiers.new('Armature', 'ARMATURE').object = arm
    return ob


def make_modules(o):
    arm = o['Armature']
    noble = o['Female_Noble_Body']
    src_for_uv = evaluated_copy(noble, 'sv_tmp_uv')
    red_uv = face_uv_by_colour(src_for_uv, is_red)
    gold_uv = face_uv_by_colour(src_for_uv, is_gold)
    mat = noble.material_slots[0].material
    bpy.data.objects.remove(src_for_uv)

    def bodice(name):
        b = evaluated_copy(noble, name)
        cut_skirt(b, CUT_Z)
        loosen_waist(b, WAIST_LOOSEN)
        if BUST_FLATTEN > 0:
            print('  bust flattened verts:', flatten_bust(b, BUST_FLATTEN))
        return b

    mods = {}
    b = bodice('NobleBodice')
    mods['NobleBodice'] = [b]
    mods['LongSkirt'] = [build_skirt(arm, b, red_uv, gold_uv)]
    b2 = bodice('DressBodice')
    mods['Dress'] = [b2, build_skirt(arm, b2, red_uv, gold_uv, 'DressSkirt')]
    pb = evaluated_copy(o['Female_Peasant_Body'], 'sv_tmp_pb')   # reference for the waist of the peasant skirt (layered over the base)
    mods['PeasantSkirt'] = [build_skirt(arm, pb, red_uv, gold_uv, 'PeasantSkirt', cut_z=PEASANT_CUT_Z, hem_z=PEASANT_HEM_Z, band=0,
                                        hem_rx=0.30, hem_ry=0.29, grow=0.012, thigh_max=0.8)]
    bpy.data.objects.remove(pb)
    return mods, mat


def build_dresses(only=None):
    report = {}
    o = load_all('Female')
    arm = o['Armature']
    bvh = base_bvh(o, 'Female')
    mods, noble_mat = make_modules(o)
    bpy.app.driver_namespace['sv_dress_mods'] = mods   # save_v2_blend() keeps these objects
    small = small_material(noble_mat, 'SV_MI_Noble')
    peasant = small_material(o['Female_Peasant_Body'].material_slots[0].material, 'SV_MI_Peasant')
    for key, objs in mods.items():
        if only and key not in only:
            continue
        for ob in objs:
            ob.data.materials.clear()
            ob.data.materials.append(peasant if key == 'PeasantSkirt' else small)  # Noble atlas only (no skin parts)
        if key == 'PeasantSkirt':
            collapse_uv(objs[0], swatch_for(objs[0], 0, PEASANT_WOOL))
        fit = fit_report(objs, bvh)
        path = os.path.join(OUT, f'{key}_Female.raw.glb')
        with contextlib.redirect_stdout(io.StringIO()):
            tris = export_module(path, objs, arm)
        mn, mx = bounds(objs)
        report[f'{key}_Female'] = dict(tris=tris, size_kb=os.path.getsize(path) // 1024, fit=fit,
                                       bbox=[[round(x, 3) for x in mn], [round(x, 3) for x in mx]])
        print(f'{key}_Female: {tris} tris, {report[f"{key}_Female"]["size_kb"]} KB, fit {fit}')
    return report


def save_v2_blend(path=None):
    """Save a copy of the open pack file with the dress modules added (collection "Dresses", bound to the original
    Armature) as All_Female_v2.blend next to it. Call after build_dresses() and instead of end(): the open file keeps its
    path and the pack file itself is never overwritten. Run it in a session where All_Female.blend is open."""
    ns = bpy.app.driver_namespace
    snap, mods = ns['sv_snap'], ns['sv_dress_mods']
    keep = {ob for objs in mods.values() for ob in objs}
    orig_arm = next(ob for ob in snap['objects'] if ob.type == 'ARMATURE')
    coll = bpy.data.collections.new('Dresses')
    bpy.context.scene.collection.children.link(coll)
    for ob in keep:
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        coll.objects.link(ob)
        ob.parent = orig_arm
        for m in ob.modifiers:
            if m.type == 'ARMATURE':
                m.object = orig_arm
    for ob in [o for o in bpy.data.objects if o not in snap['objects'] and o not in keep]:
        bpy.data.objects.remove(ob)
    for me in [m for m in bpy.data.meshes if m.users == 0]:
        bpy.data.meshes.remove(me)
    path = path or os.path.join(PACK, 'All_Female_v2.blend')
    bpy.ops.wm.save_as_mainfile(filepath=path, copy=True)
    return path
