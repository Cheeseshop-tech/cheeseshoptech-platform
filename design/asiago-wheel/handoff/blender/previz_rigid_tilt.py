"""
previz_rigid_tilt.py — the RIGID wedge tilt (Track A motion, Blender).
Run AFTER build_asiago_wheel.py (8 wedges, EJECT_WEDGE=-1 = whole wheel).
Motion: wheel makes >half-turn (camera locked wide) -> ONE wedge tilts up RIGIDLY
on its outer/lower edge (a clean hinge, no slide, no morph, wheel stays whole) ->
camera zoom-in (recoil settle) -> slow flyover. Sets up rig + keyframes ONLY
(does not render — render separately so we can test a frame first).
"""
import bpy, math
from mathutils import Matrix, Vector

R, T, WEDGES = 1.55, 0.50, 8
STEP = 2*math.pi/WEDGES
MID  = STEP/2                      # Wedge_0 bisector = 22.5 deg
TILT = math.radians(88)           # stand-up angle (flip sign if it tilts the wrong way)
CAM_FRONT_AZ = math.atan2(-5.2, 5.2)   # camera azimuth ~ -45deg (315)
SPIN = CAM_FRONT_AZ - MID          # rotate Wedge_0 bisector to face camera
# ensure AT LEAST a half turn while still ending facing the camera (+292.5 deg)
if abs(SPIN) < math.pi:
    SPIN += (2*math.pi if SPIN < 0 else -2*math.pi)

F_SPIN_END, F_TILT_END, F_ZOOM_END, F_END = 55, 80, 100, 120
sc = bpy.context.scene
sc.frame_start, sc.frame_end, sc.render.fps = 1, F_END, 24

root = bpy.data.objects["WheelRoot"]
w0   = bpy.data.objects["Wedge_0"]
cam  = bpy.data.objects["HeroCam"]

# --- build the tilt pivot at Wedge_0's outer-bottom edge midpoint ---
c, s = math.cos(MID), math.sin(MID)
P = Vector((R*c, R*s, -T/2))            # outer bottom edge midpoint
X = Vector((-s,  c, 0)).normalized()    # rim tangent (tilt axis)
Z = Vector((0, 0, 1))
Y = Z.cross(X).normalized()             # = inward (-radial)
M = Matrix(((X.x, Y.x, Z.x, P.x),
            (X.y, Y.y, Z.y, P.y),
            (X.z, Y.z, Z.z, P.z),
            (0,   0,   0,   1)))

pivot = bpy.data.objects.get("TiltPivot")
if pivot is None:
    pivot = bpy.data.objects.new("TiltPivot", None)
    root.users_collection[0].objects.link(pivot)
pivot.empty_display_size = 0.2
pivot.parent = root
pivot.matrix_parent_inverse = root.matrix_world.inverted()
pivot.matrix_world = M

# reparent Wedge_0 under the pivot, keeping it in place
w0.parent = pivot
w0.matrix_parent_inverse = pivot.matrix_world.inverted()

# --- keyframes ---
def key(o, path, frame, value, index=-1):
    if index >= 0:
        v = list(getattr(o, path)); v[index] = value; setattr(o, path, v)
    else:
        setattr(o, path, value)
    o.keyframe_insert(data_path=path, frame=frame, index=index)

# wheel half-turn+ (camera locked wide), ease-in-out
key(root, "rotation_euler", 1, 0.0, index=2)
key(root, "rotation_euler", F_SPIN_END, SPIN, index=2)
# rigid wedge tilt up on its outer edge, then hold
key(pivot, "rotation_euler", F_SPIN_END, 0.0, index=0)
key(pivot, "rotation_euler", F_TILT_END, TILT, index=0)
key(pivot, "rotation_euler", F_END, TILT, index=0)

# camera: LOCKED WIDE during spin, then zoom-in (slight overshoot recoil), then flyover
wide  = Vector((5.2, -5.2, 3.4))
zoomA = Vector((2.3, -2.5, 1.9))   # overshoot (closer)
zoom  = Vector((2.7, -2.9, 2.1))   # settle back = recoil
fly   = Vector((0.8, -3.2, 1.8))   # flyover around
def camkey(frame, p):
    for i in (0,1,2): key(cam, "location", frame, p[i], index=i)
camkey(1, wide); camkey(F_SPIN_END, wide)      # locked wide through the rotation
camkey(F_TILT_END, wide)                        # still wide while it stands
camkey(F_TILT_END+12, zoomA)                    # snap in (overshoot)
camkey(F_ZOOM_END, zoom)                         # recoil settle
camkey(F_END, fly)                               # flyover

# EEVEE clay previz to PROVE the mechanic (look-dev comes after)
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try: sc.render.engine = eng; break
    except Exception: continue
sc.render.resolution_x, sc.render.resolution_y = 1280, 720   # 16:9

print(f"[RigidTilt] rig + keys set. SPIN={math.degrees(SPIN):.1f} deg, TILT={math.degrees(TILT):.0f} deg.")
