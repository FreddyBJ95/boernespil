"""Render den oprindelige eventyrø med de nye landmærker; ingen billedredigering."""
import bpy, os
ROD=os.path.dirname(__file__)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROD,'krystaljaegerne.blend'))
bpy.context.preferences.filepaths.save_version=0
with bpy.data.libraries.load(os.path.join(ROD,'detaljer.blend'),link=False) as (fra,til):til.objects=list(fra.objects)
for o in til.objects:
  if o and not o.users_collection:bpy.context.collection.objects.link(o)
  if o:o.hide_render=True
def stil(navn,x,y,skala=1,vinkel=0):
  src=next(o for o in til.objects if o and o.name==navn)
  rod=bpy.data.objects.new('forside_detalje_'+navn,None);bpy.context.collection.objects.link(rod)
  rod.location=(x,y,0);rod.scale=(skala,skala,skala);rod.rotation_euler.z=vinkel
  for o in list(src.children):
    cp=o.copy();cp.data=o.data;bpy.context.collection.objects.link(cp);cp.parent=rod;cp.hide_render=False
stil('lanterne',-4,-2,1.05)
stil('markedsvogn',-7,-.5,.95,.3)
stil('bænk',-2,1,1,-.1)
stil('vejviser',-1,-1,1.1,.5)
stil('lejr',2,5,.75,.5)
stil('statue',4,5,.9,.2)
for x,y in [(-6,-3),(-4,-4),(0,-2),(1,3),(-8,1),(3,-2)]:stil('blomster',x,y,1.7)
for x,y in [(-8,-1),(1,5),(-2,4)]:stil('svampe',x,y,1.6)
scene=bpy.context.scene;scene.cycles.samples=40
scene.world.color=(.05,.085,.12)
scene.render.filepath=os.path.abspath(os.path.join(ROD,'../../../spil/krystaljaegerne/forside.jpg'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROD,'forside-detaljer.blend'))
bpy.ops.render.render(write_still=True)
