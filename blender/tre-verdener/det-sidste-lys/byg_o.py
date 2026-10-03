"""Originale modeller til Det Sidste Lys. Kør med Blender i baggrunden."""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector, Matrix

random.seed(4817)
KILDE = Path(__file__).resolve().parent
SPIL = KILDE.parents[2] / 'spil' / 'det-sidste-lys'
SPIL.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Et lille håndlavet materialebibliotek giver hele øen samme kystpalet.
def materiale(navn, farve, ruhed=.8, metal=0, emission=0):
  m = bpy.data.materials.new(navn)
  m.diffuse_color = (*farve, 1)
  m.use_nodes = True
  b = m.node_tree.nodes.get('Principled BSDF')
  b.inputs['Base Color'].default_value = (*farve, 1)
  b.inputs['Roughness'].default_value = ruhed
  b.inputs['Metallic'].default_value = metal
  if emission:
    b.inputs['Emission Color'].default_value = (*farve, 1)
    b.inputs['Emission Strength'].default_value = emission
  return m

græs = [materiale('Marehalm_%s' % i, c) for i,c in enumerate([
  (.28,.36,.27), (.35,.41,.28), (.40,.44,.30), (.30,.39,.33), (.44,.45,.33)])]
sten = [materiale('Kyststen_%s' % i, c) for i,c in enumerate([
  (.37,.42,.44),(.47,.49,.45),(.30,.36,.39),(.53,.52,.45)])]
sand = materiale('Strandsand',(.65,.58,.43))
sti_mat = materiale('Stier af skaller',(.57,.55,.43))
puds = materiale('Varm kalk',(.80,.79,.65))
fyrhvid = materiale('Fyrets kalk',(.88,.84,.68))
fyrrod = materiale('Falmet jernrød',(.40,.16,.12))
tag = materiale('Blaa skifer',(.18,.28,.32),.66)
træ = materiale('Drivtømmer',(.34,.25,.17))
planke = materiale('Slidt honningtræ',(.49,.37,.23))
mørktræ = materiale('Mørk eg',(.20,.17,.12))
jern = materiale('Mørk kobber',(.19,.24,.23),.45,.65)
kobber = materiale('Kobberkanter',(.46,.28,.15),.48,.65)
glas = materiale('Varmt vindueslys',(.95,.58,.20),.4,0,.8)
amber = materiale('Rav',(.90,.38,.075),.28,.15,1.4)
prisme_mat = materiale('Havglas',(.12,.65,.65),.25,.45,.3)
løv = [materiale('Fyrregrøn_%s' % i,c) for i,c in enumerate([
  (.13,.25,.21),(.18,.31,.24),(.24,.36,.26)])]
hav = materiale('Hav i forside',(.09,.25,.32),.27,.4)
sejl = materiale('Natursejl',(.80,.76,.57))

# Terrænet deler sin matematik med spillets ganghøjde.
def højde(x,z):
  r = math.sqrt((x/82)**2+(z/102)**2)
  kant = min(1,max(0,(1.03-r)/.16))
  bakker = 11*math.exp(-((x-38)**2+(z+44)**2)/550)
  bakker += 4*math.exp(-((x+12)**2+(z+62)**2)/600)
  bakker += 2.2*math.exp(-((x+45)**2+(z+28)**2)/700)
  ujævnt = .65*math.sin(x*.12)*math.cos(z*.09)+.25*math.sin(z*.3+x*.2)
  havnebassin = 6*math.exp(-((x+29)**2/160+(z-87)**2/190))
  return -2.6+kant*(5.4+bakker+ujævnt)-havnebassin

def mesh(navn, verts, faces, mat):
  data = bpy.data.meshes.new(navn)
  data.from_pydata(verts,[],faces)
  data.update()
  o = bpy.data.objects.new(navn,data)
  bpy.context.collection.objects.link(o)
  if isinstance(mat,list):
    for m in mat: data.materials.append(m)
  else: data.materials.append(mat)
  return o

def kube(navn, pos, skala, mat, kant=0):
  bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
  o=bpy.context.object
  o.name=navn
  o.scale=skala
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  o.data.materials.append(mat)
  if kant:
    mod=o.modifiers.new('Bløde slidte kanter','BEVEL')
    mod.width=kant;mod.segments=1
    o.modifiers.new('Vægtede normaler','WEIGHTED_NORMAL')
  return o

def cylinder(navn,pos,r,dybde,mat,top=None,vertices=12):
  if top is None: top=r
  bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=top,depth=dybde,location=pos)
  o=bpy.context.object;o.name=navn;o.data.materials.append(mat)
  return o

def kugle(navn,pos,skala,mat,level=1):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=level,radius=1,location=pos)
  o=bpy.context.object;o.name=navn;o.scale=skala;o.data.materials.append(mat)
  return o

def bjælke(navn,a,b,r,mat):
  a,b=Vector(a),Vector(b)
  o=cylinder(navn,(a+b)/2,r,(b-a).length,mat,vertices=8)
  o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
  return o

def jord(navn,x,z,r=.7):
  return kugle(navn,(x,z,højde(x,z)+r*.23),(r,r*.8,r*.65),random.choice(sten))

# Øens facetter har små farveforskelle, så den virker håndbygget.
verts=[];faces=[];mats=[];indeks={}
for ix,x in enumerate(range(-90,93,3)):
  for iz,z in enumerate(range(-108,109,3)):
    indeks[(ix,iz)]=len(verts);verts.append((x,z,højde(x,z)))
for ix in range(60):
  for iz in range(72):
    a,b,c,d=[indeks[p] for p in [(ix,iz),(ix+1,iz),(ix+1,iz+1),(ix,iz+1)]]
    x,z,_=verts[a]
    if math.sqrt((x/82)**2+(z/102)**2)>1.10: continue
    faces.extend([(a,b,c),(a,c,d)])
    hh=(verts[a][2]+verts[b][2]+verts[c][2])/3
    mats.extend([5 if hh<1.4 else random.randrange(5)]*2)
o=mesh('Oe_terræn',verts,faces,græs+[sand])
for p,i in zip(o.data.polygons,mats): p.material_index=i

def sti(navn,punkter,bredde=2.8):
  punkter2=[]
  for i in range(len(punkter)-1):
    a,b=Vector(punkter[i]),Vector(punkter[i+1])
    for j in range(max(1,int((b-a).length/2))):
      t=j/max(1,int((b-a).length/2));p=a.lerp(b,t);punkter2.append((p.x,p.y))
  punkter2.append(punkter[-1]);v=[];f=[]
  for i,p in enumerate(punkter2):
    før=Vector(punkter2[max(0,i-1)]);efter=Vector(punkter2[min(len(punkter2)-1,i+1)])
    d=(efter-før).normalized();normal=Vector((-d.y,d.x))*bredde/2
    for s in [-1,1]:
      x,z=p[0]+normal.x*s,p[1]+normal.y*s
      v.append((x,z,højde(x,z)+.075))
    if i: f.append((i*2-2,i*2-1,i*2+1,i*2))
  mesh(navn,v,f,sti_mat)

sti('Havnestien',[(-25,75),(-26,59),(-21,47),(-6,37),(7,26)])
sti('Fyrstien',[(7,26),(15,13),(29,2),(40,-17),(38,-37),(38,-44)],3.8)
sti('Skovstien',[(-6,37),(-24,23),(-37,4),(-43,-16),(-45,-31)])
sti('Ruinestien',[(-43,-16),(-29,-33),(-19,-52),(-12,-61)])
sti('Kyststien',[(-24,23),(-40,29),(-50,44),(-62,47)])

# Kaj, fortøjninger, fiskerbåd og værksted danner et troværdigt hjemsted.
def pæl(x,z,dybde=3):
  cylinder('Fortøjningspæl',(x,z,.8),.24,dybde,træ,vertices=10)
  cylinder('Tov om pæl',(x,z,1.8),.28,.18,sand,vertices=12)

for z in range(64,86,2):
  kube('Kajplanke',(-25,z,1.9),(8,1.85,.3),planke,.025)
for x in [-28.4,-21.6]:
  for z in [65,72,80,85]: pæl(x,z)
for x in range(-39,-24,2):
  kube('Tværkaj',(x,80,1.9),(1.85,7,.3),planke)
for z in [77,83]: pæl(-37,z)
kube('Kajens trin',(-25,64,2.3),(7,2,.5),træ)

def båd(x,z,rot=0):
  v=[(-1.7,-3,0),(1.7,-3,0),(2,1.5,0),(0,4.5,0),(-2,1.5,0),
    (-1.2,-2.8,-1),(1.2,-2.8,-1),(1.4,1,-1),(0,3.5,-.7),(-1.4,1,-1)]
  f=[(0,1,2,3,4),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0),(5,9,8,7,6)]
  o=mesh('Fiskerbaad',v,f,fyrrod);o.location=(x,z,.95);o.rotation_euler.z=rot
  kube('Baaddæk',(x,z,1.1),(2.6,4.8,.15),planke)
  bjælke('Bådmast',(x,z,1),(x,z,7),.10,træ)
  mesh('Sammenrullet sejl',[(x+.1,z,6.8),(x+.1,z,2.9),(x+2.7,z,3.3)],[(0,1,2)],sejl)
  kube('Bådkahyt',(x,z-1,2),(1.5,1.4,1.7),puds,.06)
båd(-32,87,.25)

def hus(navn,x,z,w,d,h,rotation=0,vinduer=True):
  grund=højde(x,z)
  gruppe=[]
  if navn=='Fyrmesterens_værksted':
    gruppe.append(kube(navn+'_gulv',(x,z,grund+.12),(w,d,.24),planke))
    gruppe.append(kube(navn+'_bagvæg',(x,z-d/2,grund+h/2),(w,.3,h),puds,.04))
    for side in [-1,1]:
      gruppe.append(kube(navn+'_sidevæg',(x+side*w/2,z,grund+h/2),(.3,d,h),puds,.04))
      gruppe.append(kube(navn+'_forvæg',(x+side*(w/4+.5),z+d/2,grund+h/2),(w/2-1,.3,h),puds,.04))
    gruppe.append(kube(navn+'_overdør',(x,z+d/2,grund+4.05),(2.1,.3,2.3),puds))
  else:
    gruppe.append(kube(navn+'_mur',(x,z,grund+h/2),(w,d,h),puds,.08))
  v=[(-w/2-.4,-d/2-.35,h), (w/2+.4,-d/2-.35,h), (0,-d/2-.35,h+2.3),
     (-w/2-.4,d/2+.35,h),(w/2+.4,d/2+.35,h),(0,d/2+.35,h+2.3)]
  o=mesh(navn+'_tag',v,[(0,1,2),(3,5,4),(0,2,5,3),(2,1,4,5)],tag)
  o.location=(x,z,grund);gruppe.append(o)
  if navn!='Fyrmesterens_værksted':
    gruppe.append(kube(navn+'_dør',(x,z+d/2+.055,grund+1.35),(1.25,.18,2.7),mørktræ,.06))
  gruppe.append(kube(navn+'_dørkarm',(x,z+d/2+.13,grund+2.9),(1.6,.22,.2),planke))
  for wx in [-w*.28,w*.28]:
    if not vinduer: continue
    gruppe.append(kube(navn+'_vindue',(x+wx,z+d/2+.06,grund+2.6),(1.3,.12,1.5),glas))
    gruppe.append(kube(navn+'_ramme',(x+wx,z+d/2+.16,grund+2.6),(.10,.12,1.62),træ))
    gruppe.append(kube(navn+'_sprosse',(x+wx,z+d/2+.17,grund+2.6),(1.42,.1,.10),træ))
  gruppe.append(kube(navn+'_skorsten',(x+w*.26,z-d*.14,grund+h+1.9),(.85,.85,2.8),fyrrod,.04))
  for gy in [-d/2+.7,d/2-.7]:
    for gx in [-w/2+.3,w/2-.3]:
      gruppe.append(kube(navn+'_hjørne',(x+gx,z+gy,grund+h/2),(.25,.25,h),træ))
  if rotation:
    for o in gruppe:
      p=o.location-Vector((x,z,grund));c,s=math.cos(rotation),math.sin(rotation)
      o.location=(x+p.x*c-p.y*s,z+p.x*s+p.y*c,grund+p.z)
      o.rotation_euler.z+=rotation

hus('Fyrmesterens_værksted',7,23,10,9,5.2)
hus('Blaa_hus',-8,25,7,7,4.3,.1)
hus('Havnehus',-30,55,8,8,4.4,-.12)
hus('Lagerhus',-40,61,7,12,5.2,.12)
hus('Landhandel',17,36,8,8,4.5,-.3)
hus('Lille_hus',-3,8,7,7,4.2,.23)
for x,z in [(-17,35),(19,25),(-21,55),(-37,72),(-47,68)]:
  h=højde(x,z)
  for i in range(2):
    cylinder('Tønde',(x+i*1.25,z,h+.65),.54,1.3,træ)
    cylinder('Tøndebånd',(x+i*1.25,z,h+.4),.56,.08,jern)
    cylinder('Tøndebånd',(x+i*1.25,z,h+.95),.56,.08,jern)
  kube('Fiskekasse',(x,z+1.3,h+.35),(1.5,1,.7),planke,.03)

# Værkstedsbordet og kajens postkasse er konkrete genstande i gåderne.
kube('Bordplade',(7,21,højde(7,23)+1.2),(3,1.7,.22),planke,.04)
for x in [6,8]:
  for z in [20.4,21.6]: kube('Bordben',(x,z,højde(7,23)+.6),(.15,.15,1.2),træ)
kube('Tidevandslaas',(7,21,højde(7,23)+1.55),(1.45,.8,.55),kobber,.07)
for i in range(3):
  kube('Værkstedshylde',(3,22,højde(7,23)+1+i),(.75,4,.14),planke)
  for j in range(4):
    kube('Gamle_bøger',(3,20.8+j*.75,højde(7,23)+1.32+i),(.45,.23,.5),[fyrrod,tag,sand,kobber][j])
kube('Lænestol',(10,24,højde(7,23)+.6),(1.4,1.4,.3),træ,.07)
kube('Lænestol_ryg',(10,24.6,højde(7,23)+1.25),(1.4,.25,1.3),træ,.07)
kube('Elins_kort',(7,21.7,højde(7,23)+1.36),(2.2,.7,.035),sejl)
kube('Postkassestolpe',(-25,73,2.6),(.25,.25,1.5),træ)
kube('Havnens_postkasse',(-25,73,3.5),(1.25,.7,.85),fyrrod,.12)
kube('Brev',(-25,72.62,3.52),(.66,.035,.42),sejl)

# Træer er enkle delte meshformer, men varieres i størrelse og hældning.
def fyrretræ(x,z,s=1):
  h=højde(x,z)
  cylinder('Fyrrestamme',(x,z,h+2.3*s),.23*s,4.6*s,træ,top=.14*s,vertices=7)
  for i in range(3):
    o=cylinder('Fyrrekrone',(x,z,h+(3.3+i*1.25)*s),(2.1-i*.32)*s,3.5*s,løv[i],top=.02,vertices=7)
    o.rotation_euler.z=random.random()

for i in range(84):
  x,z=random.uniform(-67,-24),random.uniform(-55,11)
  if min(math.hypot(x+45,z+31),math.hypot(x+43,z+16))<7:continue
  if højde(x,z)<1.5:continue
  fyrretræ(x,z,random.uniform(.7,1.4))
for x,z in [(43,10),(55,-12),(61,-41),(30,22),(28,37),(0,49),(-14,5)]: fyrretræ(x,z,.8)
for x,z in [(-46,-31),(-54,-20),(-35,-37)]:
  fyrretræ(x,z,1.35)
  kugle('Gammelt_rav',(x+.45,z+.32,højde(x,z)+1.8),(.36,.25,.55),amber,2)

for i in range(120):
  a=random.random()*math.tau;r=random.uniform(.79,1.07)
  x,z=math.cos(a)*82*r,math.sin(a)*102*r
  if -44<x<-13 and 64<z<100: continue
  jord('Kystklippe',x,z,random.uniform(1,4))
for i in range(42):
  x,z=random.uniform(-69,70),random.uniform(-82,85)
  if højde(x,z)>1.5: jord('Sten i marehalm',x,z,random.uniform(.25,.7))

# Ruinen med kompasroset bærer fortidens linse; hver sten har sin egen form.
rx,rz=-12,-62
rh=højde(rx,rz)
cylinder('Ruinens_stengulv',(rx,rz,rh+.2),8,.4,sten[1],vertices=16)
for side in [-1,1]:
  for j in range(6):
    x=rx+side*6.5;z=rz-5+j*2
    h=3.4+random.uniform(-.6,.8)
    kube('Ruinmur',(x,z,rh+h/2),(1.3,1.95,h),random.choice(sten),.15)
for x in [rx-4,rx+4]:
  for k in range(4): kube('Ruinsøjle',(x,rz-5,rh+.45+k*.95),(1.2,1.2,.9),sten[k%4],.08)
for i in range(9):
  a=i*math.pi/8
  kube('Portens_bue',(rx+4.3*math.cos(a),rz-5,rh+3.8+4.3*math.sin(a)),(1.1,1.5,1.1),sten[i%4],.05).rotation_euler.y=-a
cylinder('Kompasfundament',(rx,rz,rh+.7),2.2,1.2,sten[2],vertices=12)
cylinder('Linseholder',(rx,rz,rh+1.5),1.3,.45,kobber,vertices=16)
for i in range(8):
  a=i*math.pi/4
  o=kube('Kompasstraale',(rx+math.sin(a)*1.5,rz+math.cos(a)*1.5,rh+1.36),(.16,.7,.05),sejl)
  o.rotation_euler.z=-a
kugle('Den_gamle_linse',(rx,rz,rh+1.85),(.8,.8,.3),prisme_mat,2)
for i in range(13):
  x,z=rx+random.uniform(-9,9),rz+random.uniform(-9,9)
  jord('Ruinsten',x,z,random.uniform(.4,1.0))

# Fyret er modelleret i flere kalk- og kobberlag med fuld lanterne og galleri.
fx,fz=38,-44;fh=højde(fx,fz)
cylinder('Fyrets_fundament',(fx,fz,fh+.6),6.5,1.2,sten[2],vertices=16)
cylinder('Fyrets_nedre_kalk',(fx,fz,fh+6),4.7,11,fyrhvid,top=3.8,vertices=16)
cylinder('Fyrets_roede_baand',(fx,fz,fh+13.5),3.8,4,fyrrod,top=3.45,vertices=16)
cylinder('Fyrets_oevre_kalk',(fx,fz,fh+18),3.45,5,fyrhvid,top=3.05,vertices=16)
cylinder('Lanternens_galleri',(fx,fz,fh+20.7),4.9,.55,kobber,vertices=16)
cylinder('Lanternens_gulv',(fx,fz,fh+21.1),3.3,.4,jern,vertices=16)
cylinder('Lanternens_lys',(fx,fz,fh+23),2.4,3.4,glas,vertices=16)
for i in range(12):
  a=i*math.tau/12
  x,z=fx+math.sin(a)*2.8,fz+math.cos(a)*2.8
  cylinder('Lanternens_jernsprosse',(x,z,fh+23),.11,4,jern,vertices=6)
  x,z=fx+math.sin(a)*4.45,fz+math.cos(a)*4.45
  cylinder('Galleriets_raekvaerk',(x,z,fh+21.9),.085,1.4,jern,vertices=6)
  b=(i+1)*math.tau/12
  bjælke('Galleriets_haandliste',(x,z,fh+22.6),(fx+math.sin(b)*4.45,fz+math.cos(b)*4.45,fh+22.6),.08,jern)
cylinder('Lanternens_tag',(fx,fz,fh+25.6),3.65,2.1,kobber,top=.45,vertices=16)
cylinder('Tagets_spir',(fx,fz,fh+27),.11,1.2,jern,vertices=8)
kube('Fyrdoeren',(fx,fz+4.6,fh+2.1),(1.9,.2,3.4),mørktræ,.07)
kube('Fyrdoerens_kobber',(fx,fz+4.8,fh+3.9),(2.35,.3,.22),kobber)
for z in [fh+7,fh+17]:
  kube('Fyrvindue',(fx,fz+4.12-(z-fh)*.06,z),(1,.2,1.7),glas,.08)
hus('Fyrmesterbolig',50,-34,8,7,4.4,-.2)
kube('Fyrkontrol',(32,-38,højde(32,-38)+1.3),(1.7,.8,2.2),fyrrod,.07)
kube('Kontrolplade',(32,-37.56,højde(32,-38)+1.45),(1.2,.06,1.5),kobber)
for i in range(3):
  cylinder('Kontrolknap',(31.65+i*.35,-37.50,højde(32,-38)+1.2),.13,.13,glas,vertices=10).rotation_euler.x=math.pi/2

# Grotte: et stort åbent klippehvælv og en tydelig lille sti ind til prismen.
cx,cz=-66,43;ch=højde(cx,cz)
for i in range(7):
  a=i*math.pi/6
  x=cx+6*math.cos(a);h=ch+2+6*math.sin(a)
  kugle('Grottens_hvaelv',(x,cz,h),(2.9,5.8,2.8),sten[i%4],2)
kube('Grottens_bagvaeg',(cx,cz-5,ch+3),(10,1.8,6),sten[2],.4)
cylinder('Grottealter',(cx,cz+1,ch+.7),2,1.4,sten[1],vertices=12)
kugle('Havgrotten_prisme',(cx,cz+1,ch+2),(.9,.9,1.2),prisme_mat,1)
for i in range(3):
  x=cx-2.4+i*2.4
  cylinder('Prismens_spejl',(x,cz+3.5,ch+1.7),.7,.13,kobber,vertices=12).rotation_euler.x=math.pi/2
  bjælke('Spejlstativ',(x,cz+3.5,ch),(x,cz+3.5,ch+1.7),.12,jern)

# Små broer, skilte, lanterner og havgræs gør rejserne mellem gåderne interessante.
def skilt(x,z):
  h=højde(x,z)
  cylinder('Sti_skiltstolpe',(x,z,h+1.2),.12,2.4,træ,vertices=7)
  o=kube('Retningsskilt',(x,z,h+2.05),(1.9,.15,.4),planke,.04);o.rotation_euler.z=.2
  kube('Retningsskilt_2',(x,z,h+1.55),(1.4,.15,.35),fyrrod,.04)
for x,z in [(-19,43),(-27,19),(-38,-10),(24,5),(40,-24),(-48,38)]: skilt(x,z)
for x,z in [(-25,66),(7,32),(-20,40),(18,10),(31,-24),(34,-38),(-39,-9)]:
  h=højde(x,z)
  cylinder('Lanternepæl',(x,z,h+1.7),.12,3.4,træ,vertices=7)
  kube('Lanterneglas',(x,z,h+3.2),(.48,.48,.75),glas,.05)
  cylinder('Lanternetag',(x,z,h+3.7),.43,.35,jern,top=.07,vertices=6)
for x,z in [(34,-30),(-15,34)]:
  h=højde(x,z)
  kube('Bænk',(x,z,h+.72),(3.2,1,.25),planke,.04)
  kube('Bænkens_ryg',(x,z-.45,h+1.25),(3.2,.18,.75),planke,.04)
  for s in [-1,1]: kube('Bænkben',(x+s*1.2,z,h+.3),(.25,.7,.65),træ)
for i in range(180):
  x,z=random.uniform(-76,76),random.uniform(-94,94)
  if højde(x,z)<1.5:continue
  h=højde(x,z)
  for j in range(3):
    a=j*math.pi/3
    v=[(x-.18*math.cos(a),z-.18*math.sin(a),h),(x+.18*math.cos(a),z+.18*math.sin(a),h),(x+.08,z+.05,h+random.uniform(.4,.75))]
    mesh('Marehalm',v,[(0,1,2)],græs[1])

# Blender bruger Z opad; glTF-eksporten omregner til Three.js' Y opad.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
  if o.type=='MESH': o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(KILDE/'det-sidste-lys.blend'))
spejl = Matrix.Diagonal((1,-1,1,1))
for o in bpy.context.scene.objects:
  if o.type=='MESH': o.matrix_world = spejl @ o.matrix_world
bpy.ops.export_scene.gltf(filepath=str(SPIL/'oe.glb'),export_format='GLB',use_selection=True,export_apply=True,export_materials='EXPORT')
for o in bpy.context.scene.objects:
  if o.type=='MESH': o.matrix_world = spejl @ o.matrix_world

# Forsidefotografiet renderes af de samme modeller, som spilleren udforsker.
kube('Hav_til_render',(0,0,-.15),(2500,2500,.1),hav)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=1400;scene.render.resolution_y=875;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG'
scene.render.image_settings.quality=92
scene.render.filepath=str(SPIL/'forside.jpg')
scene.world.color=(.10,.16,.22)
world=scene.world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.21,.31,.42,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN',location=(50,30,80))
sun=bpy.context.object;sun.rotation_euler=(.75,-.55,-1.1);sun.data.energy=3.1;sun.data.color=(1,.68,.38);sun.data.angle=.18
bpy.ops.object.light_add(type='AREA',location=(-25,-15,100))
fill=bpy.context.object;fill.data.energy=5500;fill.data.shape='DISK';fill.data.size=130;fill.data.color=(.52,.72,1)
bpy.ops.object.camera_add(location=(111,127,91))
cam=bpy.context.object;target=Vector((3,-8,5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42
scene.camera=cam
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
bpy.ops.render.render(write_still=True)
print('DET_SIDSTE_LYS_ASSETS_KLAR', SPIL, flush=True)
