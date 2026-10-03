# ===== Fjollet Slange i Blender: hovedet, maden, hattene og pynten i verdenerne =====
# Kør:  blender --background --factory-startup --python blender/slange.py -- hoved mad hatte pynt
# Gemmer spil/slange/modeller/<navn>.glb og et prøvebillede i blender/proever/.
#
# Tallene er spillets mål (x, op, frem) — S() vender dem om til Blender.
# Hovedets led: oeje_v/oeje_h (med hvide_*, pupil_* og laag_*) · tunge · hatplads.
# Materialet "hud" er hvidt med skygger: spillet farver det grønt (eller i regnbuens farver).
# Materialet "tone" farves også i spillet (blomster, søstjerner, glasur i forskellige farver).

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tegnestue import *
from tegnestue import _læg_fast
from mathutils import Vector, Euler

UD = os.path.join(ROD, "spil", "slange", "modeller")
HUD = ("hud", 0.4)
TONE = ("tone", 0.45)


def P(base, *d):
    return S(base[0] + d[0], base[1] + d[1], base[2] + d[2])


def drejet(o, rot):
    """Drej figuren om sit eget midtpunkt (rot i Blenders akser)"""
    o.data.transform(Euler(rot).to_matrix().to_4x4()); o.data.update()
    return o


def blad(navn, c, længde, bredde, rot, farve="#3fae3a", lys="#7fd65a"):
    """Et blad, der starter i c og peger ud langs x, før det drejes (rot i Blenders akser)"""
    n = 10
    omrids = [(længde * i / n, bredde / 2 * math.sin(math.pi * i / n) ** 0.8) for i in range(n + 1)]
    omrids += [(længde * i / n, -bredde / 2 * math.sin(math.pi * i / n) ** 0.8) for i in range(n - 1, 0, -1)]
    o = plade(navn, omrids, 0.02, lambda p, nn: bland(lys, farve, trin(0.012, 0.02, abs(p[1] - c[1]))), ringe=3, plan="xz", c=c, midt=(længde * 0.45, 0))
    return drejet(o, rot)


def på_flade(o, fn, antal, lav, frø=1):
    """Sæt små ting (frø, krymmel, chokolade) på overfladen af o, hvor fn(x, y, z, normal) siger ja"""
    random.seed(frø)
    punkter = [(o.location + v.co, v.normal.copy()) for v in o.data.vertices]
    punkter = [(p, n) for p, n in punkter if fn(*G(p), n)]
    return [lav(i, *random.choice(punkter)) for i in range(min(antal, len(punkter)))]


# ---------- Hovedet ----------
def lav_hoved():
    rod = tom("hoved")
    pletter = [Vector(v) for v in [(0.0, 0.5, -0.2), (0.3, 0.38, -0.45), (-0.32, 0.36, -0.42), (0.0, 0.3, -0.62),
                                    (0.52, 0.12, -0.3), (-0.52, 0.14, -0.28), (0.18, 0.5, 0.05), (-0.2, 0.48, -0.02)]]
    def hudfarve(p, n):                                         # runde, mørkere pletter på toppen og bagpå
        d = min((Vector(G(p)) - q).length for q in pletter)
        return bland("#a8bba8", "#ffffff", trin(0.11, 0.05, d))
    dele = [ellipsoide("kranie", S(0, 0, 0), (0.65, 0.74, 0.53), hudfarve, HUD, seg=48, ring=32),
            ellipsoide("snude", S(0, -0.08, 0.45), (0.48, 0.38, 0.29), hudfarve, HUD, seg=48, ring=28)]
    for navn, s in (("v", -1), ("h", 1)):
        dele.append(ellipsoide("oejenhule_" + navn, S(s * 0.3, 0.33, 0.22), (0.3, 0.28, 0.16), hudfarve, HUD))   # øjnene sidder i en lille bule
        dele.append(ellipsoide("naesebor_" + navn, S(s * 0.14, 0.0, 0.79), (0.05, 0.035, 0.035), "#1f5a24", ("mørk", 0.5)))
        dele.append(ellipsoide("kind_" + navn, S(s * 0.41, -0.1, 0.665), (0.12, 0.04, 0.08), "#ff8fb0", ("kind", 0.5), rot=(0, 0, s * 0.75)))
    # smilet følger snudens overflade
    smil = []
    for i in range(9):
        x = (i / 8 - 0.5) * 0.62
        y = -0.17 + 0.09 * (x / 0.31) ** 2
        z = 0.45 + 0.38 * math.sqrt(max(0.0, 1 - (x / 0.48) ** 2 - ((y + 0.08) / 0.29) ** 2)) + 0.005
        smil.append(S(x, y, z))
    dele.append(pølse("smil", smil, [0.022] + [0.03] * 7 + [0.022], "#1f5a24", ("mørk", 0.5), glathed=1))
    for d in dele: sæt_forælder(d, rod)
    # googly-øjne: hvide, pupil (spillet flytter den) og et øjenlåg til at blinke
    for navn, s in (("v", -1), ("h", 1)):
        E = (s * 0.3, 0.42, 0.22)
        led = tom("oeje_" + navn, S(*E), rod)
        sæt_forælder(ellipsoide("hvide_" + navn, S(*E), 0.26, "#ffffff", ("glans", 0.15), seg=32, ring=20), led)
        pled = tom("pupil_" + navn, P(E, 0, 0.15, 0.1), led)
        def pupilfarve(p, n, E=E):
            return "#ffffff" if (Vector(G(p)) - Vector((E[0] + 0.05, E[1] + 0.21, E[2] + 0.2))).length < 0.05 else "#111111"
        sæt_forælder(ellipsoide("pupilkugle_" + navn, P(E, 0, 0.15, 0.1), 0.14, pupilfarve, ("glans", 0.15), seg=24, ring=16), pled)
        låg = klip(ellipsoide("laag_" + navn, S(*E), 0.275, hudfarve, HUD, seg=32, ring=20), lambda x, y, z: y < -0.01)
        sæt_forælder(låg, led)
    # den kløftede tunge (spillet strækker den ud og ind)
    T = (0, -0.18, 0.72)
    tled = tom("tunge", S(*T), rod)
    tunge = [pølse("tungestang", [P(T, 0, 0, 0), P(T, 0, 0, 0.44)], [0.035, 0.03], "#ff3b5c", ("tunge", 0.3), glathed=1)]
    for s in (-1, 1):
        tunge.append(pølse(f"tungespids{s}", [P(T, 0, 0, 0.42), P(T, s * 0.04, 0, 0.53), P(T, s * 0.08, 0, 0.62)], [0.028, 0.022, 0.012], "#ff3b5c", ("tunge", 0.3), glathed=1))
    for d in tunge: sæt_forælder(d, tled)
    tom("hatplads", S(0, 0.5, -0.05), rod)
    return rod


# ---------- Maden (hver ret er ca. 1 enhed stor og står på jorden i y = 0) ----------
def æble():
    def farve(p, n):
        x, y, z = G(p)
        v = math.sin(math.atan2(z, x) * 7 + y * 4) * 0.5 + 0.5
        return bland("#cf1a2c", "#ff6a3c", v * 0.55 * trin(0.35, 0.5, y))
    k = ellipsoide("æblekrop", S(0, 0.42, 0), (0.45, 0.45, 0.41), farve, ("glans", 0.3), seg=40, ring=28)
    bul(k, S(0, 0.83, 0), 0.24, -0.1); bul(k, S(0, 0.01, 0), 0.2, -0.05)
    return [k, pølse("æblestilk", [S(0, 0.72, 0), S(0.03, 0.9, 0), S(0.08, 0.99, 0)], [0.035, 0.03, 0.022], "#6e4520", glathed=1),
            blad("æbleblad", S(0.04, 0.88, 0), 0.34, 0.16, (0, -0.5, 0.4))]


def banan():
    pts = [(-0.52, 0.64), (-0.38, 0.38), (-0.18, 0.22), (0.0, 0.18), (0.18, 0.22), (0.38, 0.38), (0.52, 0.64)]
    b = pølse("banan", [S(x, y, 0) for x, y in pts], [0.045, 0.12, 0.155, 0.165, 0.155, 0.12, 0.045],
              lambda p, n: "#5a3a1a" if abs(p[0]) > 0.5 else bland("#ffd93b", "#a8d040", trin(0.42, 0.12, abs(p[0]))), ("glans", 0.1))
    for v in b.data.vertices: v.co.y *= 0.85                    # lidt flad, som en rigtig banan
    b.data.update()
    return [b]


def jordbær():
    jb = ellipsoide("jordbær", S(0, 0.44, 0), (0.4, 0.4, 0.44), lambda p, n: bland("#d60f2a", "#ff4050", trin(0.55, 0.4, p[2])), ("glans", 0.25), seg=40, ring=28)
    for v in jb.data.vertices:                                   # bred foroven, spids forneden
        k = 0.45 + 0.55 * min(1.0, (v.co.z + 0.44) / 0.62) ** 0.7
        v.co.x *= k; v.co.y *= k
    jb.data.update()
    frø = på_flade(jb, lambda x, y, z, n: 0.08 < y < 0.74, 46,
                   lambda i, p, n: ellipsoide(f"jordbærfrø{i}", p - n * 0.006, (0.022, 0.022, 0.03), "#fff3a0", seg=8, ring=6), frø=5)
    blade = [blad(f"jordbærblad{i}", S(0, 0.86, 0), 0.3, 0.13, (0, -0.35, i / 6 * math.tau)) for i in range(6)]
    return [jb, pølse("jordbærstilk", [S(0, 0.84, 0), S(0.02, 0.98, 0)], [0.035, 0.025], "#3f8a2a", glathed=1)] + frø + blade


def vandmelon():
    R = 0.55
    omrids = [(math.cos(a) * R, math.sin(a) * R) for a in [math.pi + i / 28 * math.pi for i in range(29)]]
    omrids += [(R - i / 6 * 2 * R, 0) for i in range(1, 6)]
    def farve(p, n):
        x, y = p[0], p[2] - 0.62
        d = math.hypot(x, y)
        if d > R - 0.04: return bland("#1d6e24", "#5cbf3a", trin(0, 0.7, math.sin(math.atan2(y, x) * 16)))
        if d > R - 0.1: return "#e6f7cf"
        return bland("#ff3d55", "#ff6a74", trin(0, 0.6, math.sin(x * 23) * math.sin(y * 19)))
    skive = plade("vandmelon", omrids, 0.2, farve, ("blank", 0.35), ringe=8, plan="xy", c=S(0, 0.62, 0), rund=0.03, midt=(0, -0.02))
    kerner = []
    for side in (-1, 1):
        for i, a in enumerate([math.pi + 0.45 + k * 0.37 for k in range(7)]):
            r = 0.3 + (i % 2) * 0.08
            kerner.append(ellipsoide(f"kerne{side}{i}", S(math.cos(a) * r, 0.62 + math.sin(a) * r, side * 0.1), (0.022, 0.012, 0.04), "#1a1a1a",
                                     ("blank", 0.2), seg=10, ring=6, rot=(0, math.atan2(math.cos(a), math.sin(a)), 0)))
    return [skive] + kerner


def donut(navn="donut", glasur="#ff8fd0", str_=1.0, krymmel=True, mat_glasur=("glasur", 0.25)):
    R, r = 0.34 * str_, 0.17 * str_
    dej = torus(navn + "dej", S(0, r * 1.15, 0), R, r, lambda p, n: bland("#c98a4a", "#e8b070", p[2] / (r * 2)), seg=48, tseg=20)
    gl = torus(navn + "glasur", S(0, r * 1.15, 0), R, r * 1.06, glasur, mat_glasur, seg=48, tseg=20)
    klip(gl, lambda x, y, z: y < -0.02 * str_ + 0.035 * str_ * math.sin(math.atan2(z, x) * 7))   # glasuren løber lidt ned
    dele = [dej, gl]
    if krymmel:
        F = ["#ffffff", "#ffd23f", "#5fd3ff", "#8aff7a", "#b15bff"]
        def drys(i, p, n):
            t = Vector((random.uniform(-1, 1), random.uniform(-1, 1), 0)).normalized() * 0.04 * str_
            return pølse(f"{navn}krymmel{i}", [p + n * 0.01 - t, p + n * 0.01 + t], [0.016 * str_, 0.016 * str_], F[i % len(F)], ("glasur", 0.25), glathed=1)
        dele += på_flade(gl, lambda x, y, z, n: n.z > 0.55, 26, drys, frø=8)
    return dele


def cupcake(navn="cupcake", str_=1.0):
    q = str_
    profil = [(0, 0), (0.22 * q, 0), (0.24 * q, 0.02 * q)] + [(0.24 * q + 0.09 * q * t, (0.02 + 0.34 * t) * q) for t in [i / 8 for i in range(1, 9)]] + [(0.3 * q, 0.38 * q), (0, 0.38 * q)]
    papir = drej(navn + "papir", profil, lambda p, n: bland("#ff7ec0", "#ffb0d8", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 18))), seg=72)
    for v in papir.data.vertices:                                # riller i papiret
        a = math.atan2(v.co.y, v.co.x); k = 1 + 0.035 * math.cos(a * 18)
        v.co.x *= k; v.co.y *= k
    papir.data.update()
    # en snoet top af flødeskum
    spiral, radier = [], []
    for i in range(41):
        t = i / 40; a = t * math.tau * 2.6
        rr = 0.24 * (1 - t) ** 0.8 * q
        spiral.append(S(math.cos(a) * rr, (0.42 + 0.36 * t) * q, math.sin(a) * rr)); radier.append((0.13 - 0.07 * t) * q)
    top = pølse(navn + "creme", spiral, radier, lambda p, n: bland("#fff6fb", "#ffd0e8", trin(0.0, 0.5, math.sin(p[2] * 40 / q))), ("glans", 0.15))
    bær = ellipsoide(navn + "bær", S(0, 0.86 * q, 0), 0.1 * q, "#e8283c", ("blank", 0.2), seg=20, ring=14)
    stilk = pølse(navn + "bærstilk", [S(0, 0.94 * q, 0), S(0.04 * q, 1.04 * q, 0)], [0.015 * q, 0.012 * q], "#4a7a2a", glathed=1)
    return [papir, top, bær, stilk]


def is_():
    profil = [(0.0, 0.0)] + [(0.27 * t, 0.64 * t) for t in [i / 16 for i in range(1, 17)]] + [(0.29, 0.66), (0.0, 0.66)]
    def vaffel(p, n):
        x, y, z = G(p); a = math.atan2(z, x)
        g = min(abs(math.sin(a * 6 + y * 14)), abs(math.sin(a * 6 - y * 14)))
        return bland("#c8803a", "#eab872", trin(0.25, 0.2, g))
    kegle_ = drej("vaffel", profil, vaffel, seg=48)
    random.seed(4)
    kugler = []
    for i, (y, r, f) in enumerate([(0.8, 0.3, "#ffb0d8"), (1.08, 0.26, "#fff3c0")]):
        k = ellipsoide(f"iskugle{i}", S(0, y, 0), (r, r, r * 0.9), f, ("glans", 0.15), seg=36, ring=24)
        for _ in range(10):
            v = random.choice(k.data.vertices)
            if v.co.z < 0: bul(k, k.location + v.co, r * 0.35, r * 0.12)    # små klatter, der hænger ned
        kugler.append(k)
    return [kegle_] + kugler + [ellipsoide("iskirsebær", S(0, 1.37, 0), 0.075, "#e8283c", ("blank", 0.2), seg=16, ring=12)]


def ost():
    omrids = [(-0.45, -0.32), (0.52, 0.0), (-0.45, 0.32)]
    tæt = []
    for (a, b), (c, d) in zip(omrids, omrids[1:] + omrids[:1]):  # flere punkter langs kanten
        tæt += [(a + (c - a) * t / 6, b + (d - b) * t / 6) for t in range(6)]
    o = plade("ost", tæt, 0.4, lambda p, n: bland("#ffc93a", "#ffe07a", trin(0.0, 0.3, p[2] - 0.38)), ("ost", 0.55), ringe=5, plan="xz", c=S(0, 0.2, 0), rund=0.04)
    huller = [ellipsoide(f"ostehul{i}", S(x, 0.405, z), (r, r, 0.012), "#e09a18", seg=16, ring=8) for i, (x, z, r) in
              enumerate([(0.05, 0.06, 0.07), (-0.22, -0.1, 0.05), (0.24, -0.02, 0.045)])]
    for i, (t, y, r) in enumerate([(0.3, 0.22, 0.06), (0.62, 0.12, 0.05), (0.75, 0.28, 0.045)]):   # huller i den forreste side
        x, z = 0.52 - 0.97 * t, 0.32 * t
        huller.append(ellipsoide(f"ostesidehul{i}", S(x + 0.31 * 0.006, y, z + 0.95 * 0.006), (r, 0.012, r), "#e09a18", seg=16, ring=8, rot=(0, 0, 0.315)))
    huller.append(ellipsoide("ostebaghul", S(-0.455, 0.2, -0.08), (0.012, 0.06, 0.06), "#e09a18", seg=16, ring=8))
    return [o] + huller


def kirsebær():
    dele = []
    for s in (-1, 1):
        k = ellipsoide(f"kirsebær{s}", S(s * 0.2, 0.24, 0), (0.23, 0.22, 0.22), lambda p, n: bland("#a00a24", "#e0283c", trin(0.3, 0.3, p[2])), ("blank", 0.15), seg=32, ring=22)
        bul(k, S(s * 0.2, 0.47, 0), 0.1, -0.04)
        dele += [k, pølse(f"kirsebærstilk{s}", [S(s * 0.2, 0.44, 0), S(s * 0.12, 0.7, 0), S(0.02, 0.93, 0)], [0.02, 0.018, 0.016], "#4a7a2a", glathed=1)]
    return dele + [blad("kirsebærblad", S(0.02, 0.92, 0), 0.32, 0.15, (0.3, -0.4, 0.2))]


def småkage():
    k = cylinder("småkage", S(0, 0.5, 0), 0.42, 0.12, lambda p, n: bland("#c88a48", "#e8b56a", trin(0.25, 0.2, 0.42 - math.hypot(p[0], p[2] - 0.5))), rot=(math.pi / 2, 0, 0), seg=40, rund=0.04)
    random.seed(9)
    for _ in range(18):
        v = random.choice(k.data.vertices)
        bul(k, k.location + v.co, 0.12, random.uniform(-0.015, 0.02))
    chips = []
    for side in (-1, 1):
        for i, (x, y) in enumerate([(0.15, 0.1), (-0.2, 0.05), (0.05, -0.2), (-0.05, 0.25), (0.25, -0.12), (-0.22, -0.18)]):
            chips.append(ellipsoide(f"chokolade{side}{i}", S(x, 0.5 + y, side * 0.065), (0.055, 0.035, 0.05), "#4a2a14", seg=10, ring=8, rot=(0, random.uniform(0, 3), 0)))
    return [k] + chips


def gulerod():
    profil = [(0.0, 0.0)] + [(0.2 * t ** 0.8, 0.86 * t) for t in [i / 12 for i in range(1, 13)]] + [(0.17, 0.92), (0.0, 0.94)]
    g = drej("gulerod", profil, lambda p, n: bland("#ff8c1a", "#ffb04a", trin(0.6, 0.3, math.sin(p[2] * 38))), seg=32)
    top = [pølse(f"gulerodstop{i}", [S(0, 0.9, 0), S(math.cos(a) * 0.08, 1.1, math.sin(a) * 0.08), S(math.cos(a) * 0.16, 1.28, math.sin(a) * 0.16)],
                 [0.03, 0.025, 0.012], "#3fae3a", glathed=1) for i, a in enumerate([0, 2.1, 4.2])]
    return [g] + top + [blad(f"gulerodsblad{i}", S(math.cos(a) * 0.12, 1.15, math.sin(a) * 0.12), 0.22, 0.12, (0, -1.0, -a)) for i, a in enumerate([0.5, 2.6, 4.7])]


def pizza():
    tri = [(0, 0.62), (-0.4, -0.36), (0.4, -0.36)]
    tæt = []
    for (a, b), (c, d) in zip(tri, tri[1:] + tri[:1]):
        tæt += [(a + (c - a) * t / 8, b + (d - b) * t / 8) for t in range(8)]
    def farve(p, n):
        x, y = p[0], p[2] - 0.5
        return bland("#ffc93a", "#ff9a2a", trin(0.6, 0.3, math.sin(x * 21 + 1) * math.sin(y * 17)))
    p_ = plade("pizza", tæt, 0.07, farve, ("ost", 0.55), ringe=6, plan="xy", c=S(0, 0.5, 0), rund=0.02)
    kant = pølse("pizzakant", [S(-0.44, 0.13, 0), S(0, 0.11, 0), S(0.44, 0.13, 0)], [0.07, 0.08, 0.07], lambda p, n: bland("#c8803a", "#eab060", p[2] / 0.2))
    peb = []
    for side in (-1, 1):
        for i, (x, y) in enumerate([(0, 0.3), (-0.13, -0.05), (0.15, -0.1)]):
            peb.append(cylinder(f"pepperoni{side}{i}", S(x, 0.5 + y, side * 0.04), 0.085, 0.02,
                                lambda p, n: "#8a1a1a" if (math.sin(p[0] * 60) * math.sin(p[2] * 60)) > 0.7 else "#d8232e", rot=(math.pi / 2, 0, 0), seg=20, rund=0.006))
    return [p_, kant] + peb


MADER = {"æble": æble, "banan": banan, "jordbær": jordbær, "vandmelon": vandmelon, "donut": donut, "cupcake": cupcake,
         "is": is_, "ost": ost, "kirsebær": kirsebær, "småkage": småkage, "gulerod": gulerod, "pizza": pizza}


# ---------- Hattene (hovedets top er i y = 0) ----------
def fnug(o, antal, r, frø=2):
    """Gør en kugle blød og fnugget (pomponer, fluffy kanter)"""
    random.seed(frø)
    for _ in range(antal):
        v = random.choice(o.data.vertices)
        bul(o, o.location + v.co, r, random.uniform(0.15, 0.35) * r)
    return o


def festhat():
    profil = [(0.0, 0.0)] + [(0.32 * (1 - t), 0.82 * t) for t in [i / 16 for i in range(16)]] + [(0.0, 0.82)]
    k = drej("festkegle", profil, lambda p, n: bland("#ff4d6d", "#ffd23f", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 3 + p[2] * 18))), seg=48)
    flæse = torus("festflæse", S(0, 0.03, 0), 0.31, 0.05, "#5fd3ff", seg=48, tseg=10)
    for v in flæse.data.vertices: v.co.z += 0.02 * math.sin(math.atan2(v.co.y, v.co.x) * 12)
    flæse.data.update()
    return [k, flæse, fnug(ellipsoide("festpompon", S(0, 0.85, 0), 0.11, "#8aff7a", seg=24, ring=16), 30, 0.05)]


def krone():
    seg, rækker, R = 96, 8, 0.36
    bm = bmesh.new()
    def top(a):                                                  # seks spidser
        f = (a / math.tau * 6) % 1
        return 0.2 + 0.15 * (1 - abs(f - 0.5) * 2) ** 1.6
    vs = [[bm.verts.new(S(math.cos(i / seg * math.tau) * R, top(i / seg * math.tau) * j / rækker, math.sin(i / seg * math.tau) * R)) for j in range(rækker + 1)] for i in range(seg)]
    for i in range(seg):
        for j in range(rækker):
            bm.faces.new((vs[i][j], vs[(i + 1) % seg][j], vs[(i + 1) % seg][j + 1], vs[i][j + 1]))
    me = bpy.data.meshes.new("krone"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("krone", me); bpy.context.collection.objects.link(o)
    o.data.materials.append(materiale("guld", 0.25, 0.85))
    sol = o.modifiers.new("tyk", "SOLIDIFY"); sol.thickness = 0.035; sol.offset = 0
    _læg_fast(o)
    for f in o.data.polygons: f.use_smooth = True
    farv(o, lambda p, n: bland("#e8a800", "#ffd84a", p[2] / 0.35))
    dele = [o, torus("kronekant", S(0, 0.02, 0), R, 0.03, "#ffd23f", ("guld", 0.25, 0.85), seg=48, tseg=10),
            klip(ellipsoide("kronepude", S(0, 0.04, 0), (0.34, 0.34, 0.16), "#c8102e", ("fløjl", 0.9)), lambda x, y, z: y < 0)]
    for i in range(6):
        a = i / 6 * math.tau + math.pi / 6                       # en sten mellem hver spids og en kugle på spidserne
        dele.append(ellipsoide(f"kronesten{i}", S(math.cos(a) * (R + 0.02), 0.1, math.sin(a) * (R + 0.02)), (0.045, 0.045, 0.045),
                               ["#e8283c", "#3a86ff", "#06d6a0"][i % 3], ("blank", 0.1), seg=14, ring=10))
        b = a + math.pi / 6
        dele.append(ellipsoide(f"kronekugle{i}", S(math.cos(b) * R, 0.36, math.sin(b) * R), 0.035, "#ffd84a", ("guld", 0.25, 0.85), seg=12, ring=8))
    return dele


def piratehat():
    skygge = drej("piratskygge", [(0, 0.03), (0.56, 0.03), (0.6, 0.06), (0.56, 0.09), (0, 0.09)], "#1f1a1a", seg=60)
    for v in skygge.data.vertices:                                 # tre sider foldet op: en trekantet hat
        a = math.atan2(v.co.y, v.co.x); r = math.hypot(v.co.x, v.co.y)
        v.co.z += 0.24 * max(0.0, math.cos(3 * (a + math.pi / 2))) ** 2 * max(0.0, (r - 0.28) / 0.3)
    skygge.data.update()
    top = klip(ellipsoide("pirattop", S(0, 0.06, 0), (0.34, 0.34, 0.32), "#1f1a1a"), lambda x, y, z: y < 0)
    kant = torus("piratkant", S(0, 0.07, 0), 0.34, 0.025, "#ffd23f", ("guld", 0.25, 0.85), seg=48, tseg=8)
    kranie = ellipsoide("dødningehoved", S(0, 0.24, 0.31), (0.08, 0.04, 0.075), "#ffffff", seg=20, ring=12)
    øjne = [ellipsoide(f"kranieøje{s}", S(s * 0.03, 0.25, 0.345), (0.018, 0.01, 0.02), "#111111", seg=10, ring=6) for s in (-1, 1)]
    knogler = [pølse(f"knogle{s}", [S(-0.12, 0.13 + s * 0.07, 0.33), S(0.12, 0.13 - s * 0.07, 0.33)], [0.018, 0.018], "#ffffff", glathed=1) for s in (-1, 1)]
    return [skygge, top, kant, kranie] + øjne + knogler


def cowboyhat():
    skygge = drej("cowboyskygge", [(0, 0.04), (0.62, 0.04), (0.65, 0.065), (0.62, 0.09), (0, 0.09)], lambda p, n: bland("#8a5a20", "#b8803a", p[2] * 4), seg=64)
    for v in skygge.data.vertices:                                 # siderne bøjer op
        v.co.z += 0.16 * (v.co.x / 0.65) ** 4 - 0.03 * (v.co.y / 0.65) ** 2
    skygge.data.update()
    top = drej("cowboytop", [(0, 0.06), (0.3, 0.06), (0.31, 0.3), (0.27, 0.46), (0.0, 0.47)], lambda p, n: bland("#9a6428", "#c08a44", p[2] * 2), seg=48)
    bul(top, S(0, 0.47, 0), 0.16, -0.07)                           # kniber i toppen
    for s in (-1, 1): bul(top, S(s * 0.27, 0.4, 0.05), 0.12, -0.04)
    return [skygge, top, torus("cowboybånd", S(0, 0.12, 0), 0.31, 0.035, "#4a2a10", seg=48, tseg=10)]


def højhat():
    skygge = drej("højskygge", [(0, 0.0), (0.5, 0.0), (0.52, 0.025), (0.5, 0.05), (0, 0.05)], "#1a1a1a", ("silke", 0.35), seg=56)
    for v in skygge.data.vertices: v.co.z += 0.06 * (v.co.x / 0.52) ** 2
    skygge.data.update()
    top = drej("højtop", [(0, 0.04), (0.29, 0.04), (0.3, 0.62), (0.32, 0.74), (0.0, 0.75)], "#1a1a1a", ("silke", 0.35), seg=48)
    bånd = drej("højbånd", [(0.302, 0.08), (0.306, 0.09), (0.306, 0.21), (0.302, 0.22)], "#e8283c", ("silke", 0.35), seg=48)
    return [skygge, top, bånd]


def kaninører():
    dele = [torus("hårbøjle", S(0, 0.02, 0), 0.3, 0.05, "#ffffff", seg=40, tseg=10)]
    for s in (-1, 1):
        øre = ellipsoide(f"kaninøre{s}", S(s * 0.18, 0.42, 0), (0.14, 0.07, 0.42), "#ffffff", seg=28, ring=20, rot=(0, s * 0.15, 0))
        skub(øre, S(s * 0.24, 0.8, 0), 0.25, S(0, -0.04, 0.08))   # spidsen bøjer lidt frem
        inde = ellipsoide(f"kaninøreinde{s}", S(s * 0.18, 0.42, 0.045), (0.08, 0.03, 0.33), "#ffb0c8", seg=24, ring=16, rot=(0, s * 0.15, 0))
        skub(inde, S(s * 0.24, 0.8, 0.04), 0.25, S(0, -0.04, 0.08))
        dele += [øre, inde]
    return dele


def blomsterkrans():
    F = ["#ff8fd0", "#ffd23f", "#ffffff", "#b15bff", "#ff4d6d"]
    dele = [torus("kransranke", S(0, 0.05, 0), 0.34, 0.035, "#3fae3a", seg=48, tseg=8)]
    for i in range(10):
        a = i / 10 * math.tau
        c = Vector(S(math.cos(a) * 0.34, 0.1, math.sin(a) * 0.34))
        for k in range(5):                                          # fem kronblade om en gul midte
            b = k / 5 * math.tau
            dele.append(ellipsoide(f"kronblad{i}_{k}", c + Vector((math.cos(b) * 0.06, math.sin(b) * 0.06, 0)), (0.06, 0.04, 0.018), F[i % 5],
                                   seg=12, ring=8, rot=(0, 0, b)))
        dele.append(ellipsoide(f"blomstmidte{i}", c + Vector((0, 0, 0.015)), 0.03, "#ffb800", seg=10, ring=8))
        d = a + math.pi / 10
        dele.append(blad(f"kransblad{i}", S(math.cos(d) * 0.34, 0.06, math.sin(d) * 0.34), 0.14, 0.07, (0, -0.3, -d + math.pi / 2)))
    return dele


def kokkehue():
    bånd = drej("kokkebånd", [(0, 0), (0.3, 0), (0.31, 0.3), (0, 0.3)], "#ffffff", seg=48)
    for v in bånd.data.vertices:
        k = 1 + 0.03 * math.cos(math.atan2(v.co.y, v.co.x) * 16); v.co.x *= k; v.co.y *= k
    bånd.data.update()
    puf = ellipsoide("kokkepuf", S(0, 0.52, 0), (0.42, 0.42, 0.3), "#ffffff", seg=64, ring=28)
    for v in puf.data.vertices:                                    # bløde folder i toppen
        k = 1 + 0.09 * math.cos(math.atan2(v.co.y, v.co.x) * 7) * max(0.0, v.co.z / 0.3 + 0.3)
        v.co.x *= k; v.co.y *= k
    puf.data.update()
    return [bånd, puf]


def vikinghjelm():
    metal = ("metal", 0.3, 0.75)
    dele = [klip(ellipsoide("hjelm", S(0, 0, 0), (0.38, 0.38, 0.36), "#9aa3ad", metal, seg=48, ring=24), lambda x, y, z: y < 0),
            torus("hjelmkant", S(0, 0.02, 0), 0.38, 0.04, "#b87a3a", ("bronze", 0.35, 0.7), seg=48, tseg=10),
            pølse("hjelmkam", [S(0, 0.02, 0.39), S(0, 0.28, 0.27), S(0, 0.37, 0), S(0, 0.28, -0.27), S(0, 0.02, -0.39)], [0.03] * 5, "#b87a3a", ("bronze", 0.35, 0.7), glathed=1)]
    for i in range(12):
        a = i / 12 * math.tau
        dele.append(ellipsoide(f"nitte{i}", S(math.cos(a) * 0.4, 0.05, math.sin(a) * 0.4), 0.018, "#d8dde4", metal, seg=8, ring=6))
    for s in (-1, 1):
        pts = [S(s * 0.3, 0.1, 0), S(s * 0.46, 0.2, 0), S(s * 0.6, 0.38, 0), S(s * 0.64, 0.58, 0), S(s * 0.58, 0.74, 0)]
        dele.append(pølse(f"horn{s}", pts, [0.1, 0.08, 0.06, 0.04, 0.012], lambda p, n: bland("#fff3d0", "#d8c49a", trin(0.6, 0.3, math.sin(p[2] * 30))), ("horn", 0.4)))
    return dele


HATTE = {"Festhat": festhat, "Krone": krone, "Piratehat": piratehat, "Cowboyhat": cowboyhat, "Høj hat": højhat,
         "Kaninører": kaninører, "Blomsterkrans": blomsterkrans, "Kokkehue": kokkehue, "Vikinghjelm": vikinghjelm}


# ---------- Pynten i verdenerne (står på jorden i y = 0) ----------
def træ():
    stamme = pølse("stamme", [S(0, 0, 0), S(0.12, 1.4, 0.05), S(0.0, 3.1, 0)], [0.55, 0.42, 0.32],
                   lambda p, n: bland("#6a4424", "#8a5c34", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 9 + p[2] * 1.5))))
    rødder = [pølse(f"rod{i}", [S(0, 0.35, 0), S(math.cos(a) * 0.55, 0.12, math.sin(a) * 0.55), S(math.cos(a) * 0.8, 0, math.sin(a) * 0.8)], [0.25, 0.16, 0.06], "#6a4424")
              for i, a in enumerate([0.3, 2.4, 4.4])]
    random.seed(21)
    krone_ = []
    for i, (x, y, z, r) in enumerate([(0, 3.9, 0, 1.6), (1.1, 3.4, 0.3, 1.1), (-1.0, 3.5, -0.2, 1.15), (0.2, 3.3, 1.0, 1.05), (-0.2, 3.5, -1.0, 1.1), (0.3, 4.9, -0.2, 1.0)]):
        def bladfarve(p, n):
            return bland("#2f8a2c", "#7ad05a", 0.5 + 0.5 * n.z) if n.z > -0.2 else "#2a7a28"
        k = ellipsoide(f"trækrone{i}", S(x, y, z), r, bladfarve, seg=28, ring=18)
        fnug(k, 18, r * 0.5, frø=i)
        krone_.append(k)
    return [stamme] + rødder + krone_


def fluesvamp():
    stok = drej("svampestok", [(0, 0), (0.22, 0), (0.2, 0.1), (0.17, 0.35), (0.19, 0.58), (0, 0.6)], lambda p, n: bland("#f0e2c8", "#fff8ec", p[2] / 0.6), seg=32)
    krave = torus("svampekrave", S(0, 0.42, 0), 0.19, 0.035, "#fff8ec", seg=32, tseg=8)
    prikker = [Vector(v).normalized() for v in [(0, 1, 0), (0.6, 0.7, 0.2), (-0.5, 0.75, 0.35), (0.1, 0.65, -0.7), (-0.4, 0.6, -0.6), (0.75, 0.45, -0.4), (-0.8, 0.4, 0.1), (0.3, 0.5, 0.75), (-0.15, 0.45, 0.85)]]
    def hatfarve(p, n):
        x, y, z = G(p); y -= 0.55
        if y < 0.02: return bland("#e8d4b0", "#f6ead0", trin(0, 0.6, math.sin(math.atan2(z, x) * 40)))   # lameller under hatten
        d = min((Vector((x / 0.58, y / 0.4, z / 0.58)).normalized() - q).length for q in prikker)
        return "#ffffff" if d < 0.17 else bland("#c8102e", "#ff3b3b", y / 0.4)
    hat = ellipsoide("svampehat", S(0, 0.55, 0), (0.58, 0.58, 0.4), hatfarve, ("glans", 0.3), seg=64, ring=32)
    for v in hat.data.vertices:
        if v.co.z < 0: v.co.z *= 0.22                                # flad underside
    hat.data.update()
    return [stok, krave, hat]


def blomst():
    stilk = pølse("blomsterstilk", [S(0, 0, 0), S(0.03, 0.3, 0), S(0, 0.55, 0)], [0.03, 0.026, 0.022], "#3a8a2a", glathed=1)
    blade = [blad(f"blomsterblad{s}", S(0, 0.15 + s * 0.04, 0), 0.24, 0.11, (0, -0.5, s * 1.6)) for s in (-1, 1)]
    kronblade = []
    for k in range(6):
        b = k / 6 * math.tau
        kronblade.append(ellipsoide(f"kronblad{k}", S(math.cos(b) * 0.12, 0.57 + 0.02, math.sin(b) * 0.12), (0.12, 0.065, 0.025), "#ffffff", TONE,
                                    seg=16, ring=8, rot=(0, -0.35, -b)))
    return [stilk] + blade + kronblade + [ellipsoide("blomstermidte", S(0, 0.6, 0), (0.075, 0.075, 0.05), "#ffd23f", ("midte", 0.6), seg=16, ring=10)]


def palme():
    pts, radier = [], []
    for i in range(9):
        t = i / 8
        pts.append(S(0.9 * t ** 2, 5.0 * t, 0)); radier.append(0.34 - 0.1 * t)
    stamme = pølse("palmestamme", pts, radier, lambda p, n: bland("#8a6232", "#c09a62", trin(0, 0.5, math.sin(p[2] * 7))))
    top = Vector(pts[-1])
    blade = []
    for k in range(8):
        a = k / 8 * math.tau + 0.2
        omrids = []
        for i in range(13):                                        # langt blad med takket kant
            t = i / 12
            omrids.append((2.1 * t, 0.3 * math.sin(math.pi * t) ** 0.7 * (1 if i % 2 else 0.75)))
        omrids += [(u, -v) for u, v in reversed(omrids[1:-1])]
        b = plade(f"palmeblad{k}", omrids, 0.04, lambda p, n: bland("#2f8a2c", "#6ac84a", trin(0.03, 0.05, abs(p[1] - top[1]))), ringe=3, plan="xz", c=top, midt=(1.0, 0))
        for v in b.data.vertices: v.co.z -= 0.28 * v.co.x ** 2         # bladet hænger ned
        b.data.update()
        blade.append(drejet(b, (0, -0.25, a)))
    nødder = [ellipsoide(f"kokosnød{i}", top + Vector((math.cos(i * 2.1) * 0.22, math.sin(i * 2.1) * 0.22, -0.3)), 0.2, "#5a3a1a", seg=16, ring=12) for i in range(3)]
    return [stamme] + blade + nødder


def søstjerne():
    omrids = []
    for k in range(10):
        r = 0.44 if k % 2 == 0 else 0.17; a = k / 10 * math.tau + math.pi / 2
        for t in range(3):                                          # flere punkter, så armene bliver bløde
            a2 = a + t / 3 * math.tau / 10
            r2 = r + ((0.17 if k % 2 == 0 else 0.44) - r) * t / 3
            omrids.append((math.cos(a2) * r2, math.sin(a2) * r2))
    s = plade("søstjerne", omrids, 0.1, "#e8e8e8", TONE, ringe=5, plan="xz", c=S(0, 0.05, 0), rund=0.035)
    knopper = []
    for k in range(5):
        a = k / 5 * math.tau + math.pi / 2
        for j, r in enumerate([0.12, 0.22, 0.31]):
            knopper.append(ellipsoide(f"knop{k}_{j}", S(math.cos(a) * r, 0.1, math.sin(a) * r), 0.03 - j * 0.005, "#ffffff", TONE, seg=8, ring=6))
    return [s] + knopper


def musling():
    m = ellipsoide("musling", S(0, 0, 0), (0.3, 0.36, 0.16), "#f4f4f4", TONE, seg=48, ring=20)
    klip(m, lambda x, y, z: y < -0.005 or z < -0.3)
    for v in m.data.vertices:                                      # riller ud fra hængslet
        a = math.atan2(v.co.x, -v.co.y - 0.34)
        v.co.z *= 1 + 0.18 * abs(math.cos(a * 9))
    m.data.update()
    farv(m, lambda p, n: bland("#d8d8d8", "#ffffff", trin(0, 0.6, math.cos(math.atan2(p[0], -p[1] - 0.34) * 18))))
    return [m]


def sandslot():
    def sand(p, n):
        return bland("#d8b070", "#f0d49a", 0.5 + 0.5 * math.sin(p[0] * 13) * math.sin(p[1] * 11) * math.sin(p[2] * 9))
    dele = [kasse("slotmur", S(0, 0.7, 0), (3.0, 3.0, 1.4), sand, rund=0.08)]
    for i in range(12):                                            # tinder på muren
        a = i / 12 * math.tau
        x, z = max(-1.35, min(1.35, math.cos(a) * 2)), max(-1.35, min(1.35, math.sin(a) * 2))
        dele.append(kasse(f"tinde{i}", S(x, 1.55, z), (0.3, 0.3, 0.3), sand, rund=0.04))
    for i, (dx, dz) in enumerate([(-1.5, -1.5), (1.5, -1.5), (-1.5, 1.5), (1.5, 1.5)]):
        t = drej(f"tårn{i}", [(0, 0), (0.66, 0), (0.6, 2.0), (0.72, 2.08), (0.72, 2.32), (0, 2.32)], sand, seg=32, c=S(dx, 0, dz))
        tag = kegle(f"tårntag{i}", S(dx, 2.32, dz), S(dx, 3.25, dz), 0.62, 0.02, sand)
        dele += [t, tag]
    dele.append(ellipsoide("slotport", S(0, 0.45, 1.5), (0.42, 0.06, 0.55), "#6a4a2a", seg=24, ring=12))
    for x in (-0.8, 0.8): dele.append(ellipsoide(f"slotvindue{x}", S(x, 1.0, 1.5), (0.14, 0.05, 0.2), "#6a4a2a", seg=16, ring=10))
    dele.append(pølse("flagstang", [S(1.5, 3.1, 1.5), S(1.5, 4.0, 1.5)], [0.03, 0.03], "#6e4520", glathed=1))
    dele.append(plade("flag", [(0, 0), (0.7, 0.2), (0, 0.42)], 0.02, "#ff4d6d", plan="xy", c=S(1.53, 3.55, 1.5)))
    return dele


def krabbe():
    RØD = "#e8502a"
    krop = ellipsoide("krabbekrop", S(0, 0.28, 0), (0.52, 0.42, 0.22), lambda p, n: bland("#ff9a6a", RØD, trin(0.22, 0.12, p[2])), ("glans", 0.2), seg=40, ring=24)
    fnug(krop, 10, 0.18, frø=3)
    dele = [krop]
    for s in (-1, 1):
        dele.append(pølse(f"øjestilk{s}", [S(s * 0.13, 0.42, 0.22), S(s * 0.15, 0.6, 0.26)], [0.04, 0.035], RØD, glathed=1))
        dele.append(ellipsoide(f"krabbeøje{s}", S(s * 0.15, 0.66, 0.27), 0.085, "#ffffff", ("glans", 0.15), seg=16, ring=12))
        dele.append(ellipsoide(f"krabbepupil{s}", S(s * 0.15, 0.68, 0.34), 0.04, "#111111", ("glans", 0.15), seg=12, ring=8))
        dele.append(pølse(f"klo_arm{s}", [S(s * 0.45, 0.28, 0.1), S(s * 0.62, 0.35, 0.28), S(s * 0.66, 0.38, 0.42)], [0.07, 0.06, 0.06], RØD, glathed=1))
        dele.append(ellipsoide(f"klo_over{s}", S(s * 0.7, 0.45, 0.55), (0.12, 0.17, 0.08), RØD, ("glans", 0.2), seg=20, ring=12, rot=(0.3, 0, 0)))
        dele.append(ellipsoide(f"klo_under{s}", S(s * 0.7, 0.33, 0.53), (0.08, 0.13, 0.05), RØD, ("glans", 0.2), seg=16, ring=10, rot=(-0.3, 0, 0)))
        for k, z in enumerate([0.12, -0.05, -0.2]):
            dele.append(pølse(f"krabbeben{s}{k}", [S(s * 0.42, 0.24, z), S(s * 0.68, 0.3, z * 1.3), S(s * 0.82, 0.0, z * 1.6)], [0.05, 0.04, 0.02], RØD, glathed=1))
    dele.append(pølse("krabbesmil", [S(-0.08, 0.27, 0.41), S(0, 0.24, 0.42), S(0.08, 0.27, 0.41)], [0.012, 0.014, 0.012], "#5a1a0a", glathed=1))
    return dele


def slikkepind():
    pind = pølse("slikpind", [S(0, 0, 0), S(0, 4.2, 0)], [0.12, 0.12], "#ffffff", glathed=1)
    F = ["#ff3b5c", "#ffd23f", "#4cd964", "#3aa8ff", "#c86bff", "#ff8c1a"]
    def spiral(p, n):
        x, y = p[0], p[2] - 5.2
        f = (math.atan2(y, x) / math.tau + math.hypot(x, y) * 0.75) * 6 % 6
        i = int(f); t = f - i
        return bland(F[i], F[(i + 1) % 6], trin(0.85, 0.2, t))
    rund_ = [(math.cos(a) * 1.5, math.sin(a) * 1.5) for a in [i / 72 * math.tau for i in range(72)]]
    slik = plade("slikskive", rund_, 0.4, spiral, ("blank", 0.25), ringe=18, plan="xy", c=S(0, 5.2, 0), rund=0.12, midt=(0, 0))
    return [pind, slik]


def raket():
    def krop(p, n):
        y = p[2]
        if y > 6.7 or 2.2 < y < 2.6: return "#e8283c"
        return bland("#e4e6ee", "#ffffff", 0.5 + 0.5 * n.z)
    k = drej("raketkrop", [(0, 0.6), (0.95, 0.6), (1.0, 1.0), (1.02, 3.5), (1.0, 6.0), (0.9, 6.8), (0.62, 7.7), (0.3, 8.5), (0, 8.9)], krop, ("glans", 0.25), seg=48)
    dyse = drej("raketdyse", [(0.45, 0.0), (0.72, 0.0), (0.55, 0.62), (0, 0.62)], "#5a5f6a", ("metal", 0.3, 0.75), seg=32)
    vindueskant = torus("vindueskant", S(0, 5.0, 0.98), 0.46, 0.08, "#c0c6d0", ("metal", 0.3, 0.75), rot=(math.pi / 2, 0, 0), seg=40, tseg=10)
    vindue = ellipsoide("rakettvindue", S(0, 5.0, 0.98), (0.42, 0.08, 0.42), lambda p, n: "#ffffff" if p[0] < -0.1 and p[2] > 5.15 else "#4aa8ff", ("blank", 0.1), seg=24, ring=12)
    finner = []
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        f = plade(f"finne{i}", [(0.0, 0.0), (1.0, -0.6), (1.05, 0.4), (0.0, 2.6)], 0.16, "#e8283c", ("glans", 0.25), plan="xy", c=S(0.9, 0.8, 0), rund=0.05)
        f.location = (0, 0, 0)
        f.data.transform(Matrix.Translation(S(0.9, 0.8, 0))); drejet(f, (0, 0, a))
        finner.append(f)
    return [k, dyse, vindueskant, vindue] + finner


def ufo():
    return [drej("ufoskål", [(0, -0.38), (1.0, -0.4), (2.1, -0.1), (2.22, 0.0), (2.1, 0.1), (1.0, 0.34), (0, 0.38)],
                 lambda p, n: "#8a92a6" if abs(math.hypot(p[0], p[1]) - 1.55) < 0.05 else bland("#a8b0c0", "#e8ecf4", 0.5 + 0.5 * n.z), ("metal", 0.3, 0.6), seg=64)]


PYNT = {"træ": træ, "fluesvamp": fluesvamp, "blomst": blomst, "palme": palme, "søstjerne": søstjerne, "musling": musling,
        "sandslot": sandslot, "krabbe": krabbe, "slikkepind": slikkepind,
        "kæmpecupcake": lambda: cupcake("kæmpecupcake", 7.0),
        "svævedonut": lambda: donut("svævedonut", "#ffffff", 4.1, True, TONE),
        "raket": raket, "ufo": ufo}


def række(rod, opskrifter, afstand=1.6, pr_række=6):
    """Byg hver ting i sit eget led (ved 0,0,0) og læg dem på række til skyggebagning og prøvebillede"""
    led = []
    for i, (navn, lav) in enumerate(opskrifter.items()):
        l = tom(navn, (0, 0, 0), rod)          # leddet først, så det får navnet (en del med samme navn får .001)
        dele = lav()
        for d in dele: sæt_forælder(d, l)
        led.append(l)
    for i, l in enumerate(led):
        l.location = S((i % pr_række - (pr_række - 1) / 2) * afstand, 0, -(i // pr_række) * afstand)
    return led


def færdig(rod, navn, kamera, mål, led=(), skjul=lambda o: (), styrke=0.55):
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    ao(meshes, styrke=styrke, skjul=skjul)
    prøve(f"slange_{navn}.png", kamera, mål)
    for l in led: l.location = (0, 0, 0)                          # alle ting står i midten i filen
    eksportér([rod], os.path.join(UD, f"{navn}.glb"))


if __name__ == "__main__":
    hvilke = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["hoved", "mad", "hatte", "pynt"]
    for navn in hvilke:
        if navn == "hoved":
            nulstil(ao_afstand=0.3)
            rod = lav_hoved()
            def skjul(o):                                         # pupiller og øjenlåg flytter sig — de må ikke skygge
                alle = bpy.data.objects
                if o.name.startswith("hvide"): return [x for x in alle if x.name.startswith(("pupilkugle", "laag"))]
                if o.name.startswith("laag"): return [x for x in alle if x.name.startswith(("pupilkugle", "hvide"))]
                return [x for x in alle if x.name.startswith(("pupilkugle", "laag", "tunge"))]
            færdig(rod, "hoved", S(-1.4, 1.4, 2.2), S(0, 0.15, 0.2), skjul=skjul)
        elif navn == "mad":
            nulstil(ao_afstand=0.25)
            rod = tom("mad")
            led = række(rod, MADER)
            færdig(rod, "mad", S(0, 5.5, 6.8), S(0, 0.3, -0.8), led)
        elif navn == "hatte":
            nulstil(ao_afstand=0.15)
            rod = tom("hatte")
            led = række(rod, HATTE, afstand=1.5, pr_række=5)
            færdig(rod, "hatte", S(0, 4.2, 5.2), S(0, 0.2, -0.7), led)
        elif navn == "pynt":
            nulstil(ao_afstand=0.5)
            rod = tom("pynt")
            led = række(rod, PYNT, afstand=6.5, pr_række=7)
            færdig(rod, "pynt", S(0, 16, 30), S(0, 2, -3), led)
