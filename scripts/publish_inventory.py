#!/usr/bin/env python3
"""publish_inventory.py — Python equivalent of scripts/publish-inventory.mjs.

POSTs the canonical inventory.json to the inventory-publish Netlify function, which
validates it and writes it to Netlify Blobs. The app's inventory.js function then
serves it to the browser on next load — NO rebuild. Exists for environments without
Node (the unattended Cowork routine). Touches ONLY inventory, never pricing.

Credentials (env wins, else gitignored scripts/.inventory-publish.json):
  INVENTORY_PUBLISH_URL     https://<site>/.netlify/functions/inventory-publish
  INVENTORY_PUBLISH_SECRET  must match the same env var set in Netlify
Usage: python3 scripts/publish_inventory.py [--in <inventory.json>] [--tenant montitrentini]
"""
import sys, os, json, urllib.request, urllib.error

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SCRIPTS_DIR)
args = sys.argv[1:]

def get_arg(flag, default=None):
    if flag in args:
        i = args.index(flag)
        return args[i + 1] if i + 1 < len(args) else default
    return default

tenant = get_arg("--tenant", "montitrentini")
file = get_arg("--in", os.path.join(REPO, "src/data/montitrentini/inventory.json"))

url = os.environ.get("INVENTORY_PUBLISH_URL")
secret = os.environ.get("INVENTORY_PUBLISH_SECRET")
if not url or not secret:
    cfg_path = os.path.join(SCRIPTS_DIR, ".inventory-publish.json")
    if os.path.exists(cfg_path):
        try:
            c = json.load(open(cfg_path, encoding="utf-8"))
            url = url or c.get("url"); secret = secret or c.get("secret")
        except Exception:
            pass
if not url or not secret:
    sys.stderr.write("✗ No publish credentials. Set INVENTORY_PUBLISH_URL + INVENTORY_PUBLISH_SECRET,\n"
                     "  or create scripts/.inventory-publish.json with { \"url\": ..., \"secret\": ... } (gitignored).\n")
    sys.exit(1)
if not os.path.exists(file):
    sys.stderr.write(f"✗ inventory file not found: {file}\n"); sys.exit(1)

inventory = json.load(open(file, encoding="utf-8"))
n = len(inventory.get("skus", {}))
payload = json.dumps({"tenant": tenant, "inventory": inventory}).encode()
req = urllib.request.Request(url, data=payload, method="POST",
    headers={"Content-Type": "application/json", "x-publish-secret": secret})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"✓ published {tenant} inventory ({n} SKUs) -> live store. HTTP {r.status}: {r.read().decode()}")
except urllib.error.HTTPError as e:
    sys.stderr.write(f"✗ publish failed {e.code}: {e.read().decode()}\n"); sys.exit(2)
except Exception as e:
    sys.stderr.write(f"✗ publish error: {e}\n"); sys.exit(2)
