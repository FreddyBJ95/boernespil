# ===== Fælles værktøj til Sigtekorns Blender-scripts =====
# Køres af Blender uden vindue, fx:
#   blender --background --factory-startup --python lav_gevaer.py
# Delene bygges af afrundede kasser, rør og "løft" (en form trukket gennem tværsnit). Materialerne er
# procedurale (træåre, slid på metallets kanter, stof), og til sidst bages de ned i to billeder:
# farve (med skyggen i krogene ganget på) og ruhed/metal — så spillet i browseren kan vise dem hurtigt.

import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix

MAPPE = os.path.dirname(os.path.abspath(__file__))
MODELLER = os.path.normpath(os.path.join(MAPPE, "..", "modeller"))


def nulstil():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    try:
        p = bpy.context.preferences.addons["cycles"].preferences
        p.compute_device_type = "HIP"; p.get_devices()
        for d in p.devices: d.use = True
        s.cycles.device = "GPU"
    except Exception as e:
        print("Ingen GPU:", e)
    s.cycles.samples = 64
    s.world = bpy.data.worlds.new("Verden"); s.world.use_nodes = True
    s.world.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
    s.world.light_settings.distance = 0.06                      # skyggen i krogene (AO) rækker 6 cm
    return s


# ---------- Dele ----------
def _obj(navn, bm, mat):
    me = bpy.data.meshes.new(navn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(navn, me); bpy.context.collection.objects.link(o)
    if mat: o.data.materials.append(mat)
    return o


def afrund(o, bredde=0.003, seg=3, glat=True):
    m = o.modifiers.new("afrund", "BEVEL"); m.width = bredde; m.segments = seg; m.limit_method = "ANGLE"; m.angle_limit = math.radians(40)
    m.harden_normals = True
    if glat:
        for p in o.data.polygons: p.use_smooth = True
    return o


def kasse(navn, x0, y0, z0, x1, y1, z1, mat, bredde=0.003):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    return afrund(_obj(navn, bm, mat), bredde)


def rør(navn, a, b, r, mat, seg=24, bredde=0.0015, r2=None):
    """Et rør fra punkt a til punkt b (r2: anden radius i enden, så det kan blive kegleformet)"""
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2 if r2 is not None else r, depth=(b - a).length)
    rot = (b - a).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=bm.verts)
    o = afrund(_obj(navn, bm, mat), bredde, 2)
    return o


def løft(navn, snit, mat, bredde=0.003, lukket=True):
    """En form trukket gennem tværsnit. snit = liste af lister med punkter (samme antal i hvert)"""
    bm = bmesh.new(); ringe = [[bm.verts.new(Vector(p)) for p in s] for s in snit]
    n = len(snit[0])
    for i in range(len(ringe) - 1):
        for j in range(n):
            bm.faces.new((ringe[i][j], ringe[i][(j + 1) % n], ringe[i + 1][(j + 1) % n], ringe[i + 1][j]))
    if lukket:
        bm.faces.new(list(reversed(ringe[0]))); bm.faces.new(ringe[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return afrund(_obj(navn, bm, mat), bredde)


def firkant(cy, x0, x1, z0, z1):
    """Et rektangulært tværsnit i højden/dybden cy (langs y)"""
    return [(x0, cy, z0), (x1, cy, z0), (x1, cy, z1), (x0, cy, z1)]


def kugle(navn, c, r, mat, sx=1, sy=1, sz=1):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
    for v in bm.verts: v.co = Vector((c[0] + v.co.x * sx, c[1] + v.co.y * sy, c[2] + v.co.z * sz))
    o = _obj(navn, bm, mat)
    for p in o.data.polygons: p.use_smooth = True
    return o


# ---------- Materialer (procedurale — bages senere) ----------
def _principled(navn):
    m = bpy.data.materials.new(navn); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    return m, nt, p


def _kant(nt):
    """Et tal 0..1, der er højt på kanterne (til slid)"""
    g = nt.nodes.new("ShaderNodeNewGeometry")
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].position = 0.52; r.color_ramp.elements[1].position = 0.6
    nt.links.new(g.outputs["Pointiness"], r.inputs[0])
    return r.outputs[0]


def metal(navn, farve=(0.035, 0.037, 0.042), slid=(0.42, 0.43, 0.45), ru=0.42):
    m, nt, p = _principled(navn)
    k = _kant(nt)
    støj = nt.nodes.new("ShaderNodeTexNoise"); støj.inputs["Scale"].default_value = 180; støj.inputs["Detail"].default_value = 8
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*farve, 1); mix.inputs[7].default_value = (*slid, 1)
    gang = nt.nodes.new("ShaderNodeMath"); gang.operation = "MULTIPLY"
    nt.links.new(k, gang.inputs[0]); nt.links.new(støj.outputs["Fac"], gang.inputs[1])
    nt.links.new(gang.outputs[0], mix.inputs["Factor"]); nt.links.new(mix.outputs[2], p.inputs["Base Color"])
    rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs[3].default_value = ru; rr.inputs[4].default_value = ru - 0.18
    nt.links.new(gang.outputs[0], rr.inputs[0]); nt.links.new(rr.outputs[0], p.inputs["Roughness"])
    p.inputs["Metallic"].default_value = 0.9
    return m


def træ(navn, lys=(0.36, 0.15, 0.05), mørk=(0.12, 0.045, 0.015)):
    m, nt, p = _principled(navn)
    koord = nt.nodes.new("ShaderNodeTexCoord")
    skala = nt.nodes.new("ShaderNodeMapping"); skala.inputs["Scale"].default_value = (60, 6, 60)
    nt.links.new(koord.outputs["Object"], skala.inputs[0])
    bølge = nt.nodes.new("ShaderNodeTexWave"); bølge.wave_type = "RINGS"; bølge.inputs["Distortion"].default_value = 6; bølge.inputs["Detail"].default_value = 4
    nt.links.new(skala.outputs[0], bølge.inputs[0])
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = (*mørk, 1); r.color_ramp.elements[1].color = (*lys, 1)
    nt.links.new(bølge.outputs["Fac"], r.inputs[0])
    k = _kant(nt)
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[7].default_value = (0.5, 0.3, 0.17, 1)
    nt.links.new(r.outputs[0], mix.inputs[6]); gang = nt.nodes.new("ShaderNodeMath"); gang.operation = "MULTIPLY"; gang.inputs[1].default_value = 0.6
    nt.links.new(k, gang.inputs[0]); nt.links.new(gang.outputs[0], mix.inputs["Factor"])
    nt.links.new(mix.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.5; p.inputs["Metallic"].default_value = 0.0
    return m


def farvet(navn, farve, ru=0.6, met=0.0, støj=0.12, skala=40):
    """Plastik, gummi, stof og læder: en farve med lidt variation"""
    m, nt, p = _principled(navn)
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = skala; n.inputs["Detail"].default_value = 6
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["Factor"].default_value = 0
    a = tuple(max(0, c * (1 - støj)) for c in farve); b = tuple(min(1, c * (1 + støj)) for c in farve)
    mix.inputs[6].default_value = (*a, 1); mix.inputs[7].default_value = (*b, 1)
    nt.links.new(n.outputs["Fac"], mix.inputs["Factor"]); nt.links.new(mix.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = ru; p.inputs["Metallic"].default_value = met
    return m


# ---------- Saml, bag og eksportér ----------
def saml(navn, objekter):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objekter: o.select_set(True)
    bpy.context.view_layer.objects.active = objekter[0]
    bpy.ops.object.convert(target="MESH")                        # læg afrundingerne fast
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = navn
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")
    return o


def _bag_sokkel(o, billede, sokkel=None, type_="EMIT"):
    """Bag én ting ned i billedet: en sokkel fra Principled (via lys-trick) — eller AO/ROUGHNESS direkte"""
    gemt = []
    for m in o.data.materials:
        nt = m.node_tree; n = nt.nodes.get("bagemål") or nt.nodes.new("ShaderNodeTexImage"); n.name = "bagemål"; n.image = billede
        nt.nodes.active = n
        if sokkel:
            p = nt.nodes["Principled BSDF"]; ud = nt.nodes["Material Output"]
            gammel = ud.inputs["Surface"].links[0].from_socket
            em = nt.nodes.new("ShaderNodeEmission")
            inp = p.inputs[sokkel]
            if inp.links: nt.links.new(inp.links[0].from_socket, em.inputs["Color"])
            else:
                v = inp.default_value
                em.inputs["Color"].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
            nt.links.new(em.outputs[0], ud.inputs["Surface"])
            gemt.append((nt, ud, gammel, em))
    bpy.ops.object.bake(type=type_, margin=6, use_clear=True)
    for nt, ud, gammel, em in gemt:
        nt.links.new(gammel, ud.inputs["Surface"]); nt.nodes.remove(em)


def bag(o, navn, str_=1024):
    """Bag farve, ruhed, metal og skygger i krogene — og lav ét færdigt materiale med to billeder"""
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.context.scene.cycles.samples = 32
    b = {k: bpy.data.images.new(f"{navn}_{k}", str_, str_, float_buffer=False) for k in ("farve", "ru", "met", "ao")}
    for k in ("ru", "met", "ao"): b[k].colorspace_settings.name = "Non-Color"
    _bag_sokkel(o, b["farve"], "Base Color")
    _bag_sokkel(o, b["ru"], None, "ROUGHNESS")
    _bag_sokkel(o, b["met"], "Metallic")
    bpy.context.scene.cycles.samples = 64
    _bag_sokkel(o, b["ao"], None, "AO")
    def px(im):
        buf = np.empty(str_ * str_ * 4, dtype=np.float32); im.pixels.foreach_get(buf)
        return buf.reshape(str_, str_, 4)
    f, ru, me, ao = px(b["farve"]), px(b["ru"]), px(b["met"]), px(b["ao"])
    a = 0.35 + 0.65 * ao[..., :1]                                  # skyggen i krogene, men ikke helt sort
    farve = bpy.data.images.new(f"{navn}_farve_ao", str_, str_)
    farve.pixels.foreach_set(np.concatenate([f[..., :3] * a, f[..., 3:]], axis=2).astype(np.float32).ravel())
    orm = bpy.data.images.new(f"{navn}_orm", str_, str_); orm.colorspace_settings.name = "Non-Color"
    orm.pixels.foreach_set(np.stack([ao[..., 0], ru[..., 0], me[..., 0], np.ones_like(ao[..., 0])], axis=2).astype(np.float32).ravel())
    for im in (farve, orm): im.pack()
    m = bpy.data.materials.new(navn); m.use_nodes = True; nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    tf = nt.nodes.new("ShaderNodeTexImage"); tf.image = farve; nt.links.new(tf.outputs["Color"], p.inputs["Base Color"])
    to = nt.nodes.new("ShaderNodeTexImage"); to.image = orm
    sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(to.outputs["Color"], sep.inputs[0])
    nt.links.new(sep.outputs["Green"], p.inputs["Roughness"]); nt.links.new(sep.outputs["Blue"], p.inputs["Metallic"])
    o.data.materials.clear(); o.data.materials.append(m)
    return m


def eksportér(objekter, fil):
    bpy.ops.object.select_all(action="DESELECT")
    for x in objekter: x.select_set(True)
    sti = os.path.join(MODELLER, fil)
    bpy.ops.export_scene.gltf(filepath=sti, export_format="GLB", use_selection=True, export_yup=True, export_image_format="WEBP", export_image_quality=85)
    print("GEMT", sti, os.path.getsize(sti) // 1024, "kB")


def prøvebillede(fil, kamera, mål, str_=(900, 520)):
    s = bpy.context.scene
    lo = bpy.data.objects.get("prøvesol")
    if not lo:
        lys = bpy.data.lights.new("prøvesol", "SUN"); lys.energy = 4; lo = bpy.data.objects.new("prøvesol", lys); s.collection.objects.link(lo)
    lo.rotation_euler = (math.radians(50), math.radians(10), math.radians(140))
    k = bpy.data.objects.get("prøvekamera")
    if not k:
        kd = bpy.data.cameras.new("prøvekamera"); kd.lens = 45; k = bpy.data.objects.new("prøvekamera", kd); s.collection.objects.link(k)
    k.location = kamera; retning = Vector(mål) - Vector(kamera); k.rotation_euler = retning.to_track_quat("-Z", "Y").to_euler()
    s.camera = k; s.render.resolution_x, s.render.resolution_y = str_; s.cycles.samples = 48
    s.render.filepath = os.path.join(MAPPE, "prøver", fil); s.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print("BILLEDE", s.render.filepath)
