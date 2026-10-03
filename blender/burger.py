# ===== Burgerløbet i Blender: kæmperne (manden, dinoen og monsteret) =====
# Kør:  blender --background --factory-startup --python blender/burger.py -- mand dino monster
# Gemmer spil/burgerloeb/modeller/<navn>.glb og et prøvebillede i blender/proever/.
#
# Tallene er spillets mål (x, op, frem) — S() vender dem om til Blender. Kæmperne vender mod kameraet.
# Led, som spillet bevæger: hoved · oeje_v/oeje_h (med hvide_* og pupil_*) · bryn_v/bryn_h · kind_v/kind_h
#                           mund (tom: munden laves i spillet) · haand_v/haand_h · mave

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tegnestue import *
from tegnestue import _blød, _læg_fast
from mathutils import Vector

UD = os.path.join(ROD, "spil", "burgerloeb", "modeller")


def P(base, *d):
    """base + forskydning (begge i spillets mål) → Blender"""
    return S(base[0] + d[0], base[1] + d[1], base[2] + d[2])


# ---------- Fælles dele ----------
def øje(navn, hoved, sted, r, farve_pupil="#1d140c"):
    """Et øje med hvide og pupil; pupillen kigger mod kameraet (spillet drejer den efter burgeren)"""
    led = tom("oeje_" + navn, S(*sted), hoved)
    h = ellipsoide("hvide_" + navn, S(*sted), r, "#ffffff", ("glans", 0.15))
    sæt_forælder(h, led)
    pled = tom("pupil_" + navn, P(sted, 0, 0, r * 0.62), led)
    def pupilfarve(p, n):                                      # et lille hvidt glimt i pupillen
        lok = Vector(p) - Vector(P(sted, -r * 0.18, r * 0.2, r * 0.62 + r * 0.42))
        return "#ffffff" if lok.length < r * 0.16 else farve_pupil
    pu = ellipsoide("pupilkugle_" + navn, P(sted, 0, 0, r * 0.62), (r * 0.5, r * 0.42, r * 0.5), pupilfarve, ("glans", 0.15), seg=24, ring=14)
    sæt_forælder(pu, pled)
    return led


def hånd(navn, sted, hud, kniv, str_=1.0):
    """En hånd, der holder om en gaffel (venstre) eller en kniv (højre)"""
    led = tom("haand_" + navn, S(*sted))
    q = lambda *d: P(sted, *[x * str_ for x in d])
    dele = [ellipsoide("haandflade_" + navn, q(0, 0, -0.15), (1.05 * str_, 1.0 * str_, 0.95 * str_), hud, "hud")]
    for i in range(4):                                          # fire fingre krummet om skaftet
        y = 0.55 - i * 0.36
        dele.append(pølse(f"finger{i}_{navn}", [q(-0.75, y, -0.1), q(-0.55, y, 0.75), q(0.15, y - 0.05, 0.95)],
                          [0.3 * str_, 0.28 * str_, 0.26 * str_], hud, "hud"))
    dele.append(pølse("tommel_" + navn, [q(0.6, 0.3, 0.2), q(0.75, 0.75, 0.75), q(0.35, 0.95, 1.0)], [0.3 * str_, 0.27 * str_, 0.24 * str_], hud, "hud"))
    metal = ("metal", 0.3, 0.85)
    dele.append(kegle("skaft_" + navn, q(0, -0.9, 0.4), q(0, 4.6, 0.4), 0.2 * str_, 0.17 * str_, "#c9d1dc", metal))
    if not kniv:                                                # gaffel: hals og fire tænder
        dele.append(kegle("gaffelhals_" + navn, q(0, 4.5, 0.4), q(0, 5.3, 0.4), 0.17 * str_, 0.5 * str_, "#c9d1dc", metal))
        for t in range(4):
            x = (t - 1.5) * 0.24
            dele.append(pølse(f"tand{t}_" + navn, [q(x, 5.2, 0.4), q(x, 6.8, 0.4)], [0.08 * str_, 0.06 * str_], "#c9d1dc", metal, glathed=1))
    else:                                                       # kniv: et fladt blad med rund spids
        blad = ellipsoide("blad_" + navn, q(0.15, 6.0, 0.4), (0.45 * str_, 0.07 * str_, 1.7 * str_), "#dfe5ee", metal)
        skub(blad, q(0.15, 4.4, 0.4), 1.2 * str_, S(-0.1, 0, 0))
        dele.append(blad)
    for d in dele: sæt_forælder(d, led)
    return led


# ---------- Manden med overskæg og ternet serviet ----------
def lav_mand():
    rod = tom("kaempe_mand")
    HUD, BRUN = "#f5c19c", "#6b3f1d"
    # maven i en stribet skjorte, med en ternet serviet
    mave_led = tom("mave", S(0, 0.6, -2.4), rod)
    def skjorte(p, n):                                            # bløde lodrette striber
        a = math.atan2(p[0], -(p[1] + 2.4))
        return bland("#3d8bd9", "#8cc0f0", trin(0.4, 0.25, math.sin(a * 16)))
    mave = ellipsoide("mavekrop", S(0, 0.6, -2.4), 5.4, skjorte, seg=112, ring=32)
    sæt_forælder(mave, mave_led)
    def tern(p, n):                                               # røde og hvide tern med bløde kanter
        tx, tz = math.sin(p[0] / 0.55 * math.pi), math.sin(p[2] / 0.55 * math.pi)
        return bland("#ffffff", "#e8463a", trin(0, 0.35, tx * tz))
    serviet = ellipsoide("serviet", S(0, 1.0, 2.75), (2.4, 0.35, 1.9), tern, seg=56, ring=28)
    skub(serviet, S(0, -0.9, 2.9), 1.4, S(0, -0.7, 0))          # spids forneden
    sæt_forælder(serviet, mave_led)
    # hovedet
    H = (0, 4.6, 0)
    hoved = tom("hoved", S(*H), rod)
    def hudfarve(p, n):                                           # lidt rødme i kinderne
        for s in (-1, 1):
            if (Vector(p) - Vector(P(H, s * 2.3, -0.85, 2.9))).length < 1.25: return "#f7a99a"
        return HUD
    kranie = ellipsoide("kranie", S(*H), (4.0, 3.95, 4.1), hudfarve, "hud", seg=48, ring=32)
    skub(kranie, P(H, 0, -3.4, 2.0), 1.8, S(0, -0.25, 0.35))   # hage
    for s in (-1, 1): bul(kranie, P(H, s * 2.4, -0.9, 2.9), 1.5, 0.3)   # buttede kinder
    dele = [kranie]
    for s in (-1, 1):                                             # ører
        øre = ellipsoide(f"oere{s}", P(H, s * 3.95, 0.1, -0.2), (0.55, 1.0, 0.85), lambda p, n, s=s: "#e8a283" if abs(p[0]) > 4.25 else HUD, "hud")
        dele.append(øre)
    random.seed(4)
    for i in range(46):                                           # krøllet hår på toppen og bagpå
        el = random.uniform(0.25, 1.45); az = random.uniform(-math.pi, math.pi)
        if el < 0.95 and abs(az) < 1.05: continue                 # ikke ned i ansigtet
        r = 3.75
        x, y, z = math.sin(az) * math.cos(el) * r, math.sin(el) * r, math.cos(az) * math.cos(el) * r
        if z > 1.6 and y < 3.2: continue
        dele.append(ellipsoide(f"kroelle{i}", P(H, x, y, z), random.uniform(0.8, 1.15), random.choice(["#6b3f1d", "#5a3417", "#7a4a24"]), seg=14, ring=9))
    dele.append(ellipsoide("naese", P(H, 0, -0.3, 4.0), (0.95, 0.8, 0.85), "#ee9d7e", ("glans", 0.35)))
    for s in (-1, 1):                                             # buskede overskægskrøller
        dele.append(pølse(f"skaeg{s}", [P(H, s * 0.05, -1.05, 4.05), P(H, s * 0.9, -1.25, 3.9), P(H, s * 1.7, -1.0, 3.5), P(H, s * 2.3, -0.4, 3.05)],
                          [0.45, 0.58, 0.45, 0.2], BRUN))
    for d in dele: sæt_forælder(d, hoved)
    # kinder (pustes op, når han tygger), øjne og bryn
    for navn, s in (("v", -1), ("h", 1)):
        k = ellipsoide("kind_" + navn, P(H, s * 2.35, -0.8, 2.85), 0.95, "#ff9e9e", "hud")
        sæt_forælder(k, hoved)
        ø = øje(navn, hoved, (H[0] + s * 1.45, H[1] + 0.9, H[2] + 3.35), 0.85)
        bryn = tom("bryn_" + navn, P(H, s * 1.45, 2.0, 3.25), ø)
        b = pølse("brynhaar_" + navn, [P(H, s * 0.75, 1.9, 3.45), P(H, s * 1.45, 2.15, 3.35), P(H, s * 2.15, 1.95, 3.05)], [0.2, 0.28, 0.18], BRUN)
        sæt_forælder(b, bryn)
    tom("mund", P(H, 0, -2.05, 3.5), hoved)
    # hænder med gaffel og kniv
    for navn, s in (("v", -1), ("h", 1)):
        led = hånd(navn, (s * 6.2, 1.6, 1.5), HUD, kniv=s > 0)
        sæt_forælder(led, rod)
    return rod


# ---------- Dinoen: grøn, med pigge, spidse tænder (laves i spillet) og bittesmå arme ----------
def lav_dino():
    rod = tom("kaempe_dino")
    GRØN, LYS, ORANGE, MØRK = "#5cbf4a", "#d9f2a0", "#ff9f1c", "#2e6b25"
    def plettet(p, n, base=GRØN):                               # små mørkere pletter på ryggen
        v = math.sin(p[0] * 2.1) * math.sin(p[1] * 2.3 + 1) * math.sin(p[2] * 1.9 + 2)
        return bland(base, "#4aa63b", trin(0.45, 0.2, v))
    mave_led = tom("mave", S(0, 0.2, -2.6), rod)
    def mavefarve(p, n):                                          # lys mave foran
        foran = -(p[1]) - (-2.6) * -1                             # spillets z i forhold til mavens midte
        z = -p[1] + 2.6
        return bland(GRØN, LYS, trin(2.6, 1.2, z) * trin(-3.0, 1.0, -abs(p[0]))) if z > 1.5 else plettet(p, n)
    mave = ellipsoide("mavekrop", S(0, 0.2, -2.6), 5.2, mavefarve, seg=64, ring=32)
    sæt_forælder(mave, mave_led)
    for i in range(6):                                            # pigge ned ad ryggen
        a = -0.75 + i * 0.32
        top = Vector(S(0, 0.2 + math.cos(a) * 5.05, -2.6 - math.sin(a) * 5.05))
        ud = (top - Vector(S(0, 0.2, -2.6))).normalized()
        sæt_forælder(kegle(f"rygpig{i}", top - ud * 0.3, top + ud * 1.7, 0.75, 0.05, ORANGE), mave_led)
    H = (0, 5.2, 0.3)
    hoved = tom("hoved", S(*H), rod)
    kranie = ellipsoide("kranie", S(*H), (3.6, 3.5, 3.15), lambda p, n: plettet(p, n), seg=48, ring=32)
    def snudefarve(p, n):
        return bland(GRØN, LYS, trin(-1.6, 0.6, -(p[2] - (H[1] - 1.2))) * 0.8)
    snude = ellipsoide("snude", P(H, 0, -1.2, 2.4), (2.9, 2.3, 1.75), snudefarve, seg=48, ring=28)
    dele = [kranie, snude]
    for s in (-1, 1):
        dele.append(ellipsoide(f"naesebor{s}", P(H, s * 0.7, -0.62, 4.45), (0.28, 0.2, 0.2), MØRK))
        dele.append(pølse(f"oejenbue{s}", [P(H, s * 0.9, 2.25, 2.35), P(H, s * 1.65, 2.55, 2.25), P(H, s * 2.45, 2.2, 1.8)], [0.32, 0.42, 0.28], GRØN))
    for i in range(4):                                            # pigge på hovedet
        top = Vector(P(H, 0, 3.0 - i * 0.25, 1.4 - i * 1.25))
        sæt_forælder(kegle(f"hovedpig{i}", top - Vector(S(0, 0.6, 0)), top + Vector(S(0, 1.1 - i * 0.12, -0.3)), 0.6 - i * 0.07, 0.04, ORANGE), hoved)
    for d in dele: sæt_forælder(d, hoved)
    for navn, s in (("v", -1), ("h", 1)):
        øje(navn, hoved, (H[0] + s * 1.65, H[1] + 1.4, H[2] + 2.45), 0.98)
    tom("mund", P(H, 0, -1.8, 4.1), hoved)
    # bittesmå T-rex-arme med kniv og gaffel
    for navn, s in (("v", -1), ("h", 1)):
        led = hånd(navn, (s * 2.9, 2.6, 3.2), GRØN, kniv=s > 0, str_=0.55)
        arm = pølse("arm_" + navn, [S(s * 2.3, 3.6, 1.9), S(s * 2.7, 3.0, 2.8), S(s * 2.9, 2.6, 3.15)], [0.6, 0.45, 0.4], GRØN)
        sæt_forælder(arm, led)
        sæt_forælder(led, rod)
    return rod


# ---------- Monsteret: lilla og pjusket, med ét stort øje, horn og to hugtænder (laves i spillet) ----------
def lav_monster():
    rod = tom("kaempe_monster")
    LILLA, PLET, HORN = "#9b5de5", "#c39bff", "#fff2c8"
    random.seed(7)
    def pletter(midt):
        pl = [Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))).normalized() for _ in range(14)]
        def f(p, n):
            d = (Vector(p) - Vector(midt)).normalized()
            t = max(trin(0.965, 0.02, d.dot(q)) for q in pl)
            return bland(LILLA, PLET, t)
        return f
    def pjusk(o, antal, r):                                       # små tjavser i pelsen
        for _ in range(antal):
            v = random.choice(o.data.vertices)
            bul(o, o.location + v.co, r, random.uniform(0.12, 0.28))
    mave_led = tom("mave", S(0, 0.4, -2.2), rod)
    mave = ellipsoide("mavekrop", S(0, 0.4, -2.2), 5.6, pletter(S(0, 0.4, -2.2)), seg=64, ring=36)
    pjusk(mave, 70, 0.9)
    sæt_forælder(mave, mave_led)
    H = (0, 4.8, 0)
    hoved = tom("hoved", S(*H), rod)
    kranie = ellipsoide("kranie", S(*H), 4.2, pletter(S(*H)), seg=56, ring=36)
    pjusk(kranie, 40, 0.8)
    dele = [kranie]
    for s in (-1, 1):                                             # buede horn
        dele.append(pølse(f"horn{s}", [P(H, s * 2.0, 3.2, 0.2), P(H, s * 2.9, 4.4, 0.0), P(H, s * 3.3, 5.6, -0.6), P(H, s * 3.0, 6.4, -1.1)],
                          [0.7, 0.5, 0.3, 0.06], HORN))
        dele.append(ellipsoide(f"oere{s}", P(H, s * 4.0, 1.4, -0.3), (0.5, 0.9, 1.1), LILLA))
    dele.append(pølse("bryn", [P(H, -1.6, 3.05, 2.75), P(H, 0, 3.35, 3.25), P(H, 1.6, 3.05, 2.75)], [0.3, 0.38, 0.3], "#5b2d99"))
    for d in dele: sæt_forælder(d, hoved)
    øje("v", hoved, (H[0], H[1] + 1.2, H[2] + 3.15), 1.45)
    tom("mund", P(H, 0, -1.65, 3.6), hoved)
    for navn, s in (("v", -1), ("h", 1)):
        led = hånd(navn, (s * 6.6, 1.6, 1.5), LILLA, kniv=s > 0)
        sæt_forælder(led, rod)
    return rod


# ---------- Burgerens lag (bunden af hvert lag er i højde 0) ----------
def _flad(navn, punkt_fn, nx, ny_, tyk, farve, mat="blød"):
    """En tynd plade (ost, salat, bacon) af et gitter. punkt_fn(u, v) → spillets mål (x, op, frem)"""
    bm = bmesh.new()
    rækker = [[bm.verts.new(S(*punkt_fn(i / nx, j / ny_))) for j in range(ny_ + 1)] for i in range(nx + 1)]
    for i in range(nx):
        for j in range(ny_):
            bm.faces.new((rækker[i][j], rækker[i + 1][j], rækker[i + 1][j + 1], rækker[i][j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    me = bpy.data.meshes.new(navn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(navn, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(materiale(*mat) if isinstance(mat, tuple) else materiale(mat))
    sol = o.modifiers.new("tyk", "SOLIDIFY"); sol.thickness = tyk; sol.offset = 0
    _læg_fast(o)
    for f in o.data.polygons: f.use_smooth = True
    farv(o, farve)
    return o


def lav_lag():
    rod = tom("lag")
    random.seed(11)
    def led(navn, dele):
        l = tom(navn, (0, 0, 0), rod)
        for d in dele: sæt_forælder(d, l)
    # bundbolle: rund kant og en lys snitflade
    bund = cylinder("bundbolle", S(0, 0.17, 0), 0.67, 0.34, lambda p, n: "#f6dcaa" if n.z > 0.8 and p[2] > 0.3 else bland("#c47a2c", "#e8a04e", p[2] / 0.34), rund=0.12, seg=40)
    led("bund", [bund])
    # topbolle: en kuppel med sesamfrø
    top = ellipsoide("topbolle", S(0, 0.0, 0), (0.7, 0.7, 0.55), lambda p, n: bland("#c9792c", "#f0b062", p[2] / 0.4) if p[2] > 0.02 else "#f6dcaa", ("bolle", 0.45), seg=40, ring=24)
    for v in top.data.vertices:
        if v.co.z < 0: v.co.z *= 0.12
    top.data.update()
    frø = []
    for i in range(26):
        a = i * 2.39996; r = 0.12 + (i % 7) * 0.075
        z = 0.55 * math.sqrt(max(0, 1 - (r / 0.72) ** 2))
        frø.append(ellipsoide(f"froe{i}", (math.cos(a) * r, math.sin(a) * r, z + 0.005), (0.05, 0.026, 0.02), "#fff3d6", seg=10, ring=6, rot=(0, -math.atan2(r, z) * 0.8, a)))
    led("top", [top] + frø)
    # bøf: knoldet, mørkebrun med lysere krummer
    bøf = cylinder("boefkoed", S(0, 0.11, 0), 0.66, 0.22, lambda p, n: bland("#4a2410", "#7a4422", trin(0.3, 0.3, math.sin(p[0] * 31) * math.sin(p[1] * 27))), rund=0.07, seg=40)
    for _ in range(40):
        v = random.choice(bøf.data.vertices); bul(bøf, bøf.location + v.co, 0.12, random.uniform(-0.02, 0.025))
    led("boef", [bøf])
    # ost: firkantet skive med hængende hjørner
    def ostpunkt(u, v):
        x, z = (u - 0.5) * 1.3, (v - 0.5) * 1.3
        a = math.pi / 4; xr, zr = x * math.cos(a) - z * math.sin(a), x * math.sin(a) + z * math.cos(a)
        return (xr, 0.05 - 1.3 * max(0, math.hypot(xr, zr) - 0.6) ** 2, zr)
    led("ost", [_flad("osteskive", ostpunkt, 14, 14, 0.04, "#ffc928", ("ost", 0.35, 0, 0.3))])
    # salat: rund og kruset i kanten
    def salatpunkt(u, v):
        r, a = max(u, 0.02) * 0.82, v * math.tau
        return (math.cos(a) * r, 0.05 + 0.07 * math.sin(a * 11) * (r / 0.82) ** 2 + 0.02 * math.sin(a * 23) * (r / 0.82) ** 3, math.sin(a) * r)
    led("salat", [_flad("salatblad", salatpunkt, 10, 72, 0.025, lambda p, n: bland("#3f9f2a", "#9be05a", math.hypot(p[0], p[1]) / 0.8))])
    # tomat: to skiver med lyst kød og kerner
    dele = []
    for x in (-0.3, 0.3):
        def tomatfarve(p, n, x=x):
            d = math.hypot(p[0] - x, p[1])
            if n.z < 0.7: return "#d42a17"
            if d > 0.29: return "#e0301e"
            if 0.12 < d < 0.22 and math.sin(math.atan2(p[1], p[0] - x) * 6) > 0.4: return "#ffe08a"
            return "#ff7a5c"
        dele.append(cylinder(f"tomat{x}", S(x, 0.045, 0), 0.36, 0.09, tomatfarve, ("blank", 0.3), rund=0.02, seg=32))
    led("tomat", dele)
    # løg: tre ringe
    led("loeg", [torus(f"loeg{i}", S(x, 0.045, z), 0.22, 0.045, "#f2e6ff", seg=28, tseg=8) for i, (x, z) in enumerate([(-0.35, 0.1), (0.3, 0.18), (0, -0.3)])])
    # agurk: fire skiver med kerner
    dele = []
    for i, (x, z) in enumerate([(-0.35, 0), (0.1, 0.3), (0.3, -0.25), (-0.05, -0.2)]):
        def agurkfarve(p, n, x=x, z=z):
            d = math.hypot(p[0] - x, p[1] + z)
            if n.z < 0.7 or d > 0.17: return "#2f7a28"
            return "#e9f7d2" if abs(d - 0.09) < 0.02 and math.sin(math.atan2(p[1] + z, p[0] - x) * 5) > 0.5 else "#bfe39b"
        dele.append(cylinder(f"agurk{i}", S(x, 0.025, z), 0.2, 0.05, agurkfarve, rund=0.012, seg=24))
    led("agurk", dele)
    # bacon: to bølgede strimler med fedtstriber
    dele = []
    for zz in (-0.17, 0.17):
        def baconpunkt(u, v, zz=zz):
            x = (u - 0.5) * 1.45
            return (x, 0.04 + 0.035 * math.sin(x * 9), zz + (v - 0.5) * 0.28)
        dele.append(_flad(f"bacon{zz}", baconpunkt, 30, 4, 0.03, lambda p, n, zz=zz: bland("#b8392a", "#f7c3b0", trin(0, 0.06, 0.035 - abs(-p[1] - zz)))))
    led("bacon", dele)
    # æg: en blød hvid klat med en blank blomme
    hvid = cylinder("aeggehvide", S(0, 0.03, 0), 0.62, 0.05, "#ffffff", rund=0.02, seg=40)
    for _ in range(14):
        v = random.choice(hvid.data.vertices); skub(hvid, hvid.location + v.co, 0.25, (v.co.x * 0.08, v.co.y * 0.08, 0))
    blomme = ellipsoide("blomme", S(0.08, 0.05, 0.05), (0.25, 0.25, 0.16), "#ffb000", ("blank", 0.2), seg=24, ring=12)
    for v in blomme.data.vertices:
        if v.co.z < 0: v.co.z *= 0.2
    blomme.data.update()
    led("aeg", [hvid, blomme])
    return rod


# ---------- Den lille løber: en bundbolle med ben og røde sko (den løber mod -z, væk fra kameraet) ----------
def lav_løber():
    rod = tom("loeber")
    bund = cylinder("loeberbolle", S(0, 0.59, 0), 0.67, 0.34, lambda p, n: "#f6dcaa" if n.z > 0.8 and p[2] > 0.75 else bland("#c47a2c", "#e8a04e", (p[2] - 0.42) / 0.34), rund=0.12, seg=40)
    b = tom("bund", S(0, 0.42, 0), rod); sæt_forælder(bund, b)
    for navn, s in (("v", -1), ("h", 1)):
        hofte = tom("ben_" + navn, S(s * 0.26, 0.44, 0), rod)
        ben = pølse("benet_" + navn, [S(s * 0.26, 0.46, 0), S(s * 0.26, 0.16, 0)], [0.06, 0.05], "#f2b08a", glathed=1)
        sko = ellipsoide("sko_" + navn, S(s * 0.26, 0.09, -0.07), (0.15, 0.24, 0.11), "#ff3b5c", ("blank", 0.3), seg=24, ring=14)
        skub(sko, S(s * 0.26, 0.13, -0.27), 0.15, S(0, 0.03, 0))
        sål = ellipsoide("saal_" + navn, S(s * 0.26, 0.03, -0.07), (0.16, 0.26, 0.04), "#ffffff", seg=24, ring=10)
        snøre = torus("snoere_" + navn, S(s * 0.26, 0.18, -0.13), 0.06, 0.015, "#ffffff", rot=(-0.6, 0, 0), seg=16, tseg=6)
        for d in (ben, sko, sål, snøre): sæt_forælder(d, hofte)
    return rod


def færdig(rod, navn, kamera=S(-12, 9, 24), mål=S(0, 3.5, 0), gem=True):
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    pupiller = [o for o in meshes if o.name.startswith("pupilkugle")]
    ao(meshes, styrke=0.55, skjul=lambda o: pupiller if o.name.startswith("hvide") else ())   # pupillerne flytter sig
    prøve(f"burger_{navn}.png", kamera, mål)
    if gem: eksportér([rod], os.path.join(UD, f"{navn}.glb"))


if __name__ == "__main__":
    hvilke = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["mand", "dino", "monster", "lag", "loeber"]
    for navn in hvilke:
        nulstil(ao_afstand=1.2 if navn in ("mand", "dino", "monster") else 0.3)
        rod = {"mand": lav_mand, "dino": lav_dino, "monster": lav_monster, "lag": lav_lag, "loeber": lav_løber}[navn]()
        if navn == "lag":                                          # læg lagene på række til prøvebilledet, og saml dem igen
            lagene = list(rod.children)
            for i, b in enumerate(lagene): b.location = S((i % 5) * 1.6 - 3.2, 0, (i // 5) * -1.8)
            færdig(rod, navn, kamera=S(0, 4.5, 4.5), mål=S(0, 0, -0.9), gem=False)
            for b in lagene: b.location = (0, 0, 0)
            eksportér([rod], os.path.join(UD, "lag.glb"))
        elif navn == "loeber":
            færdig(rod, navn, kamera=S(-1.6, 1.2, -2.4), mål=S(0, 0.4, 0))
        else:
            færdig(rod, navn)
