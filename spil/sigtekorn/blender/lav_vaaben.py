# ===== Pistolen, snigskytten og kniven (i hånden) → modeller/pistol.glb, snig.glb, kniv.glb =====
# Samme stil som stormgeværet (lav_gevaer.py): x til højre, y frem, z op, nulpunktet ved aftrækkeren.
# Kør: blender --background --factory-startup --python lav_vaaben.py

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import *
from faelles import _obj
from vaabendele import hænder, gem


# ---------------- Pistolen ----------------
nulstil()
STÅL, LYS = metal("stål"), metal("lyst stål", (0.08, 0.08, 0.085), (0.55, 0.56, 0.58), 0.3)
POLY = farvet("polymer", (0.03, 0.03, 0.032), ru=0.7, støj=0.08, skala=200)
d = []
d.append(kasse("slæde", -0.0145, -0.065, 0.02, 0.0145, 0.13, 0.052, STÅL, 0.003))
for i in range(6): d.append(kasse(f"rille{i}", -0.0152, -0.058 + i * 0.006, 0.025, 0.0152, -0.0555 + i * 0.006, 0.048, LYS, 0.0005))
d.append(kasse("udkast", 0.009, 0.02, 0.04, 0.0152, 0.06, 0.05, POLY, 0.001))
d.append(kasse("ramme", -0.0135, -0.05, -0.006, 0.0135, 0.115, 0.022, POLY, 0.003))
d.append(rør("pibe", (0, 0.12, 0.036), (0, 0.134, 0.036), 0.0062, POLY, 16))
d.append(kasse("korn", -0.002, 0.118, 0.052, 0.002, 0.126, 0.058, STÅL, 0.0006))
d.append(kasse("bagsigte", -0.008, -0.058, 0.052, 0.008, -0.048, 0.059, STÅL, 0.0008))
d.append(løft("greb", [[(-w, y0, z), (w, y0, z), (w, y1, z), (-w, y1, z)] for (z, w, y0, y1) in
    [(-0.004, 0.0135, -0.045, 0.012), (-0.06, 0.0152, -0.058, -0.004), (-0.118, 0.0155, -0.074, -0.022)]], POLY, 0.005))
d.append(kasse("bundplade", -0.0158, -0.078, -0.128, 0.0158, -0.018, -0.116, STÅL, 0.002))
bue = []
for i in range(11):
    v = math.pi * i / 10; y = 0.03 - math.cos(v) * 0.03; z = -0.006 - math.sin(v) * 0.022
    bue.append([(-0.003, y - 0.002, z), (0.003, y - 0.002, z), (0.003, y + 0.002, z - 0.003), (-0.003, y + 0.002, z - 0.003)])
d.append(løft("bøjle", bue, POLY, 0.001))
d.append(kasse("aftrækker", -0.0025, 0.012, -0.025, 0.0025, 0.02, -0.005, STÅL, 0.001))
hd = hænder((0.0, -0.035, -0.06), (0.0, -0.025, -0.085), venstre_ærme=((-0.04, -0.08, -0.13), (-0.2, -0.38, -0.3)))
gem("pistol", d, hd, (0, 0.14, 0.036))

# ---------------- Snigskytten ----------------
nulstil()
STÅL, LYS = metal("stål"), metal("lyst stål", (0.08, 0.08, 0.085), (0.55, 0.56, 0.58), 0.3)
OLIVEN = farvet("oliven", (0.14, 0.17, 0.09), ru=0.75, støj=0.15, skala=50)
GUMMI = farvet("gummi", (0.02, 0.02, 0.022), ru=0.9)
GLAS = farvet("glas", (0.05, 0.12, 0.16), ru=0.05, met=0.6)
d = []
d.append(løft("skæfte", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in
    [(-0.36, 0.022, -0.12, 0.02), (-0.2, 0.021, -0.1, 0.024), (-0.06, 0.024, -0.05, 0.026), (0.3, 0.026, -0.03, 0.022), (0.42, 0.022, -0.02, 0.016)]], OLIVEN, 0.01))
d.append(kasse("tommelhul", -0.025, -0.13, -0.09, 0.025, -0.07, -0.055, GUMMI, 0.01))
d.append(kasse("kolbe", -0.024, -0.375, -0.125, 0.024, -0.36, 0.024, GUMMI, 0.004))
d.append(kasse("modtager", -0.019, -0.06, 0.012, 0.019, 0.17, 0.05, STÅL, 0.004))
d.append(rør("pibe", (0, 0.17, 0.03), (0, 0.84, 0.03), 0.0115, STÅL, 20, 0.0015, 0.0095))
d.append(rør("mundingsbremse", (0, 0.84, 0.03), (0, 0.88, 0.03), 0.014, STÅL, 20))
d.append(rør("kikkert", (0, -0.08, 0.098), (0, 0.22, 0.098), 0.0185, GUMMI, 24))
d.append(rør("okular", (0, -0.13, 0.098), (0, -0.07, 0.098), 0.024, GUMMI, 24, 0.003, 0.0195))
d.append(rør("objektiv", (0, 0.21, 0.098), (0, 0.29, 0.098), 0.0195, GUMMI, 24, 0.003, 0.028))
d.append(rør("linse", (0, 0.288, 0.098), (0, 0.292, 0.098), 0.025, GLAS, 24, 0.0005))
d.append(rør("drejeknap", (0, 0.07, 0.115), (0, 0.07, 0.13), 0.009, STÅL, 16))
d.append(rør("sideknap", (0.018, 0.07, 0.098), (0.032, 0.07, 0.098), 0.009, STÅL, 16))
for y in (-0.02, 0.15): d.append(kasse(f"ring{y}", -0.022, y - 0.01, 0.045, 0.022, y + 0.01, 0.12, STÅL, 0.003))
d.append(rør("bolt", (0.019, -0.02, 0.035), (0.055, -0.02, 0.02), 0.0045, LYS, 12))
d.append(kugle("boltknop", (0.058, -0.02, 0.019), 0.011, LYS))
d.append(kasse("magasin", -0.016, 0.04, -0.065, 0.016, 0.12, -0.02, STÅL, 0.003))
d.append(løft("greb", [[(-w, y0, z), (w, y0, z), (w, y1, z), (-w, y1, z)] for (z, w, y0, y1) in
    [(-0.01, 0.017, -0.06, -0.01), (-0.07, 0.017, -0.075, -0.03), (-0.12, 0.016, -0.09, -0.05)]], OLIVEN, 0.008))
d.append(kasse("aftrækker", -0.0025, -0.012, -0.03, 0.0025, -0.004, -0.008, STÅL, 0.001))
hd = hænder((0.0, -0.06, -0.06), (0.0, 0.3, -0.045))
gem("snig", d, hd, (0, 0.9, 0.03), (0, 0.3, -0.035))

# ---------------- Kniven ----------------
nulstil()
KLINGE = metal("klinge", (0.55, 0.56, 0.58), (0.85, 0.86, 0.88), 0.18)
SORT = farvet("skaft", (0.03, 0.03, 0.03), ru=0.85, støj=0.15, skala=300)
STÅL = metal("stål")
d = []
form = [(0, -0.017), (0.17, -0.011), (0.215, 0.005), (0.2, 0.017), (0.0, 0.017)]   # klingen set fra siden (y frem, z op)
bm = bmesh.new()
vs = [[bm.verts.new(Vector((x, y, z))) for (y, z) in form] for x in (-0.0025, 0.0025)]
n = len(form)
for i in range(n): bm.faces.new((vs[0][i], vs[0][(i + 1) % n], vs[1][(i + 1) % n], vs[1][i]))
bm.faces.new(vs[0]); bm.faces.new(list(reversed(vs[1])))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
klinge = afrund(_obj("klinge", bm, KLINGE), 0.0008, 2)
d.append(klinge)
d.append(kasse("parerstang", -0.012, -0.006, -0.026, 0.012, 0.004, 0.026, STÅL, 0.002))
d.append(løft("skaft", [firkant(y, -w, w, -h, h) for (y, w, h) in [(-0.006, 0.012, 0.016), (-0.05, 0.013, 0.018), (-0.1, 0.012, 0.017), (-0.115, 0.01, 0.014)]], SORT, 0.006))
d.append(rør("knop", (0, -0.12, 0), (0, -0.115, 0), 0.012, STÅL, 16))
hd = hænder((0.0, -0.06, 0.0), type_="skaft")
gem("kniv", d, hd, (0, 0.2, 0))
