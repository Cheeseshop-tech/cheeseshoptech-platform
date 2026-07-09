"""
style_illustrated.py — "art + tech" illustrated (non-photoreal) look.
Run AFTER build_asiago_wheel.py. Overrides the photoreal materials/world with:
- flat 2-band CEL-SHADED materials in brand-aligned tones (EEVEE ShaderToRGB)
- clean INK OUTLINES via Freestyle line art (the illustrated tell)
- a flat graphic cream background
Then you can render a still / the previz in this style.
"""
import bpy

# ---- brand-aligned illustrated palette ----
PASTE = (0.95, 0.87, 0.62)   # warm straw cheese paste
RIND  = (0.80, 0.47, 0.24)   # terracotta-tan rind (ties to CST #9A3B1B family)
CREAM = (0.97, 0.94, 0.89)   # flat background
INK   = (0.13, 0.11, 0.08)   # outline / brand TECH dark

def toon_mat(name, base):
    """2-band cel material via Diffuse -> ShaderToRGB -> constant ColorRamp -> Emission."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out  = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (700, 0)
    emis = nt.nodes.new("ShaderNodeEmission");        emis.location = (480, 0)
    ramp = nt.nodes.new("ShaderNodeValToRGB");        ramp.location = (200, 0)
    ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements
    e[0].position = 0.0; e[0].color = (base[0]*0.72, base[1]*0.72, base[2]*0.70, 1)  # shadow band
    e[1].position = 0.5; e[1].color = (base[0], base[1], base[2], 1)                  # light band
    s2r  = nt.nodes.new("ShaderNodeShaderToRGB");     s2r.location = (-60, 0)
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse");     diff.location = (-300, 0)
    diff.inputs[0].default_value = (base[0], base[1], base[2], 1)
    nt.links.new(diff.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], emis.inputs["Color"])
    nt.links.new(emis.outputs[0], out.inputs[0])
    return m

# rebuild the existing material datablocks in place (wedges auto-update via slot names)
toon_mat("asiago_paste", PASTE)
toon_mat("asiago_rind",  RIND)

# flat background world
sc = bpy.context.scene
w = sc.world or bpy.data.worlds.new("World"); sc.world = w
w.use_nodes = True
wnt = w.node_tree; wnt.nodes.clear()
wout = wnt.nodes.new("ShaderNodeOutputWorld"); wout.location = (300, 0)
wbg  = wnt.nodes.new("ShaderNodeBackground");  wbg.location = (100, 0)
wbg.inputs[0].default_value = (CREAM[0], CREAM[1], CREAM[2], 1)
wbg.inputs[1].default_value = 1.0
wnt.links.new(wbg.outputs[0], wout.inputs[0])

# flat ground
gm = bpy.data.materials.get("ground_sweep")
if gm:
    gm.use_nodes = True; gnt = gm.node_tree; gnt.nodes.clear()
    go = gnt.nodes.new("ShaderNodeOutputMaterial"); go.location = (300, 0)
    ge = gnt.nodes.new("ShaderNodeEmission");        ge.location = (100, 0)
    ge.inputs[0].default_value = (CREAM[0], CREAM[1], CREAM[2], 1)
    gnt.links.new(ge.outputs[0], go.inputs[0])

# ---- EEVEE + Freestyle ink outlines ----
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
    style = ls.linestyle
    style.color = (INK[0], INK[1], INK[2])
    style.thickness = 1.8

# slightly flatter view transform reads more "illustrated"
try: sc.view_settings.view_transform = "Standard"
except Exception: pass

print("[Style] Illustrated art-tech look applied (cel + Freestyle outlines, EEVEE).")
