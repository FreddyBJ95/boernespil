"""Originale fund og en rigtig hængslet skattekiste. Kør i Blender."""
import bpy
import math
import os
from mathutils import Vector

MAPPE = os.path.dirname(os.path.abspath(__file__))
UD = os.path.abspath(os.path.join(MAPPE, '../../../spil/krystaljaegerne/modeller/fund.glb'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0

# Spillets koordinater: Y er op, og forsiden vender mod minus Z.
def punkt(p):
    return Vector((p[0], -p[2], p[1]))

# Blender forventer lineære farver; palettens hex-værdier er almindelig sRGB.
def lineær(værdi):
    return værdi / 12.92 if værdi <= .04045 else ((værdi + .055) / 1.055) ** 2.4

materialer = {}
for navn, farve, lys, metal, alpha in [
    ('turkis', '#2ab7c4', .3, .08, 1), ('violet', '#7957da', .25, .05, 1),
    ('kobber', '#da985d', 0, .6, 1), ('guld', '#efc978', .15, .65, 1),
    ('træ', '#694935', 0, 0, 1), ('prop', '#88654a', 0, 0, 1),
    ('glas', '#b9f1e9', .05, .05, .33),
]:
    mat = bpy.data.materials.new('fund_' + navn)
    mat.diffuse_color = tuple(lineær(int(farve[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (alpha,)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = mat.diffuse_color
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = .24 if navn == 'glas' else .35 if navn in ['turkis', 'violet'] else .5
    bsdf.inputs['Emission Color'].default_value = mat.diffuse_color
    bsdf.inputs['Emission Strength'].default_value = lys
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = 'DITHERED'
    materialer[navn] = mat

modeller = []
rod = None
dele = []

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

def facetter(p, s, mat, trin=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=trin, radius=1, location=punkt(p))
    obj = bpy.context.object
    obj.scale = (s[0], s[2], s[1])
    return tilføj(obj, mat)

def stang(a, b, radius, mat, sider=8):
    a, b = punkt(a), punkt(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=sider, radius=radius, depth=(b - a).length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return tilføj(obj, mat)

def ring(p, radius, tykkelse, mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=20, minor_segments=4, major_radius=radius,
                                   minor_radius=tykkelse, location=punkt(p))
    obj = bpy.context.object
    obj.rotation_euler.x = math.pi / 2
    return tilføj(obj, mat)

# Modeller og låg har ét mesh pr. materiale. Hængslets lokale nulpunkt bevares.
def saml():
    grupper = {navn: [o for o in dele if o.data.materials[0] == mat] for navn, mat in materialer.items()}
    for navn, gruppe in grupper.items():
        if not gruppe:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in gruppe:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = gruppe[0]
        if len(gruppe) > 1:
            bpy.ops.object.join()
        obj = bpy.context.object
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.context.scene.cursor.location = rod.location
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        obj.name = rod.name + '_' + navn

model('fundkrystal')
facetter((0, .46, 0), (.26, .46, .23), 'turkis')
facetter((-.22, .27, .06), (.11, .28, .12), 'violet')
facetter((.21, .20, .035), (.12, .20, .12), 'turkis')
facetter((.04, .29, -.16), (.10, .19, .10), 'violet')
saml()

model('fundkobber')
stang((0, .27, -.028), (0, .27, .028), .25, 'kobber', 24)
ring((0, .27, -.03), .204, .018, 'guld')
for v in range(4):
    a = v * math.pi / 2
    stang((0, .27, -.055), (.115 * math.sin(a), .27 + .115 * math.cos(a), -.055), .018, 'guld', 6)
facetter((0, .27, -.068), (.047, .055, .014), 'turkis')
saml()

model('fundeliksir')
facetter((0, .25, 0), (.22, .25, .20), 'glas', 2)
facetter((0, .215, 0), (.165, .18, .145), 'violet', 2)
stang((0, .4, 0), (0, .57, 0), .083, 'glas', 10)
stang((0, .52, 0), (0, .63, 0), .075, 'prop', 8)
stang((0, .49, 0), (0, .53, 0), .097, 'kobber', 10)
facetter((0, .61, 0), (.06, .037, .06), 'turkis')
saml()

model('fundsegl')
ring((0, .49, 0), .37, .06, 'guld')
for a in range(4):
    v = a * math.pi / 2
    b = v + math.pi / 2
    stang((.37 * math.sin(v), .49 + .37 * math.cos(v), -.018),
          (.37 * math.sin(b), .49 + .37 * math.cos(b), -.018), .032, 'kobber')
facetter((0, .49, -.035), (.20, .30, .11), 'turkis')
for x in [-.37, .37]:
    facetter((x, .49, -.03), (.08, .08, .06), 'turkis')
saml()

model('skattekiste')
kasse((0, .08, 0), (1.46, .16, 1.04), 'træ')
for x in [-.675, .675]:
    kasse((x, .44, 0), (.11, .72, 1.0), 'træ')
for z in [-.455, .455]:
    kasse((0, .44, z), (1.35, .72, .10), 'træ')
for x in [-.50, .50]:
    for z in [-.518, .518]:
        kasse((x, .45, z), (.06, .72, .024), 'kobber')
    kasse((x, .17, 0), (.07, .027, 1.03), 'kobber')
for y in [.14, .78]:
    for z in [-.514, .514]:
        kasse((0, y, z), (1.44, .038, .026), 'kobber')
kasse((0, .62, -.523), (.19, .23, .045), 'kobber')
facetter((0, .62, -.556), (.07, .083, .022), 'turkis')
saml()

# Den åbne bund er en rigtig beholder. Låget drejer positivt om X ved sin bagkant.
kiste = rod
rod = bpy.data.objects.new('kistelåg', None)
rod.location = punkt((0, .80, .455))
rod.parent = kiste
bpy.context.collection.objects.link(rod)
dele = []
for i in range(7):
    z = -.455 + (i - 3) * .147
    y = .08 + .09 * math.cos((i - 3) / 3 * math.pi / 2)
    kasse((0, y, z), (1.46, .115, .153), 'træ')
for x in [-.50, .50]:
    for i in range(7):
        z = -.455 + (i - 3) * .147
        y = .08 + .09 * math.cos((i - 3) / 3 * math.pi / 2)
        kasse((x, y + .062, z), (.065, .027, .153), 'kobber')
saml()

bpy.ops.object.select_all(action='DESELECT')
for modelrod in modeller:
    modelrod.select_set(True)
    for obj in modelrod.children_recursive:
        obj.select_set(True)
os.makedirs(os.path.dirname(UD), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=UD, export_format='GLB', use_selection=True, export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(MAPPE, 'fund.blend'))
print('KRYSTAL_FUND_KLAR', UD)
