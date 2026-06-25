#!/usr/bin/env python3
"""sync_inventory.py — Python equivalent of scripts/sync-inventory.mjs.

Exists because some run environments (e.g. the unattended Cowork routine) have no
Node. Verified to produce output semantically identical to the .mjs (same SKU set,
same lot data; 0 diffs) from the same CSV. Prefer the .mjs when Node is available;
use this otherwise. Same flags: [--in <csv>] [--out <name>] [--check] [--promote].

Touches ONLY inventory. Never reads or writes pricing (catalog.json).
"""
import sys, os, re, json, math, glob, time, shutil
from datetime import datetime, timezone

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SCRIPTS_DIR)
DATA_DIR = os.path.join(REPO, "src/data/montitrentini")
SRC_DIR = os.path.join(DATA_DIR, "source")
args = sys.argv[1:]

def get_arg(flag):
    if flag in args:
        i = args.index(flag)
        return args[i + 1] if i + 1 < len(args) else None
    return None

def newest_csv():
    files = sorted(os.path.basename(f) for f in glob.glob(os.path.join(SRC_DIR, "*"))
                   if re.match(r'^availability_.*\.csv$', os.path.basename(f), re.I))
    return os.path.join(SRC_DIR, files[-1]) if files else None

IN = get_arg("--in") or newest_csv()
out_flag = get_arg("--out")
OUT = os.path.join(DATA_DIR, out_flag) if out_flag else os.path.join(DATA_DIR, "inventory.json")
if not IN or not os.path.exists(IN):
    sys.stderr.write("No input CSV found. Pass --in <path> or place source/availability_*.csv\n"); sys.exit(1)

def parse_csv(text):
    rows, row, field, inQ = [], [], "", False
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if inQ:
            if c == '"':
                if i + 1 < n and text[i + 1] == '"':
                    field += '"'; i += 1
                else:
                    inQ = False
            else:
                field += c
        elif c == '"':
            inQ = True
        elif c == ",":
            row.append(field); field = ""
        elif c == "\n":
            row.append(field); rows.append(row); row = []; field = ""
        elif c == "\r":
            pass
        else:
            field += c
        i += 1
    if field or row:
        row.append(field); rows.append(row)
    return rows

MONTHS = {"jan":"01","feb":"02","mar":"03","apr":"04","may":"05","jun":"06",
          "jul":"07","aug":"08","sep":"09","oct":"10","nov":"11","dec":"12"}
TODAY = datetime.now()

def clean(s):
    return "" if s is None else str(s).strip()

def iso_from_mdy(s):
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', clean(s))
    if not m: return None
    return f"{m.group(3)}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}"

def iso_from_eta(s):
    m = re.search(r'(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?', clean(s))
    if not m: return None
    mo, d, g3 = int(m.group(1)), int(m.group(2)), m.group(3)
    if g3:
        y = 2000 + int(g3) if len(g3) == 2 else int(g3)
    else:
        y = TODAY.year
        if (TODAY - datetime(y, mo, d)).total_seconds() / 86400 > 183:
            y += 1
    return f"{y}-{str(mo).zfill(2)}-{str(d).zfill(2)}"

def month_year(s):
    m = re.match(r'^([A-Za-z]{3})-(\d{2})$', clean(s))
    if not m: return None
    mo = MONTHS.get(m.group(1).lower())
    return f"20{m.group(2)}-{mo}" if mo else None

def num(s):
    t = clean(s).replace(",", "")
    if t == "": return None
    try:
        n = float(t)
    except ValueError:
        return None
    if not math.isfinite(n): return None
    return int(n) if n == int(n) else n

def int_or_0(s):
    n = num(s)
    return 0 if n is None else math.trunc(n)

raw = open(IN, "r", encoding="utf-8").read()
rows = parse_csv(raw)

last_updated = TODAY.strftime("%Y-%m-%d")
banner = next((r for r in rows if any(re.search(r'updated on', c, re.I) for c in r)), None)
if banner:
    idx = next(i for i, c in enumerate(banner) if re.search(r'updated on', c, re.I))
    val = clean(banner[idx + 1]) if idx + 1 < len(banner) else ""
    m = re.search(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', val)
    if m:
        mo = MONTHS.get(m.group(2)[:3].lower())
        if mo:
            last_updated = f"{m.group(3)}-{mo}-{m.group(1).zfill(2)}"

h_idx = next((i for i, r in enumerate(rows) if clean(r[0]).lower() == "item"), -1)
data_rows = rows[h_idx + 1:]

skus = {}
def ensure(code, name):
    code = clean(code)
    if not code: return None
    if code not in skus:
        skus[code] = {"code": code, "name": clean(name), "casesAvail": 0,
                      "casesInTransit": 0, "comment": "", "commentEn": "", "lots": []}
    elif not skus[code]["name"] and name:
        skus[code]["name"] = clean(name)
    return skus[code]

def cell(r, i):
    return r[i] if i < len(r) else ""

for r in data_rows:
    code = clean(cell(r, 0))
    if not code: continue
    s = ensure(code, cell(r, 1))
    s["casesAvail"] = int_or_0(cell(r, 2))
    s["comment"] = clean(cell(r, 6))

lot_count = 0
for r in data_rows:
    code = clean(cell(r, 8))
    if not code: continue
    s = ensure(code, cell(r, 9))
    receipt_raw = clean(cell(r, 11))
    receipt_date = iso_from_mdy(receipt_raw)
    on_hand = bool(receipt_date)
    eta = exp_date = exp_month = None
    if on_hand:
        exp_date = iso_from_mdy(clean(cell(r, 16)))
    else:
        eta = iso_from_eta(receipt_raw)
        exp_month = month_year(clean(cell(r, 16)))
    net_avail = num(cell(r, 15))
    s["lots"].append({
        "lotNum": clean(cell(r, 10)) or None,
        "status": "on_hand" if on_hand else "in_transit",
        "receiptDate": receipt_date or None,
        "eta": eta,
        "cases": int_or_0(cell(r, 12)),
        "reserved": int_or_0(cell(r, 13)),
        "netAvailLb": None if net_avail is None else net_avail,
        "expDate": exp_date,
        "expMonth": exp_month or None,
        "comment": clean(cell(r, 14)),
    })
    lot_count += 1

for code in list(skus.keys()):
    s = skus[code]
    s["casesInTransit"] = sum((l["cases"] or 0) for l in s["lots"] if l["status"] == "in_transit")

out = {
    "schemaVersion": "1.2",
    "clientId": "monti-trentini",
    "lastUpdated": last_updated,
    "source": os.path.basename(IN),
    "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.")
                   + f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z",
    "generatedBy": "scripts/sync-inventory.mjs",
    "skus": skus,
}

sku_count = len(skus)
with_stock = sum(1 for s in skus.values()
                 if any(l["status"] == "on_hand" and (l["cases"] - l["reserved"]) > 0 for l in s["lots"]))

def validate(doc):
    errs = []
    n = len(doc["skus"])
    if n < 80: errs.append(f"only {n} SKUs parsed (expected ~110+) — sheet shape may have changed")
    if lot_count < 80: errs.append(f"only {lot_count} lots parsed (expected ~120) — lot table may be malformed")
    if with_stock < 10: errs.append(f"only {with_stock} sellable-now SKUs (expected ~40) — suspiciously low")
    for code, s in doc["skus"].items():
        for l in s["lots"]:
            if l["status"] == "on_hand" and not l["expDate"]:
                errs.append(f"on-hand lot {code}/{l['lotNum']} missing expDate")
            if l["cases"] is None:
                errs.append(f"lot {code}/{l['lotNum']} has no case count")
    return errs[:8]

CANON = os.path.join(DATA_DIR, "inventory.json")
def sellable_map(doc):
    return {k: sum(max(0, (l["cases"] or 0) - (l["reserved"] or 0))
                   for l in s["lots"] if l["status"] == "on_hand")
            for k, s in doc["skus"].items()}

def diff_vs_canon(doc):
    if not os.path.exists(CANON):
        return {"changed": True, "lines": ["(no existing inventory.json — first promote)"]}
    try:
        prev = json.load(open(CANON, encoding="utf-8"))
    except Exception:
        return {"changed": True, "lines": ["(existing inventory.json unreadable)"]}
    a, b = sellable_map(prev), sellable_map(doc)
    keys = list(dict.fromkeys(list(a.keys()) + list(b.keys())))
    lines = []
    for k in keys:
        x, y = a.get(k), b.get(k)
        if x != y:
            nm = (doc["skus"].get(k) or prev["skus"].get(k))["name"]
            lines.append(f"{k} {nm}: {x if x is not None else '-'} -> {y if y is not None else '-'}")
    return {"changed": len(lines) > 0 or prev.get("lastUpdated") != doc["lastUpdated"], "lines": lines}

def dump(doc):
    return json.dumps(doc, ensure_ascii=False, indent=2) + "\n"

if "--promote" in args or "--check" in args:
    errs = validate(out)
    diff = diff_vs_canon(out)
    if errs:
        sys.stderr.write("✗ VALIDATION FAILED — not promoting:\n")
        for e in errs: sys.stderr.write("   - " + e + "\n")
        sys.exit(2)
    if not diff["changed"]:
        print(f"= No change vs current inventory.json (sheet lastUpdated {last_updated}). Nothing to promote.")
        sys.exit(3)
    if "--check" in args:
        print(f"✓ VALID & CHANGED ({len(diff['lines'])} SKU sellable-now deltas). Safe to promote.")
        for l in diff["lines"][:12]: print("   " + l)
        sys.exit(0)
    if os.path.exists(CANON):
        bdir = os.path.abspath(os.path.join(DATA_DIR, f"../../archive/backup_{TODAY.strftime('%Y-%m-%d')}_inventory_autosync"))
        os.makedirs(bdir, exist_ok=True)
        shutil.copyfile(CANON, os.path.join(bdir, f"inventory_{int(time.time() * 1000)}.json"))
    open(CANON, "w", encoding="utf-8").write(dump(out))
    print(f"✓ PROMOTED -> {os.path.relpath(CANON)}  (SKUs {sku_count} | lots {lot_count} | sellable-now {with_stock})")
    for l in diff["lines"][:12]: print("   " + l)
    sys.exit(0)

open(OUT, "w", encoding="utf-8").write(dump(out))
print(f"✓ {os.path.basename(IN)} -> {os.path.relpath(OUT)}")
print(f"  SKUs: {sku_count} | lots: {lot_count} | sellable-now SKUs: {with_stock} | lastUpdated: {last_updated}")
