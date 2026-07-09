"""
wireframe_motion.py — wireframe motion plate to TEACH Higgsfield the rigid tilt.
Run AFTER build_asiago_wheel.py. Renders a clean WIREFRAME of the wheel from a
3/4 reference-style perspective; one wedge tilts UP from its bottom edge to stand,
holds, then LAYS BACK DOWN. Rigid hinge, no morph. EEVEE, square frame.
"""
import bpy, math
from mathutils import Matrix, Vector

R, T, WEDGES = 1.55, 0.50, 8
STEP = 2*math.pi/WEDGES
MID  = STEP/2
TILT = math.radians(90)
F_UP, F_HOLD, F_DOWN, F_END = 32, 48, 80, 80
sc = bpy.context.scene
sc.frame_start, sc.frame_end, sc.render.fps = 1, F_END, 24

root = bpy.data.objects["WheelRoot"]
w0   = bpy.data.objects["Wedge_0"]
cam  = bpy.data.objects["HeroCam"]

# ---- wireframe look: replace bevel with Wireframe modifier + dark emission ----
wire = bpy.data.materials.get("wire_mat") or bpy.data.materials.new("wire_mat")
wire.use_nodes = True
nt = wire.node_tree; nt.nodes.clear()
o = nt.nodes.new("ShaderNodeOutputMaterial"); o.location = (300, 0)
e = nt.nodes.new("ShaderNodeEmission"); e.location = (100, 0)
e.inputs[0].default_value = (0.10, 0.08, 0.06, 1)
nt.links.new(e.outputs[0], o.inputs[0])

for i in range(WEDGES):
    ob = bpy.data.objects.get(f"Wedge_{i}")
    if not ob:
        continue
    for m in list(ob.modifiers):
        if m.type == "BEVEL":
            ob.modifiers.remove(m)
    if "Wire" not in [m.name for m in ob.modifiers]:
        wm = ob.modifiers.new("Wire", "WIREFRAME")
        wm.thickness = 0.012
    ob.data.materials.clear()
    ob.data.materials.append(wire)

# hide ground, flat cream world
g = bpy.data.objects.get("Ground")
if g: g.hide_render = True; g.hide_viewport = True
w = sc.world; w.use_nodes = True
wnt = w.node_tree; wnt.nodes.clear()
wo = wnt.nodes.new("ShaderNodeOutputWorld"); wo.location = (200, 0)
wb = wnt.nodes.new("ShaderNodeBackground"); wb.location = (0, 0)
wb.inputs[0].default_value = (0.96, 0.94, 0.89, 1); wb.inputs[1].default_value = 1.0
wnt.links.new(wb.outputs[0], wo.inputs[0])

# ---- tilt pivot at Wedge_0 outer-bottom edge ----
c, s = math.cos(MID), math.sin(MID)
P = Vector((R*c, R*s, -T/2))
X = Vector((-s, c, 0)).normalized(); Z = Vector((0,0,1)); Y = Z.cross(X).normalized()
M = Matrix(((X.x,Y.x,Z.x,P.x),(X.y,Y.y,Z.y,P.y),(X.z,Y.z,Z.z,P.z),(0,0,0,1)))
pivot = bpy.data.objects.get("TiltPivot") or bpy.data.objects.new("TiltPivot", None)
if pivot.name not in bpy.context.scene.collection.all_objects:
    root.users_collection[0].objects.link(pivot)
pivot.parent = root; pivot.matrix_parent_inverse = root.matrix_world.inverted()
pivot.matrix_world = M
w0.parent = pivot; w0.matrix_parent_inverse = pivot.matrix_world.inverted()

def key(o, path, frame, value, index=-1):
    if index >= 0:
        v = list(getattr(o, path)); v[index] = value; setattr(o, path, v)
    else:
        setattr(o, path, value)
    o.keyframe_insert(data_path=path, frame=frame, index=index)

# tilt UP, hold, LAY DOWN
key(pivot, "rotation_euler", 1,      0.0,  index=0)
key(pivot, "rotation_euler", F_UP,   TILT, index=0)
key(pivot, "rotation_euler", F_HOLD, TILT, index=0)
key(pivot, "rotation_euler", F_DOWN, 0.0,  index=0)

# ---- camera: 3/4 front of the tilting wedge, slightly above (reference-ish) ----
target = bpy.data.objects.get("CamTarget") or bpy.data.objects.new("CamTarget", None)
if target.name not in bpy.context.scene.collection.all_objects:
    root.users_collection[0].objects.link(target)
target.location = (R*0.5*c, R*0.5*s, 0.55)
out = Vector((c, s, 0)); D, H = 6.2, 1.9
cam.location = (out.x*D, out.y*D, H)
for con in list(cam.constraints):
    cam.constraints.remove(con)
ct = cam.constraints.new('TRACK_TO'); ct.target = target
ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
cam.data.lens = 55

for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try: sc.render.engine = eng; break
    except Exception: continue
sc.render.resolution_x, sc.render.resolution_y = 1024, 1024
try: sc.view_settings.view_transform = "Standard"
except Exception: pass
print("[Wireframe] tilt-up + lay-down motion plate ready.")
