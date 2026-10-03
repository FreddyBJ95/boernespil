# ===== Soldaten (botterne) — krop, udstyr, skelet og animationer → modeller/soldat.glb =====
# Kroppen bygges direkte i den stilling, hvor den sigter med geværet (så armene altid holder det rigtigt).
# Animationerne bevæger kun ben, hofte, ryg og hoved: stå, gå, løb, duk, dukgå og død.
# Uniformen er lysegrå, så spillet kan farve den efter hold. Skyggerne i folderne bages ind i hjørnefarverne.
# Koordinater: x til højre, y frem, z op (meter).  Kør: blender --background --factory-startup --python lav_soldat.py

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faelles import *

s = nulstil(); s.render.fps = 30
R = math.radians


def flad(navn, farve, ru=0.8, met=0.0):
    m = bpy.data.materials.new(navn); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*farve, 1); p.inputs["Roughness"].default_value = ru; p.inputs["Metallic"].default_value = met
    return m


UNIFORM, VEST, HUD = flad("uniform", (0.62, 0.6, 0.56), 0.95), flad("vest", (0.5, 0.48, 0.44), 0.9), flad("hud", (0.6, 0.4, 0.28), 0.65)
STØVLE, HANDSKE, SORT = flad("støvle", (0.06, 0.05, 0.045), 0.7), flad("handske", (0.035, 0.035, 0.035), 0.75), flad("sort", (0.015, 0.015, 0.018), 0.25)
HJELM, KASKET, TØRKLÆDE = flad("hjelm", (0.5, 0.5, 0.46), 0.75), flad("kasket", (0.6, 0.55, 0.45), 0.9), flad("tørklæde", (0.55, 0.2, 0.15), 0.95)
STÅL, TRÆ = flad("stål", (0.05, 0.05, 0.055), 0.4, 0.85), flad("træ", (0.3, 0.13, 0.05), 0.55)

# ---------- Kroppen: et "skelet" af punkter, som Blender gør til en blød krop (skin + glat) ----------
P = {  # punkt: (sted, radius x, radius y)
    "hofte": ((0, 0, 0.96), 0.155, 0.115), "mave": ((0, 0.01, 1.14), 0.14, 0.105), "bryst": ((0, 0.01, 1.32), 0.175, 0.12),
    "skuldre": ((0, 0, 1.45), 0.13, 0.095), "hals": ((0, 0.01, 1.55), 0.055, 0.055),
    "skulder.R": ((0.18, 0, 1.43), 0.068, 0.068), "albue.R": ((0.32, 0.06, 1.22), 0.05, 0.05), "håndled.R": ((0.11, 0.24, 1.3), 0.038, 0.038),
    "skulder.L": ((-0.18, 0, 1.43), 0.068, 0.068), "albue.L": ((-0.16, 0.22, 1.2), 0.05, 0.05), "håndled.L": ((0.03, 0.47, 1.31), 0.038, 0.038),
    "hofte.R": ((0.095, 0, 0.92), 0.088, 0.088), "knæ.R": ((0.11, 0.025, 0.52), 0.063, 0.063), "ankel.R": ((0.12, 0, 0.1), 0.048, 0.048),
    "hofte.L": ((-0.095, 0, 0.92), 0.088, 0.088), "knæ.L": ((-0.11, 0.025, 0.52), 0.063, 0.063), "ankel.L": ((-0.12, 0, 0.1), 0.048, 0.048),
}
KANTER = [("hofte", "mave"), ("mave", "bryst"), ("bryst", "skuldre"), ("skuldre", "hals"),
          ("skuldre", "skulder.R"), ("skulder.R", "albue.R"), ("albue.R", "håndled.R"),
          ("skuldre", "skulder.L"), ("skulder.L", "albue.L"), ("albue.L", "håndled.L"),
          ("hofte", "hofte.R"), ("hofte.R", "knæ.R"), ("knæ.R", "ankel.R"), ("hofte", "hofte.L"), ("hofte.L", "knæ.L"), ("knæ.L", "ankel.L")]
navne = list(P)
me = bpy.data.meshes.new("krop"); me.from_pydata([P[n][0] for n in navne], [(navne.index(a), navne.index(b)) for a, b in KANTER], [])
krop = bpy.data.objects.new("krop", me); s.collection.objects.link(krop)
krop.modifiers.new("skin", "SKIN")
for i, n in enumerate(navne): krop.data.skin_vertices[0].data[i].radius = (P[n][1], P[n][2])
krop.data.skin_vertices[0].data[0].use_root = True
sub = krop.modifiers.new("glat", "SUBSURF"); sub.levels = 2
krop.data.materials.append(UNIFORM)
for p in krop.data.polygons: p.use_smooth = True

dele = []                                                         # (del, knogle) — udstyret sidder fast på én knogle
d = lambda o, ben: dele.append((o, ben))
# hovedet: et lidt aflangt hoved med næse og ører
d(kugle("hoved", (0, 0.015, 1.665), 0.105, HUD, 0.92, 1.0, 1.18), "hoved")
d(kugle("næse", (0, 0.118, 1.65), 0.022, HUD, 0.8, 0.9, 1.2), "hoved")
for x in (-0.098, 0.098): d(kugle(f"øre{x}", (x, 0.0, 1.665), 0.025, HUD, 0.45, 0.8, 1.1), "hoved")
# vest med lommer foran, bælte, knæbeskyttere, støvler og handsker
d(kasse("vest", -0.205, -0.135, 1.16, 0.205, 0.148, 1.47, VEST, 0.04), "bryst")
for x in (-0.11, 0.0, 0.11): d(kasse(f"lomme{x}", x - 0.048, 0.14, 1.17, x + 0.048, 0.19, 1.29, VEST, 0.012), "bryst")
d(kasse("bælte", -0.165, -0.12, 0.93, 0.165, 0.125, 1.0, SORT, 0.02), "hofte")
for x, side in ((-0.11, "L"), (0.11, "R")):
    d(kasse(f"knæ{x}", x - 0.055, 0.06, 0.47, x + 0.055, 0.1, 0.58, SORT, 0.02), f"skinneben.{side}")
    d(kasse(f"støvle{x}", x - 0.056, -0.07, 0.0, x + 0.056, 0.2, 0.13, STØVLE, 0.035), f"fod.{side}")
    d(rør(f"skaft{x}", (x, 0, 0.08), (x, 0, 0.22), 0.058, STØVLE, 16, 0.01), f"skinneben.{side}")
d(kugle("handske.R", (0.1, 0.27, 1.29), 0.045, HANDSKE, 0.9, 1.2, 1.1), "hånd.R")
d(kugle("handske.L", (0.035, 0.5, 1.32), 0.045, HANDSKE, 0.9, 1.25, 1.0), "hånd.L")

# ---------- Holdenes hovedbeklædning (spillet viser den ene eller den anden) ----------
def holddel(navn, objekter):
    o = saml(navn, objekter); fast_på(o, "hoved"); return o

def fast_på(o, ben):
    """Alle hjørner i delen følger én knogle"""
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target="MESH")
    g = o.vertex_groups.new(name=ben); g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
# (fast_på bruges først, når skelettet findes — se nedenfor)
hjelm = holddel("hjelm", [kugle("hjelmskal", (0, 0.005, 1.705), 0.128, HJELM, 1.0, 1.08, 0.82),
                          rør("hjelmkant", (0, 0.005, 1.66), (0, 0.005, 1.675), 0.138, HJELM, 24, 0.004, 0.132)])
briller = holddel("briller", [kasse("brilleglas", -0.075, 0.095, 1.675, 0.075, 0.125, 1.715, SORT, 0.01),
                              rør("brillerem", (0, 0, 1.69), (0, 0, 1.70), 0.112, SORT, 24, 0.002)])
kasket = holddel("kasket", [kugle("kasketpuld", (0, 0.0, 1.73), 0.112, KASKET, 1.0, 1.05, 0.55),
                            kasse("skygge", -0.07, 0.07, 1.718, 0.07, 0.17, 1.732, KASKET, 0.012)])
tørklæde = holddel("tørklæde", [rør("halstørklæde", (0, 0.01, 1.5), (0, 0.01, 1.6), 0.085, TØRKLÆDE, 20, 0.02, 0.07)])

# ---------- Geværet (en enkel udgave af stormgeværet) ----------
gd = []
gd.append(kasse("g_modtager", -0.021, -0.03, -0.026, 0.021, 0.215, 0.028, STÅL, 0.004))
gd.append(rør("g_pibe", (0, 0.2, 0.006), (0, 0.66, 0.006), 0.009, STÅL, 12))
gd.append(kasse("g_hånd", -0.025, 0.245, -0.024, 0.025, 0.415, 0.024, TRÆ, 0.008))
gd.append(kasse("g_greb", -0.014, -0.045, -0.12, 0.014, 0.01, -0.02, SORT, 0.008))
gd.append(kasse("g_skæfte", -0.019, -0.33, -0.09, 0.019, -0.02, 0.028, TRÆ, 0.012))
gd.append(kasse("g_magasin", -0.015, 0.1, -0.22, 0.015, 0.17, -0.02, TØRKLÆDE, 0.008))
gd.append(kasse("g_sigte", -0.004, 0.58, 0.012, 0.004, 0.595, 0.05, STÅL, 0.002))
gevær = saml("våben", gd)
gevær.location = (0.07, 0.3, 1.38)
bpy.ops.object.select_all(action="DESELECT"); gevær.select_set(True); bpy.context.view_layer.objects.active = gevær
bpy.ops.object.transform_apply(location=False, rotation=False, scale=False)

# ---------- Skelettet ----------
arm_data = bpy.data.armatures.new("skelet"); arm = bpy.data.objects.new("skelet", arm_data); s.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode="EDIT")
BEN = [  # navn, hoved, hale, forælder, deformerer
    ("rod", (0, 0, 0), (0, 0.15, 0), None, False), ("hofte", (0, 0, 0.96), (0, 0, 1.1), "rod", True),
    ("mave", (0, 0, 1.1), (0, 0, 1.3), "hofte", True), ("bryst", (0, 0, 1.3), (0, 0, 1.5), "mave", True),
    ("hals", (0, 0, 1.5), (0, 0, 1.58), "bryst", True), ("hoved", (0, 0, 1.58), (0, 0, 1.83), "hals", True),
    ("skulder.R", (0.03, 0, 1.44), (0.18, 0, 1.43), "bryst", True), ("overarm.R", (0.18, 0, 1.43), (0.32, 0.06, 1.22), "skulder.R", True),
    ("underarm.R", (0.32, 0.06, 1.22), (0.11, 0.24, 1.3), "overarm.R", True), ("hånd.R", (0.11, 0.24, 1.3), (0.09, 0.3, 1.28), "underarm.R", True),
    ("skulder.L", (-0.03, 0, 1.44), (-0.18, 0, 1.43), "bryst", True), ("overarm.L", (-0.18, 0, 1.43), (-0.16, 0.22, 1.2), "skulder.L", True),
    ("underarm.L", (-0.16, 0.22, 1.2), (0.03, 0.47, 1.31), "overarm.L", True), ("hånd.L", (0.03, 0.47, 1.31), (0.04, 0.53, 1.33), "underarm.L", True),
    ("lår.R", (0.095, 0, 0.92), (0.11, 0.025, 0.52), "hofte", True), ("skinneben.R", (0.11, 0.025, 0.52), (0.12, 0, 0.1), "lår.R", True),
    ("fod.R", (0.12, 0, 0.1), (0.12, 0.17, 0.03), "skinneben.R", True),
    ("lår.L", (-0.095, 0, 0.92), (-0.11, 0.025, 0.52), "hofte", True), ("skinneben.L", (-0.11, 0.025, 0.52), (-0.12, 0, 0.1), "lår.L", True),
    ("fod.L", (-0.12, 0, 0.1), (-0.12, 0.17, 0.03), "skinneben.L", True),
    ("våben", (0.07, 0.3, 1.38), (0.07, 0.5, 1.38), "bryst", False),
]
for navn, h, t, far, deform in BEN:
    b = arm_data.edit_bones.new(navn); b.head = h; b.tail = t; b.use_deform = deform; b.roll = 0
    if far: b.parent = arm_data.edit_bones[far]
bpy.ops.object.mode_set(mode="OBJECT")

# kroppen og hovedbeklædningen bøjer med skelettet (vægte regnes ud af Blender)
bpy.ops.object.select_all(action="DESELECT"); krop.select_set(True); bpy.context.view_layer.objects.active = krop
bpy.ops.object.convert(target="MESH")                               # læg den bløde krop fast
krop.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_AUTO")                     # kun kroppen får automatiske vægte
for o, ben in dele: fast_på(o, ben)
bpy.ops.object.select_all(action="DESELECT")
for o, _ in dele: o.select_set(True)
krop.select_set(True); bpy.context.view_layer.objects.active = krop
bpy.ops.object.join()                                               # krop + udstyr bliver ét (vægtene følger med)
krop_og_udstyr = krop; krop.name = "soldat"
bpy.ops.object.select_all(action="DESELECT")
for o in (hjelm, briller, kasket, tørklæde): o.select_set(True)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_NAME")                     # hovedbeklædningen bruger sine faste grupper
# geværet følger knoglen "våben"
bpy.ops.object.select_all(action="DESELECT"); gevær.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE"); arm_data.bones.active = arm_data.bones["våben"]
bpy.ops.object.parent_set(type="BONE", keep_transform=True); bpy.ops.object.mode_set(mode="OBJECT")

# ---------- Skygger i folderne (bages ind i hjørnefarverne) ----------
for o in (krop_og_udstyr, hjelm, briller, kasket, tørklæde, gevær):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    if not o.data.color_attributes: o.data.color_attributes.new("Farve", "BYTE_COLOR", "CORNER")
    o.data.color_attributes.active_color = o.data.color_attributes[0]
    s.render.bake.target = "VERTEX_COLORS"; s.cycles.samples = 64
    bpy.ops.object.bake(type="AO")
    a = o.data.color_attributes[0]                                    # ikke helt sort i krogene
    for c in a.data: c.color = tuple(0.4 + 0.6 * v for v in c.color[:3]) + (1,)

# ---------- Animationerne ----------
def handling(navn, rammer, fn, løkke=True):
    act = bpy.data.actions.new(navn); act.use_fake_user = True
    arm.animation_data_create(); arm.animation_data.action = act
    for pb in arm.pose.bones: pb.rotation_mode = "XYZ"; pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    for f in rammer:
        t = (f - rammer[0]) / (rammer[-1] - rammer[0]) if len(rammer) > 1 else 0
        for ben, rot, loc in fn(t):
            pb = arm.pose.bones[ben]
            if rot is not None: pb.rotation_euler = tuple(R(v) for v in rot); pb.keyframe_insert("rotation_euler", frame=f)
            if loc is not None: pb.location = loc; pb.keyframe_insert("location", frame=f)
    act.frame_range = (rammer[0], rammer[-1])
    return act

def ganger(t, løft, sving, knæ, krop=6, hop=0.03):
    """En gang/løbecyklus: t går 0..1, benene svinger modsat hinanden"""
    v = t * math.pi * 2
    ud = []
    for side, fase in (("R", 0), ("L", math.pi)):
        s_ = math.sin(v + fase)
        ud.append((f"lår.{side}", (sving * s_ + løft, 0, 0), None))
        ud.append((f"skinneben.{side}", (-knæ * max(0, math.sin(v + fase + 1.1)) - 4, 0, 0), None))
        ud.append((f"fod.{side}", (max(0, -s_) * 12, 0, 0), None))
    ud.append(("hofte", (0, 0, math.sin(v) * 5), (0, 0, -abs(math.cos(v)) * hop)))
    ud.append(("mave", (-krop, 0, 0), None))
    ud.append(("bryst", (0, 0, -math.sin(v) * 4), None))
    ud.append(("hoved", (krop * 0.6, 0, math.sin(v) * 2), None))
    return ud

handling("stå", [1, 31, 61], lambda t: [("bryst", (math.sin(t * math.pi * 2) * 1.2, 0, 0), None), ("hoved", (-math.sin(t * math.pi * 2) * 1, 0, 0), None)])
handling("gå", list(range(1, 33, 4)), lambda t: ganger(t, 0, 22, 30, 3, 0.015))
handling("løb", list(range(1, 22, 2)), lambda t: ganger(t, 6, 38, 70, 10, 0.04))
def duk(t, gang=0.0):
    v = t * math.pi * 2
    ud = [("hofte", (0, 0, 0), (0, 0, -0.4)), ("mave", (-14, 0, 0), None)]
    for side, fase in (("R", 0), ("L", math.pi)):
        sv = math.sin(v + fase) * gang
        ud += [(f"lår.{side}", (62 + sv * 18, 0, 0), None), (f"skinneben.{side}", (-118 - sv * 10, 0, 0), None), (f"fod.{side}", (48, 0, 0), None)]
    ud += [("bryst", (4, 0, 0), None), ("hoved", (8, 0, 0), None)]
    return ud
handling("duk", [1, 31], lambda t: duk(t))
handling("dukgå", list(range(1, 33, 4)), lambda t: duk(t, 1.0))
def død(t):
    e = min(1, t * 1.6); e = e * e * (3 - 2 * e)
    return [("rod", (86 * e, 0, 0), (0, -0.2 * e, 0.1 * math.sin(e * math.pi))), ("lår.R", (6 * e, 0, 4 * e), None), ("lår.L", (14 * e, 0, -6 * e), None),
            ("skinneben.R", (-12 * e, 0, 0), None), ("skinneben.L", (-28 * e, 0, 0), None), ("hoved", (-20 * e, 0, 8 * e), None), ("bryst", (-6 * e, 0, 0), None)]
handling("død", list(range(1, 26, 2)), død, False)

# ---------- Gem og lav prøvebilleder ----------
alle = [arm, krop_og_udstyr, hjelm, briller, kasket, tørklæde, gevær]
bpy.ops.object.select_all(action="DESELECT")
for o in alle: o.select_set(True)
sti = os.path.join(MODELLER, "soldat.glb")
bpy.ops.export_scene.gltf(filepath=sti, export_format="GLB", use_selection=True, export_yup=True, export_animations=True,
                          export_animation_mode="ACTIONS", export_skins=True, export_def_bones=False, export_force_sampling=True,
                          export_vertex_color="ACTIVE")
print("GEMT", sti, os.path.getsize(sti) // 1024, "kB", "trekanter", sum(len(o.data.polygons) for o in alle[1:] if o.type == "MESH"))

for navn, ramme in (("stå", 1), ("løb", 7), ("duk", 1), ("død", 25)):
    arm.animation_data.action = bpy.data.actions[navn]; s.frame_set(ramme)
    kasket.hide_render = True; tørklæde.hide_render = True
    prøvebillede(f"soldat_{navn}.png", (2.4, 2.6, 1.6), (0, 0, 0.95), (420, 520))
