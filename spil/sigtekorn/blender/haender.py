# ===== Hænderne om våbnet: halvfingerhandsker med rigtige fingre, der krummer sig om grebet =====
# Hver finger har tre led (og runde knoer), og fingerspidserne er bare (hudfarvede), så man kan se fingrene.
# Fingrene lægges tæt om våbnets rigtige overflade: for hver finger sendes stråler ind mod grebets akse,
# og leddene sættes lige uden på det sted, strålen rammer.
# Tre slags greb:
#   pistol — højre hånd om et pistolgreb (pegefingeren på aftrækkeren, tommelen langs venstre side)
#   forgreb — venstre hånd under håndbeskytteren (fingrene op ad højre side, tommelen langs venstre)
#   skaft — en hånd om et vandret skaft (kniv, machete, hakke)
# Koordinater som våbnene: x til højre, y frem, z op.

import math
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from faelles import rør, kugle, løft, farvet, saml, bag

R = math.radians


def materialer():
    return dict(
        HANDSKE=farvet("handske", (0.05, 0.047, 0.042), ru=0.78, støj=0.28, skala=170),
        BESKYT=farvet("knobeskytter", (0.12, 0.115, 0.1), ru=0.5, støj=0.12, skala=90),
        HUD=farvet("hud", (0.62, 0.39, 0.27), ru=0.48, støj=0.07, skala=35),
        ÆRME=farvet("ærme", (0.42, 0.33, 0.2), ru=0.95, støj=0.2, skala=60),
        REM=farvet("rem", (0.2, 0.17, 0.12), ru=0.8, støj=0.1, skala=80))


class Greb:
    """Våbnets overflade rundt om en akse. φ = 0 er 'side', φ = 90° er 'frem' (vinkelret på aksen)"""

    def __init__(self, bvh, midt, akse, side, maks=0.05, standard=0.02):
        self.bvh, self.midt, self.maks, self.standard = bvh, Vector(midt), maks, standard
        self.u = Vector(akse).normalized()
        s = Vector(side); self.x = (s - s.dot(self.u) * self.u).normalized()
        self.f = self.x.cross(self.u).normalized()

    def retning(self, φ):
        return self.x * math.cos(φ) + self.f * math.sin(φ)

    def radius(self, s, φ):
        """Hvor langt er der fra aksen ud til våbnets overflade i denne retning?"""
        c = self.midt + self.u * s; d = self.retning(φ); start = self.maks + 0.01
        hit = self.bvh.ray_cast(c + d * start, -d, start)
        if hit[0] is None: return self.standard
        return max(0.006, min(self.maks, start - hit[3]))

    def punkt(self, s, φ, ud):
        return self.midt + self.u * s + self.retning(φ) * (self.radius(s, φ) + ud)


def bue(g, s, φ0, længder, fr, retning=1):
    """Leddene i en finger, der krummer sig om grebet: start i vinklen φ0 og gå rundt (længderne er de tre led)"""
    led = [g.punkt(s, φ0, fr)]; φ, acc, sidste, rest = φ0, 0.0, led[0], list(længder)
    while rest and abs(φ - φ0) < R(330):
        φ += R(1.5) * retning; p = g.punkt(s, φ, fr)
        acc += (p - sidste).length; sidste = p
        if acc >= rest[0]: led.append(p); rest.pop(0); acc = 0.0
    while rest: led.append(led[-1] + (led[-1] - led[-2]).normalized() * rest.pop(0))   # (ude over kanten: lige ud)
    return led


def finger(navn, led, fr, M, bar=1, knoe=True):
    """En finger gennem leddene: rør mellem leddene, en kugle i hvert led — de sidste 'bar' led er hud.
    knoe: en lille polstret hætte på knoen (handskens beskyttelse)"""
    d = []
    if knoe: d.append(kugle(f"{navn}knoe", tuple(led[0]), fr * 1.3, M["BESKYT"], 1, 1, 1, 10, 6))
    for i in range(len(led) - 1):
        mat = M["HUD"] if i >= len(led) - 1 - bar else M["HANDSKE"]
        r = fr * (1 - 0.07 * i)
        d.append(rør(f"{navn}{i}", tuple(led[i]), tuple(led[i + 1]), r, mat, 10, 0.0015))
        d.append(kugle(f"{navn}led{i}", tuple(led[i]), r * 1.05, M["HANDSKE"] if i < len(led) - 1 - bar else M["HUD"], 1, 1, 1, 10, 7))
    d.append(kugle(f"{navn}spids", tuple(led[-1]), fr * 0.88, M["HUD"] if bar else M["HANDSKE"], 1, 1, 1, 10, 7))
    return d


def håndflade(navn, g, s0, s1, φa, φb, tyk, M, tyk_b=None, n_s=7, n_φ=11):
    """Håndfladen som en skal, der ligger tæt om grebet mellem vinklerne φa og φb (tykkelsen kan aftage mod φb)"""
    tyk_b = tyk if tyk_b is None else tyk_b
    snit = []
    for i in range(n_s):
        s = s0 + (s1 - s0) * i / (n_s - 1)
        kant = 1 - 0.55 * abs(2 * i / (n_s - 1) - 1) ** 2              # (tyndere i top og bund, så den ikke ser kantet ud)
        ude, inde = [], []
        for j in range(n_φ):
            t = j / (n_φ - 1); φ = φa + (φb - φa) * t
            ude.append(tuple(g.punkt(s, φ, 0.001 + (tyk + (tyk_b - tyk) * t) * kant)))
            inde.append(tuple(g.punkt(s, φ, 0.001)))
        snit.append(ude + inde[::-1])
    o = løft(navn, snit, M["HANDSKE"], 0.004)
    o.modifiers.remove(o.modifiers["afrund"])                          # (ingen afrunding — den bliver glat af sig selv)
    glat = o.modifiers.new("glat", "SUBSURF"); glat.levels = glat.render_levels = 1   # (rund og blød som en rigtig hånd)
    return o


def tommel(navn, punkter, M):
    """Tommelen gennem punkterne (to led — det yderste er hud)"""
    return finger(navn, [Vector(p) for p in punkter], 0.0098, M, 1, knoe=False)


def ærme(navn, a, b, M):
    """Ærmet (lidt bredere ved albuen) og en rem om håndleddet"""
    a, b = Vector(a), Vector(b); r = (b - a).normalized()
    return [rør(navn, tuple(a), tuple(b), 0.04, M["ÆRME"], 20, 0.004, 0.05),
            rør(navn + " manchet", tuple(a - r * 0.012), tuple(a + r * 0.03), 0.043, M["ÆRME"], 20, 0.004),
            rør(navn + " rem", tuple(a - r * 0.04), tuple(a - r * 0.018), 0.031, M["REM"], 18, 0.003)]


# ---------- de tre slags greb ----------
def mål_pistolgreb(bvh, p):
    """Find pistolgrebets akse: midten af grebet (forfra/bagfra) i to højder"""
    midter = []
    for dz in (0.012, -0.03):
        c = Vector((0, p[1], p[2] + dz))
        frem = bvh.ray_cast(c + Vector((0, 0.07, 0)), Vector((0, -1, 0)), 0.07)
        bag_ = bvh.ray_cast(c - Vector((0, 0.07, 0)), Vector((0, 1, 0)), 0.07)
        yf = frem[0].y if frem[0] else p[1] + 0.026; yb = bag_[0].y if bag_[0] else p[1] - 0.026
        midter.append(Vector((0, (yf + yb) / 2, c.z)))
    akse = (midter[1] - midter[0]).normalized()
    if akse.z > -0.6: akse = Vector((0, -0.3, -1)).normalized()           # (urimeligt: brug en almindelig hældning)
    return (midter[0] + midter[1]) / 2, akse


def højre_pistol(bvh, p, M, støtte=False):
    """Højre hånd om pistolgrebet — eller (støtte) venstre hånd uden om den, spejlet"""
    midt, akse = mål_pistolgreb(bvh, p)
    g = Greb(bvh, midt, akse, Vector((-1, 0, 0)) if støtte else Vector((1, 0, 0)), maks=0.045)
    if støtte:                                                            # spejlet: φ = 0 er venstre side, og 90° er stadig frem
        g.f = -g.f; r0 = g.radius
        g.radius = lambda s, φ: r0(s, φ) + 0.018                          # (støttehånden ligger uden på den anden hånds fingre)
    # toppen af grebet: hvor forsiden springer frem (aftrækkerbøjlen)
    base = g.radius(0, R(90)); top = -0.05
    for i in range(30):
        s = -0.004 * i
        if g.radius(s, R(90)) > base * 1.5 + 0.004: top = s + 0.004; break
    d = []
    fs = [top + 0.012, top + 0.032, top + 0.051] if not støtte else [top + 0.022, top + 0.041, top + 0.06, top + 0.078]
    skala = [1.0, 0.95, 0.82] if not støtte else [1.0, 1.0, 0.95, 0.82]
    for i, (s, k) in enumerate(zip(fs, skala)):
        d += finger(f"finger{i}", bue(g, s, R(15), [0.043 * k, 0.026 * k, 0.021 * k], 0.0088), 0.0088, M)
    s0, s1 = top - 0.008, fs[-1] + 0.016
    d.append(håndflade("håndflade", g, s0, s1, R(-40 if støtte else -150), R(22), 0.009 if støtte else 0.01, M, 0.013 if støtte else 0.017))   # (tynd håndryg — ikke en bold)
    if not støtte:
        # pegefingeren: frem langs bøjlen og ind på aftrækkeren
        k0 = g.punkt(top - 0.006, R(40), 0.0095)
        k1 = k0 + g.f * 0.034 - g.x * 0.004 - g.u * 0.004
        k2 = k1 + g.f * 0.008 - g.x * 0.016 + g.u * 0.012
        k3 = k2 - g.x * 0.006 + g.u * 0.009 - g.f * 0.004
        d += finger("pegefinger", [k0, k1, k2, k3], 0.0085, M)
    # tommelen: fra kløften bag på grebet rundt om venstre side og frem langs rammen
    if støtte: t0 = g.punkt(top + 0.014, R(-30), 0.012); t1 = g.punkt(top + 0.004, R(20), 0.011); t2 = t1 + g.f * 0.03 - g.u * 0.004
    else: t0 = g.punkt(top + 0.006, R(-120), 0.013); t1 = g.punkt(top - 0.002, R(-178), 0.012); t2 = t1 + g.f * 0.034 - g.u * 0.01
    d += tommel("tommel", [t0, t1, t2], M)
    # håndleddet bagud mod ærmet
    return d, g.punkt(s1 - 0.012, R(-70), 0.014)


def venstre_forgreb(bvh, p, M):
    """Venstre hånd under håndbeskytteren: håndfladen under, fingrene op ad højre side, tommelen langs venstre"""
    under = bvh.ray_cast(Vector((0, p[1], p[2] - 0.08)), Vector((0, 0, 1)), 0.2)
    zb = under[0].z if under[0] else p[2]
    sider = [bvh.ray_cast(Vector((sx * 0.1, p[1], zb + 0.02)), Vector((-sx, 0, 0)), 0.1) for sx in (1, -1)]
    a = max([abs(h[0].x) for h in sider if h[0]] + [0.018])
    rad = min(0.04, max(0.018, a))
    g = Greb(bvh, (0, p[1], zb + rad), (0, 1, 0), (1, 0, 0), maks=0.05, standard=rad)
    d = []
    fs = [0.026, 0.008, -0.01, -0.027]; skala = [0.95, 1.0, 0.96, 0.82]
    for i, (s, k) in enumerate(zip(fs, skala)):
        d += finger(f"vfinger{i}", bue(g, s, R(-38), [0.042 * k, 0.026 * k, 0.02 * k], 0.0086), 0.0086, M)
    d.append(håndflade("venstre håndflade", g, -0.04, 0.037, R(-160), R(-36), 0.022, M, 0.016))
    t0 = g.punkt(-0.03, R(-150), 0.012); t1 = g.punkt(-0.004, R(-185), 0.011); t2 = g.punkt(0.026, R(-195), 0.009)
    d += tommel("vtommel", [t0, t1, t2], M)
    return d, g.punkt(-0.042, R(-120), 0.016)


def skaft(bvh, p, M, venstre=False, navn="h"):
    """En hånd om et vandret skaft (langs y): håndfladen på siden, fingrene ind under, tommelen ovenpå"""
    sx = -1 if venstre else 1
    g = Greb(bvh, p, (0, 1, 0), (sx, 0, 0), maks=0.035, standard=0.016)
    # (med 'side' = højre er φ = 90° op — for venstre hånd spejles det, så φ = 90° også er op)
    if venstre: g.f = -g.f
    d = []
    fs = [0.024, 0.006, -0.012, -0.029]; skala = [0.95, 1.0, 0.96, 0.82]
    for i, (s, k) in enumerate(zip(fs, skala)):
        d += finger(f"{navn}finger{i}", bue(g, s, R(-40), [0.043 * k, 0.026 * k, 0.02 * k], 0.0088, -1), 0.0088, M)
    d.append(håndflade(f"{navn} håndflade", g, -0.042, 0.036, R(-35), R(75), 0.02, M, 0.014))
    t0 = g.punkt(-0.02, R(70), 0.012); t1 = g.punkt(0.006, R(98), 0.011); t2 = g.punkt(0.034, R(105), 0.009)
    d += tommel(f"{navn}tommel", [t0, t1, t2], M)
    return d, g.punkt(-0.045, R(15), 0.016)


# ---------- Saml det hele ----------
def lav_hænder(spec, våben):
    """Byg begge hænder (og ærmerne) om våbnet ud fra opskriften fra vaabendele.hænder()"""
    bvh = BVHTree.FromObject(våben, bpy.context.evaluated_depsgraph_get())
    M = materialer(); hd = []
    p = Vector(spec["højre"]); type_ = spec["type"]
    if type_ == "skaft": dele, led = skaft(bvh, p, M, navn="h")
    else: dele, led = højre_pistol(bvh, p, M)
    hd += dele
    a, b = spec["højre_ærme"]
    hd.append(rør("højre håndled", tuple(led), tuple(Vector(a) + (Vector(b) - Vector(a)).normalized() * -0.02), 0.026, M["HANDSKE"], 18, 0.004, 0.03))
    hd += ærme("højre ærme", a, b, M)
    if spec["venstre"]:
        v = Vector(spec["venstre"])
        if type_ == "skaft": dele, led = skaft(bvh, v, M, venstre=True, navn="v")
        elif (v - p).length < 0.07: dele, led = højre_pistol(bvh, p + Vector((0, 0, -0.006)), M, støtte=True)   # (pistol med begge hænder)
        else: dele, led = venstre_forgreb(bvh, v, M)
        hd += dele
        a, b = spec["venstre_ærme"] or (tuple(v + Vector((-0.04, -0.07, -0.05))), tuple(v + Vector((-0.24, -0.36, -0.22))))
        hd.append(rør("venstre håndled", tuple(led), tuple(Vector(a) + (Vector(b) - Vector(a)).normalized() * -0.02), 0.026, M["HANDSKE"], 18, 0.004, 0.03))
        hd += ærme("venstre ærme", a, b, M)
    o = saml("hænder", hd); bag(o, "hænder", 1024)
    o["greb"] = tuple(spec["højre"])
    return o
