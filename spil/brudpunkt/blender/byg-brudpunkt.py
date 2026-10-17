"""Originale modeller til Brudpunkt. Kør med Blender i baggrunden.

Blender --background --python byg-brudpunkt.py
Python byg-brudpunkt.py --opskrifter skriver kun fysikkens beskrivelser.
Alle mål er meter i spillets højrehåndede koordinater: x, højde, z.
"""

import json
import math
import os
import random
import sys
from pathlib import Path

ROD = Path(__file__).resolve().parents[1]
MODELLER = ROD / "modeller"
MODELLER.mkdir(parents=True, exist_ok=True)
random.seed(29)


# Opskriften beskriver rigtige, adskilte stykker og deres bærende forbindelser.
def opskrifter():
  typer = {}

  def begynd(nøgle, navn):
    data = {"navn": navn, "dele": [], "baand": []}
    typer[nøgle] = data
    return data

  def stykke(data, id, p, halv, materiale, styrke, masse, fundament=False):
    data["dele"].append({"id": id, "p": p, "halv": halv, "materiale": materiale,
                         "styrke": styrke, "masse": masse, "fundament": fundament})

  def bånd(data, a, b):
    data["baand"].append([a, b])

  bil = begynd("bil", "Servicebil")
  for id, p, halv, mat, styrke, masse in [
    ("bund", [0, .58, 0], [.93, .16, 1.85], "metal", .75, 3.5),
    ("kofanger_for", [0, .57, 2.04], [1.05, .16, .16], "metal", .44, .8),
    ("kofanger_bag", [0, .57, -2.04], [1.05, .16, .16], "metal", .44, .8),
    ("motorhjelm", [0, 1.03, 1.21], [.92, .17, .67], "metal", .46, 1.1),
    ("bagklap", [0, 1.02, -1.49], [.92, .14, .41], "metal", .46, .9),
    ("tag", [0, 1.94, -.35], [.95, .10, .97], "metal", .50, 1.2),
    ("doer_v", [-.98, 1.32, -.30], [.08, .53, .89], "metal", .46, 1.0),
    ("doer_h", [.98, 1.32, -.30], [.08, .53, .89], "metal", .46, 1.0),
    ("forrude", [0, 1.56, .57], [.85, .27, .035], "glas", .16, .2),
    ("bagrude", [0, 1.55, -1.29], [.85, .27, .035], "glas", .16, .2),
  ]:
    stykke(bil, id, p, halv, mat, styrke, masse)
  for side, x in [("v", -1.02), ("h", 1.02)]:
    for ende, z in [("for", 1.20), ("bag", -1.20)]:
      stykke(bil, "hjul_" + side + "_" + ende, [x, .43, z], [.22, .40, .40], "metal", .58, .6)
  for id in ["kofanger_for", "kofanger_bag", "motorhjelm", "bagklap", "doer_v", "doer_h",
             "hjul_v_for", "hjul_h_for", "hjul_v_bag", "hjul_h_bag"]:
    bånd(bil, "bund", id)
  for id in ["doer_v", "doer_h", "forrude", "bagrude"]:
    bånd(bil, "tag", id)
  for id in ["forrude", "bagrude"]:
    bånd(bil, "doer_v", id)
    bånd(bil, "doer_h", id)

  hus = begynd("hus", "Værkstedsdepot")
  for side, x in [("v", -1.75), ("h", 1.75)]:
    for ende, z in [("for", 1.25), ("bag", -1.25)]:
      stykke(hus, "sokkel_" + side + "_" + ende, [x, .15, z], [1.74, .15, 1.24], "beton", .91, 5.0, True)
      id = "stolpe_" + side + "_" + ende
      stykke(hus, id, [math.copysign(3.28, x), 1.70, math.copysign(2.28, z)], [.15, 1.40, .15], "trae", .66, 1.2)
      bånd(hus, "sokkel_" + side + "_" + ende, id)
  for a, b in [("v_for", "h_for"), ("v_bag", "h_bag"), ("v_for", "v_bag"), ("h_for", "h_bag")]:
    bånd(hus, "sokkel_" + a, "sokkel_" + b)
  for side, x in [("v", -3.27), ("h", 3.27)]:
    for nummer, z in enumerate([1.50, 0, -1.50]):
      id = "vaeg_" + side + "_" + str(nummer)
      stykke(hus, id, [x, 1.70, z], [.13, 1.38, .72], "trae", .40, 1.4)
      for ende in (["for"] if nummer == 0 else ["bag"] if nummer == 2 else ["for", "bag"]):
        bånd(hus, id, "stolpe_" + side + "_" + ende)
        bånd(hus, id, "sokkel_" + side + "_" + ende)
      if nummer:
        bånd(hus, id, "vaeg_" + side + "_" + str(nummer - 1))
  for side, x in [("v", -1.65), ("h", 1.65)]:
    id = "vaeg_bag_" + side
    stykke(hus, id, [x, 1.70, -2.27], [1.48, 1.38, .13], "trae", .40, 2.0)
    bånd(hus, id, "sokkel_" + side + "_bag")
    bånd(hus, id, "stolpe_" + side + "_bag")
    id = "vaeg_for_" + side
    stykke(hus, id, [x * 1.24, 1.70, 2.27], [1.10, 1.38, .13], "trae", .40, 1.5)
    bånd(hus, id, "sokkel_" + side + "_for")
    bånd(hus, id, "stolpe_" + side + "_for")
  stykke(hus, "doer", [0, 1.40, 2.30], [.79, 1.08, .07], "trae", .32, .7)
  bånd(hus, "doer", "vaeg_for_v")
  stykke(hus, "overligger", [0, 2.81, 2.27], [1.0, .28, .14], "trae", .58, .8)
  for side in ["v", "h"]:
    bånd(hus, "overligger", "vaeg_for_" + side)
  for ende, z in [("for", 2.27), ("bag", -2.27)]:
    id = "rem_" + ende
    stykke(hus, id, [0, 3.13, z], [3.45, .10, .16], "trae", .68, 1.5)
    for side in ["v", "h"]:
      bånd(hus, id, "stolpe_" + side + "_" + ende)
    stykke(hus, "gavl_" + ende, [0, 3.71, z], [3.32, .49, .10], "trae", .34, 1.0)
    bånd(hus, "gavl_" + ende, id)
  for side, x in [("v", -3.27), ("h", 3.27)]:
    id = "rem_" + side
    stykke(hus, id, [x, 3.13, 0], [.16, .10, 2.32], "trae", .68, 1.3)
    for ende in ["for", "bag"]:
      bånd(hus, id, "stolpe_" + side + "_" + ende)
  for side, x in [("v", -1.86), ("h", 1.86)]:
    for nummer, z in enumerate([1.72, 0, -1.72]):
      id = "tag_" + side + "_" + str(nummer)
      stykke(hus, id, [x, 3.79, z], [1.95, .64, .85], "metal", .35, 1.3)
      bånd(hus, id, "rem_" + side)
      bånd(hus, id, "gavl_" + ("for" if nummer < 2 else "bag"))
      if nummer:
        bånd(hus, id, "tag_" + side + "_" + str(nummer - 1))
  for nummer, z in enumerate([1.29, -1.29]):
    id = "kip_" + str(nummer)
    stykke(hus, id, [0, 4.46, z], [.13, .08, 1.29], "metal", .28, .4)
    for side in ["v", "h"]:
      for n in [nummer, nummer + 1]:
        bånd(hus, id, "tag_" + side + "_" + str(n))
  for nummer, y, hy in [(0, 1.21, .90), (1, 3.10, .98), (2, 4.62, .53)]:
    id = "skorsten_" + str(nummer)
    stykke(hus, id, [-1.65, y, -1.25], [.32, hy, .32], "beton", .48, 1.2)
    bånd(hus, id, "sokkel_v_bag" if nummer == 0 else "skorsten_" + str(nummer - 1))

  taarn = begynd("taarn", "Vandtårn")
  for xnavn, x in [("v", -1.48), ("h", 1.48)]:
    for znavn, z in [("for", 1.48), ("bag", -1.48)]:
      hjørne = xnavn + "_" + znavn
      stykke(taarn, "fod_" + hjørne, [x, .15, z], [.42, .15, .42], "beton", .94, 4.0, True)
      for n, y in enumerate([2.04, 5.55]):
        id = "ben_" + hjørne + "_" + str(n)
        stykke(taarn, id, [x, y, z], [.15, 1.74, .15], "metal", .62, 2.2)
        bånd(taarn, id, "fod_" + hjørne if n == 0 else "ben_" + hjørne + "_0")
  for n, y in enumerate([3.79, 7.29]):
    for ende, z in [("for", 1.48), ("bag", -1.48)]:
      id = "tvaer_" + ende + "_" + str(n)
      stykke(taarn, id, [0, y, z], [1.65, .10, .10], "metal", .50, 1.2)
      for side in ["v", "h"]:
        bånd(taarn, id, "ben_" + side + "_" + ende + "_" + str(n))
    for side, x in [("v", -1.48), ("h", 1.48)]:
      id = "tvaer_" + side + "_" + str(n)
      stykke(taarn, id, [x, y, 0], [.10, .10, 1.65], "metal", .50, 1.2)
      for ende in ["for", "bag"]:
        bånd(taarn, id, "ben_" + side + "_" + ende + "_" + str(n))
  for side, x in [("v", -.83), ("h", .83)]:
    for ende, z in [("for", .83), ("bag", -.83)]:
      id = "daek_" + side + "_" + ende
      stykke(taarn, id, [x, 7.31, z], [.82, .04, .82], "metal", .50, 1.0)
      bånd(taarn, id, "tvaer_" + side + "_1")
      bånd(taarn, id, "tvaer_" + ende + "_1")
  for id, y, halv, styrke, masse in [
    ("tank_bund", 7.70, [1.82, .34, 1.82], .60, 3.5),
    ("tank_midte", 8.70, [1.82, .65, 1.82], .52, 4.0),
    ("tank_top", 9.81, [1.82, .45, 1.82], .46, 3.0),
    ("tank_tag", 10.43, [1.89, .16, 1.89], .40, 2.0),
  ]:
    stykke(taarn, id, [0, y, 0], halv, "metal", styrke, masse)
  for side in ["v", "h"]:
    for ende in ["for", "bag"]:
      bånd(taarn, "tank_bund", "daek_" + side + "_" + ende)
  for a, b in [("tank_bund", "tank_midte"), ("tank_midte", "tank_top"), ("tank_top", "tank_tag")]:
    bånd(taarn, a, b)

  celle = begynd("celle", "Energicelle")
  stykke(celle, "kerne", [0, .65, 0], [.49, .65, .49], "metal", .22, 1.0)
  return typer


OPSKRIFTER = opskrifter()
(MODELLER / "opskrifter.json").write_text(json.dumps(OPSKRIFTER, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
if "--opskrifter" in sys.argv:
  print("Opskrifter:", {k: len(v["dele"]) for k, v in OPSKRIFTER.items()})
  sys.exit(0)

import bpy
from mathutils import Vector
import bmesh


# Materialerne bruger rigtige PBR-værdier. Farverne indtastes som sRGB.
def lineær(v):
  return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4


def materiale(navn, farve, ruhed=.65, metal=0, emission=0, glas=False):
  mat = bpy.data.materials.new(navn)
  mat.use_nodes = True
  farve = tuple(lineær(v) for v in farve[:3]) + (farve[3] if len(farve) > 3 else 1,)
  mat.diffuse_color = farve
  p = mat.node_tree.nodes.get("Principled BSDF")
  p.inputs["Base Color"].default_value = farve
  p.inputs["Roughness"].default_value = ruhed
  p.inputs["Metallic"].default_value = metal
  if emission:
    p.inputs["Emission Color"].default_value = farve
    p.inputs["Emission Strength"].default_value = emission
  if glas:
    p.inputs["Alpha"].default_value = .57
    mat.surface_render_method = "DITHERED"
  return mat


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
M = {
  "beton": materiale("Vasket beton", (.48, .49, .46), .92),
  "beton_lys": materiale("Slidt betonkant", (.68, .68, .61), .85),
  "mursten": materiale("Brændt tegl", (.53, .26, .16), .91),
  "puds": materiale("Gammel kalkpuds", (.68, .67, .56), .92),
  "trae": materiale("Olieret kernetræ", (.42, .28, .15), .81),
  "trae_lys": materiale("Blottet træ", (.66, .49, .28), .83),
  "trae_graa": materiale("Falmet salviegrøn træbeklædning", (.36, .46, .40), .84),
  "bil": materiale("Patineret petrolfarvet emalje", (.10, .35, .38), .31, .42),
  "indtraek": materiale("Mørkt sædeindtræk", (.15, .18, .17), .97),
  "gummi": materiale("Slidt vulkaniseret gummi", (.075, .082, .078), .94),
  "staal": materiale("Galvaniseret stål", (.48, .51, .51), .35, .85),
  "staal_moerk": materiale("Blågråt konstruktionsstål", (.20, .27, .29), .50, .70),
  "krom": materiale("Børstet aluminium", (.70, .73, .72), .22, .95),
  "rust": materiale("Jernoxid", (.44, .22, .12), .91, .12),
  "tag": materiale("Oxidrødt falset tag", (.49, .20, .12), .60, .51),
  "glas": materiale("Let tonet vinduesglas", (.34, .57, .60), .10, .16, glas=True),
  "glas_moerk": materiale("Mørk glasrefleks", (.12, .26, .29), .12, .25),
  "lygte": materiale("Varm lygteglas", (1, .84, .45), .18, .10, 1.2),
  "cyan": materiale("Ionisk lys", (.14, .91, 1), .24, .2, 2.5),
  "gul": materiale("Industrigul sikkerhedsmaling", (.94, .63, .12), .62, .22),
  "hvid": materiale("Vejrslidt elfenbensmaling", (.84, .85, .75), .70),
  "roed": materiale("Reflekterende rødt glas", (.72, .13, .08), .35, .12, .15),
  "graa": materiale("Værkstedsgrå", (.27, .32, .31), .76, .15),
  "jord": materiale("Varmt grus", (.33, .28, .20), 1),
  "klippe": materiale("Mørk skifer", (.33, .36, .34), 1),
  "klippe_lys": materiale("Lys klippeside", (.47, .48, .42), 1),
  "mos": materiale("Tørt græs og mos", (.37, .41, .25), 1),
}


# Hjælpere oversætter spillets y-op til Blenders z-op præcis én gang.
def v(p):
  return Vector((p[0], -p[2], p[1]))


def gruppe(navn, p=(0, 0, 0), parent=None):
  obj = bpy.data.objects.new(navn, None)
  bpy.context.collection.objects.link(obj)
  obj.empty_display_type = "PLAIN_AXES"
  obj.empty_display_size = .15
  obj.parent = parent
  obj.location = v(p)
  return obj


def mesh(navn, punkter, flader, mat, parent, p=(0, 0, 0), glat=False):
  data = bpy.data.meshes.new(navn)
  data.from_pydata([v(p) for p in punkter], [], flader)
  data.materials.append(M[mat] if isinstance(mat, str) else mat)
  data.update()
  # Drejede cylindre og ringe skal også have udadvendte normaler i browseren.
  bm = bmesh.new()
  bm.from_mesh(data)
  bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
  bm.to_mesh(data)
  bm.free()
  obj = bpy.data.objects.new(navn, data)
  bpy.context.collection.objects.link(obj)
  obj.parent = parent
  obj.location = v(p)
  if glat:
    for poly in data.polygons:
      poly.use_smooth = len(poly.vertices) == 4
  return obj


def kasse(navn, p, mål, mat, parent, kant=.015, drej=(0, 0, 0)):
  hx, hy, hz = [s / 2 for s in mål]
  punkter = [(x * hx, y * hy, z * hz) for x, y, z in [
    (-1,-1,-1), (1,-1,-1), (1,1,-1), (-1,1,-1),
    (-1,-1,1), (1,-1,1), (1,1,1), (-1,1,1)]]
  obj = mesh(navn, punkter, [(0,3,2,1), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)], mat, parent, p)
  obj.rotation_euler = (drej[0], -drej[2], drej[1])
  if kant and min(mål) > max(.07, kant * 2.1):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(kant, min(mål) * .22), segments=1, affect="EDGES")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
  return obj


def cylinder(navn, p, radius, højde, mat, parent, sider=20, akse="y", radius_top=None):
  radius_top = radius if radius_top is None else radius_top
  punkter = []
  for niveau, r in [(-højde / 2, radius), (højde / 2, radius_top)]:
    for i in range(sider):
      a = 2 * math.pi * i / sider
      q = (r * math.cos(a), niveau, r * math.sin(a))
      if akse == "x":
        q = (q[1], q[0], q[2])
      elif akse == "z":
        q = (q[0], q[2], q[1])
      punkter.append(q)
  flader = [tuple(reversed(range(sider))), tuple(range(sider, sider * 2))]
  flader += [(i, (i + 1) % sider, (i + 1) % sider + sider, i + sider) for i in range(sider)]
  return mesh(navn, punkter, flader, mat, parent, p, glat=True)


def ring(navn, p, radius, tykkelse, mat, parent, akse="y", sider=24, tværsnit=6):
  punkter = []
  for i in range(sider):
    a = i / sider * 2 * math.pi
    for j in range(tværsnit):
      b = j / tværsnit * 2 * math.pi
      r = radius + math.cos(b) * tykkelse
      q = (math.cos(a) * r, math.sin(b) * tykkelse, math.sin(a) * r)
      if akse == "x":
        q = (q[1], q[0], q[2])
      elif akse == "z":
        q = (q[0], q[2], q[1])
      punkter.append(q)
  flader = []
  for i in range(sider):
    for j in range(tværsnit):
      flader.append((i * tværsnit + j, ((i + 1) % sider) * tværsnit + j,
                      ((i + 1) % sider) * tværsnit + (j + 1) % tværsnit, i * tværsnit + (j + 1) % tværsnit))
  obj = mesh(navn, punkter, flader, mat, parent, p, glat=True)
  for face in obj.data.polygons:
    face.use_smooth = True
  return obj


def bjælke(navn, a, b, bredde, mat, parent, dybde=None, kant=.01):
  a, b = Vector(a), Vector(b)
  obj = kasse(navn, (a + b) / 2, (bredde, (b - a).length, dybde or bredde), mat, parent, kant)
  obj.rotation_mode = "QUATERNION"
  obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(v(b - a))
  return obj


def skilt(tekst, p, størrelse, mat, parent, drej=0):
  data = bpy.data.curves.new("Tekst " + tekst, "FONT")
  data.body = tekst
  data.align_x = "CENTER"
  data.align_y = "CENTER"
  data.size = størrelse
  data.extrude = 0
  data.resolution_u = 2
  data.materials.append(M[mat])
  obj = bpy.data.objects.new("Skilt " + tekst, data)
  bpy.context.collection.objects.link(obj)
  obj.parent = parent
  obj.location = v(p)
  obj.rotation_euler = (math.pi / 2, 0, drej)
  bpy.context.view_layer.objects.active = obj
  obj.select_set(True)
  bpy.ops.object.convert(target="MESH")
  obj.select_set(False)
  return obj


RØDDER = {navn: gruppe(navn) for navn in [*OPSKRIFTER, "omgivelser"]}
DELE = {}
for type, data in OPSKRIFTER.items():
  DELE[type] = {d["id"]: gruppe(type + "__" + d["id"], d["p"], RØDDER[type]) for d in data["dele"]}


# Servicebilen har løse døre, glas, fælge, sæder og en genkendelig undervogn.
def byg_bil():
  dele = DELE["bil"]
  p = dele["bund"]
  kasse("Ramme", (0, 0, 0), (1.84, .25, 3.7), "staal_moerk", p, .045)
  for x in [-.65, .65]:
    kasse("Længdevange", (x, -.14, 0), (.12, .12, 3.7), "staal", p)
  for z in [-1.2, 1.2]:
    cylinder("Aksel", (0, -.1, z), .075, 2.0, "staal_moerk", p, 12, "x")
    cylinder("Differentiale", (0, -.1, z), .16, .32, "staal_moerk", p, 12, "x")
  kasse("Gulv", (0, .16, -.28), (1.8, .06, 1.9), "indtraek", p)
  for x in [-.45, .45]:
    kasse("Sædehynde", (x, .39, -.19), (.59, .16, .61), "indtraek", p, .07)
    kasse("Sæderyg", (x, .68, -.44), (.59, .62, .13), "indtraek", p, .065, drej=(.10, 0, 0))
    kasse("Nakkestøtte", (x, 1.03, -.44), (.32, .20, .10), "indtraek", p, .035)
    for xx in [-.19, .19]:
      kasse("Syning i sæde", (x + xx, .49, -.17), (.012, .012, .48), "graa", p, 0)
  kasse("Instrumentbord", (0, .63, .43), (1.75, .28, .29), "indtraek", p, .04)
  ring("Rat", (-.44, .82, .22), .18, .025, "gummi", p, "z", 20, 6)
  for x in [-.52, -.36]:
    bjælke("Rat eger", (-.44, .82, .22), (x, .94, .22), .02, "staal", p)
  cylinder("Udstødning", (.66, -.16, -1.88), .055, .34, "staal", p, 12, "z")
  for ende, z, navn in [(1, .02, "kofanger_for"), (-1, -.02, "kofanger_bag")]:
    p = dele[navn]
    kasse("Kromkofanger", (0, 0, 0), (2.08, .27, .28), "krom", p, .075)
    for x in [-.67, .67]:
      kasse("Gummianslag", (x, 0, ende * .15), (.21, .31, .055), "gummi", p)
    kasse("Nummerplade", (0, -.01, ende * .16), (.65, .16, .018), "hvid", p, .008)
    skilt("BP 014", (0, -.01, ende * .172), .10, "staal_moerk", p, 0 if ende > 0 else math.pi)
  p = dele["motorhjelm"]
  kasse("Motorhjelm", (0, 0, 0), (1.82, .28, 1.31), "bil", p, .09)
  kasse("Frontpanel", (0, -.18, .66), (1.82, .34, .08), "bil", p, .025)
  kasse("Køler mørke", (0, -.17, .71), (.91, .24, .03), "gummi", p)
  for n in range(9):
    kasse("Køler ribbe", (-.40 + n * .10, -.17, .73), (.018, .22, .02), "krom", p, .005)
  for x in [-.68, .68]:
    kasse("Lygteramme", (x, -.13, .71), (.37, .26, .05), "krom", p, .035)
    kasse("Forlygte", (x, -.13, .743), (.30, .19, .02), "lygte", p, .025)
    for n in range(4):
      kasse("Prisme i lygte", (x - .10 + n * .066, -.13, .758), (.009, .17, .012), "hvid", p, 0)
  for x in [-.70, .70]:
    for n in range(5):
      kasse("Ventilationsrille", (x, .145, -.36 + n * .06), (.20, .01, .02), "staal_moerk", p, 0)
  for x in [-.90, .90]:
    kasse("Rustkant på forskærm", (x, -.09, .10), (.016, .025, 1.0), "rust", p, 0)
  p = dele["bagklap"]
  kasse("Bagklap", (0, 0, 0), (1.82, .25, .80), "bil", p, .065)
  for x in [-.70, .70]:
    kasse("Baglygteramme", (x, -.09, -.43), (.34, .21, .04), "gummi", p)
    kasse("Baglygte", (x, -.09, -.46), (.29, .16, .025), "roed", p)
  kasse("Bagklap liste", (0, -.07, -.45), (1.0, .035, .025), "krom", p, .005)
  p = dele["tag"]
  kasse("Tagplade", (0, 0, 0), (1.9, .17, 1.92), "bil", p, .07)
  for x in [-.75, .75]:
    kasse("Regnrende", (x, .075, 0), (.045, .025, 1.81), "krom", p, .006)
  for side, tegn in [("v", -1), ("h", 1)]:
    p = dele["doer_" + side]
    kasse("Dørens metalplade", (0, -.19, 0), (.14, .64, 1.73), "bil", p, .035)
    for z in [-.84, .84]:
      kasse("Stolpe", (0, .22, z), (.10, .57, .07), "bil", p)
    kasse("Overkarm", (0, .49, 0), (.10, .07, 1.76), "bil", p)
    kasse("Vindueskarm", (0, -.02, 0), (.15, .04, 1.74), "krom", p)
    kasse("Siderude", (0, .23, 0), (.025, .46, 1.60), "glas", p, 0)
    kasse("B-stolpe", (0, .23, -.26), (.09, .50, .055), "bil", p)
    kasse("Håndtag", (tegn * .085, -.10, -.54), (.055, .045, .21), "krom", p)
    kasse("Stødliste", (tegn * .081, -.30, 0), (.025, .045, 1.61), "gummi", p, .007)
    kasse("Spejlarm", (tegn * .17, .06, .79), (.29, .045, .05), "staal_moerk", p)
    kasse("Spejlkasse", (tegn * .31, .13, .79), (.09, .19, .24), "bil", p, .03)
    kasse("Spejlglas", (tegn * .36, .13, .79), (.012, .14, .18), "krom", p, .005)
    for n in range(6):
      kasse("Slid i lak", (tegn * .085, -.43 + n * .03, .26 - n * .12), (.009, .009, .17), "rust", p, 0)
  for navn in ["forrude", "bagrude"]:
    p = dele[navn]
    kasse("Lamineret glas", (0, 0, 0), (1.66, .50, .035), "glas", p, .012)
    for x in [-.84, .84]:
      kasse("Gummiliste", (x, 0, 0), (.025, .54, .05), "gummi", p, .005)
    for y in [-.26, .26]:
      kasse("Gummiliste", (0, y, 0), (1.70, .025, .05), "gummi", p, .005)
    if navn == "forrude":
      for x in [-.44, .27]:
        bjælke("Vinduesvisker", (x, -.23, .031), (x + .20, -.08, .031), .025, "gummi", p)
  for side, xtegn in [("v", -1), ("h", 1)]:
    for ende in ["for", "bag"]:
      p = dele["hjul_" + side + "_" + ende]
      cylinder("Dækkrop", (0, 0, 0), .39, .36, "gummi", p, 24, "x")
      for x in [-.17, .17]:
        ring("Rundet dækside", (x, 0, 0), .31, .074, "gummi", p, "x", 24, 6)
      cylinder("Stålfælg", (xtegn * .197, 0, 0), .235, .035, "staal", p, 20, "x")
      cylinder("Navkapsel", (xtegn * .22, 0, 0), .12, .035, "krom", p, 16, "x")
      for n in range(5):
        a = 2 * math.pi * n / 5
        cylinder("Hjulbolt", (xtegn * .247, .08 * math.cos(a), .08 * math.sin(a)), .022, .015, "staal_moerk", p, 6, "x")
      for n in range(16):
        a = 2 * math.pi * n / 16
        kasse("Dækmønster", (0, .391 * math.cos(a), .391 * math.sin(a)), (.30, .025, .08), "indtraek", p, .003,
              drej=(a, 0, 0))


# Depotets beklædning består af fysiske sektioner, med vinduer og råt træ indeni.
def byg_hus():
  dele = DELE["hus"]
  for data in OPSKRIFTER["hus"]["dele"]:
    id, halv = data["id"], data["halv"]
    p = dele[id]
    if id.startswith("sokkel"):
      kasse("Støbt sokkel", (0, 0, 0), [x * 2 for x in halv], "beton", p, .025)
      for n in range(4):
        kasse("Bræddegulv", (-1.28 + n * .85, .156, 0), (.81, .045, 2.43), "trae", p, .004)
      for x in [-1.45, 1.45]:
        for z in [-1.0, 1.0]:
          cylinder("Sokkelbolt", (x, .18, z), .026, .02, "staal", p, 6)
    elif id.startswith("stolpe"):
      kasse("Bærende stolpe", (0, 0, 0), (.29, 2.8, .29), "trae", p, .024)
      for x in [-.10, .10]:
        kasse("Åre i kernetræ", (x, 0, .146), (.009, 2.6, .006), "trae_lys", p, 0)
      kasse("Stolpesko", (0, -1.31, 0), (.34, .16, .34), "staal_moerk", p)
      for y in [-1.25, 1.20]:
        cylinder("Stolpebolt", (0, y, .16), .032, .03, "staal", p, 6, "z")
    elif id.startswith("vaeg_"):
      sidevæg = id.split("_")[1] in ["v", "h"]
      bredde = halv[2] * 2 if sidevæg else halv[0] * 2
      høj = halv[1] * 2
      vindue = (sidevæg and id.endswith("_1")) or id == "vaeg_bag_h" or id.startswith("vaeg_for_")
      vindueb = min(bredde * .63, 1.25)
      vindueh = .85
      vinduey = .23

      def felt(navn, x, y, w, h, mat="trae_graa", z=0, d=.17):
        if sidevæg:
          return kasse(navn, (z, y, x), (d, h, w), mat, p, .008)
        return kasse(navn, (x, y, z), (w, h, d), mat, p, .008)

      # Hvert panel er bygget med et ægte hul til glasset.
      if vindue:
        lo = vinduey - vindueh / 2
        hi = vinduey + vindueh / 2
        felt("Brystningspanel", 0, (-høj / 2 + lo) / 2, bredde, lo + høj / 2)
        felt("Overvindue", 0, (høj / 2 + hi) / 2, bredde, høj / 2 - hi)
        for tegn in [-1, 1]:
          felt("Vinduesfløj", tegn * (bredde + vindueb) / 4, vinduey, (bredde - vindueb) / 2, vindueh)
        felt("Gammelt glas", 0, vinduey, vindueb, vindueh, "glas", 0, .025)
        for x in [-vindueb / 2, 0, vindueb / 2]:
          felt("Vindueskarm", x, vinduey, .045, vindueh + .08, "hvid", .11, .06)
        for y in [lo, hi]:
          felt("Vindueskarm", 0, y, vindueb + .09, .055, "hvid", .11, .06)
        felt("Vinduesbund", 0, lo - .06, vindueb + .2, .08, "trae_lys", .13, .13)
      else:
        felt("Bræddepanel", 0, 0, bredde, høj)
      # Fine, forsænkede bræddesamlinger fortsætter kun over selve træet.
      antal = max(4, round(bredde / .22))
      for n in range(1, antal):
        x = -bredde / 2 + n * bredde / antal
        udvendig = -.095 if id.startswith("vaeg_v") or id.startswith("vaeg_bag") else .095
        if vindue and abs(x) < vindueb / 2:
          for center, h in [((-høj / 2 + lo) / 2, lo + høj / 2), ((høj / 2 + hi) / 2, høj / 2 - hi)]:
            felt("Bræddesamling", x, center, .012, h - .015, "trae", udvendig, .008)
        else:
          felt("Bræddesamling", x, 0, .012, høj - .02, "trae", udvendig, .008)
      for y in [-1.16, 1.13]:
        felt("Indvendig tværlægte", 0, y, bredde, .10, "trae", -.13, .10)
      for x in [-bredde / 2 + .08, bredde / 2 - .08]:
        felt("Blottet samlingstræ", x, 0, .07, høj - .03, "trae_lys", 0, .24)
      felt("Fugtspor nederst", 0, -1.30, bredde - .05, .05, "trae", .098, .006)
    elif id == "doer":
      kasse("Massiv depotdør", (0, 0, 0), (1.55, 2.15, .13), "trae_graa", p, .018)
      for x in [-.52, -.26, 0, .26, .52]:
        kasse("Dørbræddesamling", (x, 0, .072), (.015, 2.08, .008), "trae", p, 0)
      for y in [-.75, .68]:
        kasse("Dørbeslag", (-.18, y, .086), (1.1, .08, .03), "staal_moerk", p, .007)
      bjælke("Skrå dørstiver", (-.66, -.71, -.085), (.66, .71, -.085), .09, "trae", p)
      kasse("Dørgreb", (.57, -.08, .11), (.16, .04, .06), "krom", p)
      kasse("Slidt advarselsmærke", (0, .44, .077), (.36, .25, .007), "gul", p, .007)
      skilt("DEPOT", (0, .44, .084), .065, "staal_moerk", p)
    elif id.startswith("rem") or id == "overligger":
      kasse("Bærende rem", (0, 0, 0), [h * 2 for h in halv], "trae", p, .018)
      langs_x = halv[0] > halv[2]
      for ende in [-1, 1]:
        q = (ende * (halv[0] - .15), 0, halv[2] + .01) if langs_x else (halv[0] + .01, 0, ende * (halv[2] - .15))
        cylinder("Rembolt", q, .031, .024, "staal", p, 6, "z" if langs_x else "x")
    elif id.startswith("gavl"):
      # Gavlens trekant følger taghældningen, så intet stikker gennem taget.
      punkter = [(-3.35, -.48, -.085), (3.35, -.48, -.085), (0, .66, -.085),
                 (-3.35, -.48, .085), (3.35, -.48, .085), (0, .66, .085)]
      mesh("Gavlens trekant", punkter, [(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)], "trae_graa", p)
      for n in range(-7, 8):
        x = n * .40
        h = 1.13 * (1 - abs(x) / 3.35)
        kasse("Gavlliste", (x, -.48 + h / 2, .09), (.025, h, .018), "trae", p, 0)
      for tegn in [-1, 1]:
        bjælke("Gavlspær", (0, .66, .13), (tegn * 3.35, -.48, .13), .12, "trae_lys", p)
    elif id.startswith("tag_"):
      tegn = -1 if "_v_" in id else 1
      hældning = tegn * -.326
      # Pladernes underside er synlig, når en trykbølge vender dem rundt.
      kasse("Falset tagplade", (0, 0, 0), (3.89, .065, 1.68), "tag", p, .009, drej=(0,0,hældning))
      for n in range(6):
        z = -.81 + n * .324
        bjælke("Stående tagfals", (-1.84, tegn * .622 + .025, z), (1.84, tegn * -.622 + .025, z), .035, "tag", p, .03, .005)
      for z in [-.66, .66]:
        bjælke("Taglægte på underside", (-1.8, tegn * .622 - .08, z), (1.8, tegn * -.622 - .08, z), .09, "trae", p, .07)
      for x in [-1.58, 1.58]:
        cylinder("Tagskrue", (x, -tegn * x * .338 + .047, 0), .026, .02, "staal", p, 6)
    elif id.startswith("kip"):
      for tegn in [-1, 1]:
        kasse("Kipinddækning", (tegn * .085, -.02, 0), (.20, .025, 2.56), "tag", p, .006,
              drej=(0, 0, -tegn * .33))
    elif id.startswith("skorsten"):
      h = halv[1] * 2
      kasse("Skorstenens mørtel", (0, 0, 0), (.60, h, .60), "beton_lys", p, .009)
      rækker = max(2, round(h / .17))
      for n in range(rækker):
        y = -h / 2 + (n + .5) * h / rækker
        for side in [-1, 1]:
          for m in range(2):
            x = -.15 + m * .30 + (.07 if n % 2 else -.02)
            kasse("Håndstrøgen tegl", (x, y, side * .305), (.27, h / rækker - .018, .035), "mursten", p, .006)
            kasse("Håndstrøgen tegl", (side * .305, y, x), (.035, h / rækker - .018, .27), "mursten", p, .006)
      if id.endswith("2"):
        kasse("Skorstenskrone", (0, halv[1] - .02, 0), (.73, .10, .73), "beton", p, .025)
        kasse("Skorstensåbning", (0, halv[1] + .033, 0), (.36, .008, .36), "gummi", p, 0)


# Vandtårnet har adskilte ringe, I-profiler, nitter, rør og vedligeholdelsesdæk.
def byg_taarn():
  dele = DELE["taarn"]
  for data in OPSKRIFTER["taarn"]["dele"]:
    id, halv = data["id"], data["halv"]
    p = dele[id]
    if id.startswith("fod"):
      kasse("Betonfundament", (0, 0, 0), (.82, .30, .82), "beton", p, .035)
      kasse("Stålfod", (0, .17, 0), (.53, .05, .53), "staal_moerk", p)
      for x in [-.20, .20]:
        for z in [-.20, .20]:
          cylinder("Forankringsbolt", (x, .21, z), .027, .05, "staal", p, 6)
    elif id.startswith("ben"):
      kasse("I-profilens krop", (0, 0, 0), (.065, 3.46, .28), "staal_moerk", p, .009)
      for z in [-.13, .13]:
        kasse("I-profilens flange", (0, 0, z), (.29, 3.46, .045), "staal_moerk", p, .009)
      for y in [-1.63, 1.63]:
        kasse("Samleplade", (0, y, 0), (.34, .18, .32), "rust", p)
        for x in [-.10, .10]:
          cylinder("Samlebolt", (x, y, .17), .027, .026, "staal", p, 6, "z")
      # Stigens trin følger ét af hjørnebenene, også når benet falder.
      if "h_bag" in id:
        for x in [-.26, .26]:
          kasse("Stigevange", (x, 0, -.31), (.04, 3.48, .04), "staal", p)
        for n in range(10):
          bjælke("Stigetrin", (-.26, -1.55 + n * .34, -.31), (.26, -1.55 + n * .34, -.31), .035, "staal", p)
    elif id.startswith("tvaer"):
      kasse("Vandret U-profil", (0,0,0), [h * 2 for h in halv], "staal_moerk", p)
      vandret_x = halv[0] > halv[2]
      if id.endswith("0"):
        # Krydsstivere er synlige og følger den øverste af deres samlinger.
        for tegn in [-1, 1]:
          a = (-1.42, -.04, 0) if vandret_x else (0, -.04, -1.42)
          b = (1.42, -3.21, 0) if vandret_x else (0, -3.21, 1.42)
          if tegn < 0:
            a, b = (b[0], a[1], b[2]), (a[0], b[1], a[2])
          bjælke("Krydsstiver", a, b, .052, "rust", p, .07)
      else:
        for tegn in [-1, 1]:
          a = (-1.42, -.07, 0) if vandret_x else (0, -.07, -1.42)
          b = (1.42, -3.18, 0) if vandret_x else (0, -3.18, 1.42)
          if tegn < 0:
            a, b = (b[0], a[1], b[2]), (a[0], b[1], a[2])
          bjælke("Øvre krydsstiver", a, b, .052, "staal", p, .07)
    elif id.startswith("daek"):
      kasse("Dækramme", (0,0,0), (1.64,.07,1.64), "staal_moerk", p)
      for n in range(11):
        kasse("Ristens bånd", (-.76 + n * .15,.05,0), (.038,.025,1.6), "staal", p, 0)
      for n in [-.58, -.19, .19, .58]:
        kasse("Ristens tværbånd", (0,.063,n), (1.58,.015,.025), "staal", p, 0)
    elif id.startswith("tank"):
      h = halv[1] * 2
      tag = id == "tank_tag"
      cylinder("Tankens skal", (0,0,0), halv[0], h, "graa" if not tag else "staal_moerk", p, 32,
               radius_top=.16 if tag else None)
      if not tag:
        for y in [-h / 2 + .035, h / 2 - .035]:
          ring("Tankens forstærkningsring", (0,y,0), 1.824, .035, "staal_moerk", p, sider=32, tværsnit=4)
          for n in range(16):
            a = n * 2 * math.pi / 16
            cylinder("Nitte", (1.84 * math.sin(a), y, 1.84 * math.cos(a)), .025, .035, "staal", p, 6)
        for n in range(8):
          a = n / 8 * 2 * math.pi
          bjælke("Lodret svejsesøm", (1.825*math.sin(a),-h/2+.07,1.825*math.cos(a)),
                  (1.825*math.sin(a),h/2-.07,1.825*math.cos(a)), .016, "rust", p, kant=0)
        if id == "tank_midte":
          skilt("BRUDPUNKT", (0,.12,1.835), .29, "hvid", p)
          skilt("VAND  /  06", (0,-.24,1.839), .13, "gul", p)
          for x in [-.36, .36]:
            kasse("Slidt maling", (x,-.40,1.80), (.08,.18,.009), "rust", p, 0)
        if id == "tank_bund":
          cylinder("Aftapningsrør", (0,-.50,0), .10,.50,"staal",p,16)
          cylinder("Rørflange", (0,-.70,0), .17,.04,"staal_moerk",p,16)
      else:
        cylinder("Tankudluftning", (0,.33,0), .10,.34,"staal",p,16)
        cylinder("Regnhætte", (0,.52,0), .18,.05,"staal_moerk",p,16,radius_top=.13)


# Energicellen er en opfundet, industriel prøvekomponent med synlig lyskerne.
def byg_celle():
  p = DELE["celle"]["kerne"]
  cylinder("Cellebund", (0,-.51,0), .46,.25,"staal_moerk",p,24)
  cylinder("Cellekrone", (0,.50,0), .43,.22,"gul",p,24)
  cylinder("Kernerør", (0,0,0), .23,.88,"cyan",p,24)
  cylinder("Kerneglas", (0,0,0), .34,.89,"glas",p,24)
  for y in [-.40,-.29,-.18,.18,.29,.40]:
    ring("Kølering", (0,y,0), .37,.027,"staal",p,sider=24,tværsnit=4)
  for n in range(4):
    a = n / 4 * 2 * math.pi + .785
    x, z = math.sin(a) * .34, math.cos(a) * .34
    kasse("Cellevange", (x,0,z), (.085,1.12,.085),"staal_moerk",p,.018)
    for y in [-.55,.55]:
      cylinder("Cellebolt", (x,y,z), .033,.03,"krom",p,6)
  for x in [-.38,.38]:
    kasse("Bæregreb", (x,.17,0), (.08,.31,.20),"gul",p,.025)
  cylinder("Statuslampe", (0,.51,.426), .045,.02,"cyan",p,16,"z")
  kasse("Advarselsmærkat", (0,-.49,.456),(.38,.16,.01),"gul",p,.005)
  skilt("ION  /  01",(0,-.49,.465),.065,"staal_moerk",p)


# Alt pynt står uden for den frie prøveplade på 44 × 44 meter.
def byg_omgivelser():
  p = RØDDER["omgivelser"]

  # Et nedlagt værksted med bølgeblik, glas, port og udvendig ventilation.
  x, z = -33, -6
  kasse("Værkstedets betonsokkel", (x,.24,z),(12.2,.48,17.2),"beton",p,.025)
  kasse("Værkstedets sidevægge", (x,3.1,z),(12.0,5.7,17.0),"graa",p,.03)
  for side in [-1,1]:
    for n in range(29):
      kasse("Profileret stål på langside",(x+side*6.025,3.2,z-8.25+n*.59),(.035,5.6,.10),"staal_moerk",p,0)
    for n in range(7):
      kasse("Værkstedsvindue",(x+side*6.05,4.35,z-6.6+n*2.2),(.015,1.3,1.55),"glas",p,0)
      for zz in [-.75,0,.75]:
        kasse("Jernvindue lodret",(x+side*6.07,4.35,z-6.6+n*2.2+zz),(.025,1.36,.045),"hvid",p,0)
      for yy in [3.70,4.35,5.00]:
        kasse("Jernvindue vandret",(x+side*6.07,yy,z-6.6+n*2.2),(.025,.045,1.59),"hvid",p,0)
  for side in [-1,1]:
    # Skrå taghalvdele med tydelig fals og et udhæng.
    kasse("Værkstedets tag",(x+side*3.1,6.48,z),(6.42,.11,17.9),"staal_moerk",p,.005,drej=(0,0,-side*.182))
    for n in range(24):
      zz = z-8.8+n*.76
      bjælke("Tagprofil",(x+side*.02,7.05,zz),(x+side*6.24,5.91,zz),.035,"staal",p,kant=0)
  for ende in [-1,1]:
    zz = z+ende*8.53
    for n in range(21):
      xx = x-5.85+n*.585
      kasse("Profileret stål på gavl",(xx,3.1,zz),(.10,5.45,.045),"staal_moerk",p,0)
    # Gavlens trekant lukker mellem loft og de to tagflader.
    punkter = [(x-6,5.9,zz),(x+6,5.9,zz),(x,7.02,zz)]
    mesh("Værkstedsgavl",punkter,[(0,2,1)] if ende<0 else [(0,1,2)],"graa",p)
  kasse("Stor skydedør",(x,2.35,z+8.59),(4.4,4.25,.10),"staal_moerk",p,.012)
  for n in range(15):
    kasse("Lameller i port",(x, .4+n*.278,z+8.65),(4.3,.035,.025),"staal",p,0)
  for xx in [-2.30,2.30]:
    kasse("Portskinne",(x+xx,2.4,z+8.7),(.12,4.6,.16),"gul",p,.008)
  kasse("Portens skilt",(x,5.23,z+8.65),(6.65,.72,.10),"hvid",p,.025)
  skilt("BRUDPUNKT  /  TESTFELT",(x,5.23,z+8.72),.32,"staal_moerk",p)
  kasse("Lille personaleindgang",(x+4.48,1.45,z+8.61),(1.17,2.5,.10),"bil",p,.012)
  kasse("Dørens rude",(x+4.48,1.93,z+8.675),(.69,.85,.025),"glas_moerk",p,0)
  skilt("06",(x+4.48,1.08,z+8.69),.17,"hvid",p)
  kasse("Portlampe",(x,5.77,z+8.89),(1.7,.11,.21),"staal_moerk",p,.018)
  kasse("Lamperør",(x,5.71,z+8.94),(1.45,.035,.09),"lygte",p,.009)
  for xx in [-4.6,4.6]:
    cylinder("Nedløbsrør",(x+xx,2.98,z+8.71),.065,5.6,"staal",p,10)
    cylinder("Rørknæ",(x+xx,.21,z+8.90),.065,.4,"staal",p,10,"z")
  cylinder("Luftkanal",(x-5.7,6.2,z-3),.45,3.4,"staal",p,16)
  cylinder("Ventilatorhætte",(x-5.7,7.9,z-3),.62,.25,"staal_moerk",p,16,radius_top=.46)
  for n in range(3):
    cylinder("Ventilationsring",(x-5.7,5.3+n*1.1,z-3),.46,.04,"staal_moerk",p,16)

  # Tunge portalkraner skaber en genkendelig silhuet uden for prøvefeltet.
  for xx in [-5,19]:
    for zz in [-34,-31]:
      kasse("Kranens betonfod",(xx,.17,zz),(1.5,.34,1.5),"beton",p,.04)
      bjælke("Kranstolpe",(xx,.35,zz),(xx,11.25,zz),.35,"rust",p,.45)
      for y in [2,5,8]:
        kasse("Kranens samlemuffe",(xx,y,zz),(.52,.32,.60),"staal_moerk",p,.02)
    for y in [1.2,5.8,10.5]:
      bjælke("Tværforbindelse",(xx,y,-34),(xx,y,-31),.16,"gul",p)
    bjælke("Kranens skråstiver",(xx,1.2,-34),(xx,10.7,-31),.14,"rust",p)
    bjælke("Kranens skråstiver",(xx,1.2,-31),(xx,10.7,-34),.14,"rust",p)
  for zz in [-34,-31]:
    kasse("Kranens overligger",(7,11.32,zz),(25.5,.58,.43),"gul",p,.025)
    for n in range(9):
      a = -5+n*3
      bjælke("Kranens gitterdrager",(a,11.1,zz),(a+1.5,12.25,zz),.12,"rust",p)
      bjælke("Kranens gitterdrager",(a+1.5,12.25,zz),(a+3,11.1,zz),.12,"rust",p)
    kasse("Kranens øvre bånd",(7,12.30,zz),(25.5,.20,.24),"rust",p,.01)
  kasse("Løbevogn",(9,11.80,-32.5),(2.5,.65,3.6),"staal_moerk",p,.04)
  for xx in [8.6,9.4]:
    cylinder("Hejsewire",(xx,8.5,-32.5),.026,5.8,"staal",p,6)
  kasse("Krogblok",(9,5.55,-32.5),(.9,.6,.45),"gul",p,.07)
  ring("Kranens løftekrog",(9,5.11,-32.5),.28,.06,"staal_moerk",p,"z",16,5)

  # To stablede containere har låsestænger og døre i korrekt menneskeskala.
  for cx, cy, cz, mat in [(31,1.38,7,"tag"),(31,1.38,14,"bil"),(31,4.12,10.5,"graa")]:
    kasse("Containerkrop",(cx,cy,cz),(5.9,2.65,2.45),mat,p,.035)
    for side in [-1,1]:
      for n in range(22):
        kasse("Containerbølge",(cx-2.85+n*.27,cy,cz+side*1.24),(.07,2.52,.055),"staal_moerk",p,0)
      for xx in [-2.9,2.9]:
        kasse("Containerhjørne",(cx+xx,cy,cz+side*1.24),(.13,2.67,.12),"staal",p,.012)
    for xx in [-2.98,2.98]:
      for zz in [-.63,.63]:
        kasse("Containerdør",(cx+xx,cy,cz+zz),(.025,2.45,1.16),mat,p,.006)
        cylinder("Låsestang",(cx+xx*1.009,cy,cz+zz),.027,2.36,"staal",p,8)
      kasse("Containerfodsarg",(cx+xx,cy-1.28,cz),(.10,.12,2.49),"staal_moerk",p,.008)
    skilt("BP  /  2308",(cx,cy+.64,cz+1.278),.20,"hvid",p)

  # Hegn med skrå trådmasker; ingen gennemsigtighedsteksturer er nødvendige.
  def hegn(a,b):
    a,b = Vector(a),Vector(b)
    længde = (b-a).length
    retning = (b-a).normalized()
    normal = Vector((-retning.z,0,retning.x))
    antal = round(længde/4)
    for n in range(antal+1):
      q = a+(b-a)*n/antal
      cylinder("Hegnsstolpe",(q.x,1.28,q.z),.045,2.56,"staal",p,8)
      cylinder("Stolpehætte",(q.x,2.57,q.z),.058,.05,"staal_moerk",p,8)
    for y in [.25,2.40]:
      bjælke("Hegnets gennemgående skinne",(a.x,y,a.z),(b.x,y,b.z),.035,"staal",p,kant=0)
    # For hver halv meter krydser to tynde strimler hinanden.
    for n in range(math.ceil(længde/.52)):
      s = n*.52
      for tegn in [-1,1]:
        for y in [.30,.99,1.68]:
          qa = a+retning*s
          qb = a+retning*min(s+.52,længde)
          pa = Vector((qa.x,y if tegn>0 else y+.69,qa.z))
          pb = Vector((qb.x,y+.69 if tegn>0 else y,qb.z))
          # En tynd, dobbeltsidet strimmel er tilstrækkelig på afstand.
          bredde = (pb-pa).normalized().cross(normal)*.006
          mesh("Galvaniseret trådmaske",[pa-bredde,pa+bredde,pb+bredde,pb-bredde],[(0,1,2,3)],"staal_moerk",p)
  hegn((-25,0,25),(-25,0,-25))
  hegn((25,0,-25),(25,0,25))
  hegn((-25,0,-25),(25,0,-25))
  hegn((-25,0,25),(-9,0,25))
  hegn((9,0,25),(25,0,25))
  for xx in [-9,9]:
    kasse("Betonportpille",(xx,.7,25),(1.0,1.4,1.0),"beton",p,.045)
    cylinder("Portens advarselsblink",(xx,1.5,25),.15,.25,"lygte",p,12)
  for xx in [-22,22]:
    kasse("Prøvefeltets vejskilt",(xx,2.1,24.1),(2.7,.80,.10),"gul",p,.025)
    for offset in [-1.0,1.0]:
      cylinder("Skiltestander",(xx+offset,1.15,24.1),.035,2.3,"staal",p,8)
    skilt("PRØVEOMRÅDE",(xx,2.1,24.16),.18,"staal_moerk",p)

  # Asymmetriske skiferbakker og små græstuer lukker scenen mod horisonten.
  for n in range(24):
    a = n/24*math.tau
    radius = random.uniform(42,49)
    px,pz = math.cos(a)*radius,math.sin(a)*radius
    hy = random.uniform(3.0,7.0)
    rx,rz = random.uniform(5,10),random.uniform(5,9)
    punkter = []
    for ringn,y in [(0,-.4),(1,hy*.60),(2,hy)]:
      for i in range(7):
        aa = i/7*math.tau
        rr = random.uniform(.7,1.2)*(1 if ringn==0 else .74 if ringn==1 else .25)
        punkter.append((px+math.cos(aa)*rx*rr, y+random.uniform(-.3,.3), pz+math.sin(aa)*rz*rr))
    flader = []
    for j in range(2):
      for i in range(7):
        k = j*7+i
        nxt = j*7+(i+1)%7
        flader += [(k,nxt,nxt+7),(k,nxt+7,k+7)]
    flader.append(tuple(range(14,21)))
    obj = mesh("Skiferbrud",punkter,flader,"klippe",p)
    obj.data.materials.append(M["klippe_lys"])
    obj.data.materials.append(M["jord"])
    for poly in obj.data.polygons:
      poly.material_index = random.choices([0,1,2],[5,3,1])[0]
  for n in range(85):
    side = random.choice([-1,1])
    px = side*random.uniform(26,40)
    pz = random.uniform(-40,39)
    if (px<-26 and -15<pz<4) or (px>26 and 4<pz<18):
      continue
    radius = random.uniform(.12,.55)
    cylinder("Skifersten",(px,.10,pz),radius,random.uniform(.14,.32),"klippe_lys",p,5,radius_top=radius*.5)
    if n%2:
      for m in range(3):
        aa=random.random()*math.tau
        højde=random.uniform(.15,.37)
        bx,bz=px+math.cos(aa)*.35,pz+math.sin(aa)*.35
        punkter=[(bx-.06,.01,bz),(bx+.06,.01,bz),(bx+.02,højde,bz+.03)]
        mesh("Tørt græs",punkter,[(0,1,2)],"mos",p)

  # Yderkanten har nedslidte kantsten, afløb og arbejdslys.
  for side in [-1,1]:
    for n in range(20):
      kasse("Betonkantsten",(side*23.7,.10,-23+n*2.4),(.35,.20,2.32),"beton_lys",p,.015)
    for n in range(12):
      kasse("Betonkantsten",(-22+n*4,.10,side*23.7),(3.89,.20,.35),"beton_lys",p,.015)
    for zz in [-17,17]:
      xx = side*24.2
      cylinder("Lygtepæl",(xx,3.6,zz),.075,7.2,"staal_moerk",p,10)
      bjælke("Lampens arm",(xx,7.1,zz),(xx-side*1.4,7.5,zz),.07,"staal_moerk",p)
      kasse("Lampehus",(xx-side*1.4,7.48,zz),(.75,.17,.42),"staal_moerk",p,.035)
      kasse("Lampens glas",(xx-side*1.4,7.38,zz),(.62,.025,.32),"lygte",p,.012)
    for zz in [-12,0,12]:
      xx = side*23.0
      kasse("Afløbsramme",(xx,.015,zz),(.6,.03,1.3),"staal_moerk",p,.008)
      for n in range(9):
        kasse("Rist ved afløb",(xx,.037,zz-.55+n*.135),(.54,.02,.035),"staal",p,0)
  for xx in [-23,23]:
    for zz in [-23,23]:
      for n in range(6):
        kasse("Slidt sikkerhedsstribe",(xx,.012,zz+n*.36-1.0),(.22,.012,.24),"gul",p,0)


# Saml geometri pr. materialetype inde i hver fysisk del: lavere antal draw calls.
def saml_geometri(parent):
  objekter = [o for o in parent.children if o.type == "MESH"]
  if not objekter:
    return
  bpy.ops.object.select_all(action="DESELECT")
  for o in objekter:
    o.select_set(True)
  bpy.context.view_layer.objects.active = objekter[0]
  bpy.ops.object.join()
  obj = bpy.context.view_layer.objects.active
  obj.name = parent.name + "_geometri"
  # Join kan efterlade gentagne materialslots; slå dem sammen uden at ændre farver.
  navne, slots, mapping = {}, [], {}
  for i, mat in enumerate(obj.data.materials):
    if mat.name not in navne:
      navne[mat.name] = len(slots)
      slots.append(mat)
    mapping[i] = navne[mat.name]
  indeks = [mapping[f.material_index] for f in obj.data.polygons]
  obj.data.materials.clear()
  for mat in slots:
    obj.data.materials.append(mat)
  for f,i in zip(obj.data.polygons,indeks):
    f.material_index=i
  obj.select_set(False)


byg_bil()
byg_hus()
byg_taarn()
byg_celle()
byg_omgivelser()
for rod in RØDDER.values():
  if rod.name == "omgivelser":
    saml_geometri(rod)
  else:
    for part in rod.children:
      saml_geometri(part)

bpy.ops.object.select_all(action="DESELECT")
for rod in RØDDER.values():
  rod.select_set(True)
  for obj in rod.children_recursive:
    obj.select_set(True)
bpy.context.view_layer.objects.active = RØDDER["omgivelser"]
bpy.ops.export_scene.gltf(filepath=str(MODELLER / "brudpunkt.glb"), export_format="GLB", use_selection=True,
                          export_yup=True, export_apply=True, export_extras=False, export_cameras=False,
                          export_lights=False, export_materials="EXPORT")
print("GLB skrevet:", (MODELLER / "brudpunkt.glb").stat().st_size)


# Forsidebilledet bruger de samme originale modeller, blot iscenesat til et foto.
def forside():
  scene = bpy.context.scene
  scene.render.engine = "CYCLES"
  scene.cycles.samples = 32
  scene.cycles.use_denoising = True
  scene.render.resolution_x = 1200
  scene.render.resolution_y = 800
  scene.render.resolution_percentage = 100
  scene.render.image_settings.file_format = "JPEG"
  scene.render.image_settings.quality = 92
  scene.view_settings.view_transform = "AgX"
  scene.view_settings.look = "AgX - Medium High Contrast"
  scene.world.use_nodes = True
  scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.24,.34,.51,1)
  scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .55
  RØDDER["hus"].location = v((-5,0,-3))
  RØDDER["hus"].rotation_euler.z = -.18
  RØDDER["taarn"].location = v((4.5,0,-7.5))
  RØDDER["bil"].location = v((4.7,0,4.7))
  RØDDER["bil"].rotation_euler.z = -.52
  RØDDER["celle"].location = v((-.1,0,3.5))
  kasse("Forsidens betonplade",(0,-.12,0),(47,.23,47),"beton",None,.04)
  kasse("Forsidens jord",(0,-.31,0),(120,.34,120),"jord",None,.02)
  for x in range(-20,22,5):
    kasse("Betonfuge",(x,.003,0),(.017,.008,44),"graa",None,0)
  for z in range(-20,22,5):
    kasse("Betonfuge",(0,.004,z),(44,.008,.017),"graa",None,0)
  for side in [-1,1]:
    for n in range(18):
      kasse("Fotostribe",(side*21,.01,-20+n*2.3),(.30,.008,1.2),"gul",None,0)
  for n in range(3):
    celle = RØDDER["celle"].copy()
    bpy.context.collection.objects.link(celle)
    celle.location = v((1.35+n*.85,0,2.4+n*.5))
    kopier = {RØDDER["celle"]: celle}
    for obj in RØDDER["celle"].children_recursive:
      kopi = obj.copy()
      if obj.data:
        kopi.data = obj.data
      kopi.parent = kopier[obj.parent]
      bpy.context.collection.objects.link(kopi)
      kopier[obj] = kopi
  sun_data=bpy.data.lights.new("Lav gylden sol","SUN")
  sun_data.energy=3.0
  sun_data.angle=.12
  sun_data.color=(1.0,.73,.46)
  sun=bpy.data.objects.new("Lav gylden sol",sun_data)
  bpy.context.collection.objects.link(sun)
  sun.rotation_euler=(math.radians(58),math.radians(-18),math.radians(-37))
  area_data=bpy.data.lights.new("Koldt himmellys","AREA")
  area_data.energy=1800
  area_data.shape="DISK"
  area_data.size=20
  area_data.color=(.5,.68,1)
  area=bpy.data.objects.new("Koldt himmellys",area_data)
  bpy.context.collection.objects.link(area)
  area.location=v((8,14,4))
  area.rotation_euler=(v((0,0,0))-area.location).to_track_quat("-Z","Y").to_euler()
  camera_data=bpy.data.cameras.new("Forsidekamera")
  camera=bpy.data.objects.new("Forsidekamera",camera_data)
  bpy.context.collection.objects.link(camera)
  camera.location=v((17,12.7,22))
  camera.rotation_euler=(v((0,3.2,-1))-camera.location).to_track_quat("-Z","Y").to_euler()
  camera_data.lens=42
  scene.camera=camera
  scene.render.filepath=str(ROD/"forside.jpg")
  bpy.ops.wm.save_as_mainfile(filepath=str(MODELLER/"brudpunkt.blend"))
  bpy.ops.render.render(write_still=True)


if "--ingen-forside" not in sys.argv:
  forside()
else:
  bpy.ops.wm.save_as_mainfile(filepath=str(MODELLER/"brudpunkt.blend"))
print("Færdige originale Brudpunkt-modeller.")
