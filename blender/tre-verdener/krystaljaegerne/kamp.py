"""Originale håndvåben og en venlig øveskive til Krystaljægerne. Kør i Blender."""
import bpy
import math
import os
from mathutils import Vector

MAPPE = os.path.dirname(os.path.abspath(__file__))
UD = os.path.abspath(os.path.join(MAPPE, '../../../spil/krystaljaegerne/modeller/kamp.glb'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Koordinater skrives som i spillet: op er Y, og eventyreren ser langs minus Z.
def punkt(p):
    return Vector((p[0], -p[2], p[1]))

materialer = {}
for navn, farve, lys in [('kobber', '#c58958', 0), ('greb', '#3b4d58', 0),
                         ('klinge', '#e5f6f0', .25), ('turkis', '#69ead3', .5),
                         ('violet', '#ca9bff', .6), ('træ', '#88614a', 0)]:
    mat = bpy.data.materials.new(navn)
    mat.diffuse_color = tuple(int(farve[i:i + 2], 16) / 255 for i in (1, 3, 5)) + (1,)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = .46 if navn in ['kobber', 'klinge'] else .8
    shader.inputs['Metallic'].default_value = .35 if navn == 'kobber' else 0
    shader.inputs['Emission Color'].default_value = mat.diffuse_color
    shader.inputs['Emission Strength'].default_value = lys
    materialer[navn] = mat

rod = None
dele = []
modeller = []

def model(navn):
    global rod, dele
    rod = bpy.data.objects.new(navn, None)
    bpy.context.collection.objects.link(rod)
    modeller.append(rod)
    dele = []

def tilføj(obj, mat):
    obj.data.materials.append(materialer[mat])
    obj.parent = rod
    dele.append(obj)
    return obj

def kasse(p, s, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=punkt(p))
    obj = bpy.context.object
    obj.scale = (s[0], s[2], s[1])
    return tilføj(obj, mat)

def kugle(p, s, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=punkt(p))
    obj = bpy.context.object
    obj.scale = (s[0], s[2], s[1])
    return tilføj(obj, mat)

def stang(a, b, r, mat, sider=8):
    a, b = punkt(a), punkt(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=sider, radius=r, depth=(b - a).length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return tilføj(obj, mat)

def spids(a, b, r, mat, sider=4):
    a, b = punkt(a), punkt(b)
    bpy.ops.mesh.primitive_cone_add(vertices=sider, radius1=r, radius2=0, depth=(b - a).length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return tilføj(obj, mat)

def ring(y, radius, tykkelse, mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=4, major_radius=radius,
                                   minor_radius=tykkelse, location=punkt((0, y, -.071)))
    obj = bpy.context.object
    obj.rotation_euler.x = math.pi / 2
    return tilføj(obj, mat)

# Hver model bruger ét mesh pr. materiale, så den lille skærm har få tegnekald.
def saml():
    grupper = {navn: [o for o in dele if o.data.materials[0] == mat] for navn, mat in materialer.items()}
    for navn, gruppe in grupper.items():
        if not gruppe:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in gruppe:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = gruppe[0]
        bpy.ops.object.join()
        samlet = bpy.context.object
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.context.scene.cursor.location = (0, 0, 0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        samlet.name = rod.name + '_' + navn

model('kampsværd')
kasse((0, .015, 0), (.105, .24, .11), 'greb')
kasse((0, .16, 0), (.48, .09, .12), 'kobber')
for x in [-.24, .24]:
    kugle((x, .16, 0), (.065, .065, .065), 'turkis')
kasse((0, .64, 0), (.15, .86, .06), 'klinge')
spids((0, 1.07, 0), (0, 1.25, 0), .107, 'klinge')
kasse((0, .47, -.033), (.035, .52, .013), 'turkis')
kugle((0, -.12, 0), (.09, .08, .085), 'kobber')
saml()

model('kampbue')
punkter = [(0, -.68, .13), (0, -.52, -.055), (0, -.28, -.19), (0, 0, -.07),
           (0, .28, -.19), (0, .52, -.055), (0, .68, .13)]
for a, b in zip(punkter, punkter[1:]):
    stang(a, b, .042, 'kobber')
stang((0, -.12, -.07), (0, .12, -.07), .054, 'greb')
for y in [-.68, .68]:
    kugle((0, y, .13), (.064, .062, .065), 'turkis')
saml()

model('kamppil')
stang((0, 0, 0), (0, 0, -.91), .021, 'træ', 6)
spids((0, 0, -.86), (0, 0, -1.08), .071, 'klinge')
for x in [-.045, .045]:
    kasse((x, 0, -.14), (.075, .02, .21), 'turkis')
kasse((0, .045, -.14), (.02, .075, .21), 'turkis')
kugle((0, 0, -.01), (.027, .027, .027), 'kobber')
saml()

model('kampstav')
stang((0, -.16, 0), (0, .92, 0), .055, 'træ')
stang((0, -.02, 0), (0, .23, 0), .063, 'greb')
for x in [-.16, .16]:
    stang((0, .85, 0), (x, 1.16, 0), .033, 'kobber')
kugle((0, 1.12, 0), (.18, .27, .18), 'violet')
kugle((0, .76, 0), (.10, .085, .10), 'turkis')
saml()

# Den selvstændige skive ser fremad mod minus Z; ingen skade eller kamp er nødvendig her.
model('træningsskive')
kasse((0, .10, 0), (.95, .20, .65), 'træ')
stang((0, .1, .09), (0, 1.5, .09), .095, 'træ')
stang((-.38, .16, .24), (0, .85, .11), .055, 'kobber')
stang((.38, .16, .24), (0, .85, .11), .055, 'kobber')
stang((0, 1.28, -.04), (0, 1.28, .09), .58, 'træ', 24)
for radius, mat in [(.52, 'kobber'), (.37, 'turkis'), (.19, 'kobber')]:
    ring(1.28, radius, .025, mat)
kugle((0, 1.28, -.093), (.09, .09, .03), 'turkis')
saml()

bpy.ops.object.select_all(action='DESELECT')
for modelrod in modeller:
    modelrod.select_set(True)
    for obj in modelrod.children:
        obj.select_set(True)
os.makedirs(os.path.dirname(UD), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=UD, export_format='GLB', use_selection=True, export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(MAPPE, 'kamp.blend'))
print('KRYSTAL_KAMP_KLAR', UD)
