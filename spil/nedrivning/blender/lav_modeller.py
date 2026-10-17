# ===== Nedrivningsfirmaets ting: tønde, gasflaske, gastank, trækasse, skurvogn og gravko → modeller/<navn>.glb =====
# Bruger Sigtekorns fælles Blender-værktøj (../../sigtekorn/blender/faelles.py): afrundede kasser, rør og bagning.
# Lak med slid og rust laves proceduralt og bages ned i to billeder (farve og ruhed/metal).
# Mærkaterne (tekst og advarselsruder fra lav_maerkater.py) ligger som tynde, bøjede flader ovenpå med
# deres eget gennemsigtige billede, så skriften forbliver skarp.
# Kør:  blender --background --factory-startup --python lav_modeller.py

import sys, os, math, subprocess
HER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HER, "..", "..", "sigtekorn", "blender")))
from faelles import *
import faelles
MAPPE = faelles.MAPPE = HER
faelles.MODELLER = os.path.normpath(os.path.join(HER, "..", "modeller"))
os.makedirs(faelles.MODELLER, exist_ok=True)
os.makedirs(os.path.join(MAPPE, "prøver"), exist_ok=True)
MÆRKATER = os.path.join(MAPPE, "prøver", "mærkater")

# mærkaterne laves først (almindelig Python med Pillow)
subprocess.run(["python", os.path.join(MAPPE, "lav_maerkater.py")], check=False)


# ---------- Materialer ----------
def lak(navn, farve, rust=0.35, ru=0.45, støjskala=6.0, striber=False, mørkt=0.55):
    """Malet stål: slid på kanterne, rustpletter og snavs (striber: løbende snavs nedad, som på en tank)"""
    m, nt, p = faelles._principled(navn)
    k = faelles._kant(nt)
    koord = nt.nodes.new("ShaderNodeTexCoord")
    kort = nt.nodes.new("ShaderNodeMapping"); kort.inputs["Scale"].default_value = (1, 1, 6 if striber else 1)
    nt.links.new(koord.outputs["Object"], kort.inputs[0])
    plet = nt.nodes.new("ShaderNodeTexNoise"); plet.inputs["Scale"].default_value = støjskala; plet.inputs["Detail"].default_value = 10; plet.inputs["Roughness"].default_value = 0.65
    nt.links.new(kort.outputs[0], plet.inputs["Vector"])
    trin = nt.nodes.new("ShaderNodeValToRGB"); trin.color_ramp.elements[0].position = 0.62 - rust * 0.2; trin.color_ramp.elements[1].position = 0.72 - rust * 0.2
    nt.links.new(plet.outputs["Fac"], trin.inputs[0])
    # rust = pletter + kanter
    sum_ = nt.nodes.new("ShaderNodeMath"); sum_.operation = "ADD"; sum_.use_clamp = True
    kantGang = nt.nodes.new("ShaderNodeMath"); kantGang.operation = "MULTIPLY"; kantGang.inputs[1].default_value = rust * 1.6
    nt.links.new(k, kantGang.inputs[0])
    nt.links.new(trin.outputs[0], sum_.inputs[0]); nt.links.new(kantGang.outputs[0], sum_.inputs[1])
    # fin variation i rusten
    fin = nt.nodes.new("ShaderNodeTexNoise"); fin.inputs["Scale"].default_value = 90; fin.inputs["Detail"].default_value = 6
    rustFarve = nt.nodes.new("ShaderNodeValToRGB")
    rustFarve.color_ramp.elements[0].color = (0.16, 0.06, 0.02, 1); rustFarve.color_ramp.elements[1].color = (0.42, 0.17, 0.06, 1)
    nt.links.new(fin.outputs["Fac"], rustFarve.inputs[0])
    # lakken med lidt snavs
    snavs = nt.nodes.new("ShaderNodeTexNoise"); snavs.inputs["Scale"].default_value = 3; snavs.inputs["Detail"].default_value = 4
    nt.links.new(kort.outputs[0], snavs.inputs["Vector"])
    lakMix = nt.nodes.new("ShaderNodeMix"); lakMix.data_type = "RGBA"
    lakMix.inputs[6].default_value = (*farve, 1); lakMix.inputs[7].default_value = (farve[0] * mørkt, farve[1] * mørkt * 0.95, farve[2] * mørkt * 0.88, 1)
    snavsTrin = nt.nodes.new("ShaderNodeMapRange"); snavsTrin.inputs[1].default_value = 0.4; snavsTrin.inputs[2].default_value = 0.8
    nt.links.new(snavs.outputs["Fac"], snavsTrin.inputs[0]); nt.links.new(snavsTrin.outputs[0], lakMix.inputs["Factor"])
    alt = nt.nodes.new("ShaderNodeMix"); alt.data_type = "RGBA"
    nt.links.new(sum_.outputs[0], alt.inputs["Factor"]); nt.links.new(lakMix.outputs[2], alt.inputs[6]); nt.links.new(rustFarve.outputs[0], alt.inputs[7])
    nt.links.new(alt.outputs[2], p.inputs["Base Color"])
    rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs[3].default_value = ru; rr.inputs[4].default_value = 0.92
    nt.links.new(sum_.outputs[0], rr.inputs[0]); nt.links.new(rr.outputs[0], p.inputs["Roughness"])
    mm = nt.nodes.new("ShaderNodeMapRange"); mm.inputs[3].default_value = 0.25; mm.inputs[4].default_value = 0.0
    nt.links.new(sum_.outputs[0], mm.inputs[0]); nt.links.new(mm.outputs[0], p.inputs["Metallic"])
    return m


def beton(navn, farve=(0.42, 0.41, 0.39)):
    return farvet(navn, farve, ru=0.92, støj=0.25, skala=25)


# ---------- Mærkater: en tynd flade med et gennemsigtigt billede ----------
_mærkatMat = {}


def mærkatMateriale(fil):
    if fil in _mærkatMat: return _mærkatMat[fil]
    billede = bpy.data.images.load(os.path.join(MÆRKATER, fil + ".png"))
    b, h = billede.size
    if b > 512: billede.scale(512, max(16, round(h * 512 / b)))     # mindre billede i modellen
    billede.pack()
    m = bpy.data.materials.new("mærkat_" + fil); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = billede
    nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); nt.links.new(t.outputs["Alpha"], p.inputs["Alpha"])
    p.inputs["Roughness"].default_value = 0.6
    for felt, værdi in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
        try: setattr(m, felt, værdi)
        except Exception: pass
    _mærkatMat[fil] = m
    return m


def mærkat(navn, fil, b, h, fn):
    """En mærkat b × h meter. fn(u, v) giver punktet på overfladen for u, v i 0..1 (så den kan følge en krum flade)"""
    nu, nv = 12, 4
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    v = [[bm.verts.new(fn(i / nu, j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1]))
            for l, (a, c) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                l[uv].uv = (a / nu, c / nv)
    me = bpy.data.meshes.new(navn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(navn, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(mærkatMateriale(fil))
    for pg in o.data.polygons: pg.use_smooth = True
    return o


def påCylinder(r, midtVinkel, zMidt, b, h, afstand=0.0015):
    """Mærkat på en lodret cylinder (vinkel 0 = forsiden mod -y)"""
    R = r + afstand
    def fn(u, v):
        a = midtVinkel + (u - 0.5) * b / R
        return Vector((R * math.sin(a), -R * math.cos(a), zMidt + (v - 0.5) * h))
    return fn


def påVandret(r, xMidt, zAkse, midtVinkel, b, h, afstand=0.003):
    """Mærkat på en vandret cylinder langs x (vinkel 0 = siden mod -y)"""
    R = r + afstand
    def fn(u, v):
        a = midtVinkel + (v - 0.5) * h / R
        return Vector((xMidt + (u - 0.5) * b, -R * math.cos(a), zAkse + R * math.sin(a)))
    return fn


def påFlade(midt, højre, op, b, h):
    """Mærkat på en flad side: midt, og retningerne for bredde og højde"""
    midt, højre, op = Vector(midt), Vector(højre).normalized(), Vector(op).normalized()
    return lambda u, v: midt + højre * (u - 0.5) * b + op * (v - 0.5) * h


def punkt(navn, sted):
    m = bpy.data.objects.new(navn, None); bpy.context.collection.objects.link(m); m.location = sted
    return m


def buler(o, styrke=0.004, skala=0.25):
    """Små buler og skrammer i pladen"""
    t = bpy.data.textures.new(o.name + "_buler", "CLOUDS"); t.noise_scale = skala
    m = o.modifiers.new("buler", "DISPLACE"); m.texture = t; m.strength = styrke; m.mid_level = 0.5
    return o


# ---------- Tønden ----------
def tønde():
    RØD = lak("rød lak", (0.42, 0.045, 0.03), rust=0.45, ru=0.42, støjskala=5)
    STÅL = metal("stål", farve=(0.1, 0.1, 0.1), slid=(0.4, 0.4, 0.42))
    d = [buler(rør("krop", (0, 0, 0.012), (0, 0, 0.868), 0.288, RØD, 48, 0.004)),
         rør("bundkant", (0, 0, 0.0), (0, 0, 0.024), 0.292, RØD, 48, 0.004),
         rør("topkant", (0, 0, 0.856), (0, 0, 0.88), 0.292, RØD, 48, 0.004)]
    for z in (0.29, 0.59):
        d.append(rør(f"rulle{z}", (0, 0, z - 0.012), (0, 0, z + 0.012), 0.297, RØD, 48, 0.006))
    for x, r in ((0.17, 0.028), (-0.19, 0.018)):
        d.append(rør(f"prop{x}", (x, 0.05, 0.876), (x, 0.05, 0.89), r, STÅL, 20, 0.002))
    mærker = [mærkat("brandfare", "brandfare", 0.2, 0.2, påCylinder(0.288, 0.0, 0.44, 0.2, 0.2)),
              mærkat("olie", "toende_tekst", 0.36, 0.09, påCylinder(0.288, math.pi, 0.44, 0.36, 0.09))]
    return d, mærker, [], 512


# ---------- Gasflasken ----------
def gasflaske():
    GRÅ = lak("grå lak", (0.32, 0.34, 0.36), rust=0.25, ru=0.4, støjskala=9)
    MESSING = metal("messing", farve=(0.36, 0.25, 0.08), slid=(0.7, 0.55, 0.25), ru=0.35)
    SORT = farvet("sort plast", (0.02, 0.02, 0.025), ru=0.5)
    d = [buler(rør("krop", (0, 0, 0.1), (0, 0, 0.44), 0.15, GRÅ, 40, 0.003), 0.002),
         kugle("top", (0, 0, 0.44), 0.15, GRÅ, 1, 1, 0.55, 40, 16),
         kugle("bund", (0, 0, 0.1), 0.15, GRÅ, 1, 1, 0.45, 40, 16),
         rør("fod", (0, 0, 0.0), (0, 0, 0.08), 0.128, GRÅ, 40, 0.004),
         rør("krave", (0, 0, 0.5), (0, 0, 0.585), 0.085, GRÅ, 32, 0.004),
         rør("kravehul", (0, 0, 0.54), (0, 0, 0.586), 0.07, SORT, 32, 0.002),
         rør("ventil", (0, 0, 0.5), (0, 0, 0.6), 0.018, MESSING, 16, 0.002),
         rør("ventilhjul", (0, 0, 0.598), (0, 0, 0.61), 0.032, SORT, 20, 0.002),
         rør("tud", (0, 0, 0.56), (0.05, 0, 0.56), 0.009, MESSING, 12, 0.001)]
    mærker = [mærkat("propan", "propan", 0.2, 0.1, påCylinder(0.15, 0.0, 0.28, 0.2, 0.1)),
              mærkat("gasrude", "gasrude", 0.1, 0.1, påCylinder(0.15, math.pi, 0.3, 0.1, 0.1))]
    return d, mærker, [punkt("ventil", (0, 0, 0.61))], 512


# ---------- Gastanken ----------
def gastank():
    HVID = lak("hvid lak", (0.8, 0.8, 0.77), rust=0.06, ru=0.38, støjskala=1.3, striber=True, mørkt=0.82)
    BETON = beton("beton")
    STÅL = metal("stål", farve=(0.2, 0.21, 0.22), slid=(0.5, 0.5, 0.52))
    GUL = lak("gul lak", (0.75, 0.5, 0.03), rust=0.3)
    r, zc, L = 0.9, 1.62, 2.5
    d = [rør("tank", (-L, 0, zc), (L, 0, zc), r, HVID, 56, 0.01),
         kugle("ende1", (L, 0, zc), r, HVID, 0.48, 1, 1, 48, 20),
         kugle("ende2", (-L, 0, zc), r, HVID, 0.48, 1, 1, 48, 20)]
    for x in (-1.6, 1.6):
        d.append(kasse(f"sadel{x}", x - 0.25, -0.75, 0.0, x + 0.25, 0.75, 0.95, BETON, 0.02))
        d.append(kasse(f"sadelplade{x}", x - 0.3, -0.62, 0.9, x + 0.3, 0.62, 0.98, STÅL, 0.005))
    d += [rør("dom", (0.5, 0, zc + r - 0.05), (0.5, 0, zc + r + 0.14), 0.26, HVID, 32, 0.01),
          rør("ventil1", (0.4, 0, zc + r + 0.14), (0.4, 0, zc + r + 0.32), 0.035, STÅL, 12),
          rør("ventil2", (0.62, 0.08, zc + r + 0.14), (0.62, 0.08, zc + r + 0.26), 0.03, GUL, 12),
          rør("rør", (0.62, 0.08, zc + r + 0.26), (2.9, 0.08, zc + r + 0.26), 0.025, STÅL, 12),
          rør("rørned", (2.9, 0.08, zc + r + 0.26), (2.9, 0.08, 0.05), 0.025, STÅL, 12)]
    # stigen op til ventilerne
    for y in (-0.22, 0.22):
        d.append(rør(f"stige{y}", (-0.6, -1.0 + y * 0.2, 0.0), (-0.6, -0.55 + y * 0.2, zc + r + 0.2), 0.02, GUL, 10))
    for i in range(9):
        t = (i + 0.5) / 9
        d.append(rør(f"trin{i}", (-0.82, -1.0 + 0.45 * t, t * (zc + r + 0.2)), (-0.38, -1.0 + 0.45 * t, t * (zc + r + 0.2)), 0.012, STÅL, 8))
    mærker = [mærkat("tekst", "gastank_tekst", 3.0, 0.75, påVandret(r, 0.2, zc, 0.0, 3.0, 0.75)),
              mærkat("rude", "gasrude", 0.5, 0.5, påVandret(r, -1.95, zc, 0.0, 0.5, 0.5)),
              mærkat("rygning", "rygning_forbudt", 0.45, 0.45, påVandret(r, 1.95, zc, 0.0, 0.45, 0.45)),
              mærkat("tekst2", "gastank_tekst", 3.0, 0.75, påVandret(r, -0.2, zc, math.pi, 3.0, 0.75))]
    return d, mærker, [], 1024


# ---------- Trækassen med TNT ----------
def tntkasse():
    TRÆ = træ("fyr", lys=(0.5, 0.33, 0.17), mørk=(0.28, 0.16, 0.07))
    MØRK = træ("mørkt træ", lys=(0.36, 0.22, 0.1), mørk=(0.18, 0.1, 0.04))
    REB = farvet("reb", (0.45, 0.36, 0.22), ru=0.95, skala=200)
    X, Y, Z = 0.3, 0.2, 0.4
    d = []
    for i in range(3):                                   # brædderne på siderne
        z0, z1 = i * Z / 3 + 0.004, (i + 1) * Z / 3 - 0.004
        d.append(kasse(f"for{i}", -X, -Y, z0, X, -Y + 0.018, z1, TRÆ, 0.004))
        d.append(kasse(f"bag{i}", -X, Y - 0.018, z0, X, Y, z1, TRÆ, 0.004))
        d.append(kasse(f"v{i}", -X, -Y + 0.018, z0, -X + 0.018, Y - 0.018, z1, TRÆ, 0.004))
        d.append(kasse(f"h{i}", X - 0.018, -Y + 0.018, z0, X, Y - 0.018, z1, TRÆ, 0.004))
    for i in range(3):                                   # låget
        y0, y1 = -Y + i * 2 * Y / 3 + 0.003, -Y + (i + 1) * 2 * Y / 3 - 0.003
        d.append(kasse(f"låg{i}", -X, y0, Z - 0.02, X, y1, Z, TRÆ, 0.004))
    for x in (-X, X):                                    # hjørnelister
        for y in (-Y, Y):
            d.append(kasse(f"liste{x}{y}", x - 0.025 * (x > 0) - 0.003 * (x < 0), y - 0.025 * (y > 0) - 0.003 * (y < 0), 0, x + 0.025 * (x < 0) + 0.003 * (x > 0), y + 0.025 * (y < 0) + 0.003 * (y > 0), Z, MØRK, 0.004))
    for x in (-X - 0.01, X + 0.01):                      # rebhåndtag i enderne
        d.append(rør(f"reb{x}", (x, -0.08, 0.3), (x, 0.08, 0.3), 0.012, REB, 10))
    mærker = [mærkat("tnt", "tnt_roed", 0.42, 0.21, påFlade((0, -Y - 0.002, 0.2), (1, 0, 0), (0, 0, 1), 0.42, 0.21)),
              mærkat("tnt2", "tnt_roed", 0.42, 0.21, påFlade((0, Y + 0.002, 0.2), (-1, 0, 0), (0, 0, 1), 0.42, 0.21)),
              mærkat("sort", "tnt_sort", 0.42, 0.21, påFlade((0, 0, Z + 0.002), (1, 0, 0), (0, 1, 0), 0.42, 0.21))]
    return d, mærker, [], 512


# ---------- Skurvognen ----------
def skurvogn():
    HVID = lak("hvide plader", (0.72, 0.73, 0.72), rust=0.12, ru=0.5, støjskala=3, striber=True)
    GRÅ = lak("ramme", (0.2, 0.21, 0.22), rust=0.3, ru=0.5)
    GLAS = farvet("rude", (0.03, 0.04, 0.05), ru=0.05, met=0.2)
    DØR = lak("dør", (0.25, 0.32, 0.4), rust=0.2)
    X, Y, Z = 3.0, 1.2, 2.6
    d = [kasse("krop", -X + 0.08, -Y + 0.08, 0.12, X - 0.08, Y - 0.08, Z - 0.1, HVID, 0.02)]
    for x in range(-29, 30, 2):                          # bølgeblik: lodrette ribber
        d.append(kasse(f"ribF{x}", x * 0.1 - 0.025, -Y + 0.05, 0.2, x * 0.1 + 0.025, -Y + 0.085, Z - 0.18, HVID, 0.01))
        d.append(kasse(f"ribB{x}", x * 0.1 - 0.025, Y - 0.085, 0.2, x * 0.1 + 0.025, Y - 0.05, Z - 0.18, HVID, 0.01))
    for x in (-X, X - 0.12):                             # rammen
        for y in (-Y, Y - 0.12):
            d.append(kasse(f"hjørne{x}{y}", x, y, 0, x + 0.12, y + 0.12, Z, GRÅ, 0.01))
    d += [kasse("bund", -X, -Y, 0, X, Y, 0.14, GRÅ, 0.01), kasse("tag", -X, -Y, Z - 0.14, X, Y, Z, GRÅ, 0.01),
          kasse("dør", 1.2, -Y - 0.01, 0.15, 2.1, -Y + 0.05, 2.2, DØR, 0.01),
          kasse("vindue1", -2.4, -Y - 0.012, 1.0, -1.2, -Y + 0.05, 1.9, GLAS, 0.01),
          kasse("vindue2", -0.6, -Y - 0.012, 1.0, 0.6, -Y + 0.05, 1.9, GLAS, 0.01),
          kasse("trappe", 1.05, -Y - 0.75, 0.0, 2.25, -Y, 0.14, GRÅ, 0.01)]
    mærker = [mærkat("skilt", "firmaskilt", 2.4, 0.6, påFlade((-1.2, -Y - 0.02, 2.2), (1, 0, 0), (0, 0, 1), 2.4, 0.6)),
              mærkat("kontor", "kontor", 0.6, 0.19, påFlade((1.65, -Y - 0.02, 2.36), (1, 0, 0), (0, 0, 1), 0.6, 0.19))]
    return d, mærker, [], 1024


# ---------- Gravkoen ----------
def gravko():
    GUL = lak("gul lak", (0.72, 0.42, 0.02), rust=0.3, ru=0.42, støjskala=4)
    SORT = farvet("sort", (0.03, 0.03, 0.035), ru=0.7)
    BÆLTE = farvet("bælte", (0.05, 0.05, 0.05), ru=0.85, met=0.3, skala=120)
    GLAS = farvet("rude", (0.04, 0.06, 0.07), ru=0.05, met=0.3)
    STÅL = metal("stål", farve=(0.1, 0.1, 0.1), slid=(0.45, 0.45, 0.46))
    d = []
    for y in (-1.15, 1.15):                              # bælterne
        d.append(løft(f"bælte{y}", [[(-2.4, y - 0.3, 0.45), (-2.1, y - 0.3, 0.0), (2.1, y - 0.3, 0.0), (2.4, y - 0.3, 0.45), (2.1, y - 0.3, 0.9), (-2.1, y - 0.3, 0.9)],
                                    [(-2.4, y + 0.3, 0.45), (-2.1, y + 0.3, 0.0), (2.1, y + 0.3, 0.0), (2.4, y + 0.3, 0.45), (2.1, y + 0.3, 0.9), (-2.1, y + 0.3, 0.9)]], BÆLTE, 0.03))
        for x in range(-4, 5):
            d.append(kasse(f"led{y}{x}", x * 0.48 - 0.08, y - 0.31, 0.86, x * 0.48 + 0.08, y + 0.31, 0.94, STÅL, 0.01))
    d += [kasse("undervogn", -1.9, -0.85, 0.3, 1.9, 0.85, 0.95, SORT, 0.05),
          rør("drejekrans", (0, 0, 0.95), (0, 0, 1.1), 1.0, SORT, 32, 0.02),
          kasse("overvogn", -2.2, -1.35, 1.1, 1.3, 1.35, 2.05, GUL, 0.06),
          kasse("kontravægt", -2.75, -1.35, 1.1, -2.1, 1.35, 2.15, GUL, 0.1),
          kasse("motorhjelm", -2.2, -0.2, 2.05, -0.2, 1.3, 2.35, GUL, 0.05),
          kasse("førerhus", 0.0, -1.35, 2.05, 1.3, -0.25, 3.15, GUL, 0.05),
          kasse("frontrude", 1.29, -1.3, 2.25, 1.32, -0.3, 3.05, GLAS, 0.01),
          kasse("siderude", 0.1, -1.37, 2.3, 1.2, -1.34, 3.05, GLAS, 0.01)]
    # bom, arm og skovl (hviler med skovlen på jorden foran)
    d.append(løft("bom", [[(0.9, -0.2, 1.6), (0.9, 0.2, 1.6), (0.9, 0.2, 2.1), (0.9, -0.2, 2.1)],
                          [(3.0, -0.18, 3.6), (3.0, 0.18, 3.6), (3.0, 0.18, 3.95), (3.0, -0.18, 3.95)],
                          [(5.2, -0.16, 3.0), (5.2, 0.16, 3.0), (5.2, 0.16, 3.3), (5.2, -0.16, 3.3)]], GUL, 0.03))
    d.append(løft("arm", [[(5.0, -0.14, 3.15), (5.0, 0.14, 3.15), (5.3, 0.14, 3.15), (5.3, -0.14, 3.15)],
                          [(5.9, -0.12, 0.7), (5.9, 0.12, 0.7), (6.15, 0.12, 0.7), (6.15, -0.12, 0.7)]], GUL, 0.03))
    d.append(løft("skovl", [[(5.7, -0.55, 0.75), (5.7, 0.55, 0.75), (6.4, 0.55, 0.75), (6.4, -0.55, 0.75)],
                            [(5.5, -0.55, 0.25), (5.5, 0.55, 0.25), (6.6, 0.55, 0.2), (6.6, -0.55, 0.2)],
                            [(5.8, -0.55, 0.02), (5.8, 0.55, 0.02), (6.9, 0.55, 0.0), (6.9, -0.55, 0.0)]], STÅL, 0.02))
    d.append(rør("cylinder", (1.2, 0, 1.4), (2.6, 0, 3.2), 0.09, STÅL, 12))
    mærker = [mærkat("striber", "striber", 1.3, 0.3, påFlade((-2.76, 0, 1.6), (0, 1, 0), (0, 0, 1), 1.3, 0.3)),
              mærkat("navn", "gravko_navn", 1.6, 0.2, påFlade((-0.9, -1.36, 1.6), (1, 0, 0), (0, 0, 1), 1.6, 0.2))]
    return d, mærker, [], 1024


MODELLER = [("tonde", tønde), ("gasflaske", gasflaske), ("gastank", gastank), ("tntkasse", tntkasse), ("skurvogn", skurvogn), ("gravko", gravko)]
VÆLG = [a for a in sys.argv[sys.argv.index("--") + 1:]] if "--" in sys.argv else []
for navn, byg in MODELLER:
    if VÆLG and navn not in VÆLG: continue
    nulstil(); _mærkatMat.clear()
    dele, mærker, punkter, str_ = byg()
    k = saml(navn, dele); bag(k, navn, str_)
    eksportér([k, *mærker, *punkter], f"{navn}.glb")
    s = max(k.dimensions)
    prøvebillede(f"{navn}.png", (s * 1.1, -s * 1.5, s * 0.75), (0, 0, k.dimensions.z * 0.45), (640, 420))
