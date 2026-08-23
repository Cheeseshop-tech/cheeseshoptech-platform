#!/usr/bin/env python3
"""Cheese Signs — COMPOSITION STUDIO.

Same cheese, same content, six compositions, so the layout can be chosen by pointing
rather than described. Corrected against the real Brand Kit:
  · real Monti Trentini logo (Cloudinary), not typed letterspacing
  · the logo's OWN black-and-white spotted cow as the milk icon
  · Heritage Cream #FFFBDC ground (the kit's primary background), not Casa Paper
  · Cora + Futura PT via the Adobe Fonts kit sac6xdz, not the Fraunces/Inter fallbacks
"""
import base64, io, json, os, urllib.request
import qrcode
from PIL import Image
import icons as I

HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = "sofcvmwa"
PRIMARY, ACCENT = "#064E22", "#009640"
SAGE, MINT = "#70C883", "#C8E2C5"
CREAM, PAPER, CHARCOAL, INK = "#FFFBDC", "#FAF9F5", "#716A6A", "#141413"
TYPEKIT = '<link rel="stylesheet" href="https://use.typekit.net/sac6xdz.css">'

# ---------------------------------------------------------------- assets

def _fetch(url, name):
    cache = os.path.join(HERE, "cache"); os.makedirs(cache, exist_ok=True)
    fp = os.path.join(cache, name)
    if not os.path.exists(fp):
        urllib.request.urlretrieve(url, fp)
    return fp


def data_uri(path, mime=None):
    ext = os.path.splitext(path)[1].lower()
    mime = mime or {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}.get(ext, "image/png")
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def trim_white(im, tol=248):
    """Packshots ship with a lot of white air. Trim it so the product actually fills the band."""
    import numpy as np
    a = np.array(im.convert("RGB"))
    nonwhite = (a < tol).any(axis=2)
    ys, xs = np.where(nonwhite)
    if len(xs) == 0:
        return im
    m = max(4, int(0.012 * max(im.size)))
    x0, y0 = max(0, xs.min() - m), max(0, ys.min() - m)
    x1, y1 = min(im.width, xs.max() + m), min(im.height, ys.max() + m)
    return im.crop((x0, y0, x1, y1))


def packshot(public_id, ratio=2.33, mode="contain", w=1400, pad_frac=0.04):
    fp = _fetch(f"https://res.cloudinary.com/{CLOUD}/image/upload/w_{w},q_auto:good,f_jpg/{public_id}.jpg",
                public_id.replace("/", "_") + ".jpg")
    im = trim_white(Image.open(fp).convert("RGB"))
    CW = 1200; CH = int(CW / ratio)
    if mode == "contain":
        pad = int(CH * pad_frac)
        im.thumbnail((CW - 2 * pad, CH - 2 * pad), Image.LANCZOS)
        canvas = Image.new("RGB", (CW, CH), "white")
        canvas.paste(im, ((CW - im.width) // 2, (CH - im.height) // 2))
        im = canvas
    else:                                             # cover — crop to fill
        tw, th = im.size
        if tw / th > ratio:
            nw = int(th * ratio); im = im.crop(((tw - nw) // 2, 0, (tw + nw) // 2, th))
        else:
            nh = int(tw / ratio); top = int((th - nh) * 0.4); im = im.crop((0, top, tw, top + nh))
        im = im.resize((CW, CH), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=80, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def qr_svg(url, fg=INK):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=1, border=1)
    q.add_data(url); q.make(fit=True)
    m = q.get_matrix(); n = len(m); d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                run = 1
                while x + run < n and row[x + run]:
                    run += 1
                d.append(f"M{x} {y}h{run}v1h-{run}z"); x += run
            else:
                x += 1
    return (f'<svg viewBox="0 0 {n} {n}" class="qr" xmlns="http://www.w3.org/2000/svg" '
            f'shape-rendering="crispEdges"><path d="{"".join(d)}" fill="{fg}"/></svg>')


PAINT = dict(primary=PRIMARY, accent=ACCENT, ink=INK, paper="#FFFFFF")
REGION = {k: I.paint(v, **PAINT) for k, v in I.REGION.items()}
DOP = I.paint(I.DOP, **PAINT)
MTN = I.paint(I.MOUNTAIN_MARK, **PAINT)

# Each data URI is emitted ONCE into a JS map and referenced by key, so a six-variant
# page does not carry six copies of every photo.
BLOBS = {}


def blob(key, uri):
    BLOBS[key] = uri
    return key


LOGO = blob("logo", data_uri(os.path.join(HERE, "brand", "logo_full.png")))
COW = blob("cow", data_uri(os.path.join(HERE, "brand", "cow_logo.png")))
TEXTURE = blob("tex", data_uri(os.path.join(HERE, "brand", "library_texture-menu.png")))

# ---------------------------------------------------------------- pieces


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def logo_img(cls="logo"):
    return f'<img class="{cls}" data-k="{LOGO}" alt="Monti Trentini">'


def rail(s, variant="row"):
    reg = REGION.get(s["region"]["icon"], REGION["valsugana"])
    milk_sub = s["milk"].get("treatment") or s["milk"].get("detail", "")
    if variant == "col":
        return f'''<div class="rail col">
  <div class="ri"><img class="cow" data-k="{COW}" alt=""><div class="rt"><b>{esc(s["milk"]["type"])}</b><i>{esc(milk_sub)}</i></div></div>
  <div class="ri"><div class="ric">{reg}</div><div class="rt"><b>{esc(s["region"]["label"])}</b><i>{esc(s["region"]["sub"])}</i></div></div>
  <div class="ri"><div class="agec"><b>{esc(s["minAge"])}</b><i>minimum age</i></div></div>
</div>'''
    return f'''<div class="rail">
  <div class="ri"><img class="cow" data-k="{COW}" alt=""><div class="rt"><b>{esc(s["milk"]["type"])}</b><i>{esc(milk_sub)}</i></div></div>
  <div class="ri"><div class="ric">{reg}</div><div class="rt"><b>{esc(s["region"]["label"])}</b><i>{esc(s["region"]["sub"])}</i></div></div>
  <div class="ri age"><div class="age-num">{esc(s["minAge"])}</div><div class="age-lb">Minimum age</div></div>
</div>'''


def marks(s):
    out = []
    if s.get("designation") == "DOP":
        out.append(f'<div class="mark">{DOP}</div>')
    if s.get("mountainMark"):
        out.append(f'<div class="mark">{MTN}</div>')
    out.append('<div class="origin"><div class="tri"><i></i><i></i><i></i></div>'
               '<span>Product of Italy</span></div>')
    return '<div class="marks">' + "".join(out) + "</div>"


def foot(s, caption=True):
    cap = '<span>Scan for<br>the story</span>' if caption else ''
    return f'<div class="foot">{marks(s)}<div class="qrw">{qr_svg(s["qrUrl"])}{cap}</div></div>'


# ---------------------------------------------------------------- six compositions

def A_band(s):
    """Current v1, corrected: logo, photo band, copy, footer."""
    return f'''<article class="sign v-a">
  <div class="bar"></div>
  <div class="head">{logo_img()}</div>
  <div class="photo"><img data-k="{s['_contain']}"></div>
  <div class="body">
    <h2 class="name">{esc(s['name'])}</h2><div class="it">{esc(s['italianName'])}</div>
    {rail(s)}
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    <p class="desc">{esc(s['shortDescription'])}</p>
  </div>
  {foot(s)}
</article>'''


def B_greencap(s):
    """Forest Green cap carries the NAME — reads from across the shop."""
    return f'''<article class="sign v-b">
  <div class="cap">
    <h2 class="name">{esc(s['name'])}</h2>
    <div class="it">{esc(s['italianName'])}</div>
  </div>
  <div class="photo"><img data-k="{s['_contain']}"></div>
  <div class="body">
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    {rail(s)}
    <p class="desc">{esc(s['shortDescription'])}</p>
  </div>
  <div class="foot-b">{logo_img("logo sm")}{foot(s, caption=False)}</div>
</article>'''


def C_hero(s):
    """Photo bleeds to the top edge; logo overlaps as a badge. Most editorial."""
    return f'''<article class="sign v-c">
  <div class="hero"><img data-k="{s['_hero']}">{logo_img("logo badge")}</div>
  <div class="body">
    <h2 class="name">{esc(s['name'])}</h2><div class="it">{esc(s['italianName'])}</div>
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    {rail(s)}
    <p class="desc">{esc(s['shortDescription'])}</p>
  </div>
  {foot(s)}
</article>'''


def D_oval(s):
    """Photo in an oval medallion echoing the logo, on a brand texture band."""
    return f'''<article class="sign v-d">
  <div class="bar"></div>
  <div class="tex" data-bg="{TEXTURE}"></div>
  <div class="oval"><img data-k="{s['_cover']}"></div>
  <div class="head">{logo_img("logo sm")}</div>
  <div class="body">
    <h2 class="name">{esc(s['name'])}</h2><div class="it">{esc(s['italianName'])}</div>
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    {rail(s)}
    <p class="desc">{esc(s['shortDescription'])}</p>
  </div>
  {foot(s)}
</article>'''


def E_leftrail(s):
    """Specs stack down a left rail; copy gets full width and the icons get room."""
    return f'''<article class="sign v-e">
  <div class="bar"></div>
  <div class="photo"><img data-k="{s['_contain']}"></div>
  <div class="split">
    {rail(s, "col")}
    <div class="body">
      <h2 class="name">{esc(s['name'])}</h2><div class="it">{esc(s['italianName'])}</div>
      <p class="flavor">{esc(s['flavorProfile'])}</p>
      <p class="desc">{esc(s['shortDescription'])}</p>
    </div>
  </div>
  <div class="foot-e">{logo_img("logo sm")}{foot(s, caption=False)}</div>
</article>'''


def F_typefirst(s):
    """Name first and big; the photo is a supporting thumbnail. Most copy room."""
    return f'''<article class="sign v-f">
  <div class="bar"></div>
  <div class="head">{logo_img("logo sm")}</div>
  <div class="topline">
    <div class="tl-tx"><h2 class="name">{esc(s['name'])}</h2><div class="it">{esc(s['italianName'])}</div></div>
    <div class="thumb"><img data-k="{s['_cover']}"></div>
  </div>
  <div class="body">
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    {rail(s)}
    <p class="desc">{esc(s['shortDescription'])}</p>
    <p class="unique"><span>Worth knowing</span>{esc(s['unique'])}</p>
  </div>
  {foot(s)}
</article>'''


VARIANTS = [
    ("A", "Band", "v1, corrected. Logo up top, photo band, copy below.", A_band),
    ("B", "Green cap", "Name reversed out of Forest Green — reads from across the shop.", B_greencap),
    ("C", "Photo hero", "Photo bleeds to the top edge, logo overlaps as a badge. Most editorial.", C_hero),
    ("D", "Oval medallion", "Photo in an oval echoing the logo, on the brand texture.", D_oval),
    ("E", "Left rail", "Specs stack down a rail; the icons finally get room to breathe.", E_leftrail),
    ("F", "Type first", "Name big, photo as a thumbnail — most room for words.", F_typefirst),
]

CSS = """
*{box-sizing:border-box}
:root{
  --primary:#064E22;--accent:#009640;--sage:#70C883;--mint:#C8E2C5;
  --cream:#FFFBDC;--paper:#FAF9F5;--charcoal:#716A6A;--ink:#141413;
  --display:"cora","Fraunces",Georgia,serif;
  --ui:"futura-pt","Inter",system-ui,sans-serif;
}
body{margin:0;background:#DEDCD3;color:var(--ink);font-family:var(--ui);
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:1240px;margin:0 auto;padding:34px 24px 70px}
h1{font-family:var(--display);font-style:italic;color:var(--primary);font-size:32px;margin:0 0 6px}
.lede{max-width:66ch;font-size:14px;line-height:1.55;color:#3b3b36;margin:0 0 8px}
.row{display:flex;flex-wrap:wrap;gap:26px;margin:14px 0 0}
.cell{width:3in}
.cap{font-size:12px}
.tag{display:flex;align-items:baseline;gap:7px;margin:0 0 8px}
.tag b{font-family:var(--display);font-style:italic;font-size:19px;color:var(--primary)}
.tag u{text-decoration:none;font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#4a4a44}
.note{font-size:11.5px;line-height:1.4;color:#55554e;margin:7px 0 0}
h3{font-family:var(--ui);text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:#5a5a52;
  margin:40px 0 6px;border-top:1px solid #BFBCB2;padding-top:12px}

/* ============ the sign face — 3 x 4 in ============ */
.sign{width:3in;height:4in;background:var(--cream);position:relative;overflow:hidden;
  display:flex;flex-direction:column;box-shadow:0 3px 12px rgba(0,0,0,.16)}
.bar{position:absolute;left:0;right:0;top:0;height:.05in;background:var(--accent);z-index:4}
.head{text-align:center;padding:.11in 0 .01in}
.logo{width:1.02in;height:auto;display:block;margin:0 auto}
.logo.sm{width:.86in}
.photo{height:1.0in;overflow:hidden;background:#fff;border-top:.5pt solid rgba(0,0,0,.09);
  border-bottom:.5pt solid rgba(0,0,0,.09)}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
.body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:0 .17in}
.name{font-family:var(--display);font-style:italic;font-weight:700;color:var(--primary);
  font-size:15pt;line-height:1.04;margin:.05in 0 0;letter-spacing:-.005em}
.it{font-family:var(--ui);font-weight:500;font-size:5.6pt;letter-spacing:.13em;text-transform:uppercase;
  color:var(--charcoal);margin-top:.025in}
.flavor{font-family:var(--display);font-style:italic;color:var(--primary);font-size:7.8pt;
  line-height:1.3;margin:.055in 0 0}
.desc{font-size:6.8pt;line-height:1.44;color:#33332e;margin:.05in 0 0;overflow:hidden}
.unique{margin:.055in 0 0;font-size:6.1pt;line-height:1.36;color:#33332e;
  border-left:1.6pt solid var(--accent);padding-left:.07in}
.unique span{display:block;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
  font-size:5.1pt;color:var(--primary);margin-bottom:1px}

/* spec rail */
.rail{display:flex;gap:.08in;margin:.07in 0 0;padding:.05in 0;
  border-top:.5pt solid rgba(20,20,19,.18);border-bottom:.5pt solid rgba(20,20,19,.18)}
.ri{display:flex;align-items:center;gap:.04in;flex:1 1 0;min-width:0;overflow:hidden}
.cow{width:.32in;height:auto;flex:none}
.ric{width:.3in;flex:none}.ric svg{width:100%;height:auto;display:block}
.rt{min-width:0;line-height:1.16}
.rt b{display:block;font-size:5.6pt;font-weight:700;color:var(--primary)}
.rt i{font-style:normal;font-size:4.8pt;color:var(--charcoal);line-height:1.18;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ri.age{flex-direction:column;align-items:flex-end;justify-content:center;text-align:right;gap:0}
.age-num{font-family:var(--display);font-style:italic;font-weight:700;color:var(--accent);
  font-size:11pt;line-height:1.02;white-space:nowrap}
.age-lb{font-size:4.7pt;letter-spacing:.1em;text-transform:uppercase;color:var(--charcoal);margin-top:1px}

/* footer */
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:.08in;
  margin-top:auto;padding:.07in .17in .13in}
.marks{display:flex;align-items:center;gap:.06in;min-width:0}
.mark{width:.34in;flex:none}.mark svg{width:100%;height:auto;display:block}
.origin{display:flex;flex-direction:column;gap:2px}
.tri{display:flex;height:2.4pt;width:.34in}
.tri i{flex:1}.tri i:nth-child(1){background:#008C45}.tri i:nth-child(2){background:#F4F5F0}
.tri i:nth-child(3){background:#CD212A}
.origin span{font-size:5.1pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.qrw{display:flex;align-items:flex-end;gap:.04in;flex:none}
.qr{width:.6in;height:.6in;display:block}
.qrw span{font-size:4.6pt;line-height:1.2;color:var(--charcoal);text-transform:uppercase;letter-spacing:.06em;padding-bottom:2px}

/* ---- A: band (defaults above) ---- */
.v-a .photo{margin:.03in 0 0}

/* ---- B: green cap ---- */
.v-b .cap{background:var(--primary);padding:.14in .17in .12in;text-align:center}
.v-b .cap .name{color:#fff;margin:0;font-size:16.5pt}
.v-b .cap .it{color:rgba(255,255,255,.72)}
.v-b .photo{height:1.16in;border-top:0}
.v-b .body{padding-top:.02in}
.v-b .foot-b{display:flex;align-items:flex-end;gap:.08in;padding:.05in .17in .12in;margin-top:auto}
.v-b .foot-b .logo{margin:0}
.v-b .foot{padding:0;flex:1}

/* ---- C: photo hero ---- */
.v-c .hero{position:relative;height:1.45in;overflow:hidden;background:#fff;
  border-bottom:.5pt solid rgba(0,0,0,.1)}
.v-c .hero>img:first-child{width:100%;height:100%;object-fit:cover;display:block}
.v-c .logo.badge{position:absolute;left:.11in;bottom:.08in;width:.8in;margin:0;
  filter:drop-shadow(0 1px 3px rgba(0,0,0,.28))}
.v-c .name{font-size:15.5pt;margin-top:.07in}

/* ---- D: oval medallion ---- */
.v-d{background:var(--paper)}
.v-d .tex{position:absolute;left:0;right:0;top:0;height:1.1in;background-size:cover;
  background-position:center;opacity:.9}
.v-d .oval{position:absolute;left:50%;top:.56in;transform:translateX(-50%);
  width:2.3in;height:1.02in;border-radius:50%;overflow:hidden;border:2.5pt solid #fff;
  box-shadow:0 2px 7px rgba(0,0,0,.22);background:#fff;z-index:3}
.v-d .oval img{width:100%;height:100%;object-fit:contain;display:block}
.v-d .head{position:relative;z-index:4;padding:.09in 0 0;height:0}
.v-d .head .logo{filter:drop-shadow(0 1px 2px rgba(0,0,0,.25))}
.v-d .body{padding-top:1.62in}
.v-d .name{margin-top:0}

/* ---- E: left rail ---- */
.v-e .split{flex:1;min-height:0;display:flex;gap:.09in;padding:.06in .17in 0}
.v-e .rail.col{flex-direction:column;gap:.09in;width:.74in;flex:none;border:0;
  border-right:.5pt solid rgba(20,20,19,.18);padding:.02in .07in 0 0;margin:0}
.v-e .rail.col .ri{flex:0 0 auto;flex-direction:column;align-items:flex-start;gap:.02in}
.v-e .rail.col .cow{width:.42in}
.v-e .rail.col .ric{width:.4in}
.v-e .rail.col .rt b{font-size:5.4pt}
.v-e .rail.col .rt i{font-size:4.6pt}
.v-e .agec b{display:block;font-family:var(--display);font-style:italic;font-weight:700;
  color:var(--accent);font-size:11.5pt;line-height:1}
.v-e .agec i{font-style:normal;font-size:4.7pt;letter-spacing:.1em;text-transform:uppercase;color:var(--charcoal)}
.v-e .body{padding:0}
.v-e .name{margin-top:0;font-size:14pt}
.v-e .foot-e{display:flex;align-items:flex-end;gap:.08in;padding:.05in .17in .12in;margin-top:auto}
.v-e .foot-e .logo{margin:0}
.v-e .foot{padding:0;flex:1}

/* ---- F: type first ---- */
.v-f .topline{display:flex;align-items:flex-start;gap:.09in;padding:.03in .17in 0}
.v-f .tl-tx{flex:1;min-width:0}
.v-f .name{margin-top:0;font-size:16pt}
.v-f .thumb{width:.95in;height:.95in;flex:none;border-radius:50%;overflow:hidden;background:#fff;
  border:1.5pt solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.18)}
.v-f .thumb img{width:100%;height:100%;object-fit:cover;display:block}
.v-f .body{padding-top:.02in}

.knobs table{border-collapse:collapse;width:100%;max-width:1000px;font-size:12.5px;background:#F6F5EF;
  border:1px solid #C9C6BC}
.knobs th,.knobs td{border-bottom:1px solid #DAD7CD;padding:7px 10px;text-align:left;vertical-align:top}
.knobs th{background:var(--primary);color:#fff;font-weight:600;letter-spacing:.04em;font-size:11px;text-transform:uppercase}
.knobs td:first-child{font-weight:600;color:var(--primary);white-space:nowrap}
.knobs td:nth-child(2){color:#33332e}
.knobs td:nth-child(3){color:#5a5a52}
.knobs code{background:#E7E4DA;padding:1px 4px;border-radius:3px}

@media print{
  body{background:#fff}.wrap{max-width:none;padding:0}
  h1,.lede,.note,h3{display:none}
  .sign{box-shadow:none;outline:.25pt solid #ccc}
  @page{size:letter;margin:.35in}
}
"""

KNOBS = """
<h3>Every knob, and where it is set today</h3>
<div class="knobs">
<table>
<tr><th>Knob</th><th>Right now</th><th>Alternatives on the table</th></tr>
<tr><td>Ground</td><td>Heritage Cream #FFFBDC</td><td>Casa Paper #FAF9F5 · plain white · Alpine Mint tint</td></tr>
<tr><td>Top edge</td><td>Italia Green rule, 0.05&Prime;</td><td>Forest Green rule · no rule · full green cap (B)</td></tr>
<tr><td>Logo</td><td>1.02&Prime; top-centre</td><td>small in the footer (B, E) · badge over the photo (C) · none</td></tr>
<tr><td>Cheese name</td><td>Cora italic bold, 15&ndash;16.5 pt</td><td>roman not italic · all-caps · bigger (retail reads at 6&nbsp;ft)</td></tr>
<tr><td>Italian name</td><td>Futura PT, uppercase, tracked</td><td>italic sentence case · drop it entirely</td></tr>
<tr><td>Photo</td><td>1.0&Prime; band, product trimmed to fill</td><td>hero to the top edge (C) · oval medallion (D) · round thumb (F) · none</td></tr>
<tr><td>Photo ground</td><td>white, as the packshots were shot</td><td>knock the white out so the wheel floats on cream · tint to cream</td></tr>
<tr><td>Spec rail</td><td>horizontal 3-up under the name</td><td>vertical left rail (E) · two rows · split top/bottom</td></tr>
<tr><td>Cow</td><td>the logo&rsquo;s own Holstein, outlined</td><td>outline only · add &ldquo;100% Italian milk&rdquo; · sheep + goat variants for the wider line</td></tr>
<tr><td>Region icon</td><td>drawn peaks, one per region</td><td>Monti&rsquo;s own photo cutouts · the logo&rsquo;s &ldquo;M&rdquo; mountain glyph</td></tr>
<tr><td>Age</td><td>accent italic numeral + label</td><td>boxed badge · &ldquo;AGED 9 MONTHS&rdquo; in caps · wheel-and-calendar glyph</td></tr>
<tr><td>DOP mark</td><td>house stand-in badge</td><td><b>official EU PDO + consortium artwork &mdash; still needed</b></td></tr>
<tr><td>Origin</td><td>tricolore + PRODUCT OF ITALY</td><td>add &ldquo;Trentino, Italy&rdquo; · drop the tricolore · move beside the QR</td></tr>
<tr><td>QR</td><td>0.6&Prime;, bottom right, captioned</td><td>bigger · bottom left · no caption · framed in a green chip</td></tr>
<tr><td>Flavor line</td><td>above the rail (B, C, D, F)</td><td>below the rail (A) · drop it and let the description carry it</td></tr>
<tr><td>Worth knowing</td><td>long mode + F only</td><td>on every face · never · replace with a pairing line</td></tr>
</table>
<p class="note">Type note: this page asks for Cora and Futura PT from Adobe Fonts kit
<code>sac6xdz</code>. If they fail to load, what you are seeing is Fraunces + Inter &mdash; the
fallbacks the whole CST app has been running on.</p>
</div>
"""

HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Cheese Signs — composition studio</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
%TYPEKIT%
<style>%CSS%</style></head><body><div class="wrap">
<h1>Composition studio — pick by letter</h1>
<p class="lede">One cheese, one content set, six compositions. Everything is now painted from the real
Brand Kit: the actual Monti Trentini logo, the spotted cow lifted from that logo, Heritage Cream
(#FFFBDC) as the ground, and Cora + Futura PT loaded from Adobe Fonts instead of the Fraunces/Inter
fallbacks the app has been running on.</p>
%SECTIONS%
%KNOBS%
</div>%SCRIPT%</body></html>"""


def main():
    data = json.load(open(os.path.join(HERE, "signs.json")))
    by = {s["id"]: s for s in data["signs"]}
    picks = ["asiago-vecchio-dop", "imbriago", "caciotta-erbe"]
    for pid in picks:
        s = by[pid]
        s["_contain"] = blob(pid + "-c", packshot(s["image"], mode="contain"))
        s["_cover"] = blob(pid + "-sq", packshot(s["image"], ratio=1.0, mode="contain", pad_frac=0.03))
        s["_hero"] = blob(pid + "-h", packshot(s["image"], ratio=2.07, mode="contain", pad_frac=0.03))
        print("photo ok:", pid)

    secs = []
    hero = by[picks[0]]
    cells = []
    for letter, title, note, fn in VARIANTS:
        cells.append(f'<div class="cell"><div class="tag"><b>{letter}</b><u>{title}</u></div>'
                     f'{fn(hero)}<p class="note">{note}</p></div>')
    secs.append(f'<h3>Six compositions · {esc(hero["name"])}</h3><div class="row">{"".join(cells)}</div>')

    for pid in picks[1:]:
        s = by[pid]
        cells = [f'<div class="cell"><div class="tag"><b>{l}</b><u>{t}</u></div>{fn(s)}</div>'
                 for l, t, n, fn in VARIANTS]
        secs.append(f'<h3>Same six, different photo · {esc(s["name"])}</h3>'
                    f'<div class="row">{"".join(cells)}</div>')

    script = ("<script>const B=" + json.dumps(BLOBS) + ";"
              "document.querySelectorAll('[data-k]').forEach(e=>e.src=B[e.dataset.k]);"
              "document.querySelectorAll('[data-bg]').forEach(e=>e.style.backgroundImage='url('+B[e.dataset.bg]+')');"
              "</script>")
    html = (HTML.replace("%TYPEKIT%", TYPEKIT).replace("%CSS%", CSS)
                .replace("%SECTIONS%", "\n".join(secs)).replace("%KNOBS%", KNOBS).replace("%SCRIPT%", script))
    out = os.path.join(HERE, "cheese-signs-composition-studio.html")
    open(out, "w").write(html)
    print("wrote", out, os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    main()
