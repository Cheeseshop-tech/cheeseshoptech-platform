#!/usr/bin/env python3
"""Cheese Signs — build the print proof from signs.json.

Emits a single self-contained HTML file: no external assets except Google Fonts.
Photos are pulled from Cloudinary (cloud sofcvmwa) and embedded as base64 JPEG.
QR codes are generated offline and embedded as vector SVG.
"""
import base64, io, json, os, urllib.request
import qrcode
from PIL import Image
import icons as I

HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = "sofcvmwa"
PRIMARY, ACCENT, INK, CREAM, PAPER = "#064E22", "#009640", "#141413", "#FAF9F5", "#FFFFFF"
MUTED = "#6B6B63"

# ---------------------------------------------------------------- assets

def photo_data_uri(public_id, w=1400, ratio=2.33):
    cache = os.path.join(HERE, "cache")
    os.makedirs(cache, exist_ok=True)
    fp = os.path.join(cache, public_id.replace("/", "_") + ".jpg")
    if not os.path.exists(fp):
        url = f"https://res.cloudinary.com/{CLOUD}/image/upload/w_{w},q_auto:good,f_jpg/{public_id}.jpg"
        urllib.request.urlretrieve(url, fp)
    im = Image.open(fp).convert("RGB")
    # Packshots are product-on-white: fit the WHOLE product into the band (never crop the
    # wheel) and letterbox onto white, so the sign shows portion reality, not a slice of it.
    CW, CH = 1200, int(1200 / ratio)
    pad = int(CH * 0.06)
    im.thumbnail((CW - 2 * pad, CH - 2 * pad), Image.LANCZOS)
    canvas = Image.new("RGB", (CW, CH), "white")
    canvas.paste(im, ((CW - im.width) // 2, (CH - im.height) // 2))
    im = canvas
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=78, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def qr_svg(url, fg=INK):
    q = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                      box_size=1, border=1)
    q.add_data(url)
    q.make(fit=True)
    m = q.get_matrix()
    n = len(m)
    d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                run = 1
                while x + run < n and row[x + run]:
                    run += 1
                d.append(f"M{x} {y}h{run}v1h-{run}z")
                x += run
            else:
                x += 1
    return (f'<svg viewBox="0 0 {n} {n}" xmlns="http://www.w3.org/2000/svg" class="qr" '
            f'shape-rendering="crispEdges"><path d="{"".join(d)}" fill="{fg}"/></svg>')


PAINT = dict(primary=PRIMARY, accent=ACCENT, ink=INK, paper=PAPER)
COW = I.paint(I.COW, **PAINT)
DOP = I.paint(I.DOP, **PAINT)
ITALY = I.paint(I.ITALY, **PAINT)
MTN = I.paint(I.MOUNTAIN_MARK, **PAINT)
REGION = {k: I.paint(v, **PAINT) for k, v in I.REGION.items()}

# ---------------------------------------------------------------- markup


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def wordmark():
    return ('<div class="wordmark"><span class="wm-name">MONTI TRENTINI</span>'
            '<span class="wm-sub">Casari dal 1925 · Grigno, Valsugana</span></div>')


def spec_rail(s, big=False):
    reg = REGION.get(s["region"]["icon"], REGION["valsugana"])
    milk = s["milk"]["type"]
    treat = s["milk"].get("treatment") or ""
    milk_sub = treat if treat else s["milk"].get("detail", "")
    return f'''<div class="rail{' big' if big else ''}">
  <div class="rail-item"><div class="rail-ic">{COW}</div>
    <div class="rail-tx"><b>{esc(milk)}</b><i>{esc(milk_sub)}</i></div></div>
  <div class="rail-item"><div class="rail-ic">{reg}</div>
    <div class="rail-tx"><b>{esc(s["region"]["label"])}</b><i>{esc(s["region"]["sub"])}</i></div></div>
  <div class="rail-item age"><div class="age-num">{esc(s["minAge"])}</div>
    <div class="age-lb">Minimum age</div></div>
</div>'''


def marks(s):
    out = []
    if s.get("designation") == "DOP":
        out.append(f'<div class="mark">{DOP}</div>')
    if s.get("mountainMark"):
        out.append(f'<div class="mark">{MTN}</div>')
    out.append('<div class="origin"><div class="tricolore"><i></i><i></i><i></i></div>'
               '<div class="origin-tx"><span>Product of Italy</span></div></div>')
    return '<div class="marks">' + "".join(out) + "</div>"


def footer(s):
    return f'''<div class="foot">
  {marks(s)}
  <div class="qr-wrap">{qr_svg(s["qrUrl"])}<span>Scan for<br>the story</span></div>
</div>'''


def name_cls(s):
    return " tight" if len(s["name"]) > 22 else ""


def sign_short(s, size):
    return f'''<article class="sign {size} short">
  <div class="bar"></div>
  {wordmark()}
  <div class="photo"><img src="{s['_photo']}" alt="{esc(s['name'])}"></div>
  <div class="body">
    <h2 class="name{name_cls(s)}">{esc(s['name'])}</h2>
    <div class="it">{esc(s['italianName'])}</div>
    {spec_rail(s)}
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    <p class="desc">{esc(s['shortDescription'])}</p>
  </div>
  {footer(s)}
</article>'''


def sign_long(s, size):
    return f'''<article class="sign {size} long">
  <div class="bar"></div>
  {wordmark()}
  <div class="body">
    <h2 class="name big{name_cls(s)}">{esc(s['name'])}</h2>
    <div class="it">{esc(s['italianName'])}</div>
    <p class="flavor">{esc(s['flavorProfile'])}</p>
    {spec_rail(s, big=True)}
    <p class="desc long">{esc(s['longDescription'])}</p>
    <p class="unique"><span>Worth knowing</span>{esc(s['unique'])}</p>
  </div>
  {footer(s)}
</article>'''


CSS = """
*{box-sizing:border-box}
:root{--primary:#064E22;--accent:#009640;--ink:#141413;--cream:#FAF9F5;--paper:#fff;--muted:#6B6B63;
  --display:'Fraunces',Georgia,serif;--ui:'Inter',-apple-system,Segoe UI,sans-serif}
body{margin:0;background:#E8E6DF;color:var(--ink);font-family:var(--ui);
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:1180px;margin:0 auto;padding:34px 22px 60px}
.page h1{font-family:var(--display);font-style:italic;color:var(--primary);font-size:30px;margin:0 0 4px}
.page .lede{color:#444;max-width:62ch;font-size:14px;line-height:1.5;margin:0 0 6px}
.page h3{font-family:var(--ui);text-transform:uppercase;letter-spacing:.14em;font-size:11px;
  color:var(--muted);margin:34px 0 12px;border-top:1px solid #C9C6BC;padding-top:10px}
.grid{display:flex;flex-wrap:wrap;gap:22px}

/* ---------- the sign face ---------- */
.sign{background:var(--cream);position:relative;overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 2px 10px rgba(0,0,0,.14)}
.sign.s34{width:3in;height:4in;padding:0 .17in .13in}
.sign.s45{width:4in;height:5in;padding:0 .22in .16in}
.bar{position:absolute;left:0;right:0;top:0;height:.055in;background:var(--accent)}
.wordmark{text-align:center;padding-top:.14in}
.wm-name{display:block;font-family:var(--ui);font-weight:700;color:var(--primary);
  letter-spacing:.2em;font-size:6.4pt}
.wm-sub{display:block;font-family:var(--display);font-style:italic;color:var(--muted);font-size:5pt;margin-top:1px}
.s45 .wm-name{font-size:7.6pt}.s45 .wm-sub{font-size:6pt}

.photo{margin:.07in -.17in .05in;height:1.15in;overflow:hidden;background:#fff;border-bottom:.5pt solid #DCD9CF;border-top:.5pt solid #DCD9CF}
.s45 .photo{margin:.09in -.22in .06in;height:1.6in}
.photo img{width:100%;height:100%;object-fit:cover;display:block}

.body{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.short .body{justify-content:center}
.name{font-family:var(--display);font-style:italic;font-weight:600;color:var(--primary);
  font-size:13.5pt;line-height:1.06;margin:.02in 0 0}
.s45 .name{font-size:17pt}
.name.big{font-size:16pt;margin-top:.06in}.s45 .name.big{font-size:21pt}
.name.tight{font-size:11.4pt}.s45 .name.tight{font-size:14.5pt}
.name.big.tight{font-size:13.4pt}.s45 .name.big.tight{font-size:17.5pt}
.it{font-family:var(--ui);font-size:5.6pt;letter-spacing:.11em;text-transform:uppercase;
  color:var(--muted);margin-top:2px}
.s45 .it{font-size:6.8pt}
.flavor{font-family:var(--display);font-style:italic;color:var(--accent);font-size:7.4pt;
  line-height:1.28;margin:.055in 0 0}
.s45 .flavor{font-size:9pt}
.desc{font-size:6.7pt;line-height:1.42;color:#333;margin:.05in 0 0;overflow:hidden}
.s45 .desc{font-size:8.6pt}
.s45 .desc.long{font-size:9.2pt;line-height:1.5}
.desc.long{font-size:7pt;line-height:1.46}
.desc.long{text-align:justify;hyphens:auto}
.unique{margin:.06in 0 0;font-size:6.2pt;line-height:1.36;color:#333;border-left:1.6pt solid var(--accent);padding-left:.07in}
.s45 .unique{font-size:8pt}
.unique span{display:block;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
  font-size:5.2pt;color:var(--primary);margin-bottom:1px}
.s45 .unique span{font-size:6pt}

/* spec rail */
.rail{display:flex;gap:.09in;margin:.075in 0 0;border-top:.5pt solid #CFCCC2;border-bottom:.5pt solid #CFCCC2;padding:.05in 0}
.rail-item{display:flex;align-items:center;gap:.035in;flex:1 1 0;min-width:0;overflow:hidden}
.rail-ic{width:.28in;flex:none}
.s45 .rail-ic{width:.36in}
.rail.big .rail-ic{width:.34in}
.rail-ic svg{width:100%;height:auto;display:block}
.rail-tx{min-width:0;line-height:1.15}
.rail-tx b{display:block;font-size:5.6pt;font-weight:700;color:var(--primary);letter-spacing:.02em}
.rail-tx i{font-style:normal;font-size:4.7pt;color:var(--muted);line-height:1.18;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.s45 .rail-tx b{font-size:6.8pt}.s45 .rail-tx i{font-size:5.7pt}
.rail-item.age{flex-direction:column;align-items:flex-end;justify-content:center;text-align:right;gap:0}
.age-num{font-family:var(--display);font-style:italic;font-weight:700;color:var(--accent);
  font-size:10.5pt;line-height:1.02;white-space:nowrap}
.age-lb{font-size:4.7pt;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:1px}
.s45 .age-num{font-size:13pt}.s45 .age-lb{font-size:5.7pt}

/* footer marks + QR */
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:.08in;margin-top:auto;padding-top:.07in}
.marks{display:flex;align-items:center;gap:.06in;flex-wrap:nowrap;min-width:0}
.mark{width:.34in;flex:none}
.s45 .mark{width:.46in}
.mark svg{width:100%;height:auto;display:block}
.origin{display:flex;flex-direction:column;gap:2px}
.tricolore{display:flex;height:2.4pt;width:.34in}
.tricolore i{flex:1}.tricolore i:nth-child(1){background:#008C45}
.tricolore i:nth-child(2){background:#F4F5F0}.tricolore i:nth-child(3){background:#CD212A}
.origin-tx{display:flex;align-items:center;gap:.03in}
.origin-tx svg{width:.11in;height:auto;display:block}
.s45 .origin-tx svg{width:.135in}
.origin-tx span{font-size:5.2pt;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ink);white-space:nowrap}
.s45 .origin-tx span{font-size:6.2pt}.s45 .tricolore{width:.44in}
.qr-wrap{display:flex;align-items:flex-end;gap:.04in;flex:none}
.qr{width:.62in;height:.62in;display:block}
.s45 .qr{width:.78in;height:.78in}
.qr-wrap span{font-size:4.6pt;line-height:1.2;color:var(--muted);text-transform:uppercase;
  letter-spacing:.06em;padding-bottom:2px}
.s45 .qr-wrap span{font-size:5.6pt}

/* crop marks + bleed shown on screen only as a hairline */
.trim{outline:.5pt dashed rgba(0,0,0,.18);outline-offset:0}

@media print{
  body{background:#fff}
  .page{max-width:none;padding:0}
  .no-print{display:none!important}
  .page h1,.page .lede{display:none}
  .page h3{page-break-before:always;margin:0 0 .25in;border:0}
  .grid{gap:.25in}
  .sign{box-shadow:none;outline:.25pt solid #bbb}
  @page{size:letter;margin:.3in}
}
"""

HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Monti Trentini Cheese Signs</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>%CSS%</style></head><body>
<div class="page">
<h1>Cheese Signs — template proof</h1>
<p class="lede">Ten cheeses &times; two sizes &times; two description modes. Every field is pulled from a data record
(<code>signs.json</code>) — nothing on these faces is typed by hand, so the same template fills any SKU in the catalog.
Print at 100% (no &ldquo;fit to page&rdquo;): the 3&times;4 faces measure exactly 3&Prime;&times;4&Prime; and the 4&times;5 faces 4&Prime;&times;5&Prime;.</p>
%SECTIONS%
</div></body></html>"""


def main():
    data = json.load(open(os.path.join(HERE, "signs.json")))
    signs = data["signs"]
    for s in signs:
        s["_photo"] = photo_data_uri(s["image"])
        print("photo ok:", s["id"])

    sections = []
    for size, label in (("s34", "3 &times; 4 in"), ("s45", "4 &times; 5 in")):
        for mode, mlabel, fn in (("short", "short description + photo", sign_short),
                                 ("long", "long description", sign_long)):
            cards = "\n".join(fn(s, size) for s in signs)
            sections.append(f'<h3>{label} &middot; {mlabel}</h3><div class="grid">{cards}</div>')

    html = HTML.replace("%CSS%", CSS).replace("%SECTIONS%", "\n".join(sections))
    out = os.path.join(HERE, "monti-trentini-cheese-signs.html")
    open(out, "w").write(html)
    print("wrote", out, os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    main()
