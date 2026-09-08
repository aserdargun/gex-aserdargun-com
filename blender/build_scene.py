"""GEX educational geometry. No object is a vendor floorplan or a measured resource.

Blender Z-up exports as glTF Y-up. Repeated SM assemblies reuse mesh datablocks.
Animation and lane states are owned by the browser's deterministic lesson model.
"""
import bpy
import math
import json
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/models"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for data in list(bpy.data.materials):
    bpy.data.materials.remove(data)

def material(name, hexcolor, metallic=0.0, roughness=0.4):
    m = bpy.data.materials.new(name)
    rgb = [int(hexcolor[i:i+2], 16) / 255 for i in (0, 2, 4)]
    rgb = [((c+0.055)/1.055)**2.4 if c > 0.04045 else c/12.92 for c in rgb]
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    return m

M = {
    "substrate": material("GEX_MAT_SUBSTRATE", "263034", .35, .43),
    "edge": material("GEX_MAT_EDGE", "637274", .6, .35),
    "die": material("GEX_MAT_DIE", "39474a", .35, .38),
    "compute": material("GEX_MAT_COMPUTE", "eab785", .3, .35),
    "compute_side": material("GEX_MAT_COMPUTE_SIDE", "9a7959", .35, .45),
    "memory": material("GEX_MAT_MEMORY", "98b7a0", .25, .35),
    "memory_side": material("GEX_MAT_MEMORY_SIDE", "50685b", .25, .4),
    "data": material("GEX_MAT_DATA", "81b5cf", .15, .4),
    "gold": material("GEX_MAT_CONTACT", "b79a5f", .7, .3),
    "black": material("GEX_MAT_INSET", "182125", .15, .55),
}

def empty(name, parent=None, pos=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = pos
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = .3
    return obj

def box(name, pos, size, mat, parent=None, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(M[mat])
    if bevel:
        mod = obj.modifiers.new("GEX_EDGE_BEVEL", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = obj.modifiers.new("GEX_WEIGHTED_NORMALS", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.parent = parent
    obj.location = pos
    return obj

def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    return obj

def duplicate(source, name, pos, parent):
    obj = bpy.data.objects.new(name, source.data)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = pos
    return obj

def select_tree(root):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [root, *root.children_recursive]:
        obj.select_set(True)

gex = empty("GEX_ROOT")
gpu = empty("GPU_SYSTEM", gex)
gpu["abstraction"] = "educational geometry; counts and layout are illustrative"
board = box("GEX_GPU_BOARD", (0, 0, 0), (12.2, 10.0, .34), "substrate", gpu, .22)
box("GEX_BOARD_EDGE", (0, 0, -.16), (12.1, 9.9, .1), "edge", board)
box("GEX_GPU_PACKAGE", (0, .25, .3), (9.0, 7.6, .28), "black", gpu, .12)
box("GEX_PACKAGE_FRAME", (0, .25, .46), (8.7, 7.3, .08), "edge", gpu, .08)
die = box("GEX_GPU_DIE", (0, .3, .57), (8.2, 6.8, .2), "die", gpu, .06)

cluster_positions = [(-2.0, 1.9), (2.0, 1.9), (-2.0, -1.25), (2.0, -1.25)]
prototype = None
sm_positions = []
for c, (cx, cy) in enumerate(cluster_positions):
    cluster = empty(f"GEX_PROCESSING_CLUSTER_{c:02}", gpu)
    box(f"GEX_CLUSTER_FRAME_{c:02}", (cx, cy, .74), (3.2, 2.8, .12), "edge", cluster)
    box(f"GEX_CLUSTER_INSET_{c:02}", (cx, cy, .82), (3.05, 2.65, .07), "black", cluster)
    for s, (dx, dy) in enumerate([(-.75,-.64),(.75,-.64),(-.75,.64),(.75,.64)]):
        idx = c * 4 + s
        pos = (cx+dx, cy+dy, .93)
        if prototype is None:
            bits = [box("GEX_SM_BASE", (0,0,0), (1.32,1.08,.13), "compute_side", bevel=.02)]
            for a in range(2):
                for b in range(3):
                    bits.append(box("GEX_SM_COMPUTE", ((a-.5)*.58,(b-1)*.31,.12), (.49,.255,.11), "compute", bevel=.018))
            bits.append(box("GEX_SM_REGISTER_STRIP", (0,-.51,.095), (1.17,.055,.065), "edge", bevel=.01))
            prototype = join(bits, f"GEX_SM_{idx:02}")
            prototype.parent = cluster
            prototype.location = pos
        else:
            duplicate(prototype, f"GEX_SM_{idx:02}", pos, cluster)
        sm_positions.append(list(pos))

l2 = empty("GEX_MEMORY_L2", gpu)
box("GEX_L2_SUBSTRATE", (0,.3,.79), (1.1,5.9,.19), "memory_side", l2)
for j in range(6):
    box(f"GEX_L2_SEGMENT_{j:02}", (0, -2.1+j*.95, .93), (.9,.88,.13), "memory", l2)

memory_locations = [(-5.2,2.4),(-5.2,-.5),(5.2,2.4),(5.2,-.5),(-2.5,-4.15),(2.5,-4.15)]
pins = []
for i, (x,y) in enumerate(memory_locations):
    region = empty(f"GEX_GLOBAL_MEMORY_{i:02}", gpu)
    rotate = i >= 4
    dims = (2.8,1.25) if rotate else (1.25,2.55)
    box(f"GEX_GLOBAL_BASE_{i:02}",(x,y,.38),(*dims,.32),"black",region)
    box(f"GEX_GLOBAL_PACKAGE_{i:02}",(x,y,.61),(dims[0]-.09,dims[1]-.09,.16),"memory_side",region)
    box(f"GEX_GLOBAL_CAP_{i:02}",(x,y,.72),(dims[0]-.17,dims[1]-.17,.1),"memory",region)
    for k in range(18):
        t = (k-8.5)*.135
        for side in [-1,1]:
            p = (x+t, y+side*.65,.36) if rotate else (x+side*.66,y+t,.36)
            pins.append(box("GEX_CONTACT",p,(.055,.07,.16),"gold",gpu,0))

for side in [-1,1]:
    for k in range(62):
        pins.append(box("GEX_CONTACT",((k-30.5)*.185,side*4.97,-.02),(.067,.055,.22),"gold",gpu,0))
    for k in range(47):
        pins.append(box("GEX_CONTACT",(side*6.07,(k-23)*.185,-.02),(.055,.067,.22),"gold",gpu,0))
join(pins,"GEX_PACKAGE_CONTACTS")
for i, (x,y) in enumerate([(-4.15,2.7),(4.15,2.7),(-4.15,-2.1),(4.15,-2.1)]):
    box(f"GEX_MEMORY_CONTROLLER_{i:02}",(x,y,.61),(.33,.8,.13),"data",gpu)
host = box("GEX_HOST_INTERFACE",(0,4.25,.32),(3.2,.75,.18),"edge",gpu)
for x,y in [(-4.35,3.65),(4.35,3.65),(-4.35,-3.2),(4.35,-3.2)]:
    box("GEX_PACKAGE_FASTENER",(x,y,.6),(.32,.32,.13),"edge",gpu)

anchors = empty("GEX_ANCHORS",gpu)
for name,pos in {
    "GPU_DIE":(0,.3,1.1), "SM":(-2.75,1.26,1.2), "L2":(0,.3,1.15),
    "GLOBAL_MEMORY":(-5.2,2.4,.9), "MEMORY_CONTROLLER":(4.15,2.7,.9), "HOST_INTERFACE":(0,4.25,.6)
}.items():
    empty("GEX_ANCHOR_"+name,anchors,pos)

sm = empty("SM_MASTER",gex)
sm.location.x = 20
sm["abstraction"] = "logical resource regions; not an SM circuit layout"
box("GEX_SM_CHASSIS",(0,0,0),(10,8,.3),"substrate",sm,.15)
box("GEX_SM_RIM",(0,0,.17),(9.8,7.8,.1),"edge",sm)
box("GEX_SM_FLOOR",(0,0,.24),(9.5,7.5,.08),"black",sm)
regions = {
    "WARP_SCHEDULER":((0,2.8,.45),(7.6,1.05,.28),"edge"),
    "REGISTER_FILE":((0,1.4,.48),(8.3,.95,.33),"memory"),
    "SHARED_L1":((0,-2.75,.48),(8.4,1.0,.33),"memory"),
    "LOAD_STORE":((3.65,-.45,.46),(1.15,2.3,.3),"data"),
    "TENSOR_UNITS":((1.2,-.45,.46),(2.5,2.3,.3),"compute_side"),
    "EXECUTION_UNITS":((-2.1,-.45,.46),(3.8,2.3,.3),"compute_side"),
}
for name,(pos,size,mat) in regions.items():
    box("GEX_"+name,pos,size,mat,sm)
    empty("GEX_ANCHOR_"+name,sm,(pos[0],pos[1],pos[2]+.55))
for i in range(32):
    box(f"GEX_EXECUTION_RESOURCE_{i:02}",(-3.66+(i%8)*.445,-1.25+(i//8)*.51,.73),(.36,.4,.16),"compute",sm,.015)
for i in range(4):
    box(f"GEX_MATRIX_RESOURCE_{i:02}",(.54+(i%2)*1.25,-.99+(i//2)*1.1,.77),(1.05,.9,.24),"compute",sm)

cameras = empty("GEX_CAMERAS",gex)
for name,pos,target in [
    ("GPU_HERO",(12,-16,15),(0,0,0)),("BOARD",(0,-18,15),(0,0,0)),
    ("DIE",(7,-9,12),(0,0,.5)),("SM_OVERVIEW",(29,-12,14),(20,0,0)),
    ("SM_INSIDE",(20,-8,12),(20,0,0)),("WARP",(0,-7,10),(0,0,0)),
    ("MEMORY",(10,-10,10),(0,0,0)),("TENSOR",(8,-11,13),(0,0,0)),
]:
    data = bpy.data.cameras.new("GEX_CAM_"+name)
    obj = bpy.data.objects.new(data.name,data)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = cameras
    obj.location = pos
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO'
    data.ortho_scale=17
    if name == "GPU_HERO": bpy.context.scene.camera=obj

for name,pos,power,size in [("KEY",(1,-6,14),2300,9),("FILL",(-9,2,7),1700,8),("RIM",(5,8,10),2100,6)]:
    data=bpy.data.lights.new("GEX_LIGHT_"+name,'AREA')
    data.energy=power
    data.shape='DISK'
    data.size=size
    obj=bpy.data.objects.new(data.name,data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.world.color=(.04,.04,.04)
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=64
bpy.context.scene.render.resolution_x=1600
bpy.context.scene.render.resolution_y=1200
bpy.context.scene.render.resolution_percentage=100
for obj in bpy.data.objects:
    if obj.type == 'MESH': obj.data.name = obj.name + '_MESH'
for mesh in list(bpy.data.meshes):
    if mesh.users == 0: bpy.data.meshes.remove(mesh)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/gex-master.blend'))

for tree, filename in [(gpu,'gex-gpu.glb'),(sm,'gex-sm.glb')]:
    old=tree.location.copy()
    tree.location=(0,0,0)
    select_tree(tree)
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,
        export_extras=True,export_cameras=False,export_lights=False,export_animations=False,
        export_yup=True,export_shared_accessors=True)
    tree.location=old

manifest={"version":1,"units":"educational units","axes":"glTF Y-up",
    "abstraction":"educational geometry; not a literal floorplan", "illustrativeSmCount":16,
    "files":[{"file":p.name,"bytes":p.stat().st_size} for p in OUT.glob('*.glb')],
    "source":"blender/build_scene.py", "animationOwner":"web lesson state",
    "anchors":[o.name for o in bpy.data.objects if o.name.startswith('GEX_ANCHOR')],
    "cameras":[o.name for o in bpy.data.objects if o.type=='CAMERA'],
    "meshObjects":sum(1 for o in bpy.data.objects if o.type=='MESH'),
    "uniqueMeshes":len(bpy.data.meshes)}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
