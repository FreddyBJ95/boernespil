# ===== Mærkelige fisk i Blender: omgivelserne ved søen og på havet (fiskene selv laves stadig i spillet) =====
# Kør:  blender --background --factory-startup --python blender/fisk.py -- soe hav grej
# Gemmer spil/fisk/modeller/<navn>.glb og et prøvebillede i blender/proever/.
#
# soe.glb:  brygge, åkande, åkandeblomst, and, frø, siv, gran, løvtræ
# hav.glb:  båd, sejlbåd, fyrtårn, bøje, ø, palme, delfin, hval (med leddet "hale")
# grej.glb: rulle (fiskehjulet med leddet "sving"), spand, grejkasse
# Materialet "tone" farves i spillet (træernes løv, sejlbådenes forsejl), "rulle" og "line" efter fiskestangen.

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tegnestue import *
from tegnestue import _læg_fast
from slange import blad, drejet, fnug, række, P, palme as slangepalme
from mathutils import Vector, Euler

UD = os.path.join(ROD, "spil", "fisk", "modeller")
TONE = ("tone", 0.7)


def træfarve(base, mørk="#6e4a2c", akse=0, frø=0.0):
    """Træ med årer langs aksen (0 = x, 2 = z i spillet)"""
    def f(p, n):
        g = G(p); u = g[akse]; v = g[1] + g[2 - akse if akse != 1 else 0]
        åre = math.sin(u * 7 + math.sin(u * 2.3 + frø) * 2.2 + v * 13 + frø) * 0.5 + 0.5
        return bland(base, mørk, 0.4 * trin(0.75, 0.25, åre))
    return f


# ======================================================================
# Søen
# ======================================================================
def brygge():
    random.seed(31)
    FARVER = ["#a47148", "#b5835a", "#9a6840", "#ad7a50"]
    dele, i, z = [], 0, 1.66
    while z < 7.0:                                                  # kun den del af broen, man kan se fra kameraet
        dele.append(kasse(f"planke{i}", S(random.uniform(-0.03, 0.03), 0.6, z), (2.6, 0.3, 0.08), træfarve(FARVER[i % 4], frø=random.uniform(0, 9)),
                          ("træ", 0.85), rund=0.014, rot=(0, 0, random.uniform(-0.012, 0.012)), deling=(16, 0, 0)))
        for x in (-1.05, 1.05):
            for dz in (-0.07, 0.07):
                dele.append(ellipsoide(f"søm{i}_{x}_{dz}", S(x, 0.641, z + dz), (0.016, 0.016, 0.006), "#4a4038", ("metal", 0.4, 0.6), seg=8, ring=4))
        z += 0.33; i += 1
    for x in (-1.05, 1.05):
        dele.append(kasse(f"bjælke{x}", S(x, 0.46, 4.4), (0.16, 5.6, 0.2), træfarve("#8a5a34", akse=2), ("træ", 0.85), rund=0.02, deling=(0, 16, 0)))
    def pæl(p, n):
        x, y, z = G(p)
        if y < 0.05: return bland("#3e4a2a", "#5a5a34", trin(-0.6, 0.6, y))   # vådt og grønt nede ved vandet
        return træfarve("#7a5433", "#5a3a20", akse=1)(p, n)
    for z in (1.62, 5):
        for x in (-1.25, 1.25):
            dele.append(drej(f"pæl{x}_{z}", [(0, -2.45), (0.13, -2.45), (0.125, 0.85), (0.1, 0.95), (0, 0.98)], pæl, ("træ", 0.85), seg=20, c=S(x, 0, z)))
    for x in (-1.25, 1.25):                                         # tovværk om de forreste pæle
        for k in range(3):
            dele.append(torus(f"tov{x}_{k}", S(x, 0.72 + k * 0.055, 1.62), 0.15, 0.028, lambda p, n: bland("#d8c49a", "#b8a070", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 14))), ("reb", 0.9), seg=24, tseg=8))
    return dele


def åkande():
    omrids = [(math.cos(a) * 0.75, math.sin(a) * 0.75) for a in [0.42 + i / 48 * (math.tau - 0.84) for i in range(49)]] + [(0.07, 0.0)]
    def farve(p, n):
        x, z = p[0], -p[1]; r = math.hypot(x, z); a = math.atan2(z, x)
        if r > 0.7: return "#5a8a3a"
        return bland("#3f9d45", "#7fd060", 0.35 * trin(0.85, 0.2, math.cos(a * 15)) + 0.25 * (1 - r / 0.75))
    o = plade("åkande", omrids, 0.035, farve, ("blad", 0.5), ringe=7, plan="xz", c=S(0, 0.0, 0), midt=(-0.12, 0))
    for v in o.data.vertices:                                        # kanten bøjer en smule op
        r = math.hypot(v.co.x, v.co.y)
        v.co.z += max(0.0, r - 0.6) * 0.3
    o.data.update()
    return [o]


def åkandeblomst():
    dele = []
    for lag_, (n, l, op, f0) in enumerate([(8, 0.26, 0.55, "#ffffff"), (8, 0.2, 0.95, "#ffe0f0")]):
        for k in range(n):
            a = (k + lag_ * 0.5) / n * math.tau
            kb = ellipsoide(f"blomsterblad{lag_}_{k}", S(math.cos(a) * l * 0.5, 0.06 + lag_ * 0.02, math.sin(a) * l * 0.5), (l * 0.55, 0.065, 0.03),
                            lambda p, n_, f0=f0: bland(f0, "#ff7ab8", trin(0.08, 0.06, math.hypot(p[0], p[1]))), ("blomst", 0.5), seg=16, ring=10, rot=(0, -op, -a))
            dele.append(kb)
    dele.append(ellipsoide("blomstermidte", S(0, 0.1, 0), (0.07, 0.07, 0.04), "#ffd23f", seg=16, ring=10))
    for k in range(10):
        a = k / 10 * math.tau
        dele.append(ellipsoide(f"støvdrager{k}", S(math.cos(a) * 0.07, 0.14, math.sin(a) * 0.07), 0.016, "#ffb000", seg=8, ring=6))
    return dele


def and_():
    GUL = "#ffd23f"
    krop = ellipsoide("andekrop", S(0, 0.14, 0), (0.46, 0.34, 0.3), lambda p, n: bland("#f2b818", GUL, 0.5 + 0.5 * n.z), ("glans", 0.25), seg=40, ring=24)
    skub(krop, S(-0.44, 0.22, 0), 0.26, S(-0.05, 0.16, 0))            # halen peger op
    dele = [krop, ellipsoide("andehoved", S(0.3, 0.48, 0), 0.22, GUL, ("glans", 0.25), seg=32, ring=20),
            ellipsoide("andenæb", S(0.52, 0.44, 0), (0.15, 0.11, 0.045), "#ff8c1a", ("glans", 0.25), seg=24, ring=12),
            ellipsoide("andenæbunder", S(0.49, 0.405, 0), (0.12, 0.09, 0.03), "#e8700c", seg=20, ring=10)]
    for s in (-1, 1):
        dele.append(ellipsoide(f"andeøje{s}", S(0.43, 0.55, s * 0.13), 0.05, "#ffffff", ("glans", 0.25), seg=16, ring=10))
        dele.append(ellipsoide(f"andepupil{s}", S(0.465, 0.555, s * 0.145), 0.028,
                               lambda p, n, s=s: "#ffffff" if (Vector(G(p)) - Vector((0.48, 0.57, s * 0.16))).length < 0.012 else "#111111", ("glans", 0.25), seg=12, ring=8))
        dele.append(ellipsoide(f"andevinge{s}", S(-0.02, 0.2, s * 0.31), (0.24, 0.06, 0.13), "#f5c020", ("glans", 0.25), seg=20, ring=12, rot=(0, 0.25, 0)))
        dele.append(ellipsoide(f"andekind{s}", S(0.4, 0.45, s * 0.17), (0.04, 0.012, 0.03), "#ff9e7a", seg=10, ring=6, rot=(0, 0, s * 0.5)))
    return dele


def frø():
    GRØN = "#4caf50"
    pletter = [Vector(v) for v in [(-0.05, 0.36, 0.08), (0.05, 0.36, -0.1), (-0.15, 0.32, -0.06), (0.12, 0.42, 0.0)]]
    def hud(p, n):
        if n.z < -0.3: return "#c5e8b0"
        d = min((Vector(G(p)) - q).length for q in pletter)
        return bland("#2f7d32", GRØN, trin(0.05, 0.03, d))
    dele = [ellipsoide("frøkrop", S(0, 0.18, 0), (0.3, 0.26, 0.2), hud, ("glans", 0.3), seg=36, ring=24),
            ellipsoide("frømave", S(0.08, 0.14, 0), (0.24, 0.2, 0.14), "#c5e8b0", ("glans", 0.3), seg=28, ring=18),
            ellipsoide("frøhoved", S(0.2, 0.3, 0), (0.2, 0.22, 0.15), hud, ("glans", 0.3), seg=32, ring=20)]
    for s in (-1, 1):
        dele += [ellipsoide(f"frøøjebule{s}", S(0.22, 0.43, s * 0.11), 0.08, GRØN, ("glans", 0.3), seg=20, ring=14),
                 ellipsoide(f"frøøje{s}", S(0.25, 0.46, s * 0.12), 0.062, "#ffffff", ("glans", 0.3), seg=16, ring=12),
                 ellipsoide(f"frøpupil{s}", S(0.3, 0.47, s * 0.13), 0.034,
                            lambda p, n, s=s: "#ffffff" if (Vector(G(p)) - Vector((0.32, 0.49, s * 0.14))).length < 0.012 else "#111111", ("glans", 0.3), seg=12, ring=8)]
        dele.append(pølse(f"frølår{s}", [S(-0.1, 0.14, s * 0.2), S(-0.24, 0.12, s * 0.3), S(-0.06, 0.05, s * 0.34)], [0.09, 0.07, 0.04], GRØN, ("glans", 0.3)))
        dele.append(pølse(f"frøfod{s}", [S(-0.06, 0.03, s * 0.34), S(0.08, 0.02, s * 0.36)], [0.035, 0.025], GRØN, ("glans", 0.3), glathed=1))
        dele.append(pølse(f"frøarm{s}", [S(0.14, 0.16, s * 0.15), S(0.2, 0.06, s * 0.18), S(0.24, 0.02, s * 0.19)], [0.04, 0.032, 0.025], GRØN, ("glans", 0.3), glathed=1))
        for t in (-1, 0, 1):
            dele.append(ellipsoide(f"frøtå{s}{t}", S(0.27 + 0.01 * t, 0.015, s * 0.19 + t * 0.03), (0.03, 0.014, 0.01), GRØN, seg=8, ring=6, rot=(0, 0, t * 0.5)))
        dele.append(ellipsoide(f"frøkind{s}", S(0.33, 0.3, s * 0.14), (0.035, 0.012, 0.025), "#ff9eb0", seg=10, ring=6, rot=(0, 0, s * 0.9)))
    smil = [S(0.36, 0.27 + 0.03 * (abs(t) ** 2), t * 0.12) for t in [-1, -0.5, 0, 0.5, 1]]
    dele.append(pølse("frøsmil", smil, [0.008, 0.011, 0.012, 0.011, 0.008], "#2a4a1a", glathed=1))
    return dele


def siv():
    random.seed(17)
    dele = []
    for k in range(5):
        a = k / 5 * math.tau + random.uniform(-0.3, 0.3); h = random.uniform(1.4, 2.0); bøj = random.uniform(0.15, 0.35)
        omrids = [(0.035 * (1 - t), h * t) for t in [i / 10 for i in range(11)]] + [(-0.035 * (1 - t), h * t) for t in [i / 10 for i in range(10, -1, -1)]][1:]
        b = plade(f"sivblad{k}", omrids, 0.012, lambda p, n, h=h: bland("#2f7a2a", "#9cd060", p[2] / h), ("blad", 0.6), ringe=2, plan="xy", c=S(math.cos(a) * 0.06, 0, math.sin(a) * 0.06), midt=(0, h * 0.4))
        for v in b.data.vertices: v.co.x += bøj * (v.co.z / h) ** 2      # bladet bøjer udad
        b.data.update()
        dele.append(drejet(b, (0, 0, -a)))
    for k, (x, z, h) in enumerate([(0.04, -0.03, 2.1), (-0.05, 0.04, 1.8)]):
        dele.append(pølse(f"kolbestilk{k}", [S(x, 0, z), S(x * 1.5, h, z * 1.5)], [0.016, 0.012], "#4a7a2a", glathed=1))
        dele.append(pølse(f"kolbe{k}", [S(x * 1.45, h - 0.55, z * 1.45), S(x * 1.5, h - 0.15, z * 1.5)], [0.06, 0.055], lambda p, n: bland("#5a3418", "#7a4a24", trin(0, 0.6, math.sin(p[2] * 60))), ("kolbe", 0.9)))
    return dele


def gran():
    dele = [drej("granstamme", [(0, 0), (0.5, 0), (0.3, 2.6), (0, 2.6)], lambda p, n: bland("#5a3a20", "#7a5433", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 9))), seg=16)]
    for k, (y0, R, h) in enumerate([(2.0, 3.0, 2.6), (3.6, 2.5, 2.3), (5.0, 2.0, 2.0), (6.3, 1.5, 1.8), (7.5, 1.0, 2.6)]):
        t = drej(f"granlag{k}", [(0.0, y0 + 0.35), (R, y0), (R * 0.55, y0 + h * 0.45), (0.0, y0 + h)],
                 lambda p, n: "#8a8a8a" if n.z < -0.2 else bland("#c8c8c8", "#ffffff", 0.5 + 0.5 * n.z), TONE, seg=40)
        for v in t.data.vertices:                                      # kanten hænger i små buer
            r = math.hypot(v.co.x, v.co.y)
            if r > 0.75 * R: v.co.z -= 0.18 * R * (0.5 + 0.5 * math.sin(math.atan2(v.co.y, v.co.x) * 9)) * (r / R - 0.75) * 4
        t.data.update()
        dele.append(t)
    return dele


def løvtræ():
    random.seed(23)
    dele = [pølse("løvstamme", [S(0, 0, 0), S(0.1, 2.0, 0), S(0, 4.0, 0)], [0.42, 0.32, 0.24], lambda p, n: bland("#5a3a20", "#7a5433", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 9 + p[2]))))]
    dele.append(pølse("gren", [S(0.05, 3.0, 0), S(0.9, 4.2, 0.3)], [0.14, 0.08], "#6a4424"))
    for i, (x, y, z, r) in enumerate([(0, 6.3, 0, 2.6), (1.6, 5.6, 0.4, 1.7), (-1.5, 5.8, -0.3, 1.8), (0.3, 5.4, 1.6, 1.6), (-0.3, 5.6, -1.6, 1.7), (0.4, 7.6, -0.2, 1.6)]):
        k = ellipsoide(f"løvkrone{i}", S(x, y, z), r, lambda p, n: "#909090" if n.z < -0.3 else bland("#c0c0c0", "#ffffff", 0.5 + 0.5 * n.z), TONE, seg=24, ring=16)
        fnug(k, 14, r * 0.5, frø=i)
        dele.append(k)
    return dele


SØ = {"brygge": brygge, "åkande": åkande, "åkandeblomst": åkandeblomst, "and": and_, "frø": frø, "siv": siv, "gran": gran, "løvtræ": løvtræ}


# ======================================================================
# Havet
# ======================================================================
BÅD = [(2.0, 0.72), (1.2, 0.86), (0.0, 0.9), (-1.2, 0.8), (-2.0, 0.5), (-2.65, 0.0)]   # (z, halv bredde)


def bådbredde(z):
    for (z0, w0), (z1, w1) in zip(BÅD, BÅD[1:]):
        if z1 <= z <= z0:
            t = (z0 - z) / (z0 - z1); t = t * t * (3 - 2 * t) * 0.35 + t * 0.65
            return w0 + (w1 - w0) * t
    return 0.0


def bådtop(z):
    return 0.5 + 0.14 * max(0.0, -z / 2.65) ** 2 + 0.03 * max(0.0, z / 2.0) ** 2   # rælingen stiger op mod stævnen


def skrog(navn, krymp, farve, mat, vend=False, agter=2.0):
    """Bådens skal som et net: stationer langs z, og et U-snit ved hver station. agter = hvor agterspejlet sidder"""
    bm = bmesh.new(); N, M = 44, 20
    rækker = []
    for i in range(N + 1):
        z = agter - i / N * (agter + 2.62)
        w = max(0.004, bådbredde(z) * krymp); top = bådtop(z); dyb = (0.62 - 0.12 * max(0.0, -z / 2.65) ** 2) * krymp
        rækker.append([bm.verts.new(S(w * (2 * j / M - 1), top - dyb * (1 - abs(2 * j / M - 1) ** 2.4), z)) for j in range(M + 1)])
    for i in range(N):
        for j in range(M):
            f = (rækker[i][j], rækker[i + 1][j], rækker[i + 1][j + 1], rækker[i][j + 1])
            bm.faces.new(f[::-1] if vend else f)
    bm.faces.new(rækker[0] if vend else rækker[0][::-1])               # agterspejlet
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if vend: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return _ny_net(navn, bm, farve, mat)


def _ny_net(navn, bm, farve, mat):
    me = bpy.data.meshes.new(navn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(navn, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(materiale(*mat) if isinstance(mat, tuple) else materiale(mat))
    for p in o.data.polygons: p.use_smooth = True
    farv(o, farve)
    return o


def båd():
    def ydre(p, n):
        x, y, z = G(p); top = bådtop(z)
        if y > top - 0.04: return "#c8955a"
        if top - 0.24 < y < top - 0.15: return "#ffffff"                    # hvid stribe
        plank = trin(0.9, 0.12, math.sin((top - y) / 0.115 * math.pi))       # klinkbyggede planker
        return bland("#2a7fd4", "#1d62a8", 0.5 * plank)
    def indre(p, n):
        x, y, z = G(p)
        return bland("#c8955a", "#9a6a3a", 0.4 * trin(0.9, 0.12, math.sin((bådtop(z) - y) / 0.115 * math.pi)))
    dele = [skrog("bådyder", 1.0, ydre, ("bådmaling", 0.5)), skrog("bådinder", 0.94, indre, ("træ", 0.8), vend=True, agter=1.95)]
    for s in (-1, 1):                                                     # rælingen hele vejen rundt
        pts = [S(s * bådbredde(z) * 0.97, bådtop(z) + 0.01, z) for z in [2.0 - i / 20 * 4.6 for i in range(21)]]
        dele.append(pølse(f"ræling{s}", pts, [0.05] * 21, træfarve("#b07a45", akse=2), ("træ", 0.8), glathed=1))
    dele.append(pølse("agterræling", [S(-0.7, bådtop(2.0) + 0.01, 2.0), S(0.7, bådtop(2.0) + 0.01, 2.0)], [0.05, 0.05], "#b07a45", ("træ", 0.8), glathed=1))
    for k, x in enumerate([-0.45, -0.15, 0.15, 0.45]):                     # bundbrædder
        dele.append(kasse(f"bundbræt{k}", S(x, 0.1, 0.0), (0.26, 3.8, 0.04), træfarve(["#b07a45", "#a87040", "#b88250", "#a06838"][k], akse=2, frø=k), ("træ", 0.8), rund=0.01, deling=(0, 30, 0)))
    for k, z in enumerate([-1.8, -1.2, -0.6, 0.0, 0.6, 1.2, 1.8]):          # spanter inden i skroget
        w = bådbredde(z) * 0.92; top = bådtop(z); dyb = 0.56
        pts = [S(w * t, top - 0.06 - dyb * (1 - abs(t) ** 2.4), z) for t in [-0.98, -0.6, 0, 0.6, 0.98]]
        dele.append(pølse(f"spant{k}", pts, [0.025] * 5, "#9a6a3a", ("træ", 0.8), glathed=1))
    for navn, z, b in (("forbænk", -0.95, 1.62), ("bagbænk", 1.2, 1.5)):
        dele.append(kasse(navn, S(0, 0.36, z), (b, 0.36, 0.07), træfarve("#c08850"), ("træ", 0.8), rund=0.02, deling=(20, 0, 0)))
        dele.append(kasse(navn + "ben", S(0, 0.22, z), (0.08, 0.3, 0.22), "#9a6a3a", ("træ", 0.8), rund=0.015))
    for s in (-1, 1):                                                     # årerne ligger langs siderne
        dele.append(pølse(f"åreskaft{s}", [S(s * 0.62, 0.48, -0.25), S(s * 0.66, 0.41, -1.75)], [0.028, 0.028], træfarve("#c08850", akse=2), ("træ", 0.8), glathed=1))
        dele.append(ellipsoide(f"åreblad{s}", S(s * 0.67, 0.4, -1.98), (0.024, 0.24, 0.085), "#c08850", ("træ", 0.8), seg=20, ring=10, rot=(0, s * 0.15, 0)))
        dele.append(pølse(f"årehåndtag{s}", [S(s * 0.62, 0.48, -0.25), S(s * 0.615, 0.49, -0.1)], [0.032, 0.032], "#6a4424", glathed=1))
        dele.append(torus(f"åregaffel{s}", S(s * bådbredde(-0.5) * 0.97, bådtop(-0.5) + 0.07, -0.5), 0.04, 0.008, "#9aa3ad", ("metal", 0.4, 0.7), rot=(0, math.pi / 2, 0), seg=16, tseg=6))
    C = Vector(S(0.5, 0.42, -1.75))
    dele.append(torus("redningskrans", C, 0.2, 0.065, lambda p, n: "#ffffff" if (math.atan2(p[1] - C[1], p[0] - C[0]) % (math.pi / 2)) < math.pi / 4 else "#e63946",
                      ("plast", 0.5), rot=(0.45, 0, 0.4), seg=32, tseg=12))
    for k in range(3):                                                    # et rullet reb i stævnen
        dele.append(torus(f"bådreb{k}", S(0.0, 0.16 + k * 0.035, -2.0), 0.16 - k * 0.02, 0.022, "#d8c49a", ("reb", 0.9), seg=24, tseg=8))
    dele.append(pølse("vimpelstang", [S(0, 0.5, -2.42), S(0, 0.86, -2.42)], [0.018, 0.016], "#8a6a4a", glathed=1))
    return dele


def sejlbåd():
    def skrogfarve(p, n):
        y = p[2]
        if -0.32 < y < -0.2: return "#e63946"
        return "#ffffff" if y > -0.32 else "#2a4a7a"
    s = klip(ellipsoide("sejlskrog", S(0, 0, 0), (2.6, 0.95, 0.8), skrogfarve, ("bådmaling", 0.5), seg=48, ring=24), lambda x, y, z: y > 0.001)
    skub(s, S(2.6, 0, 0), 0.9, S(0.25, 0, 0.1))                           # spids stævn
    dele = [s, plade("sejldæk", [(math.cos(a) * 2.75 if math.cos(a) > 0 else math.cos(a) * 2.55, math.sin(a) * 0.93) for a in [i / 40 * math.tau for i in range(40)]],
                     0.04, træfarve("#c08850"), ("træ", 0.8), plan="xz", c=S(0, 0.0, 0), ringe=3, midt=(0, 0)),
            kasse("kahyt", S(-0.6, 0.25, 0), (1.3, 0.9, 0.4), "#ffffff", ("bådmaling", 0.5), rund=0.12),
            pølse("mast", [S(0.3, 0, 0), S(0.3, 7.0, 0)], [0.07, 0.05], "#8a6a4a", glathed=1),
            pølse("bom", [S(0.3, 0.75, 0), S(-2.5, 0.75, 0)], [0.05, 0.04], "#8a6a4a", glathed=1)]
    for k in range(3):
        dele.append(ellipsoide(f"koøje{k}", S(-1.0 + k * 0.4, 0.3, 0.45), (0.08, 0.02, 0.08), "#4aa8ff", ("blank", 0.1), seg=12, ring=8))
    stor = plade("storsejl", [(0, 0.8), (0, 6.8), (-2.6, 0.8)], 0.02, "#fdfdfd", ("sejl", 0.7), ringe=6, plan="xy", c=S(0.3, 0, 0))
    for v in stor.data.vertices: v.co.y -= 0.18 * math.sin(math.pi * min(1, -v.co.x / 2.6))   # vinden fylder sejlet
    stor.data.update()
    fok = plade("forsejl", [(0, 0.8), (0, 6.0), (2.1, 0.8)], 0.02, "#ffffff", TONE, ringe=6, plan="xy", c=S(0.3, 0, 0))
    for v in fok.data.vertices: v.co.y -= 0.14 * math.sin(math.pi * min(1, v.co.x / 2.1))
    fok.data.update()
    return dele + [stor, fok]


def fyrtårn():
    H = 16
    def tårn(p, n):
        x, y, z = G(p)
        return "#ffffff" if int(y / (H / 8)) % 2 else "#e63946"
    profil = [(0, 0)] + [(2.0 - 0.7 * t, H * t) for t in [i / 64 for i in range(65)]] + [(0, H)]
    dele = [drej("tårn", profil, tårn, ("bådmaling", 0.55), seg=40)]
    dele.append(ellipsoide("dør", S(0, 1.0, 1.98), (0.55, 0.1, 0.9), "#5a3a20", seg=20, ring=12))
    for k, y in enumerate([5.5, 9.5, 13.0]):
        r = 2.0 - 0.7 * y / H
        dele.append(ellipsoide(f"tårnvindue{k}", S(0, y, r - 0.02), (0.28, 0.08, 0.4), "#26303a", ("blank", 0.15), seg=16, ring=10))
    dele.append(drej("galleri", [(0, H), (2.2, H), (2.2, H + 0.3), (0, H + 0.3)], "#26262e", seg=40))
    dele.append(torus("rækværk", S(0, H + 1.0, 0), 2.1, 0.05, "#26262e", seg=48, tseg=8))
    for k in range(16):
        a = k / 16 * math.tau
        dele.append(pølse(f"rækværkspind{k}", [S(math.cos(a) * 2.1, H + 0.3, math.sin(a) * 2.1), S(math.cos(a) * 2.1, H + 1.0, math.sin(a) * 2.1)], [0.035, 0.035], "#26262e", glathed=1))
    dele.append(drej("lygtetag", [(0, H + 2.0), (1.5, H + 2.0), (1.4, H + 2.15), (0.15, H + 3.45), (0, H + 3.5)], "#e63946", ("bådmaling", 0.55), seg=40))
    dele.append(ellipsoide("tagknop", S(0, H + 3.6, 0), 0.25, "#26262e", seg=16, ring=10))
    for k in range(6):                                                    # sten om foden
        a = k / 6 * math.tau + 0.3
        st = ellipsoide(f"fyrsten{k}", S(math.cos(a) * 2.3, 0.1, math.sin(a) * 2.3), (0.7, 0.6, 0.45), "#8d949c", seg=12, ring=8)
        fnug(st, 6, 0.4, frø=k); dele.append(st)
    return dele


def bøje():
    def krop(p, n):
        y = p[2]
        return "#ffffff" if 0.34 < y < 0.56 else "#e63946"
    return [drej("bøjekrop", [(0, -0.25), (0.6, -0.25), (0.62, -0.2), (0.45, 0.65), (0, 0.65)], krop, ("bådmaling", 0.5), seg=32),
            torus("bøjefender", S(0, -0.18, 0), 0.6, 0.06, "#26262e", seg=32, tseg=8),
            pølse("bøjestang", [S(0, 0.65, 0), S(0, 1.38, 0)], [0.06, 0.05], "#555b66", ("metal", 0.4, 0.6), glathed=1)] + \
           [pølse(f"lygtebur{k}", [S(math.cos(a) * 0.16, 1.35, math.sin(a) * 0.16), S(math.cos(a) * 0.16, 1.68, math.sin(a) * 0.16)], [0.012, 0.012], "#555b66", glathed=1)
            for k, a in enumerate([i / 4 * math.tau for i in range(4)])] + [torus("lygtetop", S(0, 1.68, 0), 0.16, 0.02, "#555b66", seg=20, tseg=6)]


def ø():
    sand = ellipsoide("sand", S(0, -0.05, 0), (1.0, 0.85, 0.16), lambda p, n: bland("#e8cc8a", "#f6e2b0", 0.5 + 0.5 * n.z), seg=48, ring=16)
    for v in sand.data.vertices:
        a = math.atan2(v.co.y, v.co.x); k = 1 + 0.06 * math.sin(a * 5) + 0.04 * math.sin(a * 9 + 1)
        v.co.x *= k; v.co.y *= k
    sand.data.update()
    græs = ellipsoide("græs", S(0.05, 0.02, 0), (0.62, 0.5, 0.2), lambda p, n: bland("#3f9d3a", "#7ad05a", 0.5 + 0.5 * n.z), seg=40, ring=16)
    fnug(græs, 16, 0.25, frø=4)
    sten = []
    random.seed(12)
    for k in range(6):
        a = random.uniform(0, math.tau); r = random.uniform(0.035, 0.09)
        st = ellipsoide(f"østen{k}", S(math.cos(a) * 0.95, 0.0, math.sin(a) * 0.8), (r, r * 0.9, r * 0.75), "#8d949c", seg=12, ring=8)
        fnug(st, 5, r * 0.6, frø=k); sten.append(st)
    return [sand, græs] + sten


def delfin():
    def hud(p, n):
        return bland("#5f80a2", "#e6eef5", trin(-0.25, 0.3, -n.z)) if p[2] < 0.1 else "#5f80a2"
    krop = pølse("delfinkrop", [S(-1.25, 0.0, 0), S(-0.7, 0.06, 0), S(0, 0.08, 0), S(0.7, 0.04, 0), S(1.1, -0.02, 0), S(1.32, -0.06, 0), S(1.58, -0.08, 0)],
                 [0.07, 0.24, 0.36, 0.33, 0.22, 0.09, 0.055], hud, ("glans", 0.3))
    bul(krop, S(1.0, 0.2, 0), 0.25, 0.06)                                  # den runde pande
    dele = [krop, drejet(plade("rygfinne", [(-0.25, 0), (0.22, 0), (-0.32, 0.44)], 0.07, "#5f80a2", ("glans", 0.3), plan="xy", c=S(-0.05, 0.3, 0), rund=0.025), (0, 0, 0)),
            ellipsoide("haleflig1", S(-1.36, 0, 0.2), (0.14, 0.26, 0.03), "#5f80a2", ("glans", 0.3), seg=20, ring=10, rot=(0, 0, -0.6)),
            ellipsoide("haleflig2", S(-1.36, 0, -0.2), (0.14, 0.26, 0.03), "#5f80a2", ("glans", 0.3), seg=20, ring=10, rot=(0, 0, 0.6))]
    for s in (-1, 1):
        f = plade(f"sidefinne{s}", [(0, -0.1), (0, 0.1), (-0.3, 0.05)], 0.04, "#5f80a2", ("glans", 0.3), plan="xz", c=S(0.55, -0.2, s * 0.3), rund=0.015)
        dele.append(drejet(f, (s * 0.5, 0, s * 0.4)))
        dele.append(ellipsoide(f"delfinøje{s}", S(0.98, 0.07, s * 0.22), (0.05, 0.03, 0.045), lambda p, n, s=s: "#ffffff" if (Vector(G(p)) - Vector((1.01, 0.09, s * 0.245))).length < 0.014 else "#111111", ("glans", 0.3), seg=12, ring=8, rot=(0, 0, s * 0.3)))
        dele.append(pølse(f"delfinsmil{s}", [S(1.56, -0.1, s * 0.03), S(1.36, -0.09, s * 0.08), S(1.2, -0.05, s * 0.13)], [0.008, 0.01, 0.008], "#3a5a78", glathed=1))
    return dele


def hval():
    def hud(p, n):
        if n.z < -0.35:                                                  # lys bug med furer
            return bland("#d8e4ee", "#a8bccc", trin(0.6, 0.3, math.sin(p[1] * 7)))
        return bland("#2a4a70", "#3a5e88", trin(0.4, 0.4, math.sin(p[0] * 1.3) * math.sin(p[1] * 2.1)))
    krop = pølse("hvalkrop", [S(-5.2, 0.0, 0), S(-3.5, 0.2, 0), S(-1.0, 0.35, 0), S(1.5, 0.3, 0), S(3.8, 0.1, 0), S(5.5, -0.2, 0), S(6.1, -0.35, 0)],
                 [0.5, 1.2, 1.8, 2.0, 1.85, 1.2, 0.6], hud, ("glans", 0.3))
    dele = [krop,
            drejet(plade("hvalfinne", [(-0.6, 0), (0.6, 0), (-0.8, 0.9)], 0.3, "#2a4a70", ("glans", 0.3), plan="xy", c=S(-2.4, 1.7, 0), rund=0.1), (0, 0, 0)),
            ellipsoide("blæsehul", S(2.6, 1.95, 0), (0.25, 0.12, 0.06), "#1a2a40", seg=12, ring=8)]
    for s in (-1, 1):
        f = plade(f"luffe{s}", [(0.6, -0.4), (0.4, 0.4), (-1.8, 0.1)], 0.18, "#2a4a70", ("glans", 0.3), plan="xz", c=S(2.6, -1.1, s * 1.7), rund=0.06)
        dele.append(drejet(f, (s * 0.5, 0.2, s * 0.3)))
        dele.append(ellipsoide(f"hvaløje{s}", S(4.4, 0.3, s * 1.5), (0.2, 0.08, 0.18), lambda p, n, s=s: "#ffffff" if (Vector(G(p)) - Vector((4.48, 0.4, s * 1.56))).length < 0.06 else "#111111", ("glans", 0.3), seg=14, ring=10, rot=(0, 0, s * 0.35)))
        dele.append(pølse(f"hvalmund{s}", [S(5.95, -0.45, s * 0.3), S(5.0, -0.55, s * 1.05), S(3.6, -0.55, s * 1.55)], [0.05, 0.06, 0.05], "#1a2a40", glathed=1))
    led = tom("hale", S(-5.6, 0, 0))
    halestykke = pølse("halerod", [S(-5.0, 0, 0), S(-6.6, 0.05, 0)], [0.55, 0.3], hud, ("glans", 0.3))
    flige = [ellipsoide(f"haleflig{s}", S(-7.0, 0.05, s * 1.25), (0.6, 1.45, 0.14), "#2a4a70", ("glans", 0.3), seg=28, ring=14, rot=(0, 0, s * 0.5)) for s in (-1, 1)]
    for d in [halestykke] + flige: sæt_forælder(d, led)
    return dele, led


HAV = {"båd": båd, "sejlbåd": sejlbåd, "fyrtårn": fyrtårn, "bøje": bøje, "ø": ø, "palme": slangepalme, "delfin": delfin}


# ======================================================================
# Grejet: fiskehjulet, spanden og grejkassen
# ======================================================================
def rulle():
    """Hjulet sidder under stangen; stangen peger langs +y. Leddet 'sving' er håndsvinget, som spillet drejer"""
    dele = [pølse("rullefod", [S(0, 0.0, 0), S(0, -0.004, -0.045)], [0.008, 0.009], "#26262e", glathed=1),
            kasse("rulleplade", S(0, 0.0, -0.004), (0.016, 0.07, 0.006), "#26262e", rund=0.003),
            ellipsoide("rullehus", S(0, -0.012, -0.08), (0.032, 0.05, 0.046), "#ffffff", ("rulle", 0.35), seg=24, ring=16),
            drej("rotor", [(0.0, 0.016), (0.03, 0.018), (0.047, 0.03), (0.047, 0.046), (0.0, 0.046)], "#ffffff", ("rulle", 0.35), seg=32, c=S(0, 0, -0.08)),
            drej("spolekant", [(0.0, 0.05), (0.047, 0.05), (0.048, 0.056), (0.0, 0.056)], "#c0c6d0", ("metal", 0.3, 0.8), seg=32, c=S(0, 0, -0.08)),
            drej("spoletop", [(0.0, 0.088), (0.048, 0.088), (0.047, 0.095), (0.012, 0.1), (0.0, 0.102)], "#c0c6d0", ("metal", 0.3, 0.8), seg=32, c=S(0, 0, -0.08)),
            drej("snøre", [(0.0, 0.056), (0.039, 0.056), (0.04, 0.072), (0.039, 0.088), (0.0, 0.088)], lambda p, n: bland("#ffffff", "#e0e0e0", trin(0, 0.5, math.sin(p[2] * 900))), ("line", 0.6), seg=32, c=S(0, 0, -0.08))]
    bøjle = [S(math.cos(a) * 0.052, 0.072, -0.08 + math.sin(a) * 0.052) for a in [math.pi * i / 10 for i in range(11)]]
    dele.append(pølse("bøjle", bøjle, [0.0035] * 11, "#d1d5db", ("metal", 0.3, 0.8), glathed=1))
    led = tom("sving", S(-0.05, -0.012, -0.08))
    sving = [pølse("svingarm", [S(-0.05, -0.012, -0.08), S(-0.05, 0.078, -0.08)], [0.005, 0.004], "#c0c6d0", ("metal", 0.3, 0.8), glathed=1),
             ellipsoide("svingknop", S(-0.07, 0.078, -0.08), (0.02, 0.012, 0.012), "#26262e", ("plast", 0.5), seg=12, ring=8),
             ellipsoide("svingnav", S(-0.042, -0.012, -0.08), (0.01, 0.014, 0.014), "#c0c6d0", ("metal", 0.3, 0.8), seg=12, ring=8)]
    for d in sving: sæt_forælder(d, led)
    return dele, led


def spand():
    def farve(p, n):
        y = p[2]
        if y > 0.17: return "#ffffff"
        return bland("#d62839", "#ef4655", trin(0, 0.6, math.sin(y * 70)))
    krop = drej("spandkrop", fin([(0, -0.21), (0.23, -0.21), (0.245, -0.2), (0.3, 0.2), (0.312, 0.212), (0.3, 0.222), (0.286, 0.212), (0.222, -0.18), (0, -0.18)], 6), farve, ("plast", 0.4), seg=48)
    vand = drej("spandvand", [(0, 0.115), (0.27, 0.115), (0.27, 0.125), (0, 0.125)], lambda p, n: bland("#3aa8e0", "#7ad8ff", trin(0.1, 0.1, math.hypot(p[0] + 0.08, p[1] - 0.08))), ("vand", 0.08), seg=40)
    hank = pølse("spandhank", [S(-0.3, 0.17, 0), S(-0.24, 0.3, -0.12), S(0, 0.36, -0.2), S(0.24, 0.3, -0.12), S(0.3, 0.17, 0)], [0.011] * 5, "#9aa3ad", ("metal", 0.3, 0.8), glathed=1)
    ører = [ellipsoide(f"spandøre{s}", S(s * 0.3, 0.17, 0), (0.02, 0.035, 0.03), "#c01f30", ("plast", 0.4), seg=10, ring=8) for s in (-1, 1)]
    return [krop, vand, hank] + ører


def grejkasse():
    return [kasse("grejkrop", S(0, 0, 0), (0.55, 0.32, 0.26), lambda p, n: bland("#2a9d8f", "#23867a", trin(0, 0.4, -p[2] - 0.06)), ("plast", 0.45), rund=0.03),
            kasse("grejlåg", S(0, 0.15, 0), (0.57, 0.34, 0.06), "#23867a", ("plast", 0.45), rund=0.025),
            pølse("grejhank", [S(-0.1, 0.18, 0), S(-0.08, 0.25, 0), S(0.08, 0.25, 0), S(0.1, 0.18, 0)], [0.016] * 4, "#26262e", glathed=1),
            kasse("grejlås", S(0, 0.1, 0.168), (0.07, 0.012, 0.06), "#ffd23f", ("metal", 0.3, 0.8), rund=0.004),
            kasse("grejhængsel", S(0, 0.12, -0.168), (0.4, 0.012, 0.025), "#9aa3ad", ("metal", 0.3, 0.8), rund=0.004)]


def samlet(rod, opskrifter, afstand, pr_række):
    """Som række(), men opskrifter må også give et ekstra led tilbage (fx hvalens hale)"""
    led = []
    for navn, lav in opskrifter.items():
        res = lav()
        dele, ekstra = (res if isinstance(res, tuple) else (res, None))
        l = tom(navn, (0, 0, 0), rod)
        for d in dele: sæt_forælder(d, l)
        if ekstra: sæt_forælder(ekstra, l)
        led.append(l)
    for i, l in enumerate(led):
        l.location = S((i % pr_række - (pr_række - 1) / 2) * afstand, 0, -(i // pr_række) * afstand)
    return led


def færdig(rod, navn, kamera, mål, led, styrke=0.55):
    bpy.context.view_layer.update()
    ao([o for o in bpy.data.objects if o.type == "MESH"], styrke=styrke)
    prøve(f"fisk_{navn}.png", kamera, mål)
    for l in led: l.location = (0, 0, 0)
    eksportér([rod], os.path.join(UD, f"{navn}.glb"))


if __name__ == "__main__":
    hvilke = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["soe", "hav", "grej"]
    for navn in hvilke:
        if navn == "soe":
            nulstil(ao_afstand=0.5)
            rod = tom("soe")
            led = samlet(rod, SØ, afstand=8, pr_række=4)
            færdig(rod, "soe", S(0, 9, 18), S(0, 1, -3), led)
        elif navn == "hav":
            nulstil(ao_afstand=0.8)
            rod = tom("hav")
            led = samlet(rod, {**HAV, "hval": hval}, afstand=16, pr_række=4)
            færdig(rod, "hav", S(0, 22, 46), S(0, 3, -8), led)
        elif navn == "grej":
            nulstil(ao_afstand=0.08)
            rod = tom("grej")
            led = samlet(rod, {"rulle": rulle, "spand": spand, "grejkasse": grejkasse}, afstand=0.8, pr_række=3)
            færdig(rod, "grej", S(0, 0.9, 1.6), S(0, 0, 0), led)
