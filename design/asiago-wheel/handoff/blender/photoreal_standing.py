"""
photoreal_standing.py — PHOTOREAL look-dev for the standing wedge (Track A, Blender).
Run AFTER build_asiago_wheel.py. Overrides materials with photoreal paste/rind,
sets a soft studio light rig (matches the soft cream reference), keeps the rigid
hinge + photo camera, Cycles. Renders the standing HERO STILL (frame 48) to dial
the look; switch to animation once approved.
"""
import bpy, math
from mathutils import Matrix, Vector

R, T, WEDGES = 1.55, 0.50, 8
STEP = 2*math.pi/WEDGES; MID = STEP/2
TILT = math.radians(90); ELEV = math.radians(30); BASE_SPIN = math.radians(42)
F_END = 80
sc = bpy.context.scene
TEX = "/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build/design/asiago-wheel/textures/"

def load_img(name, noncolor=False):
    img = bpy.data.images.load(TEX + name, check_existing=True)
    if noncolor:
        try: img.colorspace_settings.name = "Non-Color"
        except Exception: pass
    return img

def setp(node, **kw):
    alias = {"Subsurface": ["Subsurface Weight", "Subsurface"],
             "Coat": ["Coat Weight", "Coat"],
             "Coat Roughness": ["Coat Roughness"],
             "Specular": ["Specular IOR Level", "Specular"]}
    for k, v in kw.items():
        for n in alias.get(k, [k]):
            if n in node.inputs:
                try: node.inputs[n].default_value = v
                except Exception: pass
                break

# ---------- PHOTOREAL PASTE (cut faces) ----------
def paste_mat():
    m = bpy.data.materials.get("asiago_paste") or bpy.data.materials.new("asiago_paste")
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (800, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled"); bsdf.location = (520, 0)
    setp(bsdf, **{"Roughness": 0.46, "Subsurface": 0.28,
                  "Subsurface Radius": (0.40, 0.26, 0.13), "Coat": 0.08, "Coat Roughness": 0.5})
    tex = nt.nodes.new("ShaderNodeTexCoord"); tex.location = (-800, 0)
    # albedo: two-tone straw with mottling
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.location = (-560, 180)
    nz.inputs["Scale"].default_value = 5.0; nz.inputs["Detail"].default_value = 4.0
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.location = (-300, 180)
    ramp.color_ramp.elements[0].color = (0.60, 0.44, 0.18, 1)   # deeper golden
    ramp.color_ramp.elements[1].color = (0.86, 0.70, 0.38, 1)
    # fine crystalline grain (bump) + sparse small holes
    grain = nt.nodes.new("ShaderNodeTexNoise"); grain.location = (-560, -120)
    grain.inputs["Scale"].default_value = 45.0; grain.inputs["Detail"].default_value = 9.0
    holes = nt.nodes.new("ShaderNodeTexVoronoi"); holes.location = (-560, -340)
    holes.inputs["Scale"].default_value = 11.0
    hramp = nt.nodes.new("ShaderNodeValToRGB"); hramp.location = (-340, -340)
    hramp.color_ramp.elements[0].position = 0.0; hramp.color_ramp.elements[0].color = (0,0,0,1)
    hramp.color_ramp.elements[1].position = 0.08; hramp.color_ramp.elements[1].color = (1,1,1,1)
    mix = nt.nodes.new("ShaderNodeMixRGB"); mix.location = (-100, -240); mix.blend_type = "ADD"; mix.inputs["Fac"].default_value = 1.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (180, -200); bump.inputs["Strength"].default_value = 0.55
    L = nt.links.new
    L(tex.outputs["Object"], nz.inputs["Vector"]); L(tex.outputs["Object"], grain.inputs["Vector"]); L(tex.outputs["Object"], holes.inputs["Vector"])
    L(nz.outputs["Fac"], ramp.inputs["Fac"]); L(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    L(holes.outputs["Distance"], hramp.inputs["Fac"])
    L(grain.outputs["Fac"], mix.inputs["Color1"]); L(hramp.outputs["Color"], mix.inputs["Color2"])
    L(mix.outputs["Color"], bump.inputs["Height"]); L(bump.outputs["Normal"], bsdf.inputs["Normal"])
    L(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m

# ---------- PHOTOREAL RIND ----------
def rind_mat():
    m = bpy.data.materials.get("asiago_rind") or bpy.data.materials.new("asiago_rind")
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (700, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled"); bsdf.location = (450, 0)
    setp(bsdf, **{"Roughness": 0.86, "Subsurface": 0.05})
    tex = nt.nodes.new("ShaderNodeTexCoord"); tex.location = (-760, 0)
    cn = nt.nodes.new("ShaderNodeTexNoise"); cn.location = (-520, 160); cn.inputs["Scale"].default_value = 3.0
    cr = nt.nodes.new("ShaderNodeValToRGB"); cr.location = (-280, 160)
    cr.color_ramp.elements[0].color = (0.28, 0.17, 0.07, 1); cr.color_ramp.elements[1].color = (0.50, 0.33, 0.15, 1)
    pn = nt.nodes.new("ShaderNodeTexNoise"); pn.location = (-520, -160); pn.inputs["Scale"].default_value = 26.0; pn.inputs["Detail"].default_value = 9.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (180, -160); bump.inputs["Strength"].default_value = 0.7
    L = nt.links.new
    L(tex.outputs["Object"], cn.inputs["Vector"]); L(tex.outputs["Object"], pn.inputs["Vector"])
    L(cn.outputs["Fac"], cr.inputs["Fac"]); L(cr.outputs["Color"], bsdf.inputs["Base Color"])
    L(pn.outputs["Fac"], bump.inputs["Height"]); L(bump.outputs["Normal"], bsdf.inputs["Normal"])
    L(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m

paste_mat(); rind_mat()

# ---------- SOFT STUDIO LIGHT (match the soft cream reference) ----------
# remove the build's area lights, add one big soft key + a fill; bright cream world
for o in list(bpy.data.objects):
    if o.type == "LIGHT" and o.name in ("Key", "Fill", "Rim", "Light") or (o.type=="LIGHT" and o.name.startswith(("Key","Fill","Rim"))):
        bpy.data.objects.remove(o, do_unlink=True)
coll = bpy.data.objects["WheelRoot"].users_collection[0]
def area(name, loc, energy, size, rot):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size
    l.color = (1.0, 0.98, 0.95)
    o = bpy.data.objects.new(name, l); o.location = loc; o.rotation_euler = rot
    coll.objects.link(o); return o
area("KeySoft",  (3.5, -4.5, 6.0), 380, 7.0, (math.radians(48), 0, math.radians(35)))
area("FillSoft", (-4.0, -3.0, 3.5), 120, 9.0, (math.radians(60), 0, math.radians(-30)))
w = sc.world; w.use_nodes = True
wnt = w.node_tree; wnt.nodes.clear()
wo = wnt.nodes.new("ShaderNodeOutputWorld"); wo.location = (200,0)
wb = wnt.nodes.new("ShaderNodeBackground"); wb.location = (0,0)
wb.inputs[0].default_value = (0.97, 0.95, 0.90, 1); wb.inputs[1].default_value = 0.22
wnt.links.new(wb.outputs[0], wo.inputs[0])
# enlarge the ground sweep so its far edge (horizon line) stays out of frame
g = bpy.data.objects.get("Ground")
if g: g.scale = (4.0, 4.0, 1.0)

# ---------- rig: rigid hinge + photo camera (same as outline/solid) ----------
root = bpy.data.objects["WheelRoot"]; w0 = bpy.data.objects["Wedge_0"]; cam = bpy.data.objects["HeroCam"]
root.rotation_euler = (0, 0, BASE_SPIN)
c, s = math.cos(MID), math.sin(MID)
P = Vector((R*c, R*s, -T/2)); X = Vector((-s, c, 0)).normalized(); Z = Vector((0,0,1)); Y = Z.cross(X).normalized()
M = Matrix(((X.x,Y.x,Z.x,P.x),(X.y,Y.y,Z.y,P.y),(X.z,Y.z,Z.z,P.z),(0,0,0,1)))
pivot = bpy.data.objects.get("TiltPivot") or bpy.data.objects.new("TiltPivot", None)
if pivot.name not in sc.collection.all_objects: coll.objects.link(pivot)
pivot.parent = root; pivot.matrix_parent_inverse = root.matrix_world.inverted(); pivot.matrix_world = M
w0.parent = pivot; w0.matrix_parent_inverse = pivot.matrix_world.inverted()
def key(o, path, f, v, i=-1):
    if i >= 0: cur=list(getattr(o,path)); cur[i]=v; setattr(o,path,cur)
    else: setattr(o,path,v)
    o.keyframe_insert(data_path=path, frame=f, index=i)
key(pivot,"rotation_euler",1,0.0,0); key(pivot,"rotation_euler",8,0.0,0)
key(pivot,"rotation_euler",48,TILT,0); key(pivot,"rotation_euler",F_END,TILT,0)
tgt = bpy.data.objects.get("CamTarget") or bpy.data.objects.new("CamTarget", None)
if tgt.name not in sc.collection.all_objects: coll.objects.link(tgt)
tgt.location = (0,0,0.35)
Dh = 6.3; cam.location = (c*Dh, s*Dh, Dh*math.tan(ELEV)+0.30)
for con in list(cam.constraints): cam.constraints.remove(con)
ct = cam.constraints.new('TRACK_TO'); ct.target = tgt; ct.track_axis='TRACK_NEGATIVE_Z'; ct.up_axis='UP_Y'
cam.data.lens = 60

# ---------- Cycles photoreal render ----------
sc.render.engine = 'CYCLES'
try: sc.cycles.device = 'GPU'
except Exception: pass
sc.cycles.samples = 256; sc.cycles.use_denoising = True
sc.render.use_freestyle = False
sc.render.resolution_x = sc.render.resolution_y = 1280
try: sc.view_settings.view_transform = "AgX"
except Exception: pass
sc.view_settings.exposure = -0.7
try: sc.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass
sc.frame_set(48)
print("[Photoreal] standing look-dev ready (frame 48 = standing).")
