# ===== Fælles dele til våbnene i hånden: handsker og ærmer, og at gemme et våben som GLB =====
# Bruges af lav_vaaben.py og lav_arsenal.py. Koordinater: x til højre, y frem (løbet), z op, nulpunktet ved grebet.

import bpy
from faelles import kasse, rør, farvet, saml, bag, eksportér
from haender import lav_hænder


def hænder(højre_greb, venstre=None, højre_ærme=((0.06, -0.11, -0.13), (0.19, -0.42, -0.29)), venstre_ærme=None, type_="pistol"):
    """Opskriften på hænderne: højre hånd om grebet (punktet er grebets midte) og evt. venstre hånd foran.
    type_: "pistol" (pistolgreb) eller "skaft" (et vandret skaft: kniv, machete, hakke).
    Selve hænderne bygges af gem(), når våbnet er samlet — så fingrene kan lægges tæt om dets overflade (haender.py)"""
    return {"højre": tuple(højre_greb), "venstre": tuple(venstre) if venstre else None, "højre_ærme": højre_ærme, "venstre_ærme": venstre_ærme, "type": type_}


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
    v = saml(navn, dele)
    if isinstance(hd, dict): hd = lav_hænder(hd, v)                    # (hænderne om det samlede våben)
    bag(v, navn, str_)
    ting = [v, hd, punkt("munding", munding)]
    if hd and "greb" in hd: ting.append(punkt("greb", tuple(hd["greb"])))
    if forgreb: ting.append(punkt("forgreb", forgreb))
    if øje: ting.append(punkt("oeje", øje))
    if roterer: ting.append(skil_ud(v, "roterer", roterer[1]))
    eksportér([o for o in ting if o], f"{navn}.glb")
    return v
