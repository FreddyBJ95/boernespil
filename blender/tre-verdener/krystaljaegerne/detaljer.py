"""Originale landmærker, naturdetaljer og grotterequisitter til Krystaljægerne."""
import bpy, math, os
from mathutils import Vector

ROD = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../spil/krystaljaegerne'))
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

# Farverne konverteres fra skærmfarver, så kobberet forbliver varmt i GLB og render.
palet = {'kobber':'#b46b46','træ':'#745b49','mørk':'#25394c','turkis':'#66ead4',
         'violet':'#aa84ed','guld':'#e6c788','blad':'#4b8b72','hvid':'#d5ded5','sten':'#667c87','blomst':'#e3b8a3'}
materialer={}
def lineær(v):
  v=v/255
  return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
for n,h in palet.items():
  m=bpy.data.materials.new(n);m.use_nodes=True
  farve=tuple(lineær(int(h[i:i+2],16)) for i in (1,3,5))+(1,)
  m.diffuse_color=farve;p=m.node_tree.nodes.get('Principled BSDF')
  p.inputs['Base Color'].default_value=farve;p.inputs['Roughness'].default_value=.78
  if n in ['turkis','violet']:
    p.inputs['Emission Color'].default_value=farve;p.inputs['Emission Strength'].default_value=.7
  materialer[n]=m
rod=None;modeller=[]
def model(n):
  global rod
  rod=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(rod);modeller.append(rod)
def færdig(o,mat):
  o.parent=rod;o.data.materials.append(materialer[mat]);return o
def kube(p,s,mat,rotation=None):
  bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
  if rotation:o.rotation_euler=rotation
  return færdig(o,mat)
def kugle(p,s,mat,trin=1):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=trin,radius=1,location=p);o=bpy.context.object;o.scale=s;return færdig(o,mat)
def kegle(p,r,h,mat,top=0,sider=8):
  bpy.ops.mesh.primitive_cone_add(vertices=sider,radius1=r,radius2=top,depth=h,location=p);return færdig(bpy.context.object,mat)
def stang(a,b,r,mat):
  a=Vector(a);b=Vector(b);o=kegle((a+b)/2,r,(a-b).length,mat,top=r,sider=6);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def ring(p,r,tyk,mat,drej=None):
  bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=tyk,major_segments=16,minor_segments=4,location=p)
  o=bpy.context.object
  if drej:o.rotation_euler=drej
  return færdig(o,mat)

model('lanterne')
stang((0,0,0),(0,0,2.8),.07,'kobber');stang((0,0,2.8),(.5,0,3),.055,'kobber');stang((.5,0,3),(.65,0,2.7),.05,'kobber')
kegle((.65,0,2.65),.3,.22,'kobber',top=.12);kube((.65,0,2.28),(.35,.32,.6),'turkis')
kegle((.65,0,1.94),.26,.16,'kobber',top=.3)
for x in [.44,.86]:stang((x,-.18,2),(x,-.18,2.57),.025,'mørk')
ring((0,0,.12),.3,.04,'guld')

model('vejviser')
stang((0,0,0),(0,0,2.45),.09,'træ')
for z,s,mat in [(2.2,1,'turkis'),(1.7,-1,'violet'),(1.2,1,'kobber')]:
  kube((s*.18,0,z),(1.2,.13,.32),'træ')
  kube((s*.8,0,z),(.36,.14,.32),mat,rotation=(0,math.pi/4,0))
kegle((0,0,2.6),.16,.3,'guld')

model('bænk')
for x in [-.75,.75]:
  kube((x,0,.3),(.15,.8,.6),'kobber');kube((x,.35,.85),(.13,.13,1.1),'træ')
for y in [-.3,0,.3]:kube((0,y,.63),(1.9,.22,.12),'træ')
for z in [.85,1.12]:kube((0,.38,z),(1.9,.13,.18),'træ')

model('markedsvogn')
kube((0,0,.9),(2,1.3,.45),'træ')
for x in [-.8,.8]:
  for y in [-.65,.65]:ring((x,y,.45),.4,.09,'mørk',drej=(math.pi/2,0,0))
for x in [-1,1]:
  for y in [-.65,.65]:stang((x,y,1),(x,y,2.5),.04,'kobber')
for x in [-.9,-.3,.3,.9]:kube((x,0,2.53),(.6,1.8,.1),'kappe' if 'kappe' in materialer else ('turkis' if x<0 else 'hvid'))
for x in [-.6,.1,.65]:
  kube((x,0,1.2),(.38,.5,.2),'kobber');kugle((x,0,1.45),(.16,.2,.2),'violet')
stang((0,.65,.7),(0,1.7,.6),.06,'træ')

model('lejr')
for x in [-.7,.7]:kube((x,.1,.7),(.13,2,1.8),'hvid',rotation=(0,-x*.9,0))
stang((0,-1,0),(0,-1,1.55),.05,'træ');stang((0,1,0),(0,1,1.55),.05,'træ')
for a in [0,1.7,3.4]:
  stang((math.cos(a)*.7,-2+math.sin(a)*.7,.08),(-math.cos(a)*.7,-2-math.sin(a)*.7,.08),.09,'træ')
kegle((0,-2,.4),.3,.7,'turkis')
for i in range(7):kugle((math.cos(i*math.tau/7)*.58,-2+math.sin(i*math.tau/7)*.58,.12),(.18,.18,.12),'sten')

model('svampe')
for x,y,z,r in [(-.3,0,.55,.36),(.3,.15,.35,.23),(.08,-.3,.23,.18)]:
  stang((x,y,0),(x,y,z),.055,'hvid');kugle((x,y,z),(r,r,r*.4),'violet',2)
  for a in [0,2,4]:kugle((x+math.cos(a)*r*.6,y+math.sin(a)*r*.6,z+r*.3),(.04,.04,.02),'guld')

model('blomster')
for x,y,z in [(-.25,0,.42),(.25,.15,.58),(0,-.2,.35)]:
  stang((x,y,0),(x,y,z),.025,'blad')
  for a in range(5):kugle((x+math.cos(a*math.tau/5)*.11,y+math.sin(a*math.tau/5)*.11,z),(.095,.095,.045),'blomst')
  kugle((x,y,z+.02),(.055,.055,.055),'guld')
  kugle((x+.1,y,.19),(.15,.05,.03),'blad')

model('faldetstamme')
stang((-1,0,.24),(1,0,.24),.26,'træ')
for x in [-1,1]:kegle((x,0,.24),.25,.045,'guld',top=.25).rotation_euler.y=math.pi/2
stang((.3,0,.38),(.55,.3,.65),.1,'træ')
for x in [-.6,.2,.5]:kugle((x,0,.45),(.24,.2,.065),'blad')

model('ruintavle')
kube((0,0,.1),(1.1,.75,.2),'sten');kube((0,0,.8),(.95,.32,1.4),'sten',rotation=(0,.05,0))
ring((0,-.18,.92),.28,.025,'turkis',drej=(math.pi/2,0,0))
for a in range(3):stang((math.cos(a*math.tau/3)*.18,-.18,.92+math.sin(a*math.tau/3)*.18),(0,-.18,.92),.025,'guld')

model('statue')
kube((0,0,.15),(1.6,1.6,.3),'sten');kegle((0,0,.9),.5,1.5,'kobber',top=.32)
kugle((0,0,1.85),(.56,.48,.58),'sten',2)
for x in [-.2,.2]:kube((x,-.46,1.98),(.12,.04,.1),'turkis')
kegle((0,0,2.52),.2,.6,'violet')
for x in [-.65,.65]:stang((x,0,.9),(x*.8,0,1.8),.13,'sten')

model('grottepille')
kube((0,0,.2),(.75,.75,.4),'kobber');stang((0,0,.4),(.08,0,2.9),.22,'sten')
kube((.08,0,3),(.65,.65,.3),'kobber');kegle((.08,0,3.4),.18,.55,'turkis')
for z in [1,1.5,2]:ring((0,0,z),.235,.035,'guld')

model('lyssøjle')
kube((0,0,.12),(1,1,.24),'mørk');kegle((0,0,.62),.32,1,'kobber',top=.24)
ring((0,0,1.15),.48,.075,'guld')
for a in range(3):
  x=math.cos(a*math.tau/3)*.27;y=math.sin(a*math.tau/3)*.27
  kegle((x,y,1.47),.13,.6,'violet');kegle((x,y,1.83),.065,.12,'violet')

model('havn')
for y in [-2,-1.6,-1.2,-.8,-.4,0,.4,.8,1.2,1.6,2]:kube((0,y,.1),(2.7,.32,.2),'træ')
for x in [-1.15,1.15]:
  for y in [-1.7,1.7]:stang((x,y,-1.5),(x,y,.9),.09,'træ')
stang((1.15,-1.7,.8),(1.15,1.7,.8),.035,'kobber')
for y in [-1.5,-1,-.5,0,.5,1,1.5]:kube((3,y,-.25),(1.25,.4,.25),'kobber')
for x in [2.4,3.6]:kube((x,0,-.12),(.12,3.5,.42),'træ',rotation=(0,0,(-.08 if x<3 else .08)))
stang((3,0,-.1),(3,0,2.2),.05,'træ');kube((3.65,0,1.5),(1.1,.05,1.25),'hvid')

# Statisk geometri samles per materiale for at dele instanser effektivt.
for m in modeller:
  dele=list(m.children)
  grupper={}
  for o in dele:grupper.setdefault(o.data.materials[0].name,[]).append(o)
  for n,g in grupper.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in g:o.select_set(True)
    bpy.context.view_layer.objects.active=g[0];bpy.ops.object.join();bpy.context.object.name=m.name+'_'+n
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(ROD,'modeller','detaljer.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),'detaljer.blend'))
print('KRYSTALJÆGERNE: 13 originale detaljemodeller er eksporteret')
