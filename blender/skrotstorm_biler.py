# ===== Skrotstorm i Blender: de tre biler, man kan køre i =====
# Kør:  blender --background --factory-startup --python blender/skrotstorm_biler.py -- rotten buggy truck
# Gemmer spil/skrotstorm/modeller/<bil>.glb (erstatter de kantede biler fra byg-skrotstorm.py) og et prøvebillede.
#
# Tallene er spillets mål (x til højre, op, z fremad — bilen kører mod +z).
# Hjulene er led med navnene hjul_for_venstre, hjul_for_hoejre, hjul_bag_venstre og hjul_bag_hoejre,
# med midten i (±1,35; 0,48; ±1,4) ligesom før, så bilernes fysik og kamera passer uændret.
# Forlygterne har materialet "forlygte", som spillet får til at lyse.

import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tegnestue import *
from slange import drejet, fnug
from mathutils import Vector

UD = os.path.join(ROD, "spil", "skrotstorm", "modeller")
LAK = ("lak", 0.35, 0.0, 0.7)
KROM = ("krom", 0.18, 0.95)
GLAS = ("glas", 0.06, 0.3, 0.6)
GUMMI = ("gummi", 0.9)
MØRK = ("mørk metal", 0.55, 0.4)
LYS = ("forlygte", 0.15)
TRÆ = ("træ", 0.85)
STOF = ("stof", 0.95)


def rust(base, mængde=0.3, frø=0.0, stribe=None):
    """Lak med rustpletter (og evt. en stribe: (fra y, til y, farve))"""
    def f(p, n):
        x, y, z = G(p)
        if stribe and stribe[0] < y < stribe[1]: return stribe[2]
        v = math.sin(x * 3.1 + frø) * math.sin(z * 2.3 + y * 4.1 + frø * 2) + 0.55 * math.sin(x * 7.3 + z * 5.1 + frø)
        return bland(base, "#6e3416", 0.85 * trin(1.15 - mængde * 1.8, 0.3, v))
    return f


def hjul(navn, x, z, r=0.64, b=0.52, fælg="#c9cfd4", tykke_dæk=False):
    """Et hjul: dæk med mønster, fælg med møtrikker. Leddet har sin midte i hjulets midte."""
    side = 1 if x > 0 else -1
    led = tom(navn, S(x, 0.48, z))
    kort = navn.replace("hjul_", "")
    prof = [(0.0, -b / 2), (r * 0.6, -b / 2), (r * 0.84, -b / 2 * 0.99), (r * 0.96, -b / 2 * 0.85), (r, -b / 2 * 0.45),
            (r, b / 2 * 0.45), (r * 0.96, b / 2 * 0.85), (r * 0.84, b / 2 * 0.99), (r * 0.6, b / 2), (0.0, b / 2)]
    dæk = drej(f"dæk_{kort}", fin(prof, 2), "#1d2224", GUMMI, seg=64, c=S(x, 0.48, z))
    drejet(dæk, (0, math.pi / 2, 0))                                  # aksen peger nu sidelæns
    for v in dæk.data.vertices:                                       # klodset dækmønster
        rr = math.hypot(v.co.y, v.co.z)
        if rr > r * 0.95 and abs(v.co.x) < b * 0.48:
            a = math.atan2(v.co.z, v.co.y)
            if math.sin(a * (18 if tykke_dæk else 24) + (0.6 if v.co.x > 0 else 0)) > 0.1:
                v.co.y *= 1 + 0.045; v.co.z *= 1 + 0.045
    dæk.data.update()
    farv(dæk, lambda p, n: "#3a4144" if abs(p[0] - x) > b * 0.42 and math.hypot(p[1] + z, p[2] - 0.48) > r * 0.7 else "#1d2224")
    ud = x + side * b * 0.36
    fælgdisk = drej(f"fælg_{kort}", [(0.0, 0.0), (r * 0.58, 0.0), (r * 0.6, 0.04), (r * 0.5, 0.07), (r * 0.18, 0.09), (0.0, 0.1)],
                    lambda p, n: fælg if math.hypot(p[0] - ud, p[1] + z) > r * 0.22 else "#8a9196", KROM, seg=40, c=S(ud, 0.48, z))
    drejet(fælgdisk, (0, side * math.pi / 2, 0))
    dele = [dæk, fælgdisk]
    for i in range(5):                                                # møtrikker
        a = i / 5 * math.tau
        dele.append(ellipsoide(f"møtrik_{kort}{i}", S(ud + side * 0.09, 0.48 + math.sin(a) * 0.16, z + math.cos(a) * 0.16), (0.035, 0.035, 0.035), "#5a6064", KROM, seg=8, ring=6))
    for d in dele: sæt_forælder(d, led)
    return led


def fire_hjul(rod, **kw):
    for side, navn_side in ((-1, "venstre"), (1, "hoejre")):
        for z, ende in ((1.4, "for"), (-1.4, "bag")):
            sæt_forælder(hjul(f"hjul_{ende}_{navn_side}", side * 1.35, z, **kw), rod)


def lygte(navn, x, y, z, r=0.2, ring="#c9cfd4", retning=1):
    """En rund forlygte med kromring (retning 1 = fremad, -1 = bagud)"""
    glas = ellipsoide(navn, S(x, y, z), (r, r * 0.5, r), lambda p, n: "#fff6d8" if math.hypot(p[0] - x - r * 0.3, p[2] - y - r * 0.3) < r * 0.3 else "#ffe9a8", LYS, seg=24, ring=14)
    kant = torus(navn + "kant", S(x, y, z - retning * 0.02), r * 1.02, r * 0.16, ring, KROM, rot=(math.pi / 2, 0, 0), seg=28, tseg=8)
    return [glas, kant]


def kofanger(navn, z, y=0.66, b=1.3, r=0.11):
    return pølse(navn, [S(-b, y, z - 0.25 * math.copysign(1, z)), S(-b * 0.85, y, z), S(b * 0.85, y, z), S(b, y, z - 0.25 * math.copysign(1, z))],
                 [r, r, r, r], "#d6dade", KROM, glathed=1)


# ---------- Rustrotten: en lille, hurtig retrobil med tagbagage ----------
def lav_rotten():
    rod = tom("rotten")
    ORANGE = "#e2702a"
    dele = [kasse("rottekrop", S(0, 1.0, 0.05), (2.6, 4.9, 0.85), rust(ORANGE, 0.32, 1.0, (1.06, 1.17, "#f1dfb0")), LAK, rund=0.32, deling=(10, 16, 8)),
            kasse("rottehjelm", S(0, 1.42, 1.55), (2.35, 1.7, 0.3), rust(ORANGE, 0.25, 2.0), LAK, rund=0.14, deling=(8, 6, 1)),
            kasse("rottekabine", S(0, 1.95, -0.4), (2.12, 2.3, 0.82), "#1d3a48", GLAS, rund=0.3),
            kasse("rottetag", S(0, 2.38, -0.45), (2.22, 2.25, 0.16), rust(ORANGE, 0.2, 3.0), LAK, rund=0.08)]
    for s in (-1, 1):
        dele.append(kasse(f"rottestolpe{s}", S(s * 1.05, 1.95, -0.4), (0.08, 0.2, 0.82), ORANGE, LAK, rund=0.03))
        for z in (1.4, -1.4):                                           # buede skærme over hjulene
            sk = ellipsoide(f"rotteskærm{s}{z}", S(s * 1.22, 1.0, z), (0.42, 0.98, 0.62), rust(ORANGE, 0.35, z), LAK, seg=32, ring=18)
            klip(sk, lambda xx, yy, zz: yy < -0.05)
            dele.append(sk)
        dele += lygte(f"rotteforlygte{s}", s * 0.82, 1.15, 2.47)
        dele.append(kasse(f"rottebaglygte{s}", S(s * 0.95, 1.2, -2.42), (0.36, 0.08, 0.22), "#d0281e", ("baglygte", 0.2), rund=0.04))
        dele.append(ellipsoide(f"rottespejl{s}", S(s * 1.22, 1.62, 0.75), (0.16, 0.1, 0.12), ORANGE, LAK, seg=12, ring=8))
    dele += [kasse("rottegrill", S(0, 1.0, 2.48), (1.2, 0.08, 0.42), "#2a3033", MØRK, rund=0.05)]
    for i in range(5):
        dele.append(kasse(f"rottegrillstang{i}", S(-0.48 + i * 0.24, 1.0, 2.53), (0.05, 0.04, 0.38), "#d6dade", KROM, rund=0.01))
    dele += [kofanger("rotteforkofanger", 2.58), kofanger("rottebagkofanger", -2.5),
             kasse("rottenummerplade", S(0, 0.86, -2.55), (0.7, 0.04, 0.26), lambda p, n: "#2a3033" if abs(p[0]) < 0.25 and abs(p[2] - 0.86) < 0.07 else "#f1dfb0", MØRK, rund=0.02),
             pølse("rotteudstødning", [S(0.7, 0.62, -2.2), S(0.7, 0.6, -2.7)], [0.08, 0.09], "#8a9196", KROM, glathed=1)]
    # tagbagage: rør, en turkis kasse og et reservehjul
    for s in (-1, 1):
        dele.append(pølse(f"tagrør{s}", [S(s * 0.9, 2.5, 0.5), S(s * 0.9, 2.55, 0.3), S(s * 0.9, 2.55, -1.3), S(s * 0.9, 2.5, -1.5)], [0.05] * 4, "#2a3033", MØRK, glathed=1))
    dele.append(kasse("tagkasse", S(-0.3, 2.82, -0.55), (0.9, 1.3, 0.48), "#1fa59a", LAK, rund=0.08))
    dele.append(torus("tagreservehjul", S(0.55, 2.72, -0.6), 0.38, 0.13, "#1d2224", GUMMI, seg=32, tseg=12))
    for d in dele: sæt_forælder(d, rod)
    fire_hjul(rod)
    return rod


# ---------- Sandloppen: en åben klitbuggy med styrtbøjle ----------
def lav_buggy():
    rod = tom("buggy")
    TURKIS = "#1fa59a"
    krop = kasse("buggykrop", S(0, 0.95, 0.1), (2.3, 4.7, 0.72), rust(TURKIS, 0.15, 4.0, (0.93, 1.04, "#f1dfb0")), LAK, rund=0.3, deling=(8, 16, 8))
    skub(krop, S(0, 1.3, 2.4), 1.2, S(0, -0.28, 0))                       # næsen skråner ned
    dele = [krop, kasse("buggygulv", S(0, 1.33, -0.4), (1.9, 2.4, 0.06), "#2a3033", MØRK, rund=0.02)]
    for s in (-1, 1):
        dele.append(kasse(f"buggysæde{s}", S(s * 0.48, 1.62, -0.55), (0.7, 0.62, 0.5), "#3a3030", STOF, rund=0.15))
        dele.append(kasse(f"buggyryg{s}", S(s * 0.48, 2.05, -0.9), (0.7, 0.18, 0.9), "#3a3030", STOF, rund=0.12))
        dele += lygte(f"buggylygte{s}", s * 0.7, 1.25, 2.3, r=0.16)
        # styrtbøjlen
        dele.append(pølse(f"bøjleside{s}", [S(s * 1.0, 1.25, -1.4), S(s * 0.95, 2.75, -1.1), S(s * 0.9, 2.8, 0.2), S(s * 1.05, 1.35, 1.25)], [0.08] * 4, "#f1dfb0", ("rør", 0.4, 0.3), glathed=1))
        dele.append(pølse(f"bøjleskrå{s}", [S(s * 0.95, 2.75, -1.1), S(s * 0.4, 1.4, -2.0)], [0.06, 0.06], "#f1dfb0", ("rør", 0.4, 0.3), glathed=1))
    for z, y in ((-1.1, 2.75), (0.2, 2.8)):
        dele.append(pølse(f"bøjletvær{z}", [S(-0.95, y, z), S(0.95, y, z)], [0.08, 0.08], "#f1dfb0", ("rør", 0.4, 0.3), glathed=1))
    for i in range(4):                                                    # lysbjælke på taget
        dele.append(ellipsoide(f"buggytaglys{i}", S(-0.6 + i * 0.4, 2.95, 0.2), (0.14, 0.08, 0.12), "#ffe9a8", LYS, seg=16, ring=10))
    dele.append(torus("rat", S(-0.48, 1.95, 0.35), 0.24, 0.035, "#2a3033", MØRK, rot=(0.9, 0, 0), seg=24, tseg=8))
    dele.append(pølse("ratstamme", [S(-0.48, 1.95, 0.35), S(-0.48, 1.5, 0.8)], [0.035, 0.035], "#2a3033", glathed=1))
    # motoren bagi med udstødningsrør og et stående reservehjul
    dele.append(kasse("buggymotor", S(0, 1.55, -1.95), (1.4, 0.9, 0.7), "#2a3033", MØRK, rund=0.1))
    for s in (-1, 1):
        dele.append(pølse(f"buggyrør{s}", [S(s * 0.45, 1.6, -2.3), S(s * 0.5, 1.3, -2.6), S(s * 0.55, 1.4, -2.85)], [0.07, 0.07, 0.08], "#c9cfd4", KROM, glathed=1))
    dele.append(drejet(torus("buggyreservehjul", S(0, 2.05, -2.45), 0.42, 0.15, "#1d2224", GUMMI, seg=32, tseg=12), (math.pi / 2, 0, 0)))
    dele.append(kofanger("buggykofanger", 2.55, y=0.75, b=1.1, r=0.09))
    for d in dele: sæt_forælder(d, rod)
    fire_hjul(rod, tykke_dæk=True)
    return rod


# ---------- Jernoksen: en stærk, rolig pickup med lad ----------
def lav_truck():
    rod = tom("truck")
    CREME = "#e6d6ac"
    dele = [kasse("trucklegeme", S(0, 1.05, 0.0), (2.72, 5.0, 0.95), rust(CREME, 0.28, 5.0, (1.16, 1.33, "#d8682a")), LAK, rund=0.22, deling=(10, 16, 10)),
            kasse("truckhjelm", S(0, 1.68, 1.75), (2.5, 1.45, 0.3), rust(CREME, 0.2, 6.0), LAK, rund=0.14, deling=(8, 6, 1)),
            kasse("truckkabine", S(0, 2.1, 0.55), (2.5, 1.75, 1.2), rust(CREME, 0.25, 7.0), LAK, rund=0.24, deling=(8, 6, 4)),
            kasse("truckruder", S(0, 2.25, 0.55), (2.56, 1.85, 0.6), "#1d3a48", GLAS, rund=0.2),
            kasse("truckgrill", S(0, 1.25, 2.47), (1.9, 0.1, 0.6), "#2a3033", MØRK, rund=0.06)]
    for i in range(7):
        dele.append(kasse(f"truckgrillstang{i}", S(-0.75 + i * 0.25, 1.25, 2.53), (0.06, 0.05, 0.54), "#d6dade", KROM, rund=0.01))
    for s in (-1, 1):
        dele += lygte(f"truckforlygte{s}", s * 1.05, 1.3, 2.47, r=0.22)
        dele.append(kasse(f"truckbaglygte{s}", S(s * 1.12, 1.25, -2.48), (0.3, 0.08, 0.36), "#d0281e", ("baglygte", 0.2), rund=0.04))
        dele.append(kasse(f"truckspejl{s}", S(s * 1.42, 2.25, 1.1), (0.12, 0.22, 0.36), "#2a3033", MØRK, rund=0.04))
        for z in (1.4, -1.4):
            sk = ellipsoide(f"truckskærm{s}{z}", S(s * 1.28, 1.02, z), (0.38, 1.0, 0.66), rust(CREME, 0.3, z + s), LAK, seg=32, ring=18)
            klip(sk, lambda xx, yy, zz: yy < -0.05)
            dele.append(sk)
        dele.append(kasse(f"ladside{s}", S(s * 1.28, 1.82, -1.45), (0.12, 2.0, 0.62), rust(CREME, 0.35, 8.0 + s), LAK, rund=0.04))
    dele += [kasse("ladbund", S(0, 1.55, -1.45), (2.5, 2.0, 0.08), træfarve_lad, TRÆ, rund=0.02, deling=(0, 10, 0)),
             kasse("ladlem", S(0, 1.82, -2.45), (2.6, 0.12, 0.62), rust(CREME, 0.35, 9.0, (1.75, 1.88, "#d8682a")), LAK, rund=0.04),
             kasse("lastkasse1", S(-0.5, 1.95, -1.1), (0.9, 0.8, 0.75), træfarve_lad, TRÆ, rund=0.04),
             kasse("lastkasse2", S(0.55, 1.85, -1.75), (0.8, 0.8, 0.55), træfarve_lad, TRÆ, rund=0.04),
             drej("lasttønde", fin([(0, 1.59), (0.36, 1.59), (0.4, 1.85), (0.36, 2.25), (0, 2.25)], 2), lambda p, n: "#2a3033" if abs(p[2] - 1.85) < 0.04 else "#e2702a", LAK, seg=24, c=S(0.5, 0, -0.95)),
             kofanger("truckforkofanger", 2.6, y=0.72, b=1.38, r=0.14), kofanger("truckbagkofanger", -2.55, y=0.72, b=1.35, r=0.12)]
    for i in range(4):                                                    # lys på taget
        dele.append(ellipsoide(f"trucktaglys{i}", S(-0.6 + i * 0.4, 2.8, 1.05), (0.12, 0.08, 0.1), "#ffb347", LYS, seg=14, ring=8))
    dele.append(kasse("lysbjælke", S(0, 2.72, 1.0), (1.7, 0.2, 0.08), "#2a3033", MØRK, rund=0.03))
    dele.append(pølse("antenne", [S(1.1, 2.7, 0.2), S(1.15, 4.0, 0.0)], [0.02, 0.01], "#2a3033", glathed=1))
    for d in dele: sæt_forælder(d, rod)
    fire_hjul(rod, fælg="#e2702a")
    return rod


def træfarve_lad(p, n):
    x, y, z = G(p)
    return bland("#9a6a3a", "#c08850", trin(0.4, 0.4, math.sin(x * 11 + math.sin(z * 3) * 1.5)))


BILER = {"rotten": lav_rotten, "buggy": lav_buggy, "truck": lav_truck}

if __name__ == "__main__":
    hvilke = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(BILER)
    for navn in hvilke:
        nulstil(ao_afstand=0.35)
        rod = BILER[navn]()
        bpy.context.view_layer.update()
        ao([o for o in bpy.data.objects if o.type == "MESH"], styrke=0.5)
        prøve(f"skrotstorm_{navn}.png", S(-5.5, 3.6, 6.5), S(0, 1.2, 0))
        eksportér([rod], os.path.join(UD, f"{navn}.glb"), normaler=True)
