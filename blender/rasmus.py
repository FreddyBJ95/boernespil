# ===== Rulle Rasmus i Blender: pynten langs banerne, frugten, puderne og ballonerne ved målet =====
# Kør:  blender --background --factory-startup --python blender/rasmus.py -- rasmus
# Gemmer spil/rulle-rasmus/modeller/rasmus.glb og et prøvebillede i blender/proever/.
#
# Pynten bliver strakt i spillet (stammer, stilke og pinde er 1 høje og 1 brede, så spillet kan give dem
# den rigtige højde). Kroner, hatte og hoveder sættes oven på i deres egen størrelse.
# Materialet "tone" farves i spillet (blomsterhoveder, iskugler, gummidråber og balloner).

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tegnestue import *
from slange import blad, drejet, fnug, P
from fisk import samlet
from mathutils import Vector

UD = os.path.join(ROD, "spil", "rulle-rasmus", "modeller")
TONE = ("tone", 0.4)


# ---------- Engen ----------
def stamme():
    """En stamme, 1 bred og 1 høj (spillet strækker den): bark med furer"""
    def bark(p, n):
        a = math.atan2(p[1], p[0])
        return bland("#5a3a20", "#8a6038", trin(0.2, 0.5, math.sin(a * 11 + math.sin(p[2] * 9) * 0.6)))
    o = drej("stamme", fin([(0, 0), (1.15, 0), (1.0, 0.12), (1.0, 1.0), (0, 1.0)], 3), bark, ("bark", 0.95), seg=28)
    for v in o.data.vertices:                                       # furer i barken
        a = math.atan2(v.co.y, v.co.x); k = 1 + 0.05 * math.sin(a * 11)
        v.co.x *= k; v.co.y *= k
    o.data.update()
    return [o]


def løvkrone():
    """Trækronen: knolde af løv omkring et midtpunkt (sættes på toppen af stammen)"""
    random.seed(5)
    dele = []
    for k in range(7):
        a = k / 6 * math.tau + random.uniform(0, 0.6); d = 0 if k == 0 else random.uniform(1.4, 2.1)
        s = 2.3 if k == 0 else random.uniform(1.6, 2.3)
        y = 1.6 if k == 0 else random.uniform(-0.1, 1.0)
        def løv(p, n, k=k):
            base = ["#3f9a35", "#4fae3c", "#2f8a3a"][k % 3]
            return bland(base, "#9be070", 0.45 * max(0.0, n.z)) if n.z > -0.2 else bland(base, "#1f5a22", 0.5)
        o = ellipsoide(f"løv{k}", S(math.cos(a) * d, y, math.sin(a) * d), (s, s, s * 0.85), løv, ("løv", 0.8), seg=28, ring=18)
        fnug(o, 30, s * 0.32, frø=k + 3)
        dele.append(o)
    return dele


def svampestok():
    def stok(p, n):
        return bland("#efe2c4", "#fff8ec", trin(0, 0.6, math.sin(math.atan2(p[1], p[0]) * 18)))
    return [drej("svampestok", fin([(0, 0), (1.1, 0), (1.0, 0.15), (0.85, 0.7), (0.92, 1.0), (0, 1.0)], 2), stok, ("stok", 0.85), seg=28)]


def svampehat():
    """Fluesvampens hat: rød med hvide prikker, der buler ud, og lameller under (1 bred, 0.62 høj)"""
    random.seed(8)
    prikker = [Vector((math.cos(a) * math.sin(b), math.cos(b), math.sin(a) * math.sin(b))) for a, b in
               [(random.uniform(0, math.tau), random.uniform(0.0, 1.15)) for _ in range(13)]]
    def farve(p, n):
        x, y, z = G(p)
        if y < 0.03: return bland("#e2cfa8", "#f6ead0", trin(0, 0.6, math.sin(math.atan2(z, x) * 50)))
        d = min((Vector((x, y / 0.62, z)).normalized() - q).length for q in prikker)
        return "#fffaf0" if d < 0.16 else bland("#b80c24", "#ff3a3a", y / 0.62)
    hat = ellipsoide("svampehat", S(0, 0, 0), (1.0, 1.0, 0.62), farve, ("glans", 0.35), seg=64, ring=36)
    for v in hat.data.vertices:
        if v.co.z < 0: v.co.z *= 0.15
        d = min((Vector((v.co.x, v.co.z / 0.62, -v.co.y)).normalized() - q).length for q in prikker)
        if d < 0.16 and v.co.z > 0: v.co += v.normal * 0.035 * (1 - d / 0.16)   # prikkerne buler en smule ud
    hat.data.update()
    return [hat]


def blomsterhoved():
    dele = []
    for i in range(9):
        a = i / 9 * math.tau
        kb = ellipsoide(f"kronblad{i}", S(math.cos(a) * 0.95, 0, math.sin(a) * 0.95), (0.75, 0.42, 0.13),
                        lambda p, n: bland("#ffffff", "#e0e0e0", trin(0.6, 0.4, math.hypot(p[0], p[1]))), TONE, seg=20, ring=10, rot=(0, -0.2, -a))
        skub(kb, S(math.cos(a) * 1.6, 0, math.sin(a) * 1.6), 0.5, S(0, 0.15, 0))   # spidsen bøjer op
        dele.append(kb)
    midte = ellipsoide("blomstermidte", S(0, 0.1, 0), (0.5, 0.5, 0.25), lambda p, n: bland("#ff9a00", "#ffd23f", trin(0, 0.6, math.sin(p[0] * 25) * math.sin(p[1] * 25))), ("midte", 0.9), seg=28, ring=14)
    return dele + [midte]


def ø():
    """En lille ø med græs og en sandkant (1 bred — spillet giver den sin størrelse)"""
    sand = drej("øsand", [(0, -0.75), (1.0, -0.75), (1.12, 0.0), (1.08, 0.12), (0.9, 0.16), (0, 0.16)], lambda p, n: bland("#d8bf80", "#efdcaa", 0.5 + 0.5 * n.z), ("sand", 1.0), seg=40)
    græs = ellipsoide("øgræs", S(0, 0.12, 0), (1.0, 1.0, 0.42), lambda p, n: bland("#3f8f2e", "#7ccc4e", 0.5 + 0.5 * n.z), ("græs", 0.95), seg=40, ring=16)
    fnug(græs, 20, 0.3, frø=2)
    random.seed(4)
    sten = []
    for k in range(4):
        a = random.uniform(0, math.tau); r = random.uniform(0.08, 0.14)
        st = ellipsoide(f"østen{k}", S(math.cos(a) * 1.02, 0.12, math.sin(a) * 1.02), (r, r, r * 0.7), "#9aa0a6", ("sten", 0.9), seg=12, ring=8)
        fnug(st, 4, r * 0.6, frø=k); sten.append(st)
    return [sand, græs] + sten


# ---------- Slikbanen ----------
def slikskive(farver, navn):
    def spiral(p, n):
        x, y = p[0], p[2]
        f = (math.atan2(y, x) / math.tau + math.hypot(x, y) * 1.6) * len(farver) % len(farver)
        i = int(f); t = f - i
        return bland(farver[i], farver[(i + 1) % len(farver)], trin(0.85, 0.2, t))
    rund = [(math.cos(a), math.sin(a)) for a in [i / 72 * math.tau for i in range(72)]]
    return [plade(navn, rund, 0.45, spiral, ("blank", 0.15), ringe=18, plan="xy", c=S(0, 0, 0), rund=0.12, midt=(0, 0))]


def slikpind():
    return [drej("slikpind", [(0, 0), (1.0, 0), (1.0, 1.0), (0, 1.0)], "#fffaf0", ("pind", 0.5), seg=16)]


def isvaffel():
    """Vaflen: spidsen nedad, 1 bred foroven og 1 høj (centreret som en kegle i three.js)"""
    profil = [(0.0, -0.5)] + [(t, -0.5 + t) for t in [i / 16 for i in range(1, 17)]] + [(1.08, 0.52), (1.06, 0.56), (0.0, 0.56)]
    def vaffel(p, n):
        x, y, z = G(p); a = math.atan2(z, x)
        g = min(abs(math.sin(a * 6 + y * 14)), abs(math.sin(a * 6 - y * 14)))
        return "#c88a48" if y > 0.5 else bland("#b8783a", "#e8b872", trin(0.25, 0.2, g))
    return [drej("isvaffel", profil, vaffel, ("vaffel", 0.85), seg=48)]


def iskugle():
    random.seed(6)
    k = ellipsoide("iskugle", S(0, 0, 0), (1.0, 1.0, 0.85), lambda p, n: bland("#ffffff", "#e8e8e8", trin(0, 0.6, math.sin(p[0] * 9) * math.sin(p[1] * 8))), TONE, seg=40, ring=24)
    for _ in range(14):                                               # klatter, der løber ned
        v = random.choice(k.data.vertices)
        if -0.3 < v.co.z < 0.1: bul(k, k.location + v.co, 0.3, 0.18)
    fnug(k, 10, 0.25, frø=9)
    return [k]


def kirsebær():
    return [ellipsoide("kirsebær", S(0, 0, 0), 1.0, lambda p, n: bland("#9a0a20", "#ff2a40", 0.5 + 0.5 * n.z), ("blank", 0.15), seg=28, ring=18),
            pølse("kirsebærstilk", [S(0, 0.9, 0), S(0.2, 1.6, 0), S(0.45, 2.0, 0)], [0.09, 0.08, 0.06], "#4a7a2a", glathed=1)]


# ---------- Isbanen ----------
def grantræ():
    """Et grantræ med sne på grenene, 10 højt (spillet strækker det i højden)"""
    def gren(p, n):
        if n.z > 0.45: return bland("#e8f4ff", "#ffffff", n.z)            # sne ovenpå
        return bland("#1f5a3a", "#2f7a4a", trin(0, 0.6, math.sin(math.atan2(p[1], p[0]) * 14)))
    dele = [drej("granstamme", [(0, 0), (0.42, 0), (0.3, 3.4), (0, 3.4)], "#5b3a22", ("bark", 0.95), seg=16)]
    for k in range(5):
        t = k / 5; y0 = 3.0 + t * 6.2 * 0.9; R = 2.6 * (1 - t * 0.72); h = 2.8 - t * 0.6
        g = drej(f"granlag{k}", fin([(0.0, y0 + 0.3), (R, y0), (R * 0.5, y0 + h * 0.5), (0.0, y0 + h)], 3), gren, ("gran", 0.85), seg=48)
        for v in g.data.vertices:                                      # kanten hænger i buer
            r = math.hypot(v.co.x, v.co.y)
            if r > 0.7 * R: v.co.z -= 0.16 * R * (0.5 + 0.5 * math.sin(math.atan2(v.co.y, v.co.x) * 10)) * (r / R - 0.7) * 3
        g.data.update()
        farv(g, gren)
        dele.append(g)
    return dele


def snemand():
    """Snemanden står på en isklump, der svæver (toppen af klumpen er y = 0)"""
    random.seed(3)
    klump = ellipsoide("isklump", S(0, -0.7, 0), (2.4, 2.4, 1.0), lambda p, n: bland("#bfe4ff", "#f0faff", 0.5 + 0.5 * n.z), ("is", 0.3), seg=36, ring=18)
    fnug(klump, 24, 0.7, frø=1)
    spids = drej("isspids", fin([(0.0, -4.4), (0.6, -3.2), (2.0, -1.2), (0.0, -1.0)], 2), lambda p, n: bland("#7cc4f0", "#c8ecff", trin(-3, 2, p[2])), ("is", 0.3), seg=24)
    for v in spids.data.vertices:
        a = math.atan2(v.co.y, v.co.x); k = 1 + 0.12 * math.sin(a * 5 + v.co.z)
        v.co.x *= k; v.co.y *= k
    spids.data.update()
    sne = lambda p, n: bland("#dce8f4", "#ffffff", 0.5 + 0.5 * n.z)
    dele = [klump, spids,
            ellipsoide("snebund", S(0, 0.9, 0), 1.0, sne, ("sne", 0.8), seg=36, ring=24),
            ellipsoide("snemidte", S(0, 2.2, 0), 0.74, sne, ("sne", 0.8), seg=32, ring=20),
            ellipsoide("snehoved", S(0, 3.2, 0), 0.54, sne, ("sne", 0.8), seg=32, ring=20),
            kegle("gulerodsnæse", S(0, 3.2, 0.48), S(0, 3.12, 0.95), 0.09, 0.015, lambda p, n: bland("#ff6a10", "#ff9a3a", trin(0, 0.5, math.sin(-p[1] * 60))), seg=16),
            drej("hue", fin([(0, 3.55), (0.46, 3.55), (0.48, 3.62), (0.42, 3.7), (0.3, 4.05), (0, 4.1)], 1), lambda p, n: "#ffffff" if p[2] < 3.68 else "#e8283c", ("hue", 0.9), seg=32),
            fnug(ellipsoide("huedusk", S(0.1, 4.12, 0), 0.14, "#ffffff", seg=16, ring=10), 10, 0.06, frø=2),
            torus("halstørklæde", S(0, 2.78, 0), 0.52, 0.11, lambda p, n: bland("#2f7ad8", "#5fb0ff", trin(0, 0.5, math.sin(math.atan2(p[1], p[0]) * 8))), ("uld", 0.95), seg=36, tseg=12),
            pølse("tørklædeende", [S(0.25, 2.75, 0.5), S(0.35, 2.4, 0.62), S(0.4, 2.05, 0.6)], [0.13, 0.11, 0.1], "#2f7ad8", ("uld", 0.95))]
    for s in (-1, 1):
        dele.append(ellipsoide(f"kuløje{s}", S(s * 0.18, 3.35, 0.47), 0.07, "#1a1a1a", ("blank", 0.2), seg=12, ring=8))
        dele.append(pølse(f"pindearm{s}", [S(s * 0.65, 2.3, 0), S(s * 1.3, 2.7, 0.1), S(s * 1.6, 3.1, 0.1)], [0.05, 0.04, 0.03], "#6a4424", glathed=1))
        dele.append(pølse(f"pindefinger{s}", [S(s * 1.3, 2.7, 0.1), S(s * 1.55, 2.65, 0.25)], [0.03, 0.02], "#6a4424", glathed=1))
    for k, y in enumerate([2.35, 2.05, 1.2]):
        dele.append(ellipsoide(f"knap{k}", S(0, y, 0.72 if y > 1.5 else 0.98), (0.08, 0.04, 0.08), "#1a1a1a", ("blank", 0.2), seg=12, ring=8))
    for k in range(5):                                                   # et smil af kul
        t = (k - 2) / 2
        dele.append(ellipsoide(f"kulsmil{k}", S(t * 0.18, 3.0 - 0.06 * (1 - t * t), 0.49 - abs(t) * 0.04), 0.035, "#1a1a1a", seg=8, ring=6))
    return dele


# ---------- Junglen ----------
def palmekrone():
    """Bladene og kokosnødderne på toppen af en palme (stammen bygges i spillet)"""
    dele = []
    for k in range(8):
        a = k / 8 * math.tau + 0.2
        omrids = []
        for i in range(17):
            t = i / 16
            omrids.append((4.6 * t, 0.62 * math.sin(math.pi * t) ** 0.7 * (1 if i % 2 else 0.72)))
        omrids += [(u, -v) for u, v in reversed(omrids[1:-1])]
        b = plade(f"palmeblad{k}", omrids, 0.06, lambda p, n: bland("#2f8a2c", "#7ad05a", trin(0.05, 0.1, abs(p[1]))), ("palmeblad", 0.7), ringe=3, plan="xz", c=S(0, 0.3, 0), midt=(2.2, 0))
        for v in b.data.vertices: v.co.z -= 0.07 * v.co.x ** 2              # bladet hænger ned
        b.data.update()
        dele.append(drejet(b, (0, -0.3, a)))
    for k in range(3):
        dele.append(ellipsoide(f"kokos{k}", S(math.cos(k * 2.1) * 0.38, -0.1, math.sin(k * 2.1) * 0.38), 0.3, lambda p, n: bland("#4a2a12", "#7a4a24", trin(0, 0.5, math.sin(p[0] * 40))), ("kokos", 0.9), seg=16, ring=12))
    return dele


def palmeled():
    """Et led af palmestammen, 1 bredt og 1 højt, med en ring foroven"""
    return [drej("palmeled", fin([(0, 0), (0.9, 0), (1.0, 0.75), (1.12, 0.92), (1.02, 1.0), (0, 1.0)], 1),
                 lambda p, n: bland("#7a5a34", "#b08a58", trin(0.6, 0.4, p[2])), ("bark", 0.95), seg=20)]


# ---------- Frugt (radius ca. 0.3, midten i 0) ----------
def æble():
    k = ellipsoide("æble", S(0, 0, 0), (0.3, 0.3, 0.28), lambda p, n: bland("#c8102a", "#ff4a3a", 0.4 * trin(0.0, 0.3, p[2]) + 0.2 * trin(0, 0.6, math.sin(math.atan2(p[1], p[0]) * 7))), ("blank", 0.2), seg=32, ring=22)
    bul(k, S(0, 0.28, 0), 0.14, -0.06)
    return [k, pølse("æblestilk", [S(0, 0.2, 0), S(0.02, 0.36, 0)], [0.02, 0.016], "#6b4a2a", glathed=1), blad("æbleblad", S(0.02, 0.32, 0), 0.2, 0.1, (0, -0.4, 0.3))]


def jordbær():
    jb = ellipsoide("jordbær", S(0, 0, 0), 0.3, lambda p, n: bland("#d00a28", "#ff3a4a", trin(0, 0.3, p[2])), ("blank", 0.25), seg=32, ring=22)
    for v in jb.data.vertices:
        if v.co.z < 0: f = 1 + v.co.z * 1.6; v.co.x *= f; v.co.y *= f
    jb.data.update()
    random.seed(2)
    frø = []
    for i in range(30):
        v = random.choice(jb.data.vertices)
        if -0.25 < v.co.z < 0.22:
            frø.append(ellipsoide(f"jbfrø{i}", jb.location + v.co - v.normal * 0.004, (0.014, 0.014, 0.02), "#ffe14d", seg=8, ring=6))
    return [jb] + frø + [blad(f"jbblad{i}", S(0, 0.26, 0), 0.17, 0.08, (0, -0.3, i / 6 * math.tau)) for i in range(6)]


def appelsin():
    k = ellipsoide("appelsin", S(0, 0, 0), 0.3, lambda p, n: bland("#f07a10", "#ffa42a", 0.5 + 0.5 * n.z), ("skræl", 0.55), seg=36, ring=24)
    random.seed(7)
    for _ in range(60):                                                  # små porer i skrællen
        v = random.choice(k.data.vertices); bul(k, k.location + v.co, 0.03, -0.004)
    return [k, ellipsoide("appelsintop", S(0, 0.295, 0), (0.035, 0.035, 0.01), "#6a8a2a", seg=10, ring=6), blad("appelsinblad", S(0.02, 0.3, 0), 0.2, 0.1, (0, -0.4, 0.5))]


def druer():
    dele = []
    for i in range(13):
        lag_ = i // 4; a = i * 1.7
        y = 0.18 - lag_ * 0.12; rr = 0.13 - lag_ * 0.035 if i < 12 else 0
        if i == 12: y = -0.2
        dele.append(ellipsoide(f"drue{i}", S(math.cos(a) * rr, y, math.sin(a) * rr), 0.1, lambda p, n: bland("#5a1c8a", "#9a4ad8", 0.5 + 0.5 * n.z), ("blank", 0.2), seg=18, ring=12))
    return dele + [pølse("druestilk", [S(0, 0.22, 0), S(0.03, 0.36, 0)], [0.02, 0.016], "#6b4a2a", glathed=1), blad("drueblad", S(0.02, 0.3, 0), 0.22, 0.14, (0, -0.3, 0.6))]


# ---------- Puderne midt på banen (står på y = 0) ----------
def pude_eng():
    hat = svampehat()[0]
    hat.data.transform(Matrix.Scale(0.8, 4)); hat.location = S(0, 0.5, 0)   # en lille svamp: hatten er 0.8 bred
    return [drej("pudestok", fin([(0, 0), (0.34, 0), (0.3, 0.3), (0.26, 0.55), (0, 0.56)], 1), "#f3ead2", ("stok", 0.85), seg=24), hat]


def pude_slik():
    k = ellipsoide("gummidråbe", S(0, 0, 0), (0.75, 0.75, 1.0), "#ffffff", TONE, seg=40, ring=24)
    klip(k, lambda x, y, z: y < -0.01)
    for v in k.data.vertices:                                           # spids top som en vingummidråbe
        t = max(0.0, v.co.z); k_ = 1 - 0.45 * t ** 1.5
        v.co.x *= k_; v.co.y *= k_
    k.data.update()
    sukker = []
    random.seed(11)
    for i in range(50):
        v = random.choice(k.data.vertices)
        if v.co.z > 0.05:
            sukker.append(kasse(f"sukker{i}", k.location + v.co, (0.04, 0.04, 0.04), "#ffffff", ("sukker", 0.3), rot=(random.uniform(0, 3), random.uniform(0, 3), 0)))
    return [k] + sukker


def pude_is():
    k = ellipsoide("snebold", S(0, 0.6, 0), 0.7, lambda p, n: bland("#d8e8f6", "#ffffff", 0.5 + 0.5 * n.z), ("sne", 0.8), seg=36, ring=24)
    fnug(k, 40, 0.18, frø=5)
    return [k]


def pude_jungle():
    def ved(p, n):
        if n.z > 0.8: return bland("#c89a60", "#e8c08a", trin(0, 0.5, math.sin(math.hypot(p[0], p[1]) * 60)))   # årringe
        return bland("#5a3a20", "#8a6038", trin(0.2, 0.5, math.sin(math.atan2(p[1], p[0]) * 11)))
    stub = drej("træstub", fin([(0, 0), (0.75, 0), (0.62, 0.15), (0.6, 0.8), (0, 0.8)], 2), ved, ("bark", 0.95), seg=28)
    mos = klip(ellipsoide("mos", S(0.1, 0.78, 0.05), (0.5, 0.45, 0.16), lambda p, n: bland("#3f8f2e", "#7ccc4e", 0.5 + 0.5 * n.z), ("mos", 1.0), seg=24, ring=12), lambda x, y, z: y < -0.02)
    fnug(mos, 12, 0.12, frø=3)
    return [stub, mos]


def pude_regnbue():
    dele = []
    for k in range(5):
        r = 0.53 if k == 0 else 0.38
        x, y, z = (0, 0.55, 0) if k == 0 else (math.cos(k * 1.57) * 0.4, 0.35, math.sin(k * 1.57) * 0.4)
        o = ellipsoide(f"skypude{k}", S(x, y, z), r, lambda p, n: bland("#e8e0ff", "#ffffff", 0.5 + 0.5 * n.z), ("sky", 1.0), seg=24, ring=16)
        fnug(o, 12, r * 0.4, frø=k + 20); dele.append(o)
    return dele


def ballon():
    """En ballon med knude (tone: spillet giver hver ballon sin farve)"""
    b = ellipsoide("ballonkrop", S(0, 0, 0), (0.34, 0.34, 0.39), lambda p, n: "#ffffff" if (Vector(G(p)) - Vector((-0.12, 0.18, 0.22))).length < 0.07 else "#e8e8e8", TONE, seg=28, ring=20)
    for v in b.data.vertices:
        if v.co.z < 0: k = 1 + v.co.z * 0.6; v.co.x *= k; v.co.y *= k
    b.data.update()
    return [b, kegle("ballonknude", S(0, -0.37, 0), S(0, -0.45, 0), 0.025, 0.05, "#d8d8d8", TONE, seg=12)]


TING = {"stamme": stamme, "løvkrone": løvkrone, "svampestok": svampestok, "svampehat": svampehat, "blomsterhoved": blomsterhoved, "ø": ø,
        "slikskive1": lambda: slikskive(["#ff2d55", "#ffffff", "#ffd23f", "#ffffff"], "slikskive1"),
        "slikskive2": lambda: slikskive(["#a56bff", "#ffffff", "#4dd2ff", "#ffffff"], "slikskive2"),
        "slikskive3": lambda: slikskive(["#7cff6b", "#ffffff", "#ff9f1c", "#ffffff"], "slikskive3"),
        "slikpind": slikpind, "isvaffel": isvaffel, "iskugle": iskugle, "kirsebær": kirsebær,
        "grantræ": grantræ, "snemand": snemand, "palmekrone": palmekrone, "palmeled": palmeled,
        "æble": æble, "jordbær": jordbær, "appelsin": appelsin, "druer": druer,
        "pude_eng": pude_eng, "pude_slik": pude_slik, "pude_is": pude_is, "pude_jungle": pude_jungle, "pude_regnbue": pude_regnbue,
        "ballon": ballon}


if __name__ == "__main__":
    nulstil(ao_afstand=0.3)
    rod = tom("rasmus")
    led = samlet(rod, TING, afstand=7, pr_række=6)
    bpy.context.view_layer.update()
    ao([o for o in bpy.data.objects if o.type == "MESH"], styrke=0.55)
    prøve("rasmus.png", S(0, 16, 30), S(0, 2, -12))
    for l in led: l.location = (0, 0, 0)
    eksportér([rod], os.path.join(UD, "rasmus.glb"))
