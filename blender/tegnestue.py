# ===== Tegnestuen: fælles Blender-værktøj til de bløde, tegneserieagtige figurer =====
# Bruges af Burgerløbet, Rulle Rasmus, Fjollet Slange og Mærkelige fisk. Køres af Blender uden vindue:
#   blender --background --factory-startup --python blender/burger.py
#
# Figurerne bygges af bløde former (æg, pølser, kegler, ringe), som kan skubbes og bules lidt som ler.
# Farverne ligger i hjørnerne af figuren (vertex-farver), og skyggen i krogene (AO) bages ind i farven.
# Så er der ingen billeder at hente, og filerne bliver små. Spillet indlæser dem med spil/glb.js.
#
# Akser i Blender: Z er op, og figuren kigger mod -Y (det bliver +Z i spillet, mod kameraet).

import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix, Euler

ROD = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PRØVER = os.path.join(ROD, "blender", "proever")


_mat = {}


# ---------- Opstart ----------
def nulstil(ao_afstand=0.6):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mat.clear()                                                # materialerne forsvandt med den gamle scene
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    try:
        p = bpy.context.preferences.addons["cycles"].preferences
        p.compute_device_type = "HIP"; p.get_devices()
        for d in p.devices: d.use = True
        s.cycles.device = "GPU"
    except Exception as e:
        print("Ingen GPU:", e)
    s.cycles.samples = 64
    s.world = bpy.data.worlds.new("Verden"); s.world.use_nodes = True
    s.world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.8, 0.9, 1)
    s.world.light_settings.distance = ao_afstand               # hvor langt skyggen i krogene rækker
    return s


def S(x, y, z):
    """Spillets mål (x, op, frem mod kameraet) → Blenders mål. Så kan tallene fra spillet bruges direkte."""
    return (x, -z, y)


def bland(a, b, t):
    """En blød blanding af to farver ('#rrggbb'), t = 0..1 → lineær farve"""
    t = max(0.0, min(1.0, t))
    return tuple(x * (1 - t) + y * t for x, y in zip(lin(a), lin(b)))


def trin(kant, bredde, v):
    """0 under kanten, 1 over — med en blød overgang (til striber og tern uden takker)"""
    t = max(0.0, min(1.0, (v - kant) / bredde + 0.5))
    return t * t * (3 - 2 * t)


def lin(hexfarve):
    """'#ff7eb6' → lineære farver (sådan vil glTF og three.js have vertex-farver)"""
    h = hexfarve.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ---------- Materialer: farven kommer fra hjørnerne, ruheden fra materialet ----------
def materiale(navn="blød", ru=0.6, met=0.0, glans=0.0):
    if navn in _mat: return _mat[navn]
    m = bpy.data.materials.new(navn); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Farve"
    nt.links.new(a.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = ru; p.inputs["Metallic"].default_value = met
    if glans: p.inputs["Coat Weight"].default_value = glans
    _mat[navn] = m
    return m


# ---------- Former ----------
def _ny(navn, bm, farve, mat, sted=(0, 0, 0)):
    me = bpy.data.meshes.new(navn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(navn, me); bpy.context.collection.objects.link(o)
    o.location = sted
    o.data.materials.append(materiale(*mat) if isinstance(mat, tuple) else materiale(mat))
    for p in o.data.polygons: p.use_smooth = True
    farv(o, farve)
    return o


def farv(o, farve):
    """Fyld hele figuren med én farve ('#rrggbb' eller en funktion (punkt, normal) → '#rrggbb' / (r,g,b) lineær)"""
    me = o.data
    a = me.color_attributes.get("Farve") or me.color_attributes.new("Farve", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = a
    if callable(farve):
        for li, loop in enumerate(me.loops):
            v = me.vertices[loop.vertex_index]
            f = farve(o.location + v.co, v.normal)
            c = lin(f) if isinstance(f, str) else f
            a.data[li].color = (*c, 1)
    else:
        c = lin(farve)
        buf = np.tile(np.array([*c, 1], dtype=np.float32), len(me.loops))
        a.data.foreach_set("color", buf)
    return o


def ellipsoide(navn, c, r, farve, mat="blød", seg=32, ring=18, rot=(0, 0, 0)):
    """Et æg/en kugle. r = (rx, ry, rz) eller ét tal"""
    if not isinstance(r, (tuple, list)): r = (r, r, r)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    bmesh.ops.scale(bm, vec=Vector(r), verts=bm.verts)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler(rot).to_matrix(), verts=bm.verts)
    return _ny(navn, bm, farve, mat, c)


def pølse(navn, punkter, radier, farve, mat="blød", glathed=2):
    """En blød pølse gennem punkterne, med sin egen tykkelse i hvert punkt (arme, ben, haler, slanger)"""
    me = bpy.data.meshes.new(navn)
    me.from_pydata([Vector(p) for p in punkter], [(i, i + 1) for i in range(len(punkter) - 1)], [])
    o = bpy.data.objects.new(navn, me); bpy.context.collection.objects.link(o)
    sk = o.modifiers.new("hud", "SKIN"); sk.use_smooth_shade = True
    for i, r in enumerate(radier):
        rr = r if isinstance(r, (tuple, list)) else (r, r)
        me.skin_vertices[0].data[i].radius = rr
    me.skin_vertices[0].data[0].use_root = True
    if glathed: s = o.modifiers.new("glat", "SUBSURF"); s.levels = glathed; s.render_levels = glathed
    o.data.materials.append(materiale(*mat) if isinstance(mat, tuple) else materiale(mat))
    _læg_fast(o)
    for p in o.data.polygons: p.use_smooth = True
    farv(o, farve)
    return o


def kegle(navn, a, b, r1, r2, farve, mat="blød", seg=24, glat=True):
    """En kegle/et rør fra punkt a til punkt b (tænder, horn, pigge, stilke)"""
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=(b - a).length)
    rot = (b - a).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=bm.verts)
    o = _ny(navn, bm, farve, mat)
    if not glat:
        for p in o.data.polygons: p.use_smooth = False
    return o


def torus(navn, c, R, r, farve, mat="blød", rot=(0, 0, 0), seg=40, tseg=14):
    bm = bmesh.new()
    vs = []
    for i in range(seg):
        a = i / seg * math.tau
        ring = []
        for j in range(tseg):
            b = j / tseg * math.tau
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        vs.append(ring)
    for i in range(seg):
        for j in range(tseg):
            bm.faces.new((vs[i][j], vs[(i + 1) % seg][j], vs[(i + 1) % seg][(j + 1) % tseg], vs[i][(j + 1) % tseg]))
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler(rot).to_matrix(), verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _ny(navn, bm, farve, mat, c)


def cylinder(navn, c, r, h, farve, mat="blød", rot=(0, 0, 0), seg=32, rund=0.0):
    """En lav cylinder (skiver, ostehjul, trampolin). rund = afrundede kanter"""
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    # ringe indad i låg og bund, så farverne kan lave mønstre (kerner, snitflader)
    låg = [f for f in bm.faces if len(f.verts) == seg]
    for _ in range(4):
        ud = bmesh.ops.inset_region(bm, faces=låg, thickness=r / 5.5, depth=0)
        låg = [f for f in bm.faces if len(f.verts) == seg]
    bmesh.ops.poke(bm, faces=låg)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler(rot).to_matrix(), verts=bm.verts)
    o = _ny(navn, bm, farve, mat, c)
    if rund: _afrund(o, rund)
    return o


def fin(profil, n=4):
    """Læg n ekstra punkter ind mellem hvert punkt i en profil (så farverne kan skifte midt på en væg)"""
    ud = []
    for (r0, y0), (r1, y1) in zip(profil, profil[1:]):
        ud += [(r0 + (r1 - r0) * k / (n + 1), y0 + (y1 - y0) * k / (n + 1)) for k in range(n + 1)]
    return ud + [profil[-1]]


def drej(navn, profil, farve, mat="blød", seg=32, c=(0, 0, 0)):
    """En drejet form (som på en drejebænk) om spillets lodrette akse.
    profil = [(radius, højde), …] nedefra og op i spillets mål; radius 0 lukker formen i den ende"""
    bm = bmesh.new()
    ringe = []
    for r, y in profil:
        if r < 1e-5: ringe.append([bm.verts.new(S(0, y, 0))])
        else: ringe.append([bm.verts.new(S(math.cos(i / seg * math.tau) * r, y, math.sin(i / seg * math.tau) * r)) for i in range(seg)])
    for a, b in zip(ringe, ringe[1:]):
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1: [bm.faces.new((a[0], b[(i + 1) % seg], b[i])) for i in range(seg)]
        elif len(b) == 1: [bm.faces.new((a[i], a[(i + 1) % seg], b[0])) for i in range(seg)]
        else: [bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i])) for i in range(seg)]
    if len(ringe[0]) > 1: bm.faces.new(list(reversed(ringe[0])))
    if len(ringe[-1]) > 1: bm.faces.new(ringe[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _ny(navn, bm, farve, mat, c)


def G(p):
    """Blenders mål → spillets mål (x, op, frem). Bruges i farvefunktionerne: x, y, z = G(p)"""
    return (p[0], p[2], -p[1])


def klip(o, væk):
    """Fjern de punkter, hvor væk(x, y, z) siger ja (spillets mål, i forhold til figurens midte)"""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if væk(*G(v.co))], context="VERTS")
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o


def plade(navn, punkter, tyk, farve, mat="blød", ringe=4, plan="xy", c=(0, 0, 0), rund=0.0, midt=None):
    """En flad figur (ostestykke, søstjerne, pizzastykke) ud fra en omrids-liste [(u, v), …] i spillets mål.
    plan "xy" = står op og vender mod kameraet · "xz" = ligger ned. Ringene indad giver plads til farvemønstre.
    midt = punktet, ringene samles om (standard: gennemsnittet af omridset)"""
    mx = sum(p[0] for p in punkter) / len(punkter); my = sum(p[1] for p in punkter) / len(punkter)
    if midt: mx, my = midt
    def sted(u, v, w):
        return S(u, v, w) if plan == "xy" else S(u, w, v)
    bm = bmesh.new(); n = len(punkter)
    lag = []
    for w in (-tyk / 2, tyk / 2):
        rr = [[bm.verts.new(sted(mx + (u - mx) * k / ringe, my + (v - my) * k / ringe, w)) for (u, v) in punkter] for k in range(1, ringe + 1)]
        midt = bm.verts.new(sted(mx, my, w))
        lag.append((midt, rr))
    for midt, rr in lag:
        for i in range(n): bm.faces.new((midt, rr[0][i], rr[0][(i + 1) % n]))
        for a, b in zip(rr, rr[1:]):
            for i in range(n): bm.faces.new((a[i], b[i], b[(i + 1) % n], a[(i + 1) % n]))
    yd, ud = lag[0][1][-1], lag[1][1][-1]
    for i in range(n): bm.faces.new((yd[i], yd[(i + 1) % n], ud[(i + 1) % n], ud[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _ny(navn, bm, "#ffffff", mat, c)
    if rund: _afrund(o, rund)
    farv(o, farve)
    return o


def kasse(navn, c, str_, farve, mat="blød", rund=0.0, rot=(0, 0, 0), deling=(0, 0, 0)):
    """En kasse. str_ = størrelse i Blenders akser (x, dybde, op). deling = ekstra snit langs hver akse (til træårer o.l.)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for akse, snit in enumerate(deling):
        if snit:
            kanter = [e for e in bm.edges if abs(e.verts[0].co[akse] - e.verts[1].co[akse]) > 0.5]
            bmesh.ops.subdivide_edges(bm, edges=kanter, cuts=snit, use_grid_fill=True)
    bmesh.ops.scale(bm, vec=Vector(str_), verts=bm.verts)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler(rot).to_matrix(), verts=bm.verts)
    o = _ny(navn, bm, farve, mat, c)
    for p in o.data.polygons: p.use_smooth = False
    if rund: _afrund(o, rund)
    return o


def _afrund(o, bredde):
    m = o.modifiers.new("afrund", "BEVEL"); m.width = bredde; m.segments = 3; m.limit_method = "ANGLE"
    m.harden_normals = False
    _læg_fast(o)
    for p in o.data.polygons: p.use_smooth = True


def glat(o, niveau=2):
    """Gør en kantet form blød (subdivision)"""
    s = o.modifiers.new("glat", "SUBSURF"); s.levels = niveau; s.render_levels = niveau
    _læg_fast(o)
    for p in o.data.polygons: p.use_smooth = True
    return o


def _læg_fast(o):
    """Anvend modifiers, så figuren er en almindelig mesh (vertex-farver bevares)"""
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


# ---------- Formning som ler ----------
def _blød(d, r):
    t = max(0.0, 1 - d / r)
    return t * t * (3 - 2 * t)


def skub(o, centrum, radius, flyt):
    """Træk punkterne nær centrum med (som at trække i ler)"""
    c, f = Vector(centrum) - o.location, Vector(flyt)
    for v in o.data.vertices:
        w = _blød((v.co - c).length, radius)
        if w: v.co += f * w
    o.data.update()
    return o


def bul(o, centrum, radius, mængde):
    """Pust en bule op (eller tryk den ind, hvis mængde er negativ)"""
    c = Vector(centrum) - o.location
    for v in o.data.vertices:
        w = _blød((v.co - c).length, radius)
        if w: v.co += v.normal * mængde * w
    o.data.update()
    return o


def bølg(o, akse, styrke, frekvens, fase=0.0):
    """Bølger hen over figuren (krusede kanter på salat, bacon)"""
    for v in o.data.vertices:
        v.co.z += math.sin(v.co[akse] * frekvens + fase) * styrke
    o.data.update()
    return o


# ---------- Saml, skygge i krogene og eksport ----------
def saml(navn, objekter):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objekter:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objekter[0]
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = navn; o.data.name = navn
    return o


def ao(objekter, styrke=0.6, samples=96, skjul=lambda o: ()):
    """Bag skyggen i krogene ind i vertex-farverne (andre figurer i scenen kaster også skygge).
    skjul(o) = dele, der ikke må kaste skygge på o (fx pupillen, der flytter sig hen over øjets hvide)"""
    s = bpy.context.scene
    s.cycles.samples = samples
    s.render.bake.target = "VERTEX_COLORS"
    for o in objekter:
        me = o.data
        if not len(me.polygons): continue
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        farve = me.color_attributes["Farve"]
        skygge = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
        me.color_attributes.active_color = skygge
        væk = [d for d in skjul(o) if d != o]
        for d in væk: d.hide_render = True
        bpy.ops.object.bake(type="AO")
        for d in væk: d.hide_render = False
        n = len(me.loops)
        a = np.empty(n * 4, dtype=np.float32); farve.data.foreach_get("color", a)
        b = np.empty(n * 4, dtype=np.float32); skygge.data.foreach_get("color", b)
        a, b = a.reshape(n, 4), b.reshape(n, 4)
        a[:, :3] *= (1 - styrke) + styrke * b[:, :1]
        farve.data.foreach_set("color", a.ravel())
        me.color_attributes.remove(me.color_attributes["AO"])
        me.color_attributes.active_color = me.color_attributes["Farve"]
        me.color_attributes.render_color_index = 0


def tom(navn, pos=(0, 0, 0), forælder=None):
    """Et tomt led (til at dreje/flytte dele i spillet: øjne, mund, hænder …)"""
    e = bpy.data.objects.new(navn, None); e.location = pos
    bpy.context.collection.objects.link(e)
    if forælder: sæt_forælder(e, forælder)
    return e


def sæt_forælder(barn, forælder):
    bpy.context.view_layer.update()                             # så matrix_world er opdateret
    m = barn.matrix_world.copy(); barn.parent = forælder; barn.matrix_world = m


def flyt_origin(o, punkt):
    """Læg figurens omdrejningspunkt i punkt (uden at flytte figuren)"""
    p = Vector(punkt)
    d = p - o.location
    for v in o.data.vertices: v.co -= d
    o.location = p
    o.data.update()


def rens():
    """Fjern alt fra scenen (mellem to figurer i samme script)"""
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)


def eksportér(rødder, sti):
    """Gem figurerne (med alt hvad der hænger under dem) som én GLB-fil"""
    bpy.ops.object.select_all(action="DESELECT")
    def vælg(o):
        o.select_set(True)
        for b in o.children: vælg(b)
    for r in rødder: vælg(r)
    os.makedirs(os.path.dirname(sti), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=sti, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_vertex_color="ACTIVE", export_normals=False,
                              export_texcoords=False, export_materials="EXPORT", export_animations=False)
    print("GEMT", os.path.relpath(sti, ROD), os.path.getsize(sti) // 1024, "kB")


def prøve(fil, kamera, mål, str_=(900, 700), linse=45):
    """Et prøvebillede (til at se, hvordan figurerne ser ud) i blender/proever/"""
    s = bpy.context.scene
    if not bpy.data.objects.get("prøvesol"):
        lys = bpy.data.lights.new("prøvesol", "SUN"); lys.energy = 3.5; lys.angle = 0.3
        lo = bpy.data.objects.new("prøvesol", lys); s.collection.objects.link(lo)
        lo.rotation_euler = (math.radians(45), math.radians(15), math.radians(-30))
    k = bpy.data.objects.get("prøvekamera")
    if not k:
        kd = bpy.data.cameras.new("prøvekamera"); k = bpy.data.objects.new("prøvekamera", kd); s.collection.objects.link(k)
    k.data.lens = linse
    k.location = kamera; k.rotation_euler = (Vector(mål) - Vector(kamera)).to_track_quat("-Z", "Y").to_euler()
    s.camera = k; s.render.resolution_x, s.render.resolution_y = str_; s.cycles.samples = 48
    s.render.film_transparent = False
    s.view_settings.view_transform = "Standard"
    os.makedirs(PRØVER, exist_ok=True)
    s.render.filepath = os.path.join(PRØVER, fil); s.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print("BILLEDE", s.render.filepath)
