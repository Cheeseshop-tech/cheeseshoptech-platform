"""
outline_motion.py — clean OUTLINE motion plate (Freestyle), photo perspective.
Run AFTER build_asiago_wheel.py. Pure line-art of the wheel + wedge (no fill, no
dense wireframe). One wedge tilts UP from its bottom edge to stand, holds, LAYS
back DOWN. Camera matched to the reference-photo 3/4 perspective. EEVEE, 1:1.
"""
import bpy, math
from mathutils import Matrix, Vector

R, T, WEDGES = 1.55, 0.50, 8
STEP = 2*math.pi/WEDGES
MID  = STEP/2
TILT = math.radians(90)
F_UP, F_HOLD, F_DOWN, F_END = 32, 48, 80, 80
ELEV = math.radians(30)      # camera elevation ~ reference photo
BASE_SPIN = math.radians(0)  # 0 = wedge stands at CENTER; +42 = right of center (photo match)
sc = bpy.context.scene
sc.frame_start, sc.frame_end, sc.render.fps = 1, F_END, 24

root = bpy.data.objects["WheelRoot"]
w0   = bpy.data.objects["Wedge_0"]
cam  = bpy.data.objects["HeroCam"]
root.rotation_euler = (0, 0, BASE_SPIN)   # offset so the tilting wedge sits right of center
CREAM = (0.96, 0.94, 0.89, 1)

# ---- flat cream fill (= background) so only Freestyle OUTLINES show ----
flat = bpy.data.materials.get("flat_cream") or bpy.data.materials.new("flat_cream")
flat.use_nodes = True
nt = flat.node_tree; nt.nodes.clear()
o = nt.nodes.new("ShaderNodeOutputMaterial"); o.location = (300, 0)
e = nt.nodes.new("ShaderNodeEmission"); e.location = (100, 0); e.inputs[0].default_value = CREAM
nt.links.new(e.outputs[0], o.inputs[0])

for i in range(WEDGES):
    ob = bpy.data.objects.get(f"Wedge_{i}")
    if not ob:
        continue
    for m in list(ob.modifiers):
        if m.type in ("WIREFRAME", "BEVEL"):
            ob.modifiers.remove(m)          # sharp single-line edges, no wire tubes
    ob.data.materials.clear(); ob.data.materials.append(flat)

g = bpy.data.objects.get("Ground")
if g: g.hide_render = True; g.hide_viewport = True

w = sc.world; w.use_nodes = True
wnt = w.node_tree; wnt.nodes.clear()
wo = wnt.nodes.new("ShaderNodeOutputWorld"); wo.location = (200, 0)
wb = wnt.nodes.new("ShaderNodeBackground"); wb.location = (0, 0)
wb.inputs[0].default_value = CREAM; wb.inputs[1].default_value = 1.0
wnt.links.new(wb.outputs[0], wo.inputs[0])

# ---- Freestyle outlines (silhouette + borders + creases) ----
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try: sc.render.engine = eng; break
    except Exception: continue
sc.render.use_freestyle = True
sc.render.line_thickness_mode = "ABSOLUTE"
sc.render.line_thickness = 1.0
vl = bpy.context.view_layer
vl.use_freestyle = True
fs = vl.freestyle_settings
if fs.linesets:
    ls = fs.linesets[0]
    ls.select_silhouette = True; ls.select_border = True
    ls.select_crease = True; ls.select_edge_mark = False
    ls.linestyle.color = (0.11, 0.09, 0.06); ls.linestyle.thickness = 2.4

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

key(pivot, "rotation_euler", 1, 0.0, index=0)     # lying flat
key(pivot, "rotation_euler", 8, 0.0, index=0)     # brief settle before it rises
key(pivot, "rotation_euler", 48, TILT, index=0)   # rigid 90 deg hinge -> standing
key(pivot, "rotation_euler", F_END, TILT, index=0)  # HOLD standing to the end

# ---- camera: reference-photo 3/4, elevation ~30 deg, wedge facing camera ----
target = bpy.data.objects.get("CamTarget") or bpy.data.objects.new("CamTarget", None)
if target.name not in bpy.context.scene.collection.all_objects:
    root.users_collection[0].objects.link(target)
target.location = (0.0, 0.0, 0.35)   # aim at wheel center; wedge sits off to the right
Dh = 6.3
cam.location = (c*Dh, s*Dh, Dh*math.tan(ELEV) + 0.30)
for con in list(cam.constraints):
    cam.constraints.remove(con)
ct = cam.constraints.new('TRACK_TO'); ct.target = target
ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
cam.data.lens = 52

sc.render.resolution_x, sc.render.resolution_y = 1024, 1024
try: sc.view_settings.view_transform = "Standard"
except Exception: pass
print("[Outline] photo-perspective outline plate ready (tilt up + lay down).")
