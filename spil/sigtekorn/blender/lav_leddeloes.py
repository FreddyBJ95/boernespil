# ===== De leddeløse soldater: krop, hoved, arme og ben er hver sin del, der svæver lidt fra hinanden =====
# (som Rayman). Spillet sætter selv delene på plads hvert billede — gang, dukning, kravlen, sigte og våben —
# og når en del bliver skudt, flyver den af. Delene → modeller/leddeloes.glb
# Hver del har sit nulpunkt i leddet, den drejer om (skulder, albue, hofte, knæ, hals), og arme og ben
# peger nedad (−z). Geværerne har nulpunktet i grebet og løbet fremad (+y).
# Uniformen er lysegrå, så spillet kan farve den efter hold. Skyggerne i folderne bages ind i hjørnefarverne.
# Kør: blender --background --factory-startup --python lav_leddeloes.py

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import *

s = nulstil()


def flad(navn, farve, ru=0.8, met=0.0):
    m = bpy.data.materials.new(navn); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*farve, 1); p.inputs["Roughness"].default_value = ru; p.inputs["Metallic"].default_value = met
    return m


UNIFORM, VEST, HUD = flad("uniform", (0.62, 0.6, 0.56), 0.95), flad("vest", (0.5, 0.48, 0.44), 0.9), flad("hud", (0.62, 0.42, 0.3), 0.6)
STØVLE, HANDSKE, SORT = flad("støvle", (0.06, 0.05, 0.045), 0.7), flad("handske", (0.035, 0.035, 0.035), 0.75), flad("sort", (0.015, 0.015, 0.018), 0.3)
HJELM, KASKET, TØRKLÆDE = flad("hjelm", (0.5, 0.5, 0.46), 0.75), flad("kasket", (0.6, 0.55, 0.45), 0.9), flad("tørklæde", (0.55, 0.2, 0.15), 0.95)
STÅL, TRÆ, ØJE = flad("stål", (0.05, 0.05, 0.055), 0.4, 0.85), flad("træ", (0.3, 0.13, 0.05), 0.55), flad("øje", (0.92, 0.9, 0.86), 0.3)


def snit(z, w, d, y0=0.0):
    """Et vandret tværsnit (til at "løfte" kroppen op igennem)"""
    return [(-w, y0 - d, z), (w, y0 - d, z), (w, y0 + d, z), (-w, y0 + d, z)]


def del_(navn, dele, flyt=(0, 0, 0)):
    o = saml(navn, dele)
    if flyt != (0, 0, 0): o.data.transform(Matrix.Translation(Vector(flyt)))
    for p in o.data.polygons: p.use_smooth = True
    return o


alle = []
# ---------- Kroppen (nulpunkt: midt i hoften). Den slutter ved skuldrene — der er luft op til hovedet ----------
k = [løft("torso", [snit(0.02, 0.15, 0.11), snit(0.2, 0.16, 0.115, 0.005), snit(0.38, 0.19, 0.125, 0.01), snit(0.52, 0.165, 0.105)], UNIFORM, 0.05),
     løft("vestkrop", [snit(0.16, 0.185, 0.138, 0.01), snit(0.36, 0.205, 0.145, 0.015), snit(0.49, 0.185, 0.128, 0.01)], VEST, 0.03),
     kasse("bælte", -0.165, -0.125, 0.0, 0.165, 0.125, 0.075, SORT, 0.02), kasse("spænde", -0.03, 0.118, 0.015, 0.03, 0.135, 0.06, STÅL, 0.005),
     kasse("radio", -0.09, -0.21, 0.22, 0.09, -0.13, 0.44, SORT, 0.02), rør("antenne", (0.06, -0.17, 0.44), (0.06, -0.17, 0.62), 0.006, SORT, 6)]
for x in (-0.1, 0.0, 0.1): k.append(kasse(f"lomme{x}", x - 0.045, 0.14, 0.19, x + 0.045, 0.19, 0.31, VEST, 0.012))
alle.append(del_("krop", k))

# ---------- Hovedet (nulpunkt: hvor halsen ville være) med næse, ører, øjne og bryn ----------
h = [kugle("hovedet", (0, 0.01, 0.135), 0.11, HUD, 0.95, 1.0, 1.12), kugle("næse", (0, 0.118, 0.12), 0.024, HUD, 0.8, 0.9, 1.15)]
for x in (-1, 1):
    h += [kugle(f"øre{x}", (0.103 * x, 0, 0.135), 0.027, HUD, 0.45, 0.8, 1.1), kugle(f"øjehvidt{x}", (0.042 * x, 0.094, 0.158), 0.02, ØJE, 1, 0.6, 1.1),
          kugle(f"pupil{x}", (0.042 * x, 0.105, 0.158), 0.011, SORT, 1, 0.6, 1), kasse(f"bryn{x}", 0.022 * x - 0.022, 0.098, 0.182, 0.022 * x + 0.022, 0.112, 0.192, SORT, 0.004)]
alle.append(del_("hoved", h))
# holdenes hovedbeklædning (samme nulpunkt som hovedet — spillet viser den ene eller den anden)
alle.append(del_("hjelm", [kugle("hjelmskal", (0, 0.005, 0.176), 0.128, HJELM, 1.0, 1.08, 0.82), rør("hjelmkant", (0, 0.005, 0.13), (0, 0.005, 0.145), 0.138, HJELM, 24, 0.004, 0.132)]))
alle.append(del_("briller", [kasse("brilleglas", -0.075, 0.098, 0.186, 0.075, 0.128, 0.226, SORT, 0.01), rør("brillerem", (0, 0, 0.198), (0, 0, 0.212), 0.114, SORT, 24, 0.002)]))
alle.append(del_("kasket", [kugle("kasketpuld", (0, 0.0, 0.2), 0.112, KASKET, 1.0, 1.05, 0.6), kasse("skygge", -0.07, 0.07, 0.19, 0.07, 0.175, 0.203, KASKET, 0.012)]))
alle.append(del_("tørklæde", [rør("maske", (0, 0.012, 0.045), (0, 0.012, 0.125), 0.114, TØRKLÆDE, 24, 0.015, 0.108),
                              kugle("snip", (0, 0.1, 0.06), 0.05, TØRKLÆDE, 1.2, 0.5, 1.2)]))

# ---------- Arme (nulpunkt i skulderen og albuen) og ben (nulpunkt i hoften og knæet) ----------
for side in ("R", "L"):
    alle.append(del_(f"overarm{side}", [kugle(f"skulderpude{side}", (0, 0, -0.012), 0.078, VEST, 1.0, 1.0, 0.8),
                                       rør(f"ærme{side}", (0, 0, -0.03), (0, 0, -0.27), 0.056, UNIFORM, 16, 0.01, 0.048)]))
    alle.append(del_(f"underarm{side}", [rør(f"underærme{side}", (0, 0, -0.012), (0, 0, -0.19), 0.049, UNIFORM, 16, 0.01, 0.042),
                                        rør(f"manchet{side}", (0, 0, -0.17), (0, 0, -0.215), 0.051, UNIFORM, 16, 0.006),
                                        kugle(f"handske{side}", (0, 0.008, -0.272), 0.052, HANDSKE, 0.85, 1.1, 1.2),
                                        kugle(f"tommel{side}", (0, 0.045, -0.245), 0.021, HANDSKE, 1, 1, 1.5)]))
    x = 1 if side == "R" else -1
    alle.append(del_(f"lår{side}", [rør(f"lårben{side}", (0, 0, -0.02), (0, 0, -0.39), 0.078, UNIFORM, 16, 0.012, 0.064),
                                   kasse(f"lårlomme{side}", 0.055 * x - 0.03, -0.045, -0.3, 0.055 * x + 0.03, 0.045, -0.17, UNIFORM, 0.012)]))
    alle.append(del_(f"skinneben{side}", [kasse(f"knæpude{side}", -0.052, 0.045, -0.13, 0.052, 0.088, -0.015, SORT, 0.02),
                                         rør(f"skinne{side}", (0, 0, -0.03), (0, 0, -0.3), 0.06, UNIFORM, 16, 0.01, 0.052),
                                         rør(f"støvleskaft{side}", (0, 0, -0.27), (0, 0, -0.4), 0.059, STØVLE, 16, 0.01),
                                         kasse(f"støvle{side}", -0.057, -0.075, -0.48, 0.057, 0.17, -0.36, STØVLE, 0.035)]))

# ---------- Våbnene i hånden (nulpunkt i grebet, løbet frem) ----------
g = [kasse("g_modtager", -0.021, -0.03, -0.026, 0.021, 0.215, 0.028, STÅL, 0.004), rør("g_pibe", (0, 0.2, 0.006), (0, 0.66, 0.006), 0.009, STÅL, 12),
     kasse("g_hånd", -0.025, 0.245, -0.024, 0.025, 0.415, 0.024, TRÆ, 0.008), kasse("g_greb", -0.014, -0.045, -0.12, 0.014, 0.01, -0.02, SORT, 0.008),
     kasse("g_skæfte", -0.019, -0.33, -0.09, 0.019, -0.02, 0.028, TRÆ, 0.012), kasse("g_magasin", -0.015, 0.1, -0.22, 0.015, 0.17, -0.02, TØRKLÆDE, 0.008),
     kasse("g_sigte", -0.004, 0.58, 0.012, 0.004, 0.595, 0.05, STÅL, 0.002)]
alle.append(del_("gevær", g, (0, 0.017, 0.07)))
sn = [kasse("s_modtager", -0.02, -0.06, -0.02, 0.02, 0.17, 0.03, STÅL, 0.004), rør("s_pibe", (0, 0.17, 0.008), (0, 0.86, 0.008), 0.011, STÅL, 12),
      kasse("s_skæfte", -0.024, -0.38, -0.11, 0.024, 0.32, 0.0, flad("oliven", (0.14, 0.17, 0.09), 0.8), 0.012),
      rør("s_kikkert", (0, -0.07, 0.085), (0, 0.24, 0.085), 0.021, SORT, 14), kasse("s_greb", -0.014, -0.06, -0.13, 0.014, -0.01, -0.02, SORT, 0.008)]
alle.append(del_("snig", sn, (0, 0.035, 0.075)))
p = [kasse("p_slæde", -0.0145, -0.065, 0.02, 0.0145, 0.13, 0.052, STÅL, 0.003), kasse("p_ramme", -0.0135, -0.05, -0.006, 0.0135, 0.115, 0.022, SORT, 0.003),
     kasse("p_greb", -0.015, -0.07, -0.12, 0.015, -0.015, 0.0, SORT, 0.005)]
alle.append(del_("pistol", p, (0, 0.045, 0.06)))

# ---------- Skygger i krogene (bages ind i hjørnefarverne — hver del for sig, så de kan flyttes frit) ----------
for i, o in enumerate(alle): o.location = (i * 1.2, 0, 0)
for o in alle:
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    if not o.data.color_attributes: o.data.color_attributes.new("Farve", "BYTE_COLOR", "CORNER")
    o.data.color_attributes.active_color = o.data.color_attributes[0]
    s.render.bake.target = "VERTEX_COLORS"; s.cycles.samples = 64
    bpy.ops.object.bake(type="AO")
    for c in o.data.color_attributes[0].data: c.color = tuple(0.45 + 0.55 * v for v in c.color[:3]) + (1,)
for o in alle: o.location = (0, 0, 0)

bpy.ops.object.select_all(action="DESELECT")
for o in alle: o.select_set(True)
sti = os.path.join(MODELLER, "leddeloes.glb")
bpy.ops.export_scene.gltf(filepath=sti, export_format="GLB", use_selection=True, export_yup=True, export_vertex_color="ACTIVE")
print("GEMT", sti, os.path.getsize(sti) // 1024, "kB", "trekanter", sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in alle))

# ---------- Prøvebillede: soldaten samlet, stående ----------
STED = {"krop": (0, 0, 0.95), "hoved": (0, 0.01, 1.57), "hjelm": (0, 0.01, 1.57), "briller": (0, 0.01, 1.57), "overarmR": (0.31, 0, 1.42), "overarmL": (-0.31, 0, 1.42),
        "underarmR": (0.31, 0, 1.11), "underarmL": (-0.31, 0, 1.11), "lårR": (0.11, 0, 0.9), "lårL": (-0.11, 0, 0.9), "skinnebenR": (0.11, 0, 0.48), "skinnebenL": (-0.11, 0, 0.48),
        "gevær": (0.31, 0.06, 0.84)}
for o in alle:
    o.location = STED.get(o.name, (0, 0, -5))
    o.hide_render = o.name not in STED
prøvebillede("leddeloes.png", (2.0, 2.6, 1.5), (0, 0, 0.95), (420, 520))
