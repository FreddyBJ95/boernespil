# ===== Lyset i Støvbyen: bages i Blender og lægges på banen i spillet =====
# 1) node eksporter_bane.mjs          (gemmer banens flader i ud/bane.json — med præcis samme kode som spillet)
# 2) python hent_teksturer.py         (teksturerne; deres farver bruges til lyset, der kastes tilbage)
# 3) blender --background --factory-startup --python lav_lys.py
# Resultatet ligger i ../modeller/: lys.webp (lysbilledet), lys.bin (hvor hvert hjørne ligger i billedet) og lys.json.
# Billedet holder lyset fra himlen og lyset, der kastes tilbage fra sand og mure — men ikke selve solen:
# solen og dens skarpe skygger tegner spillet selv, så skyggerne også falder på soldaterne.

import sys, os, json, math, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import nulstil, MAPPE, MODELLER
import bpy
import numpy as np
from mathutils import Vector

STR = int(os.environ.get("LYS_STR", 2048))          # lysbilledets størrelse (2048 → ca. 9 cm pr. punkt)
PRØVER = int(os.environ.get("LYS_PROEVER", 256))
K = 1.25                                            # billedet gemmer lys / K, så det kan være mellem 0 og 1
SOL = (0.55, 0.78, 0.3)                             # samme sol som i spil.js (retningen mod solen, y er op)
SOL_STYRKE, SOL_FARVE = 3.1, (1.0, 0.871, 0.686)    # 0xfff0d8 som lineære farver

BANE = os.environ.get("LYS_BANE", "stoevbyen")                  # hvilken bane (Støvbyens filer hedder bare bane.json og lys.*)
NAVN = "" if BANE == "stoevbyen" else f"_{BANE}"
d = json.load(open(os.path.join(MAPPE, "ud", f"bane{NAVN}.json"), encoding="utf-8"))
tek = json.load(open(os.path.join(MAPPE, "..", "teksturer", "teksturer.json"), encoding="utf-8"))


# ---------- Farverne på fladerne (gennemsnittet af teksturerne), så lyset, der kastes tilbage, får den rigtige farve ----------
def lin(c):
    return tuple(((v / 255 + 0.055) / 1.055) ** 2.4 if v / 255 > 0.04045 else v / 255 / 12.92 for v in c)
def hexlin(h): return lin(((h >> 16) & 255, (h >> 8) & 255, h & 255))
def gange(a, b): return tuple(x * y for x, y in zip(a, b))
snit = {n: lin(v["snitfarve"]) for n, v in tek.items()}
ALBEDO = {
    "sandsten": snit["sandsten"], "puds": snit["puds"], "sand": snit["sand"], "fliser": snit["fliser"],
    "mørk": gange(snit["sandsten"], hexlin(0x9a8a72)), "tag": gange(snit["planker"], hexlin(0xb89870)),
    "trækasse": snit["planker"], "dør": snit["doer"], "metal": snit["metal"], "vindue": hexlin(0x241a12),
    "stofRød": hexlin(0xb8402e), "stofBlå": hexlin(0x2e6a9a), "stofHvid": hexlin(0xe8dcc0), "bark": snit["bark"],
}
if "beton" in snit:                                                 # Havnen
    blik = snit["blik"]
    ALBEDO.update({"beton": snit["beton"], "lagerhal": gange(blik, hexlin(0xa0acb6)), "pier": gange(snit["planker"], hexlin(0x9a8070)),
                   **{f"container{n}": gange(blik, hexlin(h)) for n, h in [("Rød", 0xe85038), ("Blå", 0x3a7ae0), ("Grøn", 0x4ab05a), ("Orange", 0xf89038), ("Gul", 0xf8cc3a), ("Hvid", 0xf0f0e8)]}})
NAVNE = list(ALBEDO)

s = nulstil()
s.cycles.samples = PRØVER
s.cycles.max_bounces = 6; s.cycles.diffuse_bounces = 4; s.cycles.glossy_bounces = 0
billede = bpy.data.images.new("lys", STR, STR, float_buffer=True)
for navn, farve in ALBEDO.items():
    m = bpy.data.materials.new(navn); m.use_nodes = True; nt = m.node_tree
    p = nt.nodes["Principled BSDF"]; p.inputs["Base Color"].default_value = (*farve, 1); p.inputs["Roughness"].default_value = 1.0
    try: p.inputs["Specular IOR Level"].default_value = 0.0
    except KeyError: pass
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = billede; nt.nodes.active = n


# ---------- Banen: firkanterne fra spillet (y op i spillet → z op i Blender), hjørner på samme sted slås sammen ----------
nøgle, hjørner, flader, matnr, kilde = {}, [], [], [], []
for mi, m in enumerate(d["masker"]):
    p = m["pos"]
    for q in range(m["hjørner"] // 4):
        if m["skjult"][q]: continue
        f = []
        for k in range(4):
            i = (q * 4 + k) * 3; x, y, z = p[i], p[i + 1], p[i + 2]
            kn = (round(x * 1000), round(y * 1000), round(z * 1000))
            if kn not in nøgle: nøgle[kn] = len(hjørner); hjørner.append((x, -z, y))
            f.append(nøgle[kn])
        if len(set(f)) < 4: continue
        flader.append(f); matnr.append(NAVNE.index(m["mat"])); kilde.append((mi, q))
me = bpy.data.meshes.new("bane"); me.from_pydata(hjørner, [], flader)
assert len(me.polygons) == len(flader), "Blender lavede om på fladerne"
for n in NAVNE: me.materials.append(bpy.data.materials[n])
me.polygons.foreach_set("material_index", matnr)
bane = bpy.data.objects.new("bane", me); bpy.context.collection.objects.link(bane)
print(f"{len(flader)} flader, {len(hjørner)} hjørner")

# ---------- Lysbilledets plads til hver flade (alle flader får lige mange punkter pr. meter) ----------
me.uv_layers.new(name="lys")
bpy.ops.object.select_all(action="DESELECT"); bane.select_set(True); bpy.context.view_layer.objects.active = bane
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
try: bpy.ops.uv.smart_project(angle_limit=math.radians(66), margin_method="FRACTION", island_margin=0.003, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
except TypeError: bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")
uv = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers["lys"].data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
dækket = 0.0
for pg in me.polygons:
    a = uv[pg.loop_start:pg.loop_start + 4]
    dækket += 0.5 * abs(np.dot(a[:, 0], np.roll(a[:, 1], 1)) - np.dot(a[:, 1], np.roll(a[:, 0], 1)))
print(f"lysbilledet er {dækket * 100:.0f} % fyldt")

# ---------- Tønder og palmestammer skygger også (de får ikke selv lys fra billedet) ----------
for k in d["kasser"]:
    mn, mx = k["min"], k["max"]; b = mx[0] - mn[0]
    if (k["mat"] == "metal" and abs(b - 0.64) < 0.01) or (k["mat"] == "træ" and abs(b - 0.44) < 0.01):
        r, h = (0.3, 0.95) if k["mat"] == "metal" else (0.18, mx[1])
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=12, location=((mn[0] + mx[0]) / 2, -(mn[2] + mx[2]) / 2, h / 2))
        bpy.context.active_object.data.materials.append(bpy.data.materials["metal" if k["mat"] == "metal" else "bark"])

# ---------- Himlen: lys horisont og blå top, så stærk at en flade, der vender op, får samme himmellys som før ----------
HORISONT, ZENIT = np.array((0.95, 0.86, 0.72)), np.array((0.42, 0.58, 0.95))
mu = np.linspace(0, 1, 2001); t = np.clip(mu / 0.6, 0, 1); t = t * t * (3 - 2 * t)
L = HORISONT[None] * (1 - t[:, None]) + ZENIT[None] * t[:, None]
E_op = 2 * math.pi * np.trapezoid(L * mu[:, None], mu, axis=0) if hasattr(np, "trapezoid") else 2 * math.pi * np.trapz(L * mu[:, None], mu, axis=0)
STYRKE = 1.1 / float(np.dot(E_op, (0.2126, 0.7152, 0.0722)))
nt = s.world.node_tree; bg = nt.nodes["Background"]
tk = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tk.outputs["Generated"], sep.inputs[0])
mr = nt.nodes.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHSTEP"; mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.6
nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
mix.inputs[6].default_value = (*HORISONT, 1); mix.inputs[7].default_value = (*ZENIT, 1)
nt.links.new(mr.outputs["Result"], mix.inputs[0]); nt.links.new(mix.outputs[2], bg.inputs["Color"])
bg.inputs["Strength"].default_value = STYRKE

# ---------- Solen (kun til lyset, der kastes tilbage — dens direkte lys tegner spillet selv) ----------
sol = bpy.data.lights.new("sol", "SUN"); sol.energy = SOL_STYRKE; sol.color = SOL_FARVE; sol.angle = math.radians(1.0)
so = bpy.data.objects.new("sol", sol); bpy.context.collection.objects.link(so)
so.rotation_euler = Vector((SOL[0], -SOL[2], SOL[1])).normalized().to_track_quat("Z", "Y").to_euler()


# ---------- Lamperne i tunnelerne (varmt lys) ----------
LAMPE_W = float(os.environ.get("LYS_LAMPE", 70))
lamper = []
for x, y, z, *w in d.get("lamper", []):
    l = bpy.data.lights.new("lampe", "POINT"); l.energy = w[0] if w else LAMPE_W; l.color = (1.0, 0.72, 0.42); l.shadow_soft_size = 0.06
    lo = bpy.data.objects.new("lampe", l); bpy.context.collection.objects.link(lo); lo.location = (x, -z, y); lamper.append(lo)


# ---------- Bag: (1) himlen og lamperne, direkte og tilbagekastet, (2) solens tilbagekastede lys — og læg dem sammen ----------
def bag(filter_):
    bpy.ops.object.select_all(action="DESELECT"); bane.select_set(True); bpy.context.view_layer.objects.active = bane
    s.render.bake.use_pass_direct = "DIRECT" in filter_; s.render.bake.use_pass_indirect = "INDIRECT" in filter_; s.render.bake.use_pass_color = False
    s.render.bake.margin = 8; s.render.bake.margin_type = "EXTEND"
    t0 = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter=filter_, margin=8, use_clear=True)
    print(f"bagt {sorted(filter_)} på {time.time() - t0:.0f} s")
    buf = np.empty(STR * STR * 4, np.float32); billede.pixels.foreach_get(buf)
    return buf.reshape(STR, STR, 4)[..., :3].copy()

so.hide_render = True
himmel = bag({"DIRECT", "INDIRECT"})
so.hide_render = False; bg.inputs["Strength"].default_value = 0.0
for lo in lamper: lo.hide_render = True
solbund = bag({"INDIRECT"})
lys = himmel + solbund
print("lys: middel", lys.mean(axis=(0, 1)), "maks", lys.max())

# ---------- Gem billedet (sRGB, så de mørke krogle får flest trin) og hjørnernes plads ----------
v = np.clip(lys / K, 0, 1)
v = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
ud = bpy.data.images.new("lys_ud", STR, STR, alpha=False)
ud.pixels.foreach_set(np.concatenate([v, np.ones((STR, STR, 1))], axis=2).astype(np.float32).ravel())
png, webp = os.path.join(MAPPE, "ud", f"lys{NAVN}.png"), os.path.join(MODELLER, f"lys{NAVN}.webp")
ud.filepath_raw = png; ud.file_format = "PNG"; ud.save()
# WebP fylder en sjettedel (laves af almindelig Python med Pillow — samme som hent_teksturer.py)
subprocess.run(["python", "-c", f"from PIL import Image; Image.open(r'{png}').save(r'{webp}', 'WEBP', quality=92, method=6)"], check=True)

per = [np.zeros((m["hjørner"], 2), np.float32) for m in d["masker"]]
for pi, (mi, q) in enumerate(kilde):
    ls = me.polygons[pi].loop_start
    per[mi][q * 4:q * 4 + 4] = uv[ls:ls + 4]
alle = np.concatenate(per) if per else np.zeros((0, 2), np.float32)
np.round(np.clip(alle, 0, 1) * 65535).astype("<u2").tofile(os.path.join(MODELLER, f"lys{NAVN}.bin"))
with open(os.path.join(MODELLER, f"lys{NAVN}.json"), "w", encoding="utf-8") as f:
    json.dump({"k": K, "str": STR, "masker": [{"navn": m["mat"], "hjørner": m["hjørner"], "sum": m["sum"]} for m in d["masker"]]}, f, ensure_ascii=False)
print("gemt", webp)
