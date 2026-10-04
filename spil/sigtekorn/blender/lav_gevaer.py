# ===== Stormgeværet (i hånden) — bygges, bages og gemmes som modeller/gevaer.glb =====
# Koordinater i meter: x til højre, y frem (piben), z op. Nulpunktet er ved aftrækkeren.
# Kør: blender --background --factory-startup --python lav_gevaer.py

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import *

nulstil()
STÅL, LYS = metal("stål"), metal("lyst stål", (0.07, 0.072, 0.078), (0.55, 0.56, 0.58), 0.35)
TRÆ, MAG = træ("træ"), farvet("magasin", (0.30, 0.09, 0.03), ru=0.45, støj=0.18, skala=25)
GUMMI = farvet("gummi", (0.025, 0.025, 0.027), ru=0.85, støj=0.05)
dele = []
d = dele.append

# ---- modtageren og støvdækslet ----
d(kasse("modtager", -0.0215, -0.03, -0.026, 0.0215, 0.215, 0.028, STÅL, 0.0035))
d(rør("støvdæksel", (0, -0.02, 0.026), (0, 0.205, 0.026), 0.0212, STÅL, 28, 0.002))
d(kasse("trunnion", -0.0235, 0.205, -0.026, 0.0235, 0.245, 0.03, STÅL, 0.003))
# bagsigtet: en lille klods med et blad
d(kasse("bagsigte", -0.012, 0.215, 0.028, 0.012, 0.245, 0.043, STÅL, 0.002))
d(kasse("sigteblad", -0.009, 0.218, 0.043, 0.009, 0.27, 0.047, LYS, 0.001))
# sikringen og ladegrebet på højre side
d(kasse("sikring", 0.0215, 0.02, 0.006, 0.0232, 0.14, 0.013, STÅL, 0.0007))
d(rør("ladegreb", (0.02, 0.17, 0.018), (0.042, 0.17, 0.018), 0.0055, LYS, 16))
for y in (0.01, 0.09, 0.16):
    for x in (-0.0218, 0.0218): d(kugle(f"nitte{x}{y}", (x, y, -0.012), 0.0022, LYS, sx=0.5))

# ---- piben, gasrøret og sigtet foran ----
d(rør("pibe", (0, 0.24, 0.006), (0, 0.63, 0.006), 0.0088, STÅL, 24))
d(rør("gasrør", (0, 0.245, 0.034), (0, 0.43, 0.034), 0.0108, STÅL, 24))
d(kasse("gasblok", -0.012, 0.415, 0.0, 0.012, 0.44, 0.045, STÅL, 0.002))
d(rør("sigtering", (0, 0.575, 0.006), (0, 0.603, 0.006), 0.0128, STÅL, 24))
d(kasse("sigtestolpe", -0.004, 0.585, 0.012, 0.004, 0.594, 0.052, STÅL, 0.001))
d(kasse("sigtehætte_v", -0.012, 0.582, 0.02, -0.009, 0.598, 0.058, STÅL, 0.001))
d(kasse("sigtehætte_h", 0.009, 0.582, 0.02, 0.012, 0.598, 0.058, STÅL, 0.001))
d(rør("mundingsbremse", (0, 0.63, 0.006), (0, 0.675, 0.006), 0.0115, LYS, 24, 0.002, 0.0105))

# ---- træet: forreste håndbeskytter, den øverste over gasrøret, grebet og skæftet ----
d(løft("håndbeskytter", [firkant(y, -0.0255 + t, 0.0255 - t, -0.024 + t * 0.4, 0.02) for y, t in
    [(0.245, 0.0), (0.27, 0.0015), (0.35, 0.002), (0.40, 0.003), (0.415, 0.005)]], TRÆ, 0.006))
d(løft("øvre håndbeskytter", [firkant(y, -0.0175, 0.0175, 0.028, 0.05 - t) for y, t in [(0.25, 0), (0.33, 0.001), (0.405, 0.004)]], TRÆ, 0.007))
d(løft("greb", [[(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)] for (z, x0, x1, y0, y1) in
    [(-0.024, -0.013, 0.013, -0.012, 0.03), (-0.07, -0.0145, 0.0145, -0.03, 0.015), (-0.13, -0.0155, 0.0155, -0.052, -0.006)]], GUMMI, 0.006))
d(løft("skæfte", [firkant(y, -w, w, zb, zt) for (y, w, zb, zt) in
    [(-0.03, 0.019, -0.022, 0.03), (-0.09, 0.0185, -0.04, 0.027), (-0.2, 0.019, -0.068, 0.022), (-0.31, 0.021, -0.1, 0.016)]], TRÆ, 0.007))
d(kasse("kolbeplade", -0.022, -0.322, -0.104, 0.022, -0.31, 0.019, STÅL, 0.003))

# ---- magasinet: buet frem, som på et rigtigt stormgevær ----
snit = []
for i in range(9):
    t = i / 8; z = -0.024 - t * 0.215; frem = 0.07 * t * t
    snit.append(firkant(0, -0.0155, 0.0155, 0, 0))
    snit[-1] = [(-0.0155, 0.098 + frem, z), (0.0155, 0.098 + frem, z), (0.0155, 0.168 + frem + 0.01 * t, z), (-0.0155, 0.168 + frem + 0.01 * t, z)]
d(løft("magasin", snit, MAG, 0.004))
for i in range(4):                                               # ribber på siden af magasinet
    t = 0.2 + i * 0.18; z = -0.024 - t * 0.215; frem = 0.07 * t * t
    d(kasse(f"magribbe{i}", -0.0165, 0.105 + frem, z - 0.004, 0.0165, 0.16 + frem, z + 0.004, MAG, 0.0015))

# ---- aftrækkerbøjlen og aftrækkeren ----
bue = []
for i in range(13):
    v = math.pi * i / 12; y = 0.045 - math.cos(v) * 0.045; z = -0.026 - math.sin(v) * 0.022
    bue.append([(-0.003, y - 0.002, z), (0.003, y - 0.002, z), (0.003, y + 0.002, z - 0.003), (-0.003, y + 0.002, z - 0.003)])
d(løft("bøjle", bue, STÅL, 0.001))
d(løft("aftrækker", [[(-0.0025, 0.03 - 0.006 * t, -0.026 - 0.02 * t), (0.0025, 0.03 - 0.006 * t, -0.026 - 0.02 * t),
    (0.0025, 0.036 - 0.009 * t, -0.026 - 0.02 * t), (-0.0025, 0.036 - 0.009 * t, -0.026 - 0.02 * t)] for t in (0, 0.5, 1)], STÅL, 0.001))

gevær = saml("gevær", dele)
bag(gevær, "gevær", 1024)

# ---- hænderne: halvfingerhandsker med fingre, der krummer sig om grebet og håndbeskytteren (haender.py) ----
from vaabendele import hænder as hænder_opskrift
from haender import lav_hænder
hænder = lav_hænder(hænder_opskrift((0.0, -0.033, -0.072), (0, 0.335, -0.035), ((0.055, -0.11, -0.125), (0.19, -0.42, -0.29)),
                                    ((-0.045, 0.25, -0.095), (-0.24, -0.04, -0.27))), gevær)

# mundingen (hvor glimtet skal sidde) — et tomt punkt, som spillet finder
m = bpy.data.objects.new("munding", None); bpy.context.collection.objects.link(m); m.location = (0, 0.69, 0.006)
g = bpy.data.objects.new("greb", None); bpy.context.collection.objects.link(g); g.location = (0.011, -0.033, -0.072)       # højre hånd (botterne)
f = bpy.data.objects.new("forgreb", None); bpy.context.collection.objects.link(f); f.location = (0, 0.335, -0.035)      # venstre hånd
eksportér([gevær, hænder, m, g, f], "gevaer.glb")
prøvebillede("gevaer.png", (0.55, -0.35, 0.22), (0, 0.18, -0.02))
