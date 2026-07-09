"""
phase2_morph.py — CST Opening Animation, Phase 2: "go 3D + grid + crossfade".
================================================================================
Track B (illustrated). Run AFTER build_asiago_wheel.py (the 8-wedge wheel +
WheelRoot must exist). This script is self-contained: it (re)builds the cel
materials in morph-capable form, adds the tech grid, and keyframes the whole
Phase-2 beat. style_illustrated.py is NOT required first — this supersedes it
for the morph (same datablock names, so wedges auto-update).

THE BEAT (storyboard Phase 2):
  flat 2D pie (top-down, thin, flat graphic color)
   → camera tilts to the hero 3/4 angle
   → wedges thicken in Z (extrude to 3D)
   → a perspective tech grid fades in beneath
   → material crossfades flat brand graphic → illustrated cel cheese (ink outlines)
  ...landing on the dimensional illustrated wheel, ready for Phase 3 (labels/spin).

HOW TO RUN (console-paste method)
  exec(open("/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build/design/asiago-wheel/handoff/blender/build_asiago_wheel.py").read())
  exec(open("/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build/design/asiago-wheel/handoff/blender/phase2_morph.py").read())
Then: Render > Render Animation (or it renders to renders/morph/ on the path below).
"""

import bpy, math

# ----------------------------------------------------------------------------
# TIMELINE  (24 fps)
# ----------------------------------------------------------------------------
FPS        = 24
F_START    = 1
F_FLAT_END = 24     # hold the flat pie until here
F_MORPH_END= 72     # morph completes here
F_END      = 96     # settle on the dimensional wheel

# ----------------------------------------------------------------------------
# LOOK  (illustrated palette — flat graphic stage vs cel cheese stage)
# ----------------------------------------------------------------------------
PASTE_CHEESE = (0.95, 0.87, 0.62)   # warm straw paste (cheese end)
RIND_CHEESE  = (0.80, 0.47, 0.24)   # terracotta-tan rind (cheese end)
PASTE_FLAT   = (0.96, 0.90, 0.70)   # brighter flat graphic (data-pie end)
RIND_FLAT    = (0.91, 0.55, 0.30)   # brighter flat graphic
CREAM        = (0.97, 0.94, 0.89)   # background
INK          = (0.13, 0.11, 0.08)   # outlines / grid lines / brand TECH dark
GRID_LINE    = (0.62, 0.40, 0.22)   # warm tech-grid line tint

OUT_DIR = "/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build/design/asiago-wheel/handoff/renders/morph/"


# ----------------------------------------------------------------------------
# morph-capable cel material:  flat graphic  --MorphFac-->  2-band cel
# ----------------------------------------------------------------------------
def morph_cel_mat(name, flat_rgb, cheese_rgb):
    """Rebuild material `name` in place. A 'MorphFac' Value node (0=flat graphic,
    1=cel cheese) mixes a constant flat color against a 2-band toon shade.
    Returns the MorphFac value node so the caller can keyframe it."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()

    out  = nt.nodes.new("ShaderNodeOutputMaterial"); out.location  = (820, 0)
    emis = nt.nodes.new("ShaderNodeEmission");        emis.location = (620, 0)

    # --- cel branch (cheese) : Diffuse -> ShaderToRGB -> constant 2-band ramp ---
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse");     diff.location = (-360, -120)
    diff.inputs[0].default_value = (*cheese_rgb, 1)
    s2r  = nt.nodes.new("ShaderNodeShaderToRGB");     s2r.location  = (-140, -120)
    ramp = nt.nodes.new("ShaderNodeValToRGB");        ramp.location = (80, -120)
    ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements
    e[0].position = 0.0
    e[0].color = (cheese_rgb[0]*0.72, cheese_rgb[1]*0.72, cheese_rgb[2]*0.70, 1)  # shadow band
    e[1].position = 0.5
    e[1].color = (*cheese_rgb, 1)                                                  # light band
    nt.links.new(diff.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])

    # --- flat branch (data graphic) : a single constant color ---
    flat = nt.nodes.new("ShaderNodeRGB");             flat.location = (80, 140)
    flat.outputs[0].default_value = (*flat_rgb, 1)

    # --- crossfade ---
    fac = nt.nodes.new("ShaderNodeValue");            fac.location  = (80, 320)
    fac.label = "MorphFac"; fac.name = "MorphFac"
    mix = nt.nodes.new("ShaderNodeMixRGB");           mix.location  = (380, 0)
    mix.blend_type = "MIX"
    nt.links.new(fac.outputs[0], mix.inputs[0])       # Fac
    nt.links.new(flat.outputs[0], mix.inputs[1])      # Color1 = flat (Fac 0)
    nt.links.new(ramp.outputs["Color"], mix.inputs[2])# Color2 = cel cheese (Fac 1)
    nt.links.new(mix.outputs[0], emis.inputs["Color"])
    nt.links.new(emis.outputs[0], out.inputs[0])
    return fac


def key_fac(value_node, frame, v):
    value_node.outputs[0].default_value = v
    value_node.outputs[0].keyframe_insert("default_value", frame=frame)


# ----------------------------------------------------------------------------
# tech grid — a subdivided plane + Wireframe modifier, emission, fades in
# ----------------------------------------------------------------------------
def build_grid():
    old = bpy.data.objects.get("TechGrid")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    z = -0.50 / 2.0  # sit at the wheel's base (THICKNESS=0.5)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=24,
                                     size=22, location=(0, 0, z))
    g = bpy.context.active_object
    g.name = "TechGrid"
    wf = g.modifiers.new("Wire", "WIREFRAME")
    wf.thickness = 0.012
    wf.use_replace = True
    gm = bpy.data.materials.new("tech_grid")
    gm.use_nodes = True
    gnt = gm.node_tree; gnt.nodes.clear()
    go = gnt.nodes.new("ShaderNodeOutputMaterial"); go.location = (300, 0)
    ge = gnt.nodes.new("ShaderNodeEmission");        ge.location = (80, 0)
    ge.inputs[0].default_value = (*GRID_LINE, 1)
    ge.inputs[1].default_value = 0.0   # animated
    gnt.links.new(ge.outputs[0], go.inputs[0])
    g.data.materials.append(gm)
    # keyframe the fade-in strength
    strength = ge.inputs[1]
    for fr, v in ((F_START, 0.0), (F_FLAT_END, 0.0), (F_MORPH_END, 2.2), (F_END, 2.2)):
        strength.default_value = v
        strength.keyframe_insert("default_value", frame=fr)
    # keep it out of the flat-stage silhouette: no freestyle on the grid plane
    return g


# ----------------------------------------------------------------------------
# easing helper
# ----------------------------------------------------------------------------
def _action_fcurves(action):
    """Version-safe fcurve access. Blender 5.x removed Action.fcurves in favor of
    slotted actions (layers -> strips -> channelbags -> fcurves)."""
    out = []
    try:
        legacy = list(action.fcurves)
        if legacy:
            return legacy
    except Exception:
        pass
    for layer in getattr(action, "layers", []):
        for strip in getattr(layer, "strips", []):
            for cb in getattr(strip, "channelbags", []):
                out.extend(cb.fcurves)
    return out


def ease_fcurves(obj_or_id):
    ad = getattr(obj_or_id, "animation_data", None)
    if not ad or not ad.action:
        return
    for fc in _action_fcurves(ad.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.easing = "EASE_IN_OUT"


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------
def run():
    sc = bpy.context.scene
    root = bpy.data.objects.get("WheelRoot")
    if root is None:
        print("[Phase2] ERROR: WheelRoot not found. Run build_asiago_wheel.py first.")
        return

    # 1) morph-capable cel materials (rebuilt in place; wedges auto-update by slot)
    fac_paste = morph_cel_mat("asiago_paste", PASTE_FLAT, PASTE_CHEESE)
    fac_rind  = morph_cel_mat("asiago_rind",  RIND_FLAT,  RIND_CHEESE)
    for fac in (fac_paste, fac_rind):
        key_fac(fac, F_FLAT_END, 0.0)     # flat graphic held
        key_fac(fac, F_MORPH_END, 1.0)    # full cel cheese

    # 2) flat background world
    w = sc.world or bpy.data.worlds.new("World"); sc.world = w
    w.use_nodes = True
    wnt = w.node_tree; wnt.nodes.clear()
    wout = wnt.nodes.new("ShaderNodeOutputWorld"); wout.location = (300, 0)
    wbg  = wnt.nodes.new("ShaderNodeBackground");  wbg.location = (100, 0)
    wbg.inputs[0].default_value = (*CREAM, 1)
    wbg.inputs[1].default_value = 1.0
    wnt.links.new(wbg.outputs[0], wout.inputs[0])

    # 3) thicken: WheelRoot scales in Z (symmetric about z=0). Thin pie -> full wheel.
    root.scale = (1.0, 1.0, 0.06)
    root.keyframe_insert("scale", frame=F_START)
    root.keyframe_insert("scale", frame=F_FLAT_END)
    root.scale = (1.0, 1.0, 1.0)
    root.keyframe_insert("scale", frame=F_MORPH_END)
    root.keyframe_insert("scale", frame=F_END)
    ease_fcurves(root)

    # 4) camera: top-down -> hero 3/4. TRACK_TO root keeps the aim locked.
    cam = bpy.data.objects.get("HeroCam")
    if cam is None:
        cd = bpy.data.cameras.new("HeroCam"); cd.lens = 50
        cam = bpy.data.objects.new("HeroCam", cd)
        bpy.context.scene.collection.objects.link(cam)
        ct = cam.constraints.new('TRACK_TO'); ct.target = root
        ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
    sc.camera = cam
    cam.location = (0.001, -0.001, 9.0)          # straight top-down (tiny offset for stable aim)
    cam.keyframe_insert("location", frame=F_START)
    cam.keyframe_insert("location", frame=F_FLAT_END)
    cam.location = (5.2, -5.2, 3.4)              # hero 3/4
    cam.keyframe_insert("location", frame=F_MORPH_END)
    cam.keyframe_insert("location", frame=F_END)
    ease_fcurves(cam)

    # 5) tech grid
    build_grid()

    # 6) EEVEE + Freestyle ink outlines
    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try: sc.render.engine = eng; break
        except Exception: continue
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = "ABSOLUTE"
    sc.render.line_thickness = 1.6
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    if fs.linesets:
        ls = fs.linesets[0]
        ls.select_silhouette = True
        ls.select_border = True
        ls.select_crease = True
        if ls.linestyle:
            ls.linestyle.color = INK
            ls.linestyle.thickness = 1.8
    try: sc.view_settings.view_transform = "Standard"
    except Exception: pass

    # 7) render settings (previz speed) + range + output
    sc.frame_start = F_START
    sc.frame_end   = F_END
    sc.render.fps  = FPS
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = OUT_DIR + "f_"
    try: sc.eevee.taa_render_samples = 16
    except Exception: pass
    sc.frame_set(F_FLAT_END)  # park on a representative frame for a viewport check

    print("[Phase2] Morph rig built: flat pie -> 3D cheese wheel + tech grid, "
          f"frames {F_START}-{F_END} @ {FPS}fps. Output -> {OUT_DIR}")
    print("[Phase2] Render the animation, then ffmpeg the PNGs to morph.mp4.")


if __name__ == "__main__":
    run()
run()
