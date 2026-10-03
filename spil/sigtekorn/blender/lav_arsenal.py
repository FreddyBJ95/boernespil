# ===== Arsenalet: alle de nye våben i kataloget (katalog.js) — hvert med handsker og ærmer → modeller/<navn>.glb =====
# Samme stil som stormgeværet (lav_gevaer.py): x til højre, y frem (løbet), z op, nulpunktet ved grebet.
# Hvert våben bygges af dele (kasser, rør og "løft"), bages ned i to billeder og gemmes med et punkt for
# mundingen og et for venstre hånd (forgrebet), som botterne bruger.
# Kør:  blender --background --factory-startup --python lav_arsenal.py
# Kun nogle af dem:  ARSENAL=taktisk,pump blender --background --factory-startup --python lav_arsenal.py

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import *
from faelles import _obj
from vaabendele import hænder, gem


def sæt():
    """Materialerne, de fleste våben bruger"""
    return dict(STÅL=metal("stål"), LYS=metal("lyst stål", (0.08, 0.08, 0.085), (0.55, 0.56, 0.58), 0.3),
                POLY=farvet("polymer", (0.03, 0.03, 0.032), ru=0.7, støj=0.08, skala=200), TRÆ=træ("træ"),
                GUMMI=farvet("gummi", (0.02, 0.02, 0.022), ru=0.9), GLAS=farvet("glas", (0.05, 0.12, 0.16), ru=0.05, met=0.6))


def greb(navn, x, y, z, mat, hæld=0.02):
    """Et pistolgreb under nulpunktet (skråt bagud)"""
    return løft(navn, [[(-w, y0, zz), (w, y0, zz), (w, y1, zz), (-w, y1, zz)] for (zz, w, y0, y1) in
                       [(z, 0.0135, y - 0.035, y + 0.02), (z - 0.055, 0.0145, y - 0.05 - hæld, y + 0.005 - hæld), (z - 0.105, 0.015, y - 0.064 - 2 * hæld, y - 0.012 - 2 * hæld)]], mat, 0.005)


def bøjle(navn, y0, længde, z, mat):
    """Aftrækkerbøjlen og aftrækkeren"""
    bue = []
    for i in range(11):
        v = math.pi * i / 10; y = y0 + længde / 2 - math.cos(v) * længde / 2; zz = z - math.sin(v) * 0.022
        bue.append([(-0.003, y - 0.002, zz), (0.003, y - 0.002, zz), (0.003, y + 0.002, zz - 0.003), (-0.003, y + 0.002, zz - 0.003)])
    return [løft(navn, bue, mat, 0.001), kasse(navn + "_aftr", -0.0025, y0 + længde * 0.3, z - 0.02, 0.0025, y0 + længde * 0.45, z, mat, 0.001)]


def magasin(navn, y0, y1, z0, længde, bøj, mat, w=0.015, ribber=True):
    """Et magasin, der hænger ned (og bøjer lidt frem)"""
    snit = []
    for i in range(7):
        t = i / 6; z = z0 - t * længde; f = bøj * t * t
        snit.append([(-w, y0 + f, z), (w, y0 + f, z), (w, y1 + f + 0.006 * t, z), (-w, y1 + f + 0.006 * t, z)])
    d = [løft(navn, snit, mat, 0.004)]
    if ribber:
        for i in range(3):
            t = 0.25 + i * 0.22; z = z0 - t * længde; f = bøj * t * t
            d.append(kasse(f"{navn}_ribbe{i}", -w - 0.001, y0 + 0.006 + f, z - 0.004, w + 0.001, y1 - 0.006 + f, z + 0.004, mat, 0.0015))
    return d


def skinne(navn, y0, y1, z, mat):
    """En skinne oven på våbnet (til sigter) med tænder"""
    d = [kasse(navn, -0.011, y0, z, 0.011, y1, z + 0.009, mat, 0.0015)]
    n = int((y1 - y0) / 0.022)
    for i in range(n): d.append(kasse(f"{navn}{i}", -0.0115, y0 + 0.006 + i * 0.022, z + 0.009, 0.0115, y0 + 0.016 + i * 0.022, z + 0.013, mat, 0.0008))
    return d


def ærme(x, y, z):
    """Højre ærme regnet ud fra grebets plads"""
    return ((x + 0.06, y - 0.075, z - 0.07), (x + 0.19, y - 0.385, z - 0.23))


def ring(navn, c, R, r, mat, drej=(0, math.pi / 2, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=c, rotation=drej, major_segments=24, minor_segments=8)
    o = bpy.context.active_object; o.name = navn; o.data.materials.append(mat)
    return o


def hult_rør(navn, a, b, r, tyk, mat, seg=28):
    """Et rør uden låg, man kan kigge igennem (rødpunktsigtet): væggen er tyk tyk og går indad"""
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=(b - a).length)
    rot = (b - a).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=bm.verts)
    o = _obj(navn, bm, mat)
    v = o.modifiers.new("væg", "SOLIDIFY"); v.thickness = tyk; v.offset = -1; v.use_even_offset = True
    for p in o.data.polygons: p.use_smooth = True
    return o


# Hvor øjet er, når man sigter ned over våbnet: bag sigtet på sigtelinjen (kun de våben, der har "sigte" i katalog.js)
ØJE = {"kamp": (0, -0.01, 0.087), "jagt": (0, 0.1, 0.048), "armbroest": (0, -0.1, 0.073)}


def kurve_klinge(navn, punkter, tyk, mat):
    """En klinge set fra siden (punkter i (y, z)), trukket ud i tykkelsen"""
    bm = bmesh.new()
    vs = [[bm.verts.new(Vector((x, y, z))) for (y, z) in punkter] for x in (-tyk / 2, tyk / 2)]
    n = len(punkter)
    for i in range(n): bm.faces.new((vs[0][i], vs[0][(i + 1) % n], vs[1][(i + 1) % n], vs[1][i]))
    bm.faces.new(vs[0]); bm.faces.new(list(reversed(vs[1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return afrund(_obj(navn, bm, mat), 0.0008, 2)


# =====================================================================================================
def taktisk(M):
    d = [kasse("nedre", -0.02, -0.03, -0.045, 0.02, 0.17, 0.0, M["POLY"], 0.004), kasse("øvre", -0.021, -0.04, 0.0, 0.021, 0.2, 0.035, M["STÅL"], 0.004)]
    d += skinne("skinne", -0.035, 0.42, 0.035, M["STÅL"])
    d.append(løft("håndskærm", [firkant(y, -0.024, 0.024, -0.03, 0.033) for y in (0.2, 0.3, 0.415)], M["POLY"], 0.006))
    for i in range(4): d.append(kasse(f"rille{i}", -0.0245, 0.235 + i * 0.045, -0.01, 0.0245, 0.258 + i * 0.045, 0.015, M["GUMMI"], 0.002))
    d += [rør("pibe", (0, 0.41, 0.012), (0, 0.47, 0.012), 0.008, M["STÅL"], 16), rør("lyddæmper", (0, 0.465, 0.012), (0, 0.66, 0.012), 0.019, M["POLY"], 24, 0.003)]
    for y in (0.5, 0.6): d.append(rør(f"dæmperring{y}", (0, y, 0.012), (0, y + 0.008, 0.012), 0.0195, M["STÅL"], 24))
    d += magasin("magasin", 0.075, 0.118, -0.045, 0.16, 0.02, M["STÅL"])
    d += [greb("greb", 0, -0.005, -0.045, M["POLY"]), rør("buffer", (0, -0.04, 0.012), (0, -0.2, 0.012), 0.016, M["STÅL"], 16),
          kasse("skæfte", -0.021, -0.31, -0.055, 0.021, -0.14, 0.032, M["POLY"], 0.008), kasse("kolbe", -0.023, -0.325, -0.062, 0.023, -0.305, 0.036, M["GUMMI"], 0.004),
          kasse("ladegreb", -0.016, -0.05, 0.03, 0.016, -0.03, 0.04, M["STÅL"], 0.002), kasse("korn", -0.003, 0.38, 0.044, 0.003, 0.39, 0.075, M["STÅL"], 0.001),
          kasse("bagsigte", -0.01, -0.02, 0.044, 0.01, 0.0, 0.066, M["STÅL"], 0.002)]
    d += bøjle("bøjle", 0.0, 0.07, -0.045, M["STÅL"])
    return d, hænder((0, -0.02, -0.085), (0, 0.3, -0.045), ærme(0, -0.02, -0.085)), (0, 0.67, 0.012), (0, 0.3, -0.03)


def salve(M):
    GRØN = farvet("salvegrøn", (0.12, 0.14, 0.12), ru=0.65, støj=0.1, skala=80)
    d = [løft("krop", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in [(-0.36, 0.024, -0.09, 0.025), (-0.2, 0.026, -0.06, 0.035), (0.05, 0.026, -0.045, 0.04), (0.3, 0.023, -0.035, 0.03)]], GRØN, 0.01),
         kasse("håndtagforan", -0.012, 0.2, 0.035, 0.012, 0.24, 0.11, GRØN, 0.006), kasse("håndtagbag", -0.012, -0.15, 0.035, 0.012, -0.11, 0.11, GRØN, 0.006),
         kasse("håndtagtop", -0.014, -0.15, 0.095, 0.014, 0.24, 0.118, GRØN, 0.008), rør("pibe", (0, 0.3, 0.0), (0, 0.5, 0.0), 0.009, M["STÅL"], 16),
         rør("flammeskjuler", (0, 0.49, 0.0), (0, 0.53, 0.0), 0.012, M["STÅL"], 16), kasse("kolbe", -0.025, -0.375, -0.095, 0.025, -0.355, 0.028, M["GUMMI"], 0.004),
         greb("greb", 0, 0.03, -0.045, M["POLY"]), kasse("lang bøjle", -0.004, -0.02, -0.07, 0.004, 0.09, -0.064, M["POLY"], 0.002)]
    d += magasin("magasin", -0.16, -0.105, -0.06, 0.12, 0.0, M["STÅL"], ribber=False)
    for x in (-0.012, 0.012): d.append(rør(f"tobenet{x}", (x, 0.28, -0.03), (x, 0.08, -0.04), 0.004, M["STÅL"], 8))
    return d, hænder((0, 0.02, -0.08), (0, 0.24, -0.05), ærme(0, 0.02, -0.08)), (0, 0.54, 0.0), (0, 0.24, -0.04)


def kamp(M):
    TAN = farvet("ørkenfarve", (0.42, 0.33, 0.22), ru=0.7, støj=0.1, skala=90)
    d = [kasse("øvre", -0.024, -0.05, -0.005, 0.024, 0.34, 0.04, TAN, 0.005), kasse("nedre", -0.021, -0.03, -0.05, 0.021, 0.12, -0.005, M["POLY"], 0.004)]
    d += skinne("skinne", -0.04, 0.33, 0.04, M["POLY"])
    d += [rør("pibe", (0, 0.34, 0.015), (0, 0.62, 0.015), 0.011, M["STÅL"], 16), rør("mundingsbremse", (0, 0.6, 0.015), (0, 0.66, 0.015), 0.016, M["STÅL"], 16),
          kasse("magasin", -0.016, 0.04, -0.17, 0.016, 0.11, -0.05, M["POLY"], 0.004), greb("greb", 0, -0.01, -0.05, M["POLY"]),
          kasse("skæfte", -0.022, -0.3, -0.065, 0.022, -0.05, 0.03, TAN, 0.009), kasse("kindstøtte", -0.018, -0.24, 0.03, 0.018, -0.1, 0.05, TAN, 0.006),
          kasse("kolbe", -0.024, -0.315, -0.07, 0.024, -0.295, 0.035, M["GUMMI"], 0.004),
          hult_rør("sigte", (0, 0.1, 0.087), (0, 0.155, 0.087), 0.025, 0.0035, M["POLY"]), ring("sigtekant", (0, 0.1, 0.087), 0.0235, 0.0022, M["POLY"], (math.pi / 2, 0, 0)),
          kasse("sigtefod", -0.012, 0.105, 0.049, 0.012, 0.15, 0.063, M["POLY"], 0.003)]
    d += bøjle("bøjle", 0.005, 0.07, -0.05, M["POLY"])
    return d, hænder((0, -0.015, -0.09), (0, 0.27, -0.035), ærme(0, -0.015, -0.09)), (0, 0.67, 0.015), (0, 0.27, -0.025)


def mp(M):
    d = [rør("modtager", (0, -0.06, 0.02), (0, 0.22, 0.02), 0.022, M["STÅL"], 24, 0.002), løft("håndskærm", [firkant(y, -0.026, 0.026, -0.022, 0.026) for y in (0.13, 0.2, 0.27)], M["POLY"], 0.008),
         rør("pibe", (0, 0.27, 0.015), (0, 0.33, 0.015), 0.009, M["STÅL"], 16), rør("kornring", (0, 0.31, 0.04), (0, 0.325, 0.04), 0.012, M["STÅL"], 16),
         rør("ladrør", (0, 0.05, 0.045), (0, 0.27, 0.045), 0.008, M["STÅL"], 12), rør("ladegreb", (-0.01, 0.24, 0.045), (-0.035, 0.24, 0.045), 0.004, M["STÅL"], 8),
         kugle("tromlesigte", (0, -0.04, 0.05), 0.012, M["STÅL"]), greb("greb", 0, -0.02, -0.002, M["POLY"])]
    d += magasin("magasin", 0.045, 0.072, -0.002, 0.17, 0.07, M["STÅL"], 0.012)
    for x in (-0.018, 0.018): d.append(rør(f"stang{x}", (x, -0.06, 0.02), (x, -0.27, 0.02), 0.004, M["STÅL"], 8))
    d.append(kasse("kolbeplade", -0.024, -0.285, -0.035, 0.024, -0.27, 0.035, M["GUMMI"], 0.004))
    d += bøjle("bøjle", 0.01, 0.06, -0.002, M["STÅL"])
    return d, hænder((0, -0.03, -0.05), (0, 0.2, -0.02), ærme(0, -0.03, -0.05)), (0, 0.34, 0.015), (0, 0.2, -0.01)


def sprøjte(M):
    OLIVEN = farvet("oliven", (0.2, 0.24, 0.13), ru=0.6, støj=0.12, skala=70)
    RAV = farvet("rav", (0.7, 0.4, 0.08), ru=0.25, met=0.0, støj=0.05)
    d = [løft("krop", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in [(-0.2, 0.026, -0.1, 0.03), (-0.1, 0.03, -0.11, 0.04), (0.12, 0.03, -0.1, 0.045), (0.25, 0.026, -0.06, 0.035), (0.28, 0.02, -0.03, 0.025)]], OLIVEN, 0.016),
         kasse("magasin", -0.022, -0.13, 0.04, 0.022, 0.2, 0.07, RAV, 0.008), rør("pibe", (0, 0.28, 0.0), (0, 0.34, 0.0), 0.009, M["STÅL"], 16),
         kasse("rødpunkt", -0.012, 0.15, 0.07, 0.012, 0.2, 0.1, M["POLY"], 0.004), kasse("rødglas", -0.009, 0.199, 0.074, 0.009, 0.202, 0.096, M["GLAS"], 0.001),
         kasse("greb", -0.014, -0.02, -0.16, 0.014, 0.03, -0.08, M["POLY"], 0.008), kasse("tommelhul", -0.031, 0.06, -0.12, 0.031, 0.1, -0.06, M["POLY"], 0.008)]
    return d, hænder((0, 0.005, -0.12), (0, 0.17, -0.08), ærme(0, 0.005, -0.12)), (0, 0.35, 0.0), (0, 0.17, -0.07)


def pump(M):
    d = [kasse("modtager", -0.022, -0.05, -0.035, 0.022, 0.13, 0.03, M["STÅL"], 0.004), rør("pibe", (0, 0.13, 0.012), (0, 0.63, 0.012), 0.012, M["STÅL"], 18),
         rør("magasinrør", (0, 0.13, -0.02), (0, 0.56, -0.02), 0.011, M["STÅL"], 16), kugle("kugle", (0, 0.62, 0.026), 0.004, M["LYS"]),
         løft("pumpe", [firkant(y, -0.022 - t, 0.022 + t, -0.045 - t, 0.006 + t) for y, t in [(0.21, 0), (0.24, 0.003), (0.34, 0.003), (0.37, 0)]], M["TRÆ"], 0.008),
         løft("skæfte", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in [(-0.05, 0.018, -0.045, 0.02), (-0.12, 0.017, -0.075, 0.012), (-0.25, 0.02, -0.11, 0.008), (-0.36, 0.022, -0.13, 0.012)]], M["TRÆ"], 0.008),
         kasse("kolbe", -0.023, -0.375, -0.135, 0.023, -0.36, 0.015, M["GUMMI"], 0.004)]
    for y in (0.25, 0.28, 0.31, 0.34): d.append(kasse(f"rille{y}", -0.0255, y, -0.049, 0.0255, y + 0.008, 0.009, M["TRÆ"], 0.002))
    d += bøjle("bøjle", -0.03, 0.06, -0.035, M["STÅL"])
    return d, hænder((0, -0.075, -0.06), (0, 0.29, -0.05), ærme(0, -0.075, -0.06)), (0, 0.64, 0.012), (0, 0.29, -0.04)


def hagl(M):
    d = [kasse("modtager", -0.026, -0.08, -0.04, 0.026, 0.28, 0.05, M["POLY"], 0.008), rør("pibe", (0, 0.28, 0.02), (0, 0.5, 0.02), 0.014, M["STÅL"], 18),
         rør("bremse", (0, 0.47, 0.02), (0, 0.535, 0.02), 0.023, M["STÅL"], 18, 0.003)]
    d += skinne("skinne", -0.06, 0.26, 0.05, M["STÅL"])
    d += [rør("tromle", (-0.03, 0.08, -0.11), (0.03, 0.08, -0.11), 0.075, M["POLY"], 32, 0.006), rør("tromlemidte", (-0.032, 0.08, -0.11), (0.032, 0.08, -0.11), 0.02, M["STÅL"], 16),
          greb("greb", 0, -0.03, -0.04, M["POLY"]), kasse("skæfte", -0.024, -0.33, -0.075, 0.024, -0.08, 0.035, M["POLY"], 0.01),
          kasse("kolbe", -0.026, -0.345, -0.08, 0.026, -0.33, 0.04, M["GUMMI"], 0.004)]
    for i in range(4): d.append(kasse(f"hul{i}", 0.0225, 0.48 + i * 0.012, 0.012, 0.0235, 0.486 + i * 0.012, 0.028, M["GUMMI"], 0.0005))
    d += bøjle("bøjle", -0.01, 0.06, -0.04, M["POLY"])
    return d, hænder((0, -0.035, -0.085), (0, 0.22, -0.055), ærme(0, -0.035, -0.085)), (0, 0.54, 0.02), (0, 0.22, -0.045)


def jagt(M):
    d = [løft("skæfte", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in [(-0.36, 0.021, -0.13, 0.02), (-0.2, 0.019, -0.09, 0.015), (-0.06, 0.017, -0.05, 0.012),
                                                                       (0.0, 0.02, -0.035, 0.01), (0.3, 0.019, -0.03, 0.008), (0.43, 0.014, -0.02, 0.006)]], M["TRÆ"], 0.008),
         kasse("kolbeplade", -0.022, -0.372, -0.135, 0.022, -0.36, 0.022, M["LYS"], 0.003),
         rør("modtager", (0, -0.05, 0.022), (0, 0.15, 0.022), 0.017, M["STÅL"], 20), rør("pibe", (0, 0.15, 0.022), (0, 0.79, 0.022), 0.011, M["STÅL"], 16, 0.0015, 0.009),
         rør("bolt", (0.017, 0.0, 0.027), (0.052, -0.012, 0.004), 0.004, M["LYS"], 10), kugle("boltknop", (0.055, -0.013, 0.002), 0.01, M["LYS"]),
         kasse("korn", -0.002, 0.76, 0.03, 0.002, 0.77, 0.048, M["STÅL"], 0.0006), kasse("bagsigteV", -0.009, 0.25, 0.03, -0.0025, 0.26, 0.05, M["STÅL"], 0.0008), kasse("bagsigteH", 0.0025, 0.25, 0.03, 0.009, 0.26, 0.05, M["STÅL"], 0.0008),
         kasse("bagsigteFod", -0.009, 0.25, 0.03, 0.009, 0.26, 0.042, M["STÅL"], 0.0008)]
    d += bøjle("bøjle", -0.02, 0.06, -0.035, M["STÅL"])
    return d, hænder((0, -0.075, -0.045), (0, 0.3, -0.035), ærme(0, -0.075, -0.045)), (0, 0.8, 0.022), (0, 0.3, -0.025)


def spejder(M):
    GRØN = farvet("spejdergrøn", (0.16, 0.22, 0.14), ru=0.7, støj=0.12, skala=60)
    d = [løft("skæfte", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in [(-0.34, 0.02, -0.11, 0.02), (-0.2, 0.018, -0.1, 0.02), (-0.06, 0.02, -0.04, 0.022), (0.32, 0.021, -0.025, 0.018)]], GRØN, 0.01),
         kasse("tommelhul", -0.0205, -0.17, -0.075, 0.0205, -0.1, -0.05, M["GUMMI"], 0.006), kasse("kolbe", -0.021, -0.355, -0.115, 0.021, -0.34, 0.022, M["GUMMI"], 0.004),
         kasse("modtager", -0.017, -0.06, 0.012, 0.017, 0.16, 0.045, M["STÅL"], 0.004), rør("pibe", (0, 0.16, 0.028), (0, 0.79, 0.028), 0.0095, M["STÅL"], 16),
         rør("bremse", (0, 0.79, 0.028), (0, 0.82, 0.028), 0.0125, M["STÅL"], 16),
         rør("kikkert", (0, -0.06, 0.09), (0, 0.18, 0.09), 0.016, M["GUMMI"], 22), rør("okular", (0, -0.1, 0.09), (0, -0.05, 0.09), 0.021, M["GUMMI"], 22, 0.003, 0.017),
         rør("objektiv", (0, 0.17, 0.09), (0, 0.24, 0.09), 0.017, M["GUMMI"], 22, 0.003, 0.024), rør("linse", (0, 0.238, 0.09), (0, 0.241, 0.09), 0.021, M["GLAS"], 22, 0.0005),
         rør("bolt", (0.017, -0.03, 0.03), (0.05, -0.03, 0.016), 0.004, M["LYS"], 10), kugle("boltknop", (0.053, -0.03, 0.015), 0.009, M["LYS"]),
         kasse("magasin", -0.013, 0.03, -0.05, 0.013, 0.09, -0.02, M["STÅL"], 0.003)]
    for y in (-0.02, 0.13): d.append(kasse(f"ring{y}", -0.019, y - 0.008, 0.045, 0.019, y + 0.008, 0.106, M["STÅL"], 0.003))
    return d, hænder((0, -0.075, -0.075), (0, 0.24, -0.04), ærme(0, -0.075, -0.075)), (0, 0.83, 0.028), (0, 0.24, -0.03)


def lmg(M):
    OLIVEN = farvet("kassegrøn", (0.2, 0.22, 0.13), ru=0.7, støj=0.12, skala=60)
    d = [kasse("modtager", -0.03, -0.08, -0.04, 0.03, 0.24, 0.05, M["STÅL"], 0.006), kasse("låg", -0.032, -0.06, 0.05, 0.032, 0.14, 0.065, M["STÅL"], 0.005),
         rør("pibe", (0, 0.24, 0.012), (0, 0.69, 0.012), 0.0145, M["STÅL"], 18), kasse("varmeskjold", -0.012, 0.25, 0.028, 0.012, 0.5, 0.034, M["POLY"], 0.002),
         kasse("håndskærm", -0.026, 0.24, -0.035, 0.026, 0.42, 0.01, M["POLY"], 0.008), rør("bærehåndtag", (0, 0.3, 0.07), (0, 0.42, 0.07), 0.008, M["POLY"], 12),
         kasse("håndtagfod", -0.006, 0.3, 0.034, 0.006, 0.31, 0.07, M["POLY"], 0.002), kasse("ammokasse", -0.065, 0.0, -0.19, 0.025, 0.14, -0.04, OLIVEN, 0.01),
         greb("greb", 0, -0.03, -0.04, M["POLY"]), kasse("skæfteramme", -0.02, -0.38, -0.08, 0.02, -0.08, 0.03, M["POLY"], 0.01),
         kasse("kolbe", -0.023, -0.395, -0.085, 0.023, -0.375, 0.035, M["GUMMI"], 0.004)]
    for x in (-0.014, 0.014): d.append(rør(f"tobenet{x}", (x, 0.6, -0.004), (x, 0.43, -0.03), 0.005, M["STÅL"], 8))
    d += bøjle("bøjle", -0.01, 0.065, -0.04, M["STÅL"])
    return d, hænder((0, -0.035, -0.085), (0, 0.34, -0.05), ærme(0, -0.035, -0.085)), (0, 0.7, 0.012), (0, 0.34, -0.04)


def minigun(M):
    d = [rør("rotorhus", (0, -0.14, 0.02), (0, 0.12, 0.02), 0.065, M["STÅL"], 32, 0.006), kasse("motor", -0.055, -0.3, -0.04, 0.055, -0.13, 0.08, M["POLY"], 0.012),
         rør("forklemme", (0, 0.42, 0.02), (0, 0.45, 0.02), 0.05, M["STÅL"], 24), rør("midtklemme", (0, 0.2, 0.02), (0, 0.23, 0.02), 0.052, M["STÅL"], 24),
         rør("aksel", (0, 0.12, 0.02), (0, 0.76, 0.02), 0.012, M["STÅL"], 12), kasse("tophåndtagfod", -0.008, 0.0, 0.08, 0.008, 0.02, 0.11, M["POLY"], 0.002),
         kasse("tophåndtag", -0.012, 0.0, 0.1, 0.012, 0.28, 0.125, M["POLY"], 0.006), kasse("tophåndtagfod2", -0.008, 0.26, 0.06, 0.008, 0.28, 0.11, M["POLY"], 0.002),
         greb("greb", 0, -0.02, -0.04, M["POLY"]), kasse("ammokasse", 0.06, -0.12, -0.2, 0.16, 0.08, -0.06, farvet("ammogrøn", (0.2, 0.22, 0.13), ru=0.7), 0.01),
         løft("bælte", [[(0.04, -0.03, z), (0.07, -0.03, z), (0.07, 0.02, z), (0.04, 0.02, z)] for z in (0.0, -0.03, -0.065)], M["LYS"], 0.002)]
    for i in range(6):
        v = i * math.pi / 3; x, z = math.cos(v) * 0.032, 0.02 + math.sin(v) * 0.032
        d.append(rør(f"løb{i}", (x, 0.1, z), (x, 0.76, z), 0.0095, M["STÅL"], 12))
    return d, hænder((0, -0.025, -0.085), (0, 0.14, 0.112), ærme(0, -0.025, -0.085), ((-0.05, 0.08, 0.06), (-0.26, -0.2, -0.1))), (0, 0.77, 0.02), (0, 0.14, 0.11)


def raket(M):
    OLIVEN = farvet("rørgrøn", (0.24, 0.27, 0.16), ru=0.65, støj=0.12, skala=50)
    SPRÆNG = farvet("sprænghoved", (0.26, 0.3, 0.2), ru=0.5, støj=0.1, skala=50)
    d = [rør("rør", (0, -0.45, 0.06), (0, 0.36, 0.06), 0.034, OLIVEN, 24, 0.003), rør("tragt", (0, -0.58, 0.06), (0, -0.45, 0.06), 0.052, OLIVEN, 24, 0.004, 0.034),
         rør("varmeskjold", (0, -0.12, 0.06), (0, 0.12, 0.06), 0.041, M["TRÆ"], 24, 0.004), rør("sprænghoved", (0, 0.36, 0.06), (0, 0.47, 0.06), 0.04, SPRÆNG, 24, 0.004, 0.06),
         rør("spids", (0, 0.47, 0.06), (0, 0.6, 0.06), 0.06, SPRÆNG, 24, 0.004, 0.012), greb("greb", 0, 0.0, -0.0, M["POLY"]),
         kasse("forgreb", -0.013, 0.15, -0.075, 0.013, 0.19, 0.026, M["POLY"], 0.006), kasse("sigte", -0.06, -0.02, 0.06, -0.035, 0.08, 0.1, M["POLY"], 0.006),
         kasse("sigteglas", -0.058, 0.079, 0.066, -0.037, 0.082, 0.094, M["GLAS"], 0.001)]
    d += bøjle("bøjle", 0.01, 0.06, 0.0, M["STÅL"])
    return d, hænder((0, -0.02, -0.045), (0, 0.17, -0.04), ærme(0, -0.02, -0.045)), (0, 0.62, 0.06), (0, 0.17, -0.03)


def armbrøst(M):
    STRENG = farvet("streng", (0.75, 0.7, 0.6), ru=0.9)
    d = [løft("skæfte", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in [(-0.3, 0.02, -0.09, 0.02), (-0.12, 0.018, -0.05, 0.02), (0.05, 0.016, -0.03, 0.02), (0.36, 0.015, -0.02, 0.018)]], M["TRÆ"], 0.008),
         greb("greb", 0, -0.01, -0.03, M["POLY"]), rør("pil", (0, 0.05, 0.025), (0, 0.42, 0.025), 0.004, M["TRÆ"], 8),
         rør("pilespids", (0, 0.42, 0.025), (0, 0.45, 0.025), 0.007, M["LYS"], 8, 0.0005, 0.001), kasse("stigbøjle", -0.03, 0.4, -0.03, 0.03, 0.41, 0.02, M["STÅL"], 0.003),
         hult_rør("kikkert", (0, 0.0, 0.073), (0, 0.05, 0.073), 0.022, 0.003, M["POLY"]), kasse("kikkertfod", -0.008, 0.005, 0.02, 0.008, 0.045, 0.052, M["POLY"], 0.002)]
    for s in (-1, 1):
        d += [rør(f"bue{s}a", (0, 0.35, 0.012), (s * 0.14, 0.335, 0.012), 0.012, M["POLY"], 12, 0.002, 0.01),
              rør(f"bue{s}b", (s * 0.14, 0.335, 0.012), (s * 0.27, 0.29, 0.012), 0.01, M["POLY"], 12, 0.002, 0.007),
              rør(f"streng{s}", (s * 0.27, 0.29, 0.016), (0, 0.06, 0.026), 0.0018, STRENG, 6)]
    return d, hænder((0, -0.02, -0.075), (0, 0.2, -0.04), ærme(0, -0.02, -0.075)), (0, 0.46, 0.025), (0, 0.2, -0.03)


def lydløs(M):
    d = [kasse("slæde", -0.0145, -0.065, 0.02, 0.0145, 0.13, 0.052, M["STÅL"], 0.003), kasse("ramme", -0.0135, -0.05, -0.006, 0.0135, 0.115, 0.022, M["POLY"], 0.003),
         rør("pibe", (0, 0.12, 0.036), (0, 0.14, 0.036), 0.0062, M["STÅL"], 16), rør("lyddæmper", (0, 0.135, 0.036), (0, 0.3, 0.036), 0.016, M["POLY"], 22, 0.003),
         kasse("korn", -0.002, 0.118, 0.052, 0.002, 0.126, 0.058, M["STÅL"], 0.0006), kasse("bagsigte", -0.008, -0.058, 0.052, 0.008, -0.048, 0.059, M["STÅL"], 0.0008),
         greb("greb", 0, -0.02, -0.004, M["POLY"], 0.01)]
    d += bøjle("bøjle", 0.0, 0.06, -0.006, M["POLY"])
    return d, hænder((0.0, -0.035, -0.06), (0.0, -0.025, -0.085), ærme(0, -0.035, -0.06), ((-0.04, -0.08, -0.13), (-0.2, -0.38, -0.3))), (0, 0.31, 0.036), None


def automat(M):
    d = [kasse("krop", -0.018, -0.06, -0.01, 0.018, 0.17, 0.04, M["POLY"], 0.005), rør("skjold", (0, 0.17, 0.02), (0, 0.27, 0.02), 0.013, M["STÅL"], 16, 0.002),
         rør("pibe", (0, 0.26, 0.02), (0, 0.285, 0.02), 0.006, M["STÅL"], 12), kasse("magasin", -0.012, 0.03, -0.2, 0.012, 0.072, -0.01, M["STÅL"], 0.004),
         greb("greb", 0, -0.035, -0.01, M["POLY"], 0.012), kasse("ladegreb", -0.025, 0.1, 0.02, -0.018, 0.12, 0.034, M["STÅL"], 0.002)]
    for i in range(5): d.append(kasse(f"hul{i}", -0.0135, 0.185 + i * 0.016, 0.026, 0.0135, 0.192 + i * 0.016, 0.034, M["GUMMI"], 0.0005))
    d += bøjle("bøjle", -0.01, 0.045, -0.01, M["POLY"])
    return d, hænder((0.0, -0.04, -0.065), (0.0, 0.05, -0.13), ærme(0, -0.04, -0.065), ((-0.03, 0.0, -0.17), (-0.2, -0.3, -0.33))), (0, 0.29, 0.02), None


def revolver(M):
    d = [kasse("ramme", -0.012, -0.04, 0.0, 0.012, 0.06, 0.05, M["STÅL"], 0.004), rør("tromle", (0, 0.0, 0.028), (0, 0.052, 0.028), 0.022, M["STÅL"], 24, 0.003),
         rør("pibe", (0, 0.05, 0.04), (0, 0.2, 0.04), 0.0085, M["STÅL"], 16), kasse("ribbe", -0.005, 0.05, 0.047, 0.005, 0.2, 0.054, M["STÅL"], 0.002),
         kasse("korn", -0.002, 0.19, 0.054, 0.002, 0.198, 0.064, M["STÅL"], 0.0006), kasse("hane", -0.005, -0.05, 0.035, 0.005, -0.03, 0.065, M["STÅL"], 0.002),
         løft("greb", [[(-w, y0, z), (w, y0, z), (w, y1, z), (-w, y1, z)] for (z, w, y0, y1) in [(0.0, 0.014, -0.05, -0.01), (-0.06, 0.016, -0.075, -0.03), (-0.11, 0.017, -0.095, -0.045)]], M["TRÆ"], 0.006)]
    for i in range(6):
        v = i * math.pi / 3; d.append(rør(f"rille{i}", (math.cos(v) * 0.022, 0.006, 0.028 + math.sin(v) * 0.022), (math.cos(v) * 0.022, 0.046, 0.028 + math.sin(v) * 0.022), 0.004, M["GUMMI"], 8))
    d += bøjle("bøjle", -0.01, 0.05, 0.0, M["STÅL"])
    return d, hænder((0.0, -0.05, -0.055), (0.0, -0.04, -0.08), ærme(0, -0.05, -0.055), ((-0.04, -0.09, -0.13), (-0.2, -0.39, -0.3))), (0, 0.205, 0.04), None


def karambit(M):
    KLINGE = metal("klinge", (0.55, 0.56, 0.58), (0.85, 0.86, 0.88), 0.18)
    bue = [(0.0, 0.02), (0.06, 0.04), (0.11, 0.03), (0.15, -0.0), (0.17, -0.045), (0.16, -0.075), (0.145, -0.05), (0.13, -0.02), (0.09, 0.0), (0.04, 0.005), (0.0, -0.005)]
    d = [kurve_klinge("klinge", bue, 0.004, KLINGE), løft("skaft", [firkant(y, -w, w, -h, h) for (y, w, h) in [(0.0, 0.012, 0.017), (-0.06, 0.013, 0.018), (-0.1, 0.012, 0.016)]], M["POLY"], 0.006),
         ring("ring", (0, -0.125, 0.0), 0.022, 0.006, M["STÅL"])]
    return d, hænder((0.0, -0.05, 0.0)), (0, 0.17, -0.04), None


def machete(M):
    KLINGE = metal("klinge", (0.45, 0.46, 0.48), (0.8, 0.81, 0.83), 0.25)
    form = [(0.0, -0.022), (0.38, -0.03), (0.45, -0.005), (0.43, 0.03), (0.0, 0.026)]
    d = [kurve_klinge("klinge", form, 0.004, KLINGE), kasse("parér", -0.012, -0.008, -0.03, 0.012, 0.004, 0.032, M["STÅL"], 0.002),
         løft("skaft", [firkant(y, -w, w, -h, h) for (y, w, h) in [(-0.008, 0.012, 0.017), (-0.07, 0.013, 0.019), (-0.13, 0.012, 0.018), (-0.145, 0.014, 0.02)]], M["GUMMI"], 0.006)]
    return d, hænder((0.0, -0.07, 0.0)), (0, 0.45, 0.0), None


def hakke(M):
    HOVED = metal("hakkehoved", (0.14, 0.15, 0.17), (0.6, 0.61, 0.64), 0.3)
    BÅND = farvet("bånd", (0.75, 0.42, 0.08), ru=0.8, støj=0.15)
    d = [rør("skaft", (0, -0.2, 0), (0, 0.45, 0), 0.016, M["TRÆ"], 16, 0.003), rør("greb", (0, -0.2, 0), (0, -0.04, 0), 0.0185, M["GUMMI"], 16, 0.003),
         rør("bånd", (0, 0.36, 0), (0, 0.4, 0), 0.0185, BÅND, 16, 0.002),
         løft("hoved", [[(-0.018, 0.45 + f, z), (0.018, 0.45 + f, z), (0.018, 0.49 + f, z), (-0.018, 0.49 + f, z)] for z, f in
                        [(-0.13, -0.05), (-0.07, -0.01), (0.0, 0.0), (0.08, -0.012), (0.15, -0.045), (0.2, -0.085)]], HOVED, 0.006),
         kasse("muffe", -0.022, 0.44, -0.025, 0.022, 0.5, 0.025, HOVED, 0.006)]
    return d, hænder((0.0, -0.12, 0.0), (0.0, 0.12, 0.0)), (0, 0.47, 0.17), None


BYG = {"taktisk": taktisk, "salve": salve, "kamp": kamp, "mp": mp, "sproejte": sprøjte, "pump": pump, "hagl": hagl, "jagt": jagt, "spejder": spejder,
       "lmg": lmg, "minigun": minigun, "raket": raket, "armbroest": armbrøst, "lydloes": lydløs, "automat": automat, "revolver": revolver,
       "karambit": karambit, "machete": machete, "hakke": hakke}

valgt = [n for n in os.environ.get("ARSENAL", "").split(",") if n] or list(BYG)
for navn in valgt:
    nulstil()
    M = sæt()
    dele, hd, munding, forgreb = BYG[navn](M)
    gem(navn, dele, hd, munding, forgreb, øje=ØJE.get(navn))
    prøvebillede(f"{navn}.png", (0.55, -0.35, 0.22), (0, 0.15, -0.02), (480, 300))
