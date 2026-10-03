"""Skrotstorm: egne modeller, terræn og forside. Kør med Blender --background."""
import bpy, math, random, os
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
UD = os.path.join(ROOT, 'spil', 'skrotstorm')
os.makedirs(os.path.join(UD, 'modeller'), exist_ok=True)
random.seed(742)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Matte metaller, varmt sand og turkis emalje giver en rolig, sammenhængende verden.
def materiale(navn, farve, metal=0, ruhed=0.75, lys=0):
  m = bpy.data.materials.new(navn)
  m.diffuse_color = (*farve, 1)
  m.use_nodes = True
  p = m.node_tree.nodes.get('Principled BSDF')
  p.inputs['Base Color'].default_value = (*farve, 1)
  p.inputs['Metallic'].default_value = metal
  p.inputs['Roughness'].default_value = ruhed
  if lys:
    p.inputs['Emission Color'].default_value = (*farve, 1)
    p.inputs['Emission Strength'].default_value = lys
  return m

SAND = materiale('Gyldent sand', (0.56, 0.34, 0.16))
KLIPPE = materiale('Terracotta klippe', (0.42, 0.22, 0.12))
VEJ = materiale('Slidt asfalt', (0.10, 0.115, 0.115))
MØRK = materiale('Mørkt jern', (0.055, 0.08, 0.08), .55)
RUST = materiale('Rust', (0.38, 0.12, 0.045), .3)
ORANGE = materiale('Orange emalje', (0.92, 0.34, 0.075), .25)
TURKIS = materiale('Turkis emalje', (0.06, 0.52, 0.48), .4)
CREME = materiale('Creme markering', (0.91, 0.77, 0.43))
GLAS = materiale('Blå glas', (0.065, 0.19, 0.23), .7, .21)
LYS = materiale('Varmt lys', (1.0, .68, .22), .1, .3, 2)
SOL = materiale('Solceller', (.055, .14, .24), .5, .35)
GUMMI = materiale('Gummi', (.023, .035, .038), .05)
STÅL = materiale('Børstet stål', (.46, .53, .5), .75)
GRØN = materiale('Støvet salvie', (.23, .33, .19))

def pos(x, y, z): return (x, -z, y)
def ter(x, z):
  def bakke(cx, cz, h, r): return h * math.exp(-((x-cx)**2+(z-cz)**2)/(r*r))
  return bakke(400,-170,110,85)+bakke(420,120,125,95)+bakke(180,-360,65,80)+bakke(-390,-340,42,85)

def cube(n, x, y, z, sx, sy, sz, m, rotation=0, bevel=0):
  bpy.ops.mesh.primitive_cube_add(size=1, location=pos(x,y,z))
  o=bpy.context.object; o.name=n; o.scale=(sx,sz,sy); o.rotation_euler[2]=-rotation
  bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
  o.data.materials.append(m)
  if bevel:
    b=o.modifiers.new('Små metalrundinger','BEVEL'); b.width=bevel; b.segments=1
    bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=b.name)
  return o

def cyl(n,x,y,z,r,h,m,vertices=12):
  bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=h, location=pos(x,y,z))
  o=bpy.context.object; o.name=n; o.data.materials.append(m); return o

def mesh(n, verts, faces, m):
  d=bpy.data.meshes.new(n); d.from_pydata([pos(*v) for v in verts],[],[tuple(reversed(f)) for f in faces]); d.update()
  o=bpy.data.objects.new(n,d); bpy.context.collection.objects.link(o); o.data.materials.append(m); return o

def rør(n,a,b,r,m):
  av=Vector(pos(*a)); bv=Vector(pos(*b)); mid=(av+bv)/2
  bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=(bv-av).length,location=mid)
  o=bpy.context.object;o.name=n;o.rotation_euler=(bv-av).to_track_quat('Z','Y').to_euler();o.data.materials.append(m);return o

def tekst(n,tekstværdi,x,y,z,size,m,rotation=0):
  bpy.ops.object.text_add(location=pos(x,y,z));o=bpy.context.object;o.name=n;o.data.body=tekstværdi;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.012
  o.rotation_euler=(math.pi/2,0,math.pi-rotation);o.data.materials.append(m)
  bpy.ops.object.convert(target='MESH');return bpy.context.object

def join_materialer(objekter, præfiks):
  grupper={}
  for o in objekter:
    if o.type=='MESH' and o.data.materials: grupper.setdefault(o.data.materials[0].name,[]).append(o)
  resultat=[]
  for navn, gruppe in grupper.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in gruppe:o.select_set(True)
    bpy.context.view_layer.objects.active=gruppe[0];bpy.ops.object.join();o=bpy.context.object;o.name=præfiks+'_'+navn;resultat.append(o)
  return resultat

def eksport(navn,objekter):
  bpy.ops.object.select_all(action='DESELECT')
  for o in objekter:o.select_set(True)
  bpy.ops.export_scene.gltf(filepath=os.path.join(UD,'modeller',navn+'.glb'),export_format='GLB',use_selection=True,export_yup=True,export_cameras=False,export_lights=False)

# Terrain er et enkelt facetteret mesh. Store bjergsider står uden for hovedruten.
verts=[];faces=[];n=65
for j in range(n):
  z=-420+j*840/(n-1)
  for i in range(n):
    x=-450+i*900/(n-1);verts.append((x,ter(x,z)-.12,z))
for j in range(n-1):
  for i in range(n-1):
    a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
mesh('Ørken med bjergmassiver',verts,faces,SAND)
RUTER=[
  (25,[[-275,0,220],[-345,0,80],[-325,0,-140],[-245,0,-230],[-70,0,-265],[95,5,-240],[215,30,-175],[300,57,-85],[330,72,45],[265,58,150],[160,27,220],[20,0,265],[-155,0,265],[-275,0,220]]),
  (21,[[-325,0,-140],[-170,0,-130],[-20,0,-190],[-70,0,-265]]),
  (23,[[-275,0,220],[-170,0,80],[-90,0,-40],[-170,0,-130]]),
  (22,[[-170,0,80],[-30,0,75],[80,12,100],[160,27,220]]),
  (24,[[-90,0,-40],[20,0,-35],[105,0,-25],[180,0,30],[210,0,100]]),
  (20,[[-155,0,265],[-110,0,190],[20,0,265]])]
for bredde,punkter in RUTER:
  for a,b in zip(punkter,punkter[1:]):
    dx=b[0]-a[0];dz=b[2]-a[2];l=math.hypot(dx,dz);nx=-dz/l;nz=dx/l
    vs=[(a[0]+nx*bredde/2,a[1]+.08,a[2]+nz*bredde/2),(a[0]-nx*bredde/2,a[1]+.08,a[2]-nz*bredde/2),(b[0]-nx*bredde/2,b[1]+.08,b[2]-nz*bredde/2),(b[0]+nx*bredde/2,b[1]+.08,b[2]+nz*bredde/2)]
    mesh('Asfaltvej',vs,[(0,1,2,3)],VEJ)
    # Dæmning under høje veje og bropiller gør højden synlig.
    if max(a[1],b[1])>4:
      for t in [.15,.5,.85]:
        x=a[0]+dx*t;z=a[2]+dz*t;y=a[1]+(b[1]-a[1])*t
        cyl('Broens søjle',x,y/2,z,2.2,max(1,y),RUST,8)
      for side in [-1,1]:
        rør('Sikkerhedsrækværk',(a[0]+nx*(bredde/2-.5)*side,a[1]+1.5,a[2]+nz*(bredde/2-.5)*side),(b[0]+nx*(bredde/2-.5)*side,b[1]+1.5,b[2]+nz*(bredde/2-.5)*side),.2,TURKIS)
    for t in range(0,int(l),15):
      u=min(1,(t+2)/l);x=a[0]+dx*u;z=a[2]+dz*u;y=a[1]+(b[1]-a[1])*u
      cube('Midterstribe',x,y+.12,z,.45,.05,4.5,CREME,math.atan2(dx,dz))
    cyl('Vejknude',a[0],a[1]+.04,a[2],bredde/2,.08,VEJ,16)

# Garage med profileret bliktag, løftekran, skilte og synlige reservedele.
cube('Garagebygning',-280,6,256,28,12,25,TURKIS,bevel=.3)
cube('Garageport',-280,4.5,243.35,13,8.5,.35,MØRK)
cube('Dørkarm',-280,9,243,16,1,.7,ORANGE)
for x in [-288,-272]:cube('Portstolpe',x,4.4,243,1,9,1,ORANGE)
cube('Profileret tag',-280,12.3,256,32,1,29,RUST)
for x in range(-295,-264,3):cube('Tagribbe',x,12.9,256,.3,.35,29,ORANGE)
tekst('Garageskilt','SKROTSTORM',-280,10.4,242.55,2.4,CREME)
tekst('Undertekst','DEN BLA GARAGE',-280,2,243,1.05,TURKIS)
cube('Garageplads',-275,.025,220,51,.05,40,MØRK)
for x,z in [(-302,236),(-258,240),(-309,220)]:
  cyl('Tønde',x,1.1,z,1.1,2.2,ORANGE);cyl('Tøndelåg',x,2.25,z,1.15,.15,MØRK)
for i in range(8):
  x=-299+(i%2)*2.4;z=247+(i//2)*2
  cyl('Ekstra dæk',x,.55,z,1.1,1.1,GUMMI)
rør('Kran mast',(-255,0,250),(-255,17,250),.5,RUST)
rør('Kranarm',(-255,17,250),(-273,17,235),.45,ORANGE)
rør('Kranwire',(-273,17,235),(-273,8,235),.07,MØRK)
cube('Kranens krog',-273,8,235,.8,1.4,.8,STÅL)
for x in [-296,-262]:
  cyl('Garagelampe',x,4,237,.18,8,MØRK)
  cube('Lampelys',x,8,237,1.3,.5,1.3,LYS)

# Industribyen: siloer, rør, tårne og store facetterede fabriksbygninger.
for x,z,sx,sz,h in [(-185,-182,31,27,15),(-115,-195,27,24,12),(15,-217,31,33,19)]:
  cube('Fabrik',x,h/2,z,sx,h,sz,RUST,bevel=.4)
  cube('Fabrikstag',x,h+.7,z,sx+2,1.4,sz+2,ORANGE)
  for xx in range(int(x-sx/2+3),int(x+sx/2-2),5):cube('Fabriksrude',xx,h*.7,z+sz/2+.1,2.8,3,.3,GLAS)
  for zz in [-7,0,7]:cube('Støttebjælke',x-sx/2-.3,h/2,z+zz,.6,h,.6,MØRK)
for x,z in [(-28,-236),(46,-252),(-138,-224)]:
  cyl('Silo',x,13,z,8,26,STÅL,12)
  cyl('Silokant',x,22,z,8.25,.6,RUST,12)
  rør('Silorør',(x,18,z),(x+20,18,z+10),.8,TURKIS)
for x,z in [(15,-230),(-190,-190)]:
  cyl('Skorsten',x,33,z,2.4,38,RUST,10)
  cyl('Skorstenring',x,48,z,2.6,1,CREME,10)
tekst('Fabriksskilt','KURER · DELE',-16,6,-205,2,CREME)

# Skrotpladsens bunker, nummererede containere og gamle chassis.
for i in range(18):
  x=random.uniform(-309,-261);z=random.uniform(-221,-172)
  cube('Skrotplade',x,random.uniform(.7,2.4),z,random.uniform(2,4),random.uniform(.6,2),random.uniform(2,4),RUST,random.uniform(0,3),.15)
for x,z in [(-312,-183),(-264,-213)]:
  cube('Skrotcontainer',x,2.5,z,8,5,16,TURKIS)
  for zz in range(-7,8,3):cube('Containerprofil',x-4.1,2.5,z+zz,.2,5,.4,MØRK)
for x,z in [(-286,-215),(-302,-189)]:
  cube('Gammelt chassis',x,1.3,z,5,1,9,ORANGE,random.random());cube('Gammel motor',x,2.2,z,3,1.8,3,MØRK)
tekst('Skrotplads skilt','FIND · BYG · KOR',-278,5,-226,1.5,CREME)

# Solstation og udsigtstårn er dalens to tydelige landemærker.
cube('Solstation',-98,4,218,18,8,18,TURKIS)
for ix in range(4):
  for iz in range(3):
    x=-136+ix*13;z=151+iz*13
    o=cube('Solpanel',x,3,z,10,.35,8,SOL);o.rotation_euler[0]=math.radians(18)
    rør('Panelstativ',(x,0,z),(x,3,z),.25,STÅL)
    cube('Panelsamling',x,3.5,z,.1,.05,8,CREME)
for x,z in [(346,19)]:
  y=72;cyl('Tårn sokkel',x,y+2,z,8,4,MØRK,12)
  for dx,dz in [(-4,-4),(4,-4),(-4,4),(4,4)]:rør('Tårnben',(x+dx,y,z+dz),(x+dx*.4,y+30,z+dz*.4),.45,TURKIS)
  for yy in [8,16,24]:
    rør('Tårnkryds',(x-4,y+yy,z-4),(x+4,y+yy+8,z-4),.22,ORANGE)
    cube('Tårnplatform',x,y+yy,z,10,.7,10,MØRK)
  cyl('Stormlygte',x,y+34,z,3,7,LYS,16)
  cyl('Lygtetag',x,y+38,z,4,1.3,TURKIS,16)

# To rigtige kileformede ramper med synlige afstivninger.
for x,z,v,b,l,h in [(75,-29,math.pi/2,14,32,6),(-155,190,0,12,28,4)]:
  s=math.sin(v);c=math.cos(v)
  def p(t,side,y):return (x+s*t+c*side,y,z+c*t-s*side)
  vs=[p(-l/2,-b/2,.05),p(-l/2,b/2,.05),p(l/2,b/2,h),p(l/2,-b/2,h),p(l/2,-b/2,0),p(l/2,b/2,0)]
  mesh('Stuntrampe',vs,[(0,1,2,3),(1,5,2),(0,3,4),(2,5,4,3)],ORANGE)
  for t in range(-int(l/2),int(l/2),4):
    yy=(t/l+.5)*h+.08
    rør('Rampens trin',p(t,-b/2,yy),p(t,b/2,yy),.11,CREME)
  for side in [-1,1]:rør('Rampe gelænder',p(-l/2,side*b/2,1),p(l/2,side*b/2,h+1),.15,TURKIS)

# Garagens åbne værksted er fyldt med egne små ting: værktøj, donkraft og kasser.
cube('Værkstedsbord',-303,1.7,237,10,.35,3.2,STÅL)
for xx in [-307,-299]:
  for zz in [236,238]:cube('Bordben',xx,.8,zz,.25,1.6,.25,RUST)
cube('Værktøjstavle',-303,3.5,239,10,3,.2,TURKIS)
for i in range(6):
  x=-307+i*1.5
  rør('Hængende skruenøgle',(x,2.9,238.8),(x,4.1,238.8),.09,STÅL)
  cyl('Skruenøglens hoved',x,4.2,238.65,.24,.12,STÅL,8)
for x,z in [(-307,235.9),(-304,237),(-300,237)]:
  cube('Reservedelskasse',x,2.2,z,1.4,.7,1.1,ORANGE,bevel=.05)
  cube('Kasseetiket',x,2.2,z-.57,.8,.3,.03,CREME)
cube('Kompressor',-258,1.4,236,3,2,2.5,TURKIS,bevel=.25)
cyl('Trykmåler',-258,2.6,236,.4,.25,CREME)
rør('Luftslange',(-258,1.7,235),(-263,.2,232),.07,MØRK)
cube('Donkraft',-269,.4,233,1.4,.6,2.8,ORANGE)
rør('Donkraftgreb',(-269,.5,231.7),(-269,1.8,229.8),.08,STÅL)
for xx in [-310,-295]:
  rør('Solsejlstolpe',(xx,0,228),(xx,5.5,228),.18,TURKIS)
mesh('Skygge over værksted',[(-312,5.5,228),(-294,5.5,228),(-294,6.1,241),(-312,6.1,241)],[(0,1,2,3)],CREME)
for zz in [228,230,232,234,236,238,240]:
  rør('Solsejlets syning',(-312,5.55,zz),(-294,5.55,zz),.04,ORANGE)
cube('Servicepumpe',-249,1.8,219,2.5,3.6,2.3,ORANGE,bevel=.2)
cube('Pumpedisplay',-249,2.7,217.82,1.6,.8,.08,MØRK)
tekst('Tankdisplay','07',-249,2.55,217.74,.5,LYS)
rør('Pumpeslange',(-250.2,2.3,219),(-251.2,.5,219),.10,MØRK)
cube('Garageflag fod',-252,.4,212,2,.8,2,MØRK)
rør('Garageflag stang',(-252,.8,212),(-252,10,212),.12,STÅL)
mesh('Garagevimpel',[(-252,10,212),(-252,7.5,212),(-246,9.3,212)],[(0,1,2)],TURKIS)
cube('Serviceskilt',-258,6.1,239.3,10,2.1,.3,TURKIS)
tekst('Garagepladsens skilt','SERVICE 07',-258,6,239,1.1,CREME)

# Industrikvarteret får sidegader, små værksteder, porte og en rolig havneplads.
for x,z,navn in [(-240,-90,'MEKANIK'),(-60,-138,'RADIO'),(-220,-280,'DEPOT'),(-330,-230,'SKROT')]:
  cube('Sideværksted',x,4,z,22,8,17,TURKIS,bevel=.15)
  cube('Værkstedstag',x,8.5,z,25,.8,20,RUST)
  cube('Butiksport',x,2.8,z+8.7,8,5.5,.25,MØRK)
  cube('Portoverligger',x,6,z+8.85,10,.55,.3,ORANGE)
  tekst('Værkstedets navn',navn,x,6.7,z+8.9,1.2,CREME,math.pi)
  for side in [-1,1]:
    cube('Værkstedsvindue',x+side*7,4,z+8.7,3,2.6,.2,GLAS)
    cube('Varm rude',x+side*7,3.8,z+8.85,2.1,.18,.06,LYS)
  cube('Ventilator',x+8,6.4,z-8.7,2.4,2.4,.5,MØRK)
  for yy in [5.6,6.2,6.8,7.4]:cube('Ventilatorlamel',x+8,yy,z-9,.12,.08,.7,STÅL)
for x,z,sx,sz,h in [(-185,-182,31,27,15),(-115,-195,27,24,12),(15,-217,31,33,19)]:
  cube('Fabriksdør',x,h*.2,z+sz/2+.25,5,h*.4,.4,MØRK)
  cube('Lastelampe',x,h*.45,z+sz/2+.8,2,.35,1,LYS)
  for side in [-1,1]:
    rør('Nedløbsrør',(x+side*(sx/2-1),.4,z+sz/2+.6),(x+side*(sx/2-1),h,z+sz/2+.6),.12,STÅL)
  for zz in [-4,0,4]:
    cube('Tagventilation',x,h+1.9,z+zz,3,2.2,2,MØRK)
    for xx in [-.6,0,.6]:cube('Ventilationsrille',x+xx,h+3.05,z+zz,.15,.15,1.4,STÅL)
for x,z in [(-178,-165),(-120,-178),(38,-216),(-209,-279),(-340,-217)]:
  cube('Lastepalet',x,.25,z,3,.5,3,CREME)
  for dx in [-.8,0,.8]:cube('Pallebræt',x+dx,.55,z,.55,.15,3,RUST)
  cube('Godskasse',x,1.4,z,2.4,1.6,2.4,ORANGE)
  cube('Kassebånd',x,1.4,z+.02,2.55,1.8,.12,MØRK)

# Parkerede servicebiler er samlet med resten af byen, så de ikke giver flere draw calls.
for x,z,v in [(-216,-92,.2),(-63,-126,.3),(-298,-218,-.4),(-337,-250,.5)]:
  cube('Parkeret skrotbil',x,1,z,3.2,1.2,6,ORANGE,v,bevel=.15)
  cube('Parkeret kabine',x,2.1,z-.5,2.8,1.4,2.5,TURKIS,v,bevel=.1)
  cube('Parkeret forrude',x,2.3,z+.85,2.2,.7,.08,GLAS,v)
  for dx in [-1.65,1.65]:
    for dz in [-1.8,1.8]:
      d=cyl('Parkeret dæk',x+dx,.6,z+dz,.75,.4,GUMMI,12);d.rotation_euler[1]=math.pi/2

# Tre ægte vindrotorer har hver sit eget centrumpunkt til stille animation i browseren.
rotorer=[]
for i,(x,z,h) in enumerate([(-367,-30,16),(66,-314,19),(245,166,15)]):
  y=ter(x,z)
  for dx,dz in [(-1.7,-1.7),(1.7,-1.7),(-1.7,1.7),(1.7,1.7)]:
    rør('Vindmølle mast',(x+dx,y,z+dz),(x,y+h,z),.16,STÅL)
  rør('Møllekryds',(x-1.5,y+4,z-1.5),(x+1.5,y+10,z-1.5),.12,TURKIS)
  før=set(bpy.context.scene.objects)
  for j in range(6):
    v=j*math.tau/6
    a=(x+math.sin(v)*.7,y+h+math.cos(v)*.7,z)
    b=(x+math.sin(v)*4.5,y+h+math.cos(v)*4.5,z)
    rør('Rotorblad',a,b,.32,TURKIS)
  hub=cyl('Rotoraksel',x,y+h,z,.65,.45,TURKIS);hub.rotation_euler[0]=math.pi/2
  dele=[o for o in bpy.context.scene.objects if o not in før]
  bpy.ops.object.select_all(action='DESELECT')
  for o in dele:o.select_set(True)
  bpy.context.view_layer.objects.active=hub;bpy.ops.object.join();hub=bpy.context.object
  hub.name='rotor_'+str(i);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);bpy.context.scene.cursor.location=pos(x,y+h,z);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
  rotorer.append(hub)

# Ørkenen får salviefarvede kaktusser og buske uden at spærre nogen vej.
def vejafstand(x,z):
  bedste=10000
  for bredde,p in RUTER:
    for a,b in zip(p,p[1:]):
      dx=b[0]-a[0];dz=b[2]-a[2]
      t=max(0,min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz)))
      bedste=min(bedste,math.hypot(x-a[0]-dx*t,z-a[2]-dz*t)-bredde/2)
  return bedste
for i in range(70):
  x=random.uniform(-400,380);z=random.uniform(-360,345)
  if vejafstand(x,z)<12 or min(math.hypot(x-cx,z-cz) for cx,cz in [(-275,220),(-285,-190),(-110,190)])<38:continue
  y=ter(x,z);h=random.uniform(2,5)
  cyl('Kaktus',x,y+h/2,z,.38,h,GRØN,6)
  for side in [-1,1]:
    rør('Kaktusarm',(x,y+h*.45,z),(x+side*1,y+h*.45,z),.26,GRØN)
    cyl('Kaktusfinger',x+side*1,y+h*.65,z,.26,h*.4,GRØN,6)
for x,z,navn,v in [(-305,106,'RUSTBY',.3),(-175,57,'BJERGPAS',0),(-72,-63,'STUNTVEJ',0),(-164,239,'SOLSTATION',0),(130,217,'UDSIGT',math.pi/2)]:
  y=min((a[1] for _,p in RUTER for a in p),default=0)
  rør('Rutens skiltestolpe',(x,y,z),(x,y+6,z),.18,RUST)
  cube('Rutens skilt',x,y+5,z,8,2.4,.3,TURKIS,v)
  tekst('Rutens navn',navn,x,y+4.75,z-.25,1.1,CREME,v)

# Broernes afstivninger fortæller tydeligt, hvor dækket og den lave dal er.
for bredde,punkter in RUTER:
  for a,b in zip(punkter,punkter[1:]):
    if min(a[1],b[1])<10:continue
    dx=b[0]-a[0];dz=b[2]-a[2];l=math.hypot(dx,dz);nx=-dz/l;nz=dx/l
    for side in [-1,1]:
      kant=(bredde/2-1)*side
      rør('Broens kantbjælke',(a[0]+nx*kant,a[1]-.5,a[2]+nz*kant),(b[0]+nx*kant,b[1]-.5,b[2]+nz*kant),.4,MØRK)
      for j in range(5):
        t0=j/5;t1=(j+1)/5
        x0=a[0]+dx*t0+nx*kant;z0=a[2]+dz*t0+nz*kant;y0=a[1]+(b[1]-a[1])*t0
        x1=a[0]+dx*t1+nx*kant;z1=a[2]+dz*t1+nz*kant;y1=a[1]+(b[1]-a[1])*t1
        rør('Turkis broafstivning',(x0,y0-3,z0),(x1,y1-.5,z1),.22,TURKIS)
        rør('Turkis broafstivning',(x0,y0-.5,z0),(x1,y1-3,z1),.22,TURKIS)
    # Høje rammer står uden for bilens frie bane; traversen ligger seks meter over dækket.
    x=(a[0]+b[0])/2;z=(a[2]+b[2])/2;y=(a[1]+b[1])/2
    for side in [-1,1]:
      xx=x+nx*(bredde/2-.5)*side;zz=z+nz*(bredde/2-.5)*side
      rør('Broportal',(xx,y-.5,zz),(xx,y+7,zz),.4,ORANGE)
    rør('Broportalens travers',(x+nx*(bredde/2-.5),y+7,z+nz*(bredde/2-.5)),(x-nx*(bredde/2-.5),y+7,z-nz*(bredde/2-.5)),.5,TURKIS)
tekst('Bjergtårnets skilt','STORMLYGTE 07',346,78,10.7,1.35,CREME)
cube('Bjergtårnets navneplade',346,78.3,11,17,2.5,.35,TURKIS)

# Små detaljer samles pr. materiale, så browseren tegner få objekter.
for i in range(100):
  x=random.uniform(-425,425);z=random.uniform(-390,390)
  if vejafstand(x,z)<8 or min(math.hypot(x-cx,z-cz) for cx,cz in [(-275,220),(-285,-190),(-110,190)])<38:continue
  y=ter(x,z);bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(1.7,4.5),location=pos(x,y+1,z))
  o=bpy.context.object;o.name='Ørkensten';o.scale=(random.uniform(1,2),random.uniform(.7,1.6),random.uniform(.4,1));o.data.materials.append(KLIPPE)
for x,z in [(-340,55),(-237,-226),(-60,-266),(205,-176),(270,150),(12,266),(-180,78)]:
  y=min((a[1] for _,p in RUTER for a in p),default=0)
  rør('Vejskiltstolpe',(x,0,z),(x,5,z),.16,MØRK)
  cube('Turkis vejskilt',x,4.6,z,5,2,.25,TURKIS)
verden=join_materialer([o for o in bpy.context.scene.objects if o not in rotorer],'Verden')+rotorer
eksport('oerken',verden)

# Tre kørebare biler deler en enkel hjulstruktur, men har forskellige karrosserier.
def bil(navn,farve,variant):
  før=set(bpy.context.scene.objects)
  cube('Chassis',0,.65,0,2.55,.45,4.6,MØRK,bevel=.13)
  cube('Karrosseri',0,1.1,.1,2.65,.7,4.1,farve,bevel=.18)
  cube('Motorhjelm',0,1.55,1.3,2.45,.3,1.55,farve,bevel=.08)
  cube('Kølergrill',0,1.25,2.23,2.25,.6,.15,MØRK)
  for x in [-.85,-.55,-.25,.05,.35,.65,.95]:cube('Kølerlamel',x,1.25,2.35,.08,.55,.08,STÅL)
  for x in [-.9,.9]:
    cube('Forlygte',x,1.55,2.27,.47,.3,.14,LYS,bevel=.04)
    cube('Baglygte',x,1.3,-2.14,.35,.22,.12,ORANGE)
  cube('Forkofanger',0,.82,2.5,2.95,.25,.35,RUST,bevel=.05)
  cube('Bagkofanger',0,.8,-2.4,2.8,.25,.35,RUST)
  if variant=='truck':
    cube('Lastbilkabine',0,2,.7,2.35,1.5,1.9,farve,bevel=.12)
    cube('Lastbilrude',0,2.25,1.68,2.05,.7,.08,GLAS)
    cube('Lad',0,1.4,-1.35,2.7,.65,1.5,RUST)
    for side in [-1,1]:cube('Ladkant',side*1.3,1.75,-1.35,.12,.65,1.6,farve)
  elif variant=='buggy':
    cube('Buggy sæde',0,1.7,-.3,1.7,.8,1.1,MØRK,bevel=.1)
    for side in [-1,1]:
      rør('Sikkerhedsbur',(side*1.15,1,-1.2),(side*1,2.65,-.9),.1,CREME)
      rør('Sikkerhedsbur',(side*1,2.65,-.9),(side*.95,2.6,.7),.1,CREME)
      rør('Sikkerhedsbur',(side*.95,2.6,.7),(side*1.15,1,1.3),.1,CREME)
    rør('Tagbøjle',(-1,2.65,-.9),(1,2.65,-.9),.1,CREME)
    cube('Vinge',0,2.1,-2,3.3,.14,.65,TURKIS)
  else:
    cube('Kabine',0,1.96,-.2,2.1,1.15,2,farve,bevel=.17)
    cube('Forrude',0,2.13,.82,1.8,.75,.08,GLAS)
    cube('Bagrude',0,2.15,-1.24,1.8,.6,.08,GLAS)
    for side in [-1,1]:cube('Siderude',side*1.07,2.17,-.17,.06,.63,1.62,GLAS)
    cube('Tagbagage',0,2.65,-.3,1.9,.17,1.8,MØRK)
    cube('Reservedelsboks',-.4,2.91,-.3,.7,.5,1.4,TURKIS,bevel=.07)
  for side in [-1,1]:
    rør('Udstødning',(side*1.1,.85,-1.7),(side*1.1,1.6,-2.25),.13,STÅL)
    cube('Spejl',side*1.43,2,.65,.38,.25,.2,MØRK)
    cube('Rustplet',side*1.335,1.2,-.45,.03,.3,.8,RUST)
  cube('Motordel',0,1.95,1.38,.7,.6,.85,MØRK,bevel=.07)
  for z in [1.1,1.5]:cyl('Luftfilter',0,2.3,z,.3,.17,STÅL,10)
  krop=join_materialer([o for o in bpy.context.scene.objects if o not in før],navn)
  hjul=[]
  for side in [-1,1]:
    for z,ende in [(1.4,'for'),(-1.4,'bag')]:
      x=side*1.35
      d=cyl('Dæk',x,.48,z,.64,.52,GUMMI,16);d.rotation_euler[1]=math.pi/2
      fælg=cyl('Fælg',x+side*.28,.48,z,.38,.07,STÅL,10);fælg.rotation_euler[1]=math.pi/2
      for i in range(10):
        v=i*math.tau/10
        cube('Dækmønster',x,.48+math.sin(v)*.59,z+math.cos(v)*.59,.57,.12,.18,MØRK,bevel=.02)
      dele=[o for o in bpy.context.scene.objects if o not in før and o not in krop and o not in hjul]
      bpy.ops.object.select_all(action='DESELECT')
      for o in dele:o.select_set(True)
      bpy.context.view_layer.objects.active=d;bpy.ops.object.join();d=bpy.context.object;d.name='hjul_'+ende+('_venstre' if side<0 else '_hoejre')
      bpy.context.scene.cursor.location=pos(x,.48,z);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');hjul.append(d)
  objekter=krop+hjul;eksport(navn,objekter)
  return objekter

rotten=bil('rotten',ORANGE,'rotten')
buggy=bil('buggy',TURKIS,'buggy')
truck=bil('truck',CREME,'truck')
for o in buggy+truck:o.hide_render=True
for o in rotten:
  o.location=Matrix.Rotation(math.radians(-18),4,'Z') @ o.location
  o.location.x+=-274;o.location.y+=-219
  o.rotation_euler[2]+=math.radians(-18)

# Samme Blender-kilde gemmes, så både modeller og forside kan genskabes.
bpy.context.scene.cursor.location=(0,0,0)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=92
scene.render.filepath=os.path.join(UD,'forside.jpg')
scene.world.color=(.35,.42,.48)
scene.use_nodes=True
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.45,.54,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN',location=(0,0,100));sun=bpy.context.object;sun.name='Den varme sol';sun.data.energy=2.6;sun.data.color=(1.0,.84,.62);sun.rotation_euler=(.35,-.55,-.55)
bpy.ops.object.camera_add(location=pos(-298,9,196));cam=bpy.context.object;target=Vector(pos(-277,4,235));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=33;scene.camera=cam
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),'skrotstorm.blend'))
bpy.ops.render.render(write_still=True)
print('SKROTSTORM: modeller, blend og forside er færdige')
