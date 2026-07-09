"""
build_asiago_wheel.py  —  one-click procedural Asiago wheel for Blender
=======================================================================
CheeseShop TECH · Asiago wheel, Stage-3 build (matches the prototype specs in
ASIAGO_WHEEL_BLENDER_BUILD.md).

HOW TO RUN
  1. Open Blender (3.6+ or 4.x).
  2. Scripting workspace → New → paste this file (or Text > Open this .py).
  3. Press "Run Script" (or Alt+P).
  The wheel builds at the origin: 7 separate wedge objects, apex at world
  origin, beveled edges, procedural paste + rind materials, 3-point studio
  light rig, a 50mm camera, and Cycles + AgX set up for a hero render.

WHAT YOU GET
  - Collection "AsiagoWheel" with Wedge_0 .. Wedge_6 (each a separate object,
    apex at origin, so the Three.js runtime can seat + eject them).
  - "WheelRoot" empty as the parent/pivot.
  - Materials "asiago_paste" (the two radial cut faces) and "asiago_rind"
    (curved arc + top + bottom), fully procedural — infinite res, no textures
    needed to start. Swap in Substance maps later per the build doc.
  - Optional ejected hero pose (EJECT_WEDGE) and a ground sweep.

TWEAK THESE FIRST
"""

import bpy, bmesh, math
from mathutils import Vector

# ----------------------------------------------------------------------------
# PARAMETERS  (defaults match the prototype: R=1.55, T=0.5, 7 wedges)
# ----------------------------------------------------------------------------
WEDGES      = 8          # one per portal app (Dashboard…Content Studio). Seat angle = 45°.
RADIUS      = 1.55       # wheel radius (matches R=1.55 in the runtime)
THICKNESS   = 0.50       # wheel height  (matches T=0.5)
ARC_SEGS    = 48         # smoothness of the curved rind (per full circle)
GAP_DEG     = 0.4        # tiny gap between wedges so cuts read as separate slices
BEVEL_WIDTH = 0.012      # the realism tell — real cheese isn't razor sharp
BEVEL_SEGS  = 3
EJECT_WEDGE = -1         # -1 = whole seated wheel (for animation); set 0+ for a static hero eject
EJECT_DIST  = 0.55       # how far the ejected wedge slides out (along its bisector)
ADD_GROUND  = True
ADD_LIGHTS  = True
ADD_CAMERA  = True
SETUP_RENDER = True

PASTE_COLOR = (0.886, 0.808, 0.518, 1.0)   # ~#E2CE84 pale straw
RIND_COLOR  = (0.560, 0.380, 0.180, 1.0)   # ~#8F6130 tan-brown

COLL_NAME = "AsiagoWheel"


# ----------------------------------------------------------------------------
# small helpers
# ----------------------------------------------------------------------------
def get_clean_collection(name):
    """Remove a prior build of this collection, return a fresh one linked to scene."""
    old = bpy.data.collections.get(name)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


def set_principled(node, **kwargs):
    """Set Principled BSDF inputs by name, tolerating Blender 3.x/4.x renames."""
    aliases = {
        "Subsurface": ["Subsurface Weight", "Subsurface"],
        "Subsurface Radius": ["Subsurface Radius"],
        "Specular": ["Specular IOR Level", "Specular"],
    }
    for key, val in kwargs.items():
        names = aliases.get(key, [key])
        for n in names:
            if n in node.inputs:
                try:
                    node.inputs[n].default_value = val
                except Exception:
                    pass
                break


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------
def make_paste_material():
    mat = bpy.data.materials.get("asiago_paste") or bpy.data.materials.new("asiago_paste")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial");      out.location = (600, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled");     bsdf.location = (300, 0)
    set_principled(bsdf, **{
        "Base Color": PASTE_COLOR,
        "Roughness": 0.40,
        "Subsurface": 0.22,
        "Subsurface Radius": (0.32, 0.20, 0.10),
        "Coat Weight": 0.12,
        "Coat Roughness": 0.5,
    })
    # crystalline "eyes": Voronoi -> Bump (more pronounced, irregular)
    tex = nt.nodes.new("ShaderNodeTexCoord");            tex.location = (-600, -100)
    vor = nt.nodes.new("ShaderNodeTexVoronoi");          vor.location = (-380, -100)
    vor.inputs["Scale"].default_value = 15.0
    bump = nt.nodes.new("ShaderNodeBump");               bump.location = (0, -150)
    bump.inputs["Strength"].default_value = 0.30
    # subtle albedo variation
    noise = nt.nodes.new("ShaderNodeTexNoise");          noise.location = (-380, 160)
    noise.inputs["Scale"].default_value = 6.0
    ramp = nt.nodes.new("ShaderNodeValToRGB");           ramp.location = (-120, 160)
    ramp.color_ramp.elements[0].color = (0.78, 0.69, 0.40, 1)
    ramp.color_ramp.elements[1].color = PASTE_COLOR
    nt.links.new(tex.outputs["Object"], vor.inputs["Vector"])
    nt.links.new(tex.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_rind_material():
    mat = bpy.data.materials.get("asiago_rind") or bpy.data.materials.new("asiago_rind")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial");      out.location = (600, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled");     bsdf.location = (300, 0)
    set_principled(bsdf, **{"Base Color": RIND_COLOR, "Roughness": 0.88, "Subsurface": 0.0})
    tex = nt.nodes.new("ShaderNodeTexCoord");            tex.location = (-700, -100)
    # pitted skin: fine noise -> bump
    noise = nt.nodes.new("ShaderNodeTexNoise");          noise.location = (-460, -120)
    noise.inputs["Scale"].default_value = 11.0
    noise.inputs["Detail"].default_value = 8.0
    bump = nt.nodes.new("ShaderNodeBump");               bump.location = (0, -160)
    bump.inputs["Strength"].default_value = 0.55
    # blotchy color variation: coarse noise -> ramp tan..brown
    cnoise = nt.nodes.new("ShaderNodeTexNoise");         cnoise.location = (-460, 160)
    cnoise.inputs["Scale"].default_value = 3.5
    cramp = nt.nodes.new("ShaderNodeValToRGB");          cramp.location = (-200, 160)
    cramp.color_ramp.elements[0].color = (0.42, 0.27, 0.12, 1)   # darker brown
    cramp.color_ramp.elements[1].color = (0.62, 0.43, 0.22, 1)   # lighter tan
    nt.links.new(tex.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(tex.outputs["Object"], cnoise.inputs["Vector"])
    nt.links.new(cnoise.outputs["Fac"], cramp.inputs["Fac"])
    nt.links.new(cramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


# ----------------------------------------------------------------------------
# geometry — one wedge sector, apex at origin
# ----------------------------------------------------------------------------
def build_wedge(name, a0, a1, paste_mat, rind_mat, coll):
    """Build a sector from angle a0..a1 (radians), apex at origin, Z up.
    Face material slots: 0 = paste (radial cut faces), 1 = rind (arc/top/bottom)."""
    half = THICKNESS / 2.0
    segs = max(2, int(round(ARC_SEGS * (a1 - a0) / (2 * math.pi))))
    bm = bmesh.new()

    apex_t = bm.verts.new((0, 0,  half))
    apex_b = bm.verts.new((0, 0, -half))
    top_arc, bot_arc = [], []
    for i in range(segs + 1):
        a = a0 + (a1 - a0) * i / segs
        x, y = RADIUS * math.cos(a), RADIUS * math.sin(a)
        top_arc.append(bm.verts.new((x, y,  half)))
        bot_arc.append(bm.verts.new((x, y, -half)))
    bm.verts.ensure_lookup_table()

    faces_paste, faces_rind = [], []
    # top fan + bottom fan (RIND)
    for i in range(segs):
        faces_rind.append(bm.faces.new((apex_t, top_arc[i], top_arc[i + 1])))
        faces_rind.append(bm.faces.new((apex_b, bot_arc[i + 1], bot_arc[i])))
    # outer curved arc (RIND)
    for i in range(segs):
        faces_rind.append(bm.faces.new((top_arc[i], bot_arc[i], bot_arc[i + 1], top_arc[i + 1])))
    # two radial CUT faces (PASTE)
    faces_paste.append(bm.faces.new((apex_t, apex_b, bot_arc[0], top_arc[0])))
    faces_paste.append(bm.faces.new((apex_t, top_arc[-1], bot_arc[-1], apex_b)))

    bm.normal_update()
    # recalc outward normals
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)

    # material slots: 0 paste, 1 rind
    obj.data.materials.append(paste_mat)
    obj.data.materials.append(rind_mat)
    # assign slot indices (paste faces were the last 2 built)
    nfaces = len(obj.data.polygons)
    for poly in obj.data.polygons:
        poly.material_index = 0 if poly.index >= nfaces - 2 else 1
    for poly in obj.data.polygons:
        poly.use_smooth = True

    # bevel + a touch of subdivision for the curve, via modifiers (non-destructive)
    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = BEVEL_WIDTH
    bev.segments = BEVEL_SEGS
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(30)
    return obj


# ----------------------------------------------------------------------------
# scene assembly
# ----------------------------------------------------------------------------
def build():
    coll = get_clean_collection(COLL_NAME)
    # remove default starter objects so they don't block the wheel
    for stray in ("Cube",):
        o = bpy.data.objects.get(stray)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)
    paste_mat, rind_mat = make_paste_material(), make_rind_material()

    root = bpy.data.objects.new("WheelRoot", None)   # empty pivot
    root.empty_display_size = 0.3
    coll.objects.link(root)

    step = 2 * math.pi / WEDGES
    gap = math.radians(GAP_DEG)
    wedges = []
    for i in range(WEDGES):
        a0 = i * step + gap / 2
        a1 = (i + 1) * step - gap / 2
        w = build_wedge(f"Wedge_{i}", a0, a1, paste_mat, rind_mat, coll)
        w.parent = root
        wedges.append((i, a0, a1, w))

    # optional ejected hero pose: slide one wedge out along its bisector
    if 0 <= EJECT_WEDGE < WEDGES:
        i, a0, a1, w = wedges[EJECT_WEDGE]
        mid = (a0 + a1) / 2
        w.location = (EJECT_DIST * math.cos(mid), EJECT_DIST * math.sin(mid), 0)

    if ADD_GROUND:
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -THICKNESS / 2))
        ground = bpy.context.active_object
        ground.name = "Ground"
        gmat = bpy.data.materials.new("ground_sweep")
        gmat.use_nodes = True
        bsdf = gmat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            set_principled(bsdf, **{"Base Color": (0.92, 0.90, 0.86, 1), "Roughness": 0.8})
        ground.data.materials.append(gmat)
        for c in ground.users_collection:
            c.objects.unlink(ground)
        coll.objects.link(ground)

    if ADD_LIGHTS:
        def add_area(name, loc, energy, size, color):
            l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
            o = bpy.data.objects.new(name, l); o.location = loc
            o.rotation_euler = (math.radians(55), 0, math.radians(35))
            coll.objects.link(o)
            ct = o.constraints.new('TRACK_TO'); ct.target = root
            ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
            return o
        add_area("Key",  ( 4,  -3, 5), 1700, 4.0, (1.0, 0.97, 0.92))   # warm key upper-right
        add_area("Fill", (-4,  -2, 3),  450, 6.0, (0.92, 0.95, 1.0))   # cool fill
        add_area("Rim",  ( 0,   5, 4), 1000, 3.0, (1.0, 0.93, 0.82))   # warm rim/back

    if ADD_CAMERA:
        cam_data = bpy.data.cameras.new("HeroCam"); cam_data.lens = 50
        cam = bpy.data.objects.new("HeroCam", cam_data)
        cam.location = (5.2, -5.2, 3.4)
        coll.objects.link(cam)
        ct = cam.constraints.new('TRACK_TO'); ct.target = root
        ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
        bpy.context.scene.camera = cam

    if SETUP_RENDER:
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        try: sc.cycles.device = 'GPU'
        except Exception: pass
        sc.cycles.samples = 768
        sc.cycles.use_denoising = True
        sc.render.resolution_x, sc.render.resolution_y = 2560, 1920
        try: sc.view_settings.view_transform = 'AgX'
        except Exception: sc.view_settings.view_transform = 'Filmic'
        # soft neutral world so it isn't black before you add an HDRI
        world = sc.world or bpy.data.worlds.new("World"); sc.world = world
        world.use_nodes = True
        wnt = world.node_tree
        wnt.nodes.clear()
        wout = wnt.nodes.new("ShaderNodeOutputWorld");  wout.location = (400, 0)
        bg = wnt.nodes.new("ShaderNodeBackground");     bg.location = (200, 0)
        bg.inputs[1].default_value = 1.0
        # soft studio gradient backdrop -> graded reflections
        tc = wnt.nodes.new("ShaderNodeTexCoord");       tc.location = (-400, 0)
        grad = wnt.nodes.new("ShaderNodeTexGradient");  grad.location = (-200, 0)
        grad.gradient_type = "QUADRATIC_SPHERE"
        wramp = wnt.nodes.new("ShaderNodeValToRGB");    wramp.location = (0, -120)
        wramp.color_ramp.elements[0].color = (0.55, 0.52, 0.48, 1)  # dim warm edge
        wramp.color_ramp.elements[1].color = (0.98, 0.96, 0.92, 1)  # bright center
        wnt.links.new(tc.outputs["Window"], grad.inputs["Vector"])
        wnt.links.new(grad.outputs["Color"], wramp.inputs["Fac"])
        wnt.links.new(wramp.outputs["Color"], bg.inputs[0])
        wnt.links.new(bg.outputs[0], wout.inputs[0])

    print(f"[Asiago] Built {WEDGES} wedges, R={RADIUS}, T={THICKNESS}. "
          f"Add a studio HDRI to the World for the photoreal pass.")


if __name__ == "__main__":
    build()

# ----------------------------------------------------------------------------
# NOTE — 7 vs 8 wedges
#   The prototype/runtime is built for 7 wedges (one per portal tool). Your live
#   CST nav has ~8 apps (Dashboard, Campaigns, Catalog, Orders, CRM, Media hub,
#   Tools, Content Studio). If the wheel is going to drive app selection, set
#   WEDGES = 8 above AND update the runtime seat angle (51.43° -> 45°). Decide
#   the count before baking textures — re-slicing after is a re-do.
#
# NEXT (per ASIAGO_WHEEL_BLENDER_BUILD.md):
#   - Replace procedural paste/rind with Substance 2K maps for the final look.
#   - Add a Poly Haven studio HDRI to the World for true reflections.
#   - Track B: render the hero still (Cycles, 768+ samples, AgX).
#   - Track A: export selected wedges to .glb (+Y up, Draco) -> gltf-transform
#     KTX2 -> drop wheel_web.glb into prototypes/ for the runtime wire-up.
# ----------------------------------------------------------------------------
