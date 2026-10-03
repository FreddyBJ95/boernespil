# ===== Fælles dele til våbnene i hånden: handsker og ærmer, og at gemme et våben som GLB =====
# Bruges af lav_vaaben.py og lav_arsenal.py. Koordinater: x til højre, y frem (løbet), z op, nulpunktet ved grebet.

import bpy
from faelles import kasse, rør, farvet, saml, bag, eksportér


def hænder(højre_greb, venstre=None, højre_ærme=((0.06, -0.11, -0.13), (0.19, -0.42, -0.29)), venstre_ærme=None):
    """Handsker og ærmer: højre hånd om grebet (punktet er grebets midte) og evt. venstre hånd foran"""
    HANDSKE = farvet("handske", (0.03, 0.03, 0.032), ru=0.7, støj=0.25, skala=120)
    ÆRME = farvet("ærme", (0.42, 0.33, 0.2), ru=0.95, støj=0.2, skala=60)
    x, y, z = højre_greb
    hd = [kasse("højre håndflade", x - 0.02, y - 0.032, z - 0.042, x + 0.018, y + 0.026, z + 0.038, HANDSKE, 0.012)]
    for i, dz in enumerate((-0.02, 0.0, 0.02)):
        hd.append(rør(f"finger{i}", (x + 0.016, y + 0.03, z + dz), (x - 0.03, y + 0.042, z + dz - 0.004), 0.0092, HANDSKE, 14, 0.003))
    hd.append(rør("tommel", (x - 0.03, y - 0.02, z + 0.04), (x - 0.03, y + 0.02, z + 0.052), 0.0092, HANDSKE, 14, 0.003))
    hd.append(rør("højre håndled", (x + 0.01, y - 0.03, z - 0.02), (x + 0.045, y - 0.1, z - 0.06), 0.026, HANDSKE, 18, 0.004, 0.03))
    a, b = højre_ærme
    hd.append(rør("højre ærme", a, b, 0.04, ÆRME, 20, 0.004, 0.05))
    if venstre:
        vx, vy, vz = venstre
        hd.append(kasse("venstre håndflade", vx - 0.024, vy - 0.035, vz - 0.016, vx + 0.024, vy + 0.035, vz + 0.016, HANDSKE, 0.011))
        for i, dy in enumerate((-0.025, -0.008, 0.009, 0.026)):
            hd.append(rør(f"vfinger{i}", (vx - 0.012, vy + dy, vz - 0.006), (vx - 0.03, vy + dy + 0.004, vz + 0.05), 0.0085, HANDSKE, 14, 0.003))
        hd.append(rør("vtommel", (vx + 0.016, vy - 0.02, vz), (vx + 0.028, vy + 0.015, vz + 0.042), 0.009, HANDSKE, 14, 0.003))
        a, b = venstre_ærme or ((vx - 0.04, vy - 0.07, vz - 0.05), (vx - 0.24, vy - 0.36, vz - 0.22))
        hd.append(rør("venstre ærme", a, b, 0.04, ÆRME, 20, 0.004, 0.05))
    o = saml("hænder", hd); bag(o, "hænder", 512)
    o["greb"] = tuple(højre_greb)                                   # grebet (højre hånd) — gem() lægger et punkt dér
    return o


def punkt(navn, sted):
    """Et tomt punkt, spillet finder (mundingen, hvor glimtet sidder — eller forgrebet til venstre hånd)"""
    m = bpy.data.objects.new(navn, None); bpy.context.collection.objects.link(m); m.location = sted
    return m


def skil_ud(o, gruppe, akse):
    """Skil de dele, der er i gruppen, ud som deres egen ting (samme billeder) — med nulpunktet på aksen, de drejer om"""
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT")
    o.vertex_groups.active_index = o.vertex_groups[gruppe].index; bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.separate(type="SELECTED"); bpy.ops.object.mode_set(mode="OBJECT")
    r = [x for x in bpy.context.selected_objects if x != o][0]; r.name = gruppe
    bpy.context.scene.cursor.location = akse
    bpy.ops.object.select_all(action="DESELECT"); r.select_set(True); bpy.context.view_layer.objects.active = r
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR"); bpy.context.scene.cursor.location = (0, 0, 0)
    return r


def gem(navn, dele, hd, munding, forgreb=None, str_=1024, øje=None, roterer=None):
    """Saml våbnet, bag dets materialer og gem det sammen med hænderne og punkterne som modeller/<navn>.glb.
    Punkterne: munding (glimtet), greb (højre hånd) og forgreb (venstre hånd) — botterne holder våbnet i dem.
    øje: hvor øjet er, når man sigter ned over våbnet (spillet lægger det punkt midt foran kameraet).
    roterer: (navne, akse) — de dele, der drejer rundt (minigunnens løb), gemmes for sig som roterer"""
    if roterer:
        for o in dele:
            if o.name.startswith(roterer[0]):
                g = o.vertex_groups.new(name="roterer"); g.add(range(len(o.data.vertices)), 1.0, "REPLACE")
    v = saml(navn, dele); bag(v, navn, str_)
    ting = [v, hd, punkt("munding", munding)]
    if hd and "greb" in hd: ting.append(punkt("greb", tuple(hd["greb"])))
    if forgreb: ting.append(punkt("forgreb", forgreb))
    if øje: ting.append(punkt("oeje", øje))
    if roterer: ting.append(skil_ud(v, "roterer", roterer[1]))
    eksportér([o for o in ting if o], f"{navn}.glb")
    return v
