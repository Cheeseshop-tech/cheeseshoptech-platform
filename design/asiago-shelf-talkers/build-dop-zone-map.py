#!/usr/bin/env python3
"""
Build the Asiago DOP zone map paths from official ISTAT province boundaries.

    curl -sO https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_provinces.geojson
    python3 build-dop-zone-map.py limits_IT_provinces.geojson paths.json

Emits SVG path data at three tolerances: slide, card mini-map, and country inset.
See .claude/skills/accurate-maps/SKILL.md for the method and the rendering rules.
"""

SRC = sys.argv[1]
d = json.load(open(SRC))

def rdp(pts, eps):
    if len(pts) < 3: return pts
    def d2(p, a, b):
        (x,y),(x1,y1),(x2,y2) = p,a,b
        dx,dy = x2-x1, y2-y1
        if dx==0 and dy==0: return (x-x1)**2+(y-y1)**2
        t = max(0, min(1, ((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)))
        px,py = x1+t*dx, y1+t*dy
        return (x-px)**2+(y-py)**2
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        dd = d2(pts[i], pts[0], pts[-1])
        if dd > dmax: dmax, idx = dd, i
    if dmax > eps*eps:
        return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

def rings(f):
    g = f["geometry"]
    if g["type"] == "Polygon": return [g["coordinates"][0]]
    return [p[0] for p in g["coordinates"]]

def byname(n):
    for f in d["features"]:
        if f["properties"]["prov_name"] == n: return f
    raise KeyError(n)

class Proj:
    def __init__(self, lon0, lon1, lat0, lat1, W, H, pad=0):
        self.k = math.cos(math.radians((lat0+lat1)/2))
        w = (lon1-lon0)*self.k; h = lat1-lat0
        s = min((W-2*pad)/w, (H-2*pad)/h)
        self.s = s; self.lon0=lon0; self.lat1=lat1
        self.ox = pad + ((W-2*pad) - w*s)/2
        self.oy = pad + ((H-2*pad) - h*s)/2
    def __call__(self, lon, lat):
        return (round(self.ox + (lon-self.lon0)*self.k*self.s, 1),
                round(self.oy + (self.lat1-lat)*self.s, 1))

def path(f, proj, eps):
    out = []
    for r in rings(f):
        pts = rdp([(x,y) for x,y,*_ in r], eps)
        if len(pts) < 3: continue
        p = [proj(x,y) for x,y in pts]
        out.append("M " + " L ".join(f"{a} {b}" for a,b in p) + " Z")
    return " ".join(out)

# ---------- main map: Trentino-Alto Adige + Veneto ----------
NAMES = ["Bolzano/Bozen","Trento","Verona","Vicenza","Belluno","Treviso","Venezia","Padova","Rovigo"]
feats = {n: byname(n) for n in NAMES}
xs=[];ys=[]
for n in NAMES:
    for r in rings(feats[n]):
        for x,y,*_ in r: xs.append(x); ys.append(y)
print("bbox lon %.3f..%.3f lat %.3f..%.3f" % (min(xs),max(xs),min(ys),max(ys)), file=sys.stderr)

P = Proj(min(xs), max(xs), min(ys), max(ys), 1000, 760, pad=12)
res = {"main": {n: path(feats[n], P, 0.0035) for n in NAMES}, "cities": {}, "mini": {}}

CITY = {"BOLZANO":(11.354,46.499),"TRENTO":(11.121,46.069),"ASIAGO":(11.510,45.876),
        "ENEGO":(11.702,45.941),"VICENZA":(11.546,45.547),"VERONA":(10.993,45.438),
        "PADOVA":(11.876,45.407),"VENICE":(12.327,45.438),"TREVISO":(12.245,45.666),
        "BELLUNO":(12.216,46.139),"ROVIGO":(11.790,45.070),"GRIGNO":(11.622,46.020)}
for k,(lo,la) in CITY.items(): res["cities"][k] = P(lo,la)

# ---------- mini map (cards): tighter crop on the zone ----------
zx=[];zy=[]
for n in ["Trento","Vicenza"]:
    for r in rings(feats[n]):
        for x,y,*_ in r: zx.append(x); zy.append(y)
M = Proj(min(xs), max(xs), min(ys), max(ys), 300, 240, pad=4)
res["mini"] = {n: path(feats[n], M, 0.012) for n in NAMES}
res["mini_cities"] = {k: M(*v) for k,v in CITY.items()}

# ---------- Italy inset: every province, coarse ----------
axs=[];ays=[]
for f in d["features"]:
    for r in rings(f):
        for x,y,*_ in r: axs.append(x); ays.append(y)
I = Proj(min(axs), max(axs), min(ays), max(ays), 200, 300, pad=6)
italy = [path(f, I, 0.055) for f in d["features"]]
res["italy"] = " ".join(p for p in italy if p)
res["italy_zone"] = " ".join(path(feats[n], I, 0.02) for n in ["Trento","Vicenza"])
res["italy_cities"] = {"Venice": I(12.327,45.438), "Rome": I(12.496,41.903)}

json.dump(res, open(sys.argv[2],"w"))
for k in ["main","mini"]:
    print(k, {n: len(v) for n,v in res[k].items()}, file=sys.stderr)
print("italy chars:", len(res["italy"]), file=sys.stderr)
