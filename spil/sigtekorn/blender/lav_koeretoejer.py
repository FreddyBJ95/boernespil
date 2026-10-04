# ===== Køretøjerne: en snescooter (Fjeldbyen) og en gaffeltruck (Havnen) → modeller/<navn>.glb =====
# Samme stil som våbnene: x til højre, y frem, z op, i meter, nulpunktet midt under køretøjet på jorden.
# Hvert køretøj samles og bages ned i to billeder (farve og ruhed/metal) og gemmes med punktet "saede",
# hvor føreren sidder (spillet sætter kameraet lidt over det).
# Kør:  blender --background --factory-startup --python lav_koeretoejer.py

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import *


def punkt(navn, sted):
    m = bpy.data.objects.new(navn, None); bpy.context.collection.objects.link(m); m.location = sted
    return m


def hjul(navn, x, y, z, r, b, mat):
    """Et hjul, der drejer om x-aksen"""
    return rør(navn, (x - b / 2, y, z), (x + b / 2, y, z), r, mat, 24, 0.02)


def snescooter():
    RØD = farvet("rød lak", (0.55, 0.05, 0.04), ru=0.35, støj=0.05, skala=60)
    SORT = farvet("sort plast", (0.02, 0.02, 0.025), ru=0.6, støj=0.1, skala=120)
    GUMMI = farvet("gummi", (0.015, 0.015, 0.017), ru=0.95)
    STÅL = metal("stål")
    GLAS = farvet("rude", (0.12, 0.16, 0.2), ru=0.08, met=0.3)
    d = [
        kasse("bælte", -0.27, -1.3, 0.05, 0.27, 0.35, 0.42, GUMMI, 0.06),
        løft("motorhjelm", [firkant(0.3, -0.43, 0.43, 0.36, 0.95), firkant(0.85, -0.41, 0.41, 0.3, 0.82), firkant(1.35, -0.24, 0.24, 0.26, 0.52)], RØD, 0.03),
        kasse("bagkrop", -0.32, -1.38, 0.38, 0.32, -1.05, 0.62, RØD, 0.03),
        kasse("sæde", -0.24, -1.05, 0.42, 0.24, 0.3, 0.7, SORT, 0.05),
        kasse("rude", -0.36, 0.86, 0.9, 0.36, 0.9, 1.22, GLAS, 0.01),
        rør("styrstang", (0, 0.5, 0.82), (0, 0.6, 1.02), 0.025, STÅL),
        rør("styr", (-0.36, 0.6, 1.02), (0.36, 0.6, 1.02), 0.02, SORT),
        kugle("lygte", (0, 1.36, 0.42), 0.07, farvet("lygte", (0.9, 0.88, 0.7), ru=0.1)),
    ]
    for s in (-1, 1):
        d += [kasse(f"ski{s}", s * 0.45 - 0.07, 0.3, 0.0, s * 0.45 + 0.07, 1.55, 0.04, SORT, 0.01),
              løft(f"skispids{s}", [[(s * 0.45 - 0.07, 1.55, 0.0), (s * 0.45 + 0.07, 1.55, 0.0), (s * 0.45 + 0.07, 1.55, 0.04), (s * 0.45 - 0.07, 1.55, 0.04)],
                                    [(s * 0.45 - 0.07, 1.72, 0.14), (s * 0.45 + 0.07, 1.72, 0.14), (s * 0.45 + 0.07, 1.7, 0.18), (s * 0.45 - 0.07, 1.7, 0.18)]], SORT, 0.01),
              rør(f"stiver{s}", (s * 0.45, 0.85, 0.04), (s * 0.3, 0.8, 0.45), 0.025, STÅL),
              kasse(f"fodbræt{s}", s * 0.27, -0.9, 0.3, s * 0.48, 0.25, 0.34, SORT, 0.01)]
    return d, (0, -0.4, 0.72)


def gaffeltruck():
    GUL = farvet("gul lak", (0.85, 0.55, 0.04), ru=0.4, støj=0.06, skala=50)
    SORT = farvet("sort", (0.025, 0.025, 0.03), ru=0.6, støj=0.08, skala=90)
    GRÅ = farvet("kontravægt", (0.12, 0.12, 0.13), ru=0.7, støj=0.1, skala=40)
    GUMMI = farvet("dæk", (0.015, 0.015, 0.017), ru=0.95)
    STÅL = metal("stål")
    d = [
        kasse("chassis", -0.55, -0.95, 0.22, 0.55, 0.9, 0.85, GUL, 0.04),
        kasse("kontravægt", -0.6, -1.3, 0.18, 0.6, -0.9, 1.05, GRÅ, 0.06),
        kasse("sæde", -0.25, -0.55, 0.85, 0.25, -0.05, 1.0, SORT, 0.04),
        kasse("ryglæn", -0.25, -0.6, 1.0, 0.25, -0.48, 1.45, SORT, 0.04),
        rør("rat", (0, 0.35, 1.25), (0, 0.32, 1.28), 0.17, SORT, 24, 0.01),
        rør("ratstamme", (0, 0.5, 0.85), (0, 0.35, 1.25), 0.03, SORT),
        kasse("instrumenter", -0.4, 0.45, 0.85, 0.4, 0.8, 1.0, GUL, 0.03),
    ]
    for x in (-0.52, 0.52):
        d += [hjul(f"forhjul{x}", x, 0.62, 0.3, 0.3, 0.22, GUMMI), hjul(f"baghjul{x}", x, -0.85, 0.26, 0.26, 0.2, GUMMI)]
        for y in (-0.75, 0.62):                                               # beskyttelsesburet over føreren
            d.append(rør(f"stolpe{x}{y}", (x * 0.95, y, 0.85), (x * 0.95, y, 2.15), 0.03, SORT, 12))
    d += [kasse("tagramme", -0.52, -0.78, 2.12, 0.52, 0.65, 2.18, SORT, 0.01)]
    for y in (-0.5, -0.2, 0.1, 0.4):
        d.append(kasse(f"tagbjælke{y}", -0.5, y - 0.03, 2.12, 0.5, y + 0.03, 2.17, SORT, 0.005))
    for x in (-0.36, 0.36):                                                     # masten og gaflerne
        d += [kasse(f"mast{x}", x - 0.05, 0.92, 0.08, x + 0.05, 1.0, 2.6, STÅL, 0.01),
              kasse(f"gaffel{x * 0.7}", x * 0.7 - 0.05, 1.02, 0.07, x * 0.7 + 0.05, 2.2, 0.13, STÅL, 0.01),
              kasse(f"gaffelryg{x * 0.7}", x * 0.7 - 0.05, 1.02, 0.07, x * 0.7 + 0.05, 1.08, 1.0, STÅL, 0.01)]
    d += [kasse("mastbjælke", -0.42, 0.93, 2.45, 0.42, 1.0, 2.55, STÅL, 0.01), kasse("gaffelplade", -0.4, 1.0, 0.75, 0.4, 1.05, 1.0, SORT, 0.01)]
    return d, (0, -0.3, 1.0)


for navn, byg in [("snescooter", snescooter), ("gaffeltruck", gaffeltruck)]:
    nulstil()
    dele, sæde = byg()
    k = saml(navn, dele); bag(k, navn, 1024)
    eksportér([k, punkt("saede", sæde)], f"{navn}.glb")
    prøvebillede(f"{navn}.png", (2.6, 3.0, 1.8), (0, 0.2, 0.6), (640, 400))
