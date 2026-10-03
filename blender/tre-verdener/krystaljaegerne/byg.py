"""Originale lavpolygonmodeller og forside til Krystaljægerne. Kør i Blender."""
import bpy, math, os, random
from mathutils import Vector

ROD = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../spil/krystaljaegerne'))
os.makedirs(os.path.join(ROD, 'modeller'), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# En lille fælles farvepalet giver eventyret sin kobber- og krystalstil.
farver = {'kobber': '#aa6247', 'turkis': '#43ddcf', 'violet': '#ac74ed', 'sten': '#577084',
          'mørk': '#25354c', 'blad': '#356c64', 'lystblad': '#70a582', 'træ': '#79594b',
          'guld': '#ecc986', 'hud': '#ecc3a4', 'kappe': '#376d87', 'hvid': '#d4e5de', 'jord': '#46605c'}
materialer = {}
for navn, hex in farver.items():
    mat = bpy.data.materials.new(navn)
    mat.diffuse_color = tuple(int(hex[i:i+2], 16)/255 for i in (1, 3, 5)) + (1,)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = mat.diffuse_color
    bsdf.inputs['Roughness'].default_value = .72
    if navn in ['turkis', 'violet']:
        bsdf.inputs['Emission Color'].default_value = mat.diffuse_color
        bsdf.inputs['Emission Strength'].default_value = .35
    materialer[navn] = mat

rod = None
modeller = []
def model(navn):
    global rod
    rod = bpy.data.objects.new(navn, None)
    bpy.context.collection.objects.link(rod)
    modeller.append(rod)
    return rod

def delnavn(obj, mat, navn=None):
    obj.data.materials.append(materialer[mat])
    obj.parent = rod
    if navn: obj.name = navn
    return obj

def kube(p, s, mat, navn=None, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    obj = bpy.context.object
    obj.scale = s
    if rotation: obj.rotation_euler = rotation
    return delnavn(obj, mat, navn)

def kugle(p, s, mat, navn=None, trin=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=trin, radius=1, location=p)
    obj = bpy.context.object
    obj.scale = s
    return delnavn(obj, mat, navn)

def kegle(p, r, h, mat, top=0, sider=6, navn=None):
    bpy.ops.mesh.primitive_cone_add(vertices=sider, radius1=r, radius2=top, depth=h, location=p)
    return delnavn(bpy.context.object, mat, navn)

def stang(a, b, radius, mat):
    mid = (Vector(a)+Vector(b))/2
    obj = kegle(mid, radius, (Vector(b)-Vector(a)).length, mat, top=radius, sider=6)
    obj.rotation_euler = (Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler()
    return obj

# Eventyrerens adskilte lemmer kan bevæges direkte af spillet.
model('eventyrer')
kugle((0, 0, 1.45), (.32,.28,.33), 'hud', 'hoved', 2)
kugle((0,.045,1.61), (.34,.29,.18), 'mørk', 'hår', 1)
kube((0,0,1), (.57,.35,.65), 'kappe', 'krop')
kube((0,.2,.94), (.65,.08,.8), 'kobber', 'kappe')
kube((-.39,0,1), (.18,.23,.55), 'hud', 'armVenstre')
kube((.39,0,1), (.18,.23,.55), 'hud', 'armHøjre')
kube((-.16,0,.37), (.2,.24,.67), 'mørk', 'benVenstre')
kube((.16,0,.37), (.2,.24,.67), 'mørk', 'benHøjre')
kube((0,-.19,1.0), (.62,.045,.12), 'guld')
for x in [-.11,.11]: kugle((x,-.26,1.45), (.035,.025,.04), 'mørk')

model('følgesvend')
kugle((0,0,.5), (.32,.36,.35), 'turkis', 'krop', 2)
for x in [-.14,.14]: kugle((x,-.31,.58), (.045,.035,.055), 'mørk')
for x in [-.3,.3]: kegle((x,0,.58), .1,.48,'guld', top=.01, navn='vinge')
kegle((0,0,.98), .16,.3,'violet')

model('stenvogter')
kube((0,0,1.1), (.85,.55,1.0), 'sten', 'krop')
kugle((0,0,1.9), (.4,.34,.36), 'sten', 'hoved', 1)
for x in [-.6,.6]:
    kugle((x,0,1.3), (.3,.32,.35), 'kobber', 'skulder')
    kube((x,0,.85), (.32,.36,.7), 'sten', 'armVenstre' if x<0 else 'armHøjre')
for x in [-.24,.24]: kube((x,0,.32), (.35,.45,.65), 'mørk', 'benVenstre' if x<0 else 'benHøjre')
for x in [-.13,.13]: kube((x,-.345,1.92), (.12,.045,.06), 'turkis')
kegle((0,-.29,1.15), .19,.42,'turkis')

model('slim')
kugle((0,0,.42), (.63,.58,.48),'violet','krop',2)
for x in [-.18,.18]: kugle((x,-.51,.53),(.08,.04,.08),'hvid')

model('krystaldyr')
kugle((0,0,.62), (.4,.7,.42),'turkis','krop',1)
kugle((0,-.58,.87),(.28,.36,.3),'sten','hoved',1)
for x in [-.25,.25]:
    for y in [-.4,.4]: kube((x,y,.22),(.12,.16,.44),'mørk','ben')
for y in [-.2,.15,.45]: kegle((0,y,1.12),.15,.6,'violet')
for x in [-.17,.17]: kegle((x,-.62,1.17),.07,.38,'guld')

model('sværd')
kube((0,0,.7),(.11,.05,.85),'hvid')
kegle((0,0,1.2),.08,.18,'hvid',sider=4)
kube((0,0,.27),(.44,.09,.09),'kobber')
kube((0,0,.12),(.09,.09,.26),'mørk')

model('bue')
punkter = [(-.24,0,0),(-.4,0,.2),(-.46,0,.5),(-.4,0,.8),(-.24,0,1)]
for a,b in zip(punkter, punkter[1:]): stang(a,b,.05,'kobber')
stang(punkter[0],punkter[-1],.012,'hvid')
stang((-.3,0,.5),(.45,0,.5),.025,'guld')

model('stav')
stang((0,0,0),(0,0,1.1),.05,'træ')
kegle((0,0,1.32),.2,.45,'violet')
for x in [-.18,.18]: stang((0,0,1),(x,0,1.35),.035,'kobber')

model('hus')
kube((0,0,1.2),(3.5,3,2.4),'hvid')
kube((0,-1.52,.8),(.7,.06,1.6),'træ')
for x in [-1.1,1.1]: kube((x,-1.53,1.5),(.55,.06,.65),'turkis')
for x in [-1.75,1.75]: kube((x,0,1.25),(.15,3.1,2.5),'træ')
for x, ang in [(-1, -.53),(1,.53)]: kube((x,0,2.75),(2.25,3.6,.22),'kobber',rotation=(0,ang,0))
kube((1.0,.7,3.2),(.5,.5,1.5),'sten')

model('tårn')
kegle((0,0,2),1.3,4,'sten',top=1.1,sider=8)
kegle((0,0,4.6),1.65,1.7,'kobber',sider=8)
for z in [1.5,2.9]: kube((0,-1.21,z),(.42,.05,.55),'turkis')

model('brønd')
kegle((0,0,.4),.8,.8,'sten',top=.8,sider=8)
kegle((0,0,.81),.6,.03,'turkis',top=.6,sider=8)
for x in [-.85,.85]: stang((x,0,.5),(x,0,2.1),.07,'træ')
kube((0,0,2),(2.1,1.2,.16),'kobber',rotation=(0,.15,0))

model('træ')
kegle((0,0,1),.2,2,'træ',top=.12)
for z,r in [(1.7,1.3),(2.5,1.0),(3.2,.7)]: kegle((0,0,z),r,1.6,'blad' if z<3 else 'lystblad')

model('birk')
stang((0,0,0),(.15,0,2.8),.14,'hvid')
for p,s in [((0,0,2.5),(1.1,.9,.8)),((.6,0,3.1),(.8,.7,.7)),((-.5,.1,3.1),(.7,.8,.8))]: kugle(p,s,'lystblad',trin=1)

model('klippe')
kugle((0,0,.5),(1.25,1.1,.9),'sten',trin=1)
kugle((.4,.4,1.1),(.6,.7,.65),'sten',trin=1)

model('krystal')
for p,r,h,mat in [((0,0,1),.38,2,'turkis'),((.5,.2,.62),.27,1.24,'violet'),((-.38,-.2,.45),.2,.9,'turkis')]:
    kegle(p,r,h,mat,top=r*.5)
    kegle((p[0],p[1],p[2]+h*.6),r*.5,h*.2,mat)

model('søjle')
kube((0,0,.18),(1,1,.36),'sten')
kegle((0,0,1.8),.32,3.2,'sten',top=.32,sider=8)
kube((0,0,3.45),(.9,.9,.35),'kobber')

model('ruinbue')
for x in [-1.3,1.3]: kube((x,0,1.6),(.7,.8,3.2),'sten')
for x in [-.7,0,.7]: kube((x,0,3.3),(.7,.9,.6),'kobber',rotation=(0,x*.22,0))

model('kiste')
kube((0,0,.4),(1,.65,.6),'træ')
kugle((0,0,.65),(.5,.325,.25),'kobber',trin=1)
for x in [-.32,.32]: kube((x,-.34,.42),(.1,.06,.65),'guld')
kube((0,-.36,.5),(.17,.05,.2),'turkis')

model('portal')
for i in range(12):
    a=i*math.tau/12
    kube((math.cos(a)*1.55,0,math.sin(a)*1.55+1.7),(.5,.45,.65),'kobber',rotation=(0,math.pi/2-a,0))
for x in [-2,2]: kegle((x,0,.65),.32,1.3,'violet')

model('gulvmodul')
kube((0,0,-.25),(8,8,.5),'sten')
for x in [-3,-1,1,3]:
    for y in [-3,-1,1,3]: kube((x,y,.005),(1.92,1.92,.03),'mørk')

model('vægmodul')
kube((0,0,1.5),(8,.8,3),'sten')
for x in [-3,-1,1,3]: kube((x,-.44,1.5),(1.85,.06,2.85),'mørk')

model('terrænmodul')
kugle((0,0,-.8),(5,5,1),'jord',trin=2)

# Saml statiske modeller til få mesh-dele; karakterernes navne bevares.
for m in modeller:
    if m.name in ['eventyrer','følgesvend','stenvogter','slim','krystaldyr']: continue
    bpy.ops.object.select_all(action='DESELECT')
    dele=list(m.children)
    for obj in dele: obj.select_set(True)
    bpy.context.view_layer.objects.active=dele[0]
    bpy.ops.object.join()
    dele[0].name=m.name+'_mesh'

# GLB bruger Y op som Three.js. Alle biblioteksmodeller har samme lokale nulpunkt.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(ROD,'modeller','eventyr.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True)

# Forsiden bygges af de samme originale modeller, sat op som en lille eventyrscene.
for m in modeller:
    m.hide_render=True
    for obj in m.children: obj.hide_render=True
rod=None
def kopi(navn, p, s=1, drej=0):
    src=next(m for m in modeller if m.name==navn)
    ny=bpy.data.objects.new('forside_'+navn,None)
    bpy.context.collection.objects.link(ny)
    ny.location=p; ny.scale=(s,s,s); ny.rotation_euler.z=drej
    for obj in src.children:
        cp=obj.copy(); cp.data=obj.data
        bpy.context.collection.objects.link(cp); cp.parent=ny; cp.hide_render=False
    return ny
model('forsideø')
kugle((0,0,-2),(13,10,2.2),'jord',trin=2)
kopi('hus',(-5,2,0),1.1)
kopi('tårn',(-7,4,0),1.1)
kopi('brønd',(-4,-1,0),1)
kopi('portal',(5,3,0),1.6)
for p in [(4,2,0),(7,0,0),(6,5,0),(-1,3,0),(2,-4,0)]: kopi('krystal',p,1.2)
for p in [(-8,-2,0),(-7,-4,0),(-9,2,0),(0,6,0),(2,7,0),(-4,6,0)]: kopi('træ',p,1.25)
for p in [(1,1,0),(3,4,0),(6,-3,0)]: kopi('klippe',p,.8)
kopi('ruinbue',(3,4,0),1.3)
kopi('stenvogter',(3,.5,0),1.6,-.5)
kopi('eventyrer',(0,-4,0),1.8,.1)
kopi('sværd',(.7,-4,1),1.5,-.2)
kopi('følgesvend',(-1.4,-3.2,1),1.1)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=1200;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.world.color=(.06,.08,.12)
bpy.ops.object.light_add(type='AREA',location=(-6,-7,16))
bpy.context.object.data.energy=2300;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=12
bpy.ops.object.light_add(type='AREA',location=(8,2,10))
bpy.context.object.data.energy=1800;bpy.context.object.data.color=(.35,.85,1);bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(18,-27,22))
cam=bpy.context.object;cam.rotation_euler=(Vector((0,1,1))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=27;scene.camera=cam
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.quality=92
scene.render.filepath=os.path.join(ROD,'forside.jpg')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),'krystaljaegerne.blend'))
bpy.ops.render.render(write_still=True)
