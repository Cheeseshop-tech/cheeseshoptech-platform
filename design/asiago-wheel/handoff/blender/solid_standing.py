"""
solid_standing.py — SOLID clay-cheese standing motion (restyle seed for Higgsfield
Method A). Run AFTER build_asiago_wheel.py. Same rig/camera/motion as
outline_motion.py, but KEEPS the build's procedural paste/rind materials and
lights (solid shaded form) instead of the outline. EEVEE, photo perspective,
wedge right-of-center.
"""
import bpy, math
from mathutils import Matrix, Vector

R, T, WEDGES = 1.55, 0.50, 8
STEP = 2*math.pi/WEDGES
MID  = STEP/2
TILT = math.radians(90)
ELEV = math.radians(30)
BASE_SPIN = math.radians(42)   # right-of-center (photo match)
F_END = 80
sc = bpy.context.scene
sc.frame_start, sc.frame_end, sc.render.fps = 1, F_END, 24

root = bpy.data.objects["WheelRoot"]
w0   = bpy.data.objects["Wedge_0"]
cam  = bpy.data.objects["HeroCam"]
root.rotation_euler = (0, 0, BASE_SPIN)

# tilt pivot at Wedge_0 outer-bottom edge (same hinge as the outline plate)
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

key(pivot, "rotation_euler", 1, 0.0, index=0)
key(pivot, "rotation_euler", 8, 0.0, index=0)
key(pivot, "rotation_euler", 48, TILT, index=0)
key(pivot, "rotation_euler", F_END, TILT, index=0)

# camera = photo perspective (same as outline plate)
target = bpy.data.objects.get("CamTarget") or bpy.data.objects.new("CamTarget", None)
if target.name not in bpy.context.scene.collection.all_objects:
    root.users_collection[0].objects.link(target)
target.location = (0.0, 0.0, 0.35)
Dh = 6.3
cam.location = (c*Dh, s*Dh, Dh*math.tan(ELEV) + 0.30)
for con in list(cam.constraints):
    cam.constraints.remove(con)
ct = cam.constraints.new('TRACK_TO'); ct.target = target
ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
cam.data.lens = 52

# SOLID shaded (keep build's cheese materials + lights), EEVEE for speed
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try: sc.render.engine = eng; break
    except Exception: continue
sc.render.use_freestyle = False
sc.render.resolution_x, sc.render.resolution_y = 1024, 1024
try: sc.view_settings.view_transform = "AgX"
except Exception: pass
print("[Solid] clay-cheese standing motion ready (restyle seed).")
