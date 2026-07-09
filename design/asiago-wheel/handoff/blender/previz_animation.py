"""
previz_animation.py — quick motion previz of the Asiago wheel.
Run AFTER build_asiago_wheel.py has built the scene (WheelRoot, HeroCam, Wedge_*).
Animates: wheel spin + camera push-in + one wedge ejecting & lifting.
Renders an EEVEE PNG sequence to handoff/renders/previz/ (assembled to MP4 outside).
"""
import bpy, math
from mathutils import Vector

OUT_DIR = "/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build/design/asiago-wheel/handoff/renders/previz/"
F_START, F_END, FPS = 1, 96, 24
WEDGES = 8

sc = bpy.context.scene
sc.frame_start, sc.frame_end, sc.render.fps = F_START, F_END, FPS

root = bpy.data.objects.get("WheelRoot")
cam  = bpy.data.objects.get("HeroCam")
w0   = bpy.data.objects.get("Wedge_0")

def key(obj, data_path, frame, value, index=-1):
    if index >= 0:
        cur = list(getattr(obj, data_path)); cur[index] = value; setattr(obj, data_path, cur)
    else:
        setattr(obj, data_path, value)
    obj.keyframe_insert(data_path=data_path, frame=frame, index=index)

# --- wheel spin: ease-in-out ~135 degrees ---
if root:
    root.rotation_euler = (0, 0, 0)
    key(root, "rotation_euler", F_START, 0.0, index=2)
    key(root, "rotation_euler", F_END, math.radians(135), index=2)

# --- camera push-in ---
if cam:
    start = Vector((5.2, -5.2, 3.4)); end = Vector((4.2, -4.2, 2.9))
    cam.location = start
    for i in (0, 1, 2): key(cam, "location", F_START, start[i], index=i)
    for i in (0, 1, 2): key(cam, "location", F_END, end[i], index=i)

# --- one wedge ejects + lifts (its cut face presents) around mid-clip ---
if w0:
    mid = math.radians(22.5)                       # wedge-0 bisector (8 wedges)
    out = Vector((0.55*math.cos(mid), 0.55*math.sin(mid), 0.18))
    w0.location = (0, 0, 0)
    for i in (0, 1, 2): key(w0, "location", 30, 0.0 if i < 2 else 0.0, index=i)
    for i in (0, 1, 2): key(w0, "location", 60, out[i], index=i)
    for i in (0, 1, 2): key(w0, "location", F_END, out[i], index=i)
    # small present tilt
    key(w0, "rotation_euler", 30, 0.0, index=0)
    key(w0, "rotation_euler", 60, math.radians(-18), index=0)
    key(w0, "rotation_euler", F_END, math.radians(-18), index=0)

# --- render settings: fast EEVEE PNG sequence ---
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        sc.render.engine = eng; break
    except Exception:
        continue
sc.render.resolution_x, sc.render.resolution_y = 960, 720
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = OUT_DIR + "f_"
try: sc.view_settings.view_transform = "AgX"
except Exception: pass

import os; os.makedirs(OUT_DIR, exist_ok=True)
bpy.ops.render.render(animation=True)
print("[Previz] rendered frames", F_START, "to", F_END, "->", OUT_DIR)
