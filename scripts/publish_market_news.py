#!/usr/bin/env python3
"""publish_market_news.py - Node-free twin of publish-market-news.mjs (stdlib only).

The scheduled Cowork runner often has no Node installed, so the nightly routine uses this.
Verified-equivalent: same endpoint, same headers, same payload, same exit codes.

Input file = a JSON array of news items:
  [{ id, category: "trade"|"consumer", headline, summary, url, source, date: "YYYY-MM-DD", tags[] }]

Env required:
  MARKETNEWS_PUBLISH_URL     e.g. https://<site>/.netlify/functions/market-news-publish
  MARKETNEWS_PUBLISH_SECRET  must match the same env var set in Netlify
Falls back to gitignored scripts/.market-news-publish.json -> {"url": ..., "secret": ...}

Usage: python3 scripts/publish_market_news.py [--in <market-news.json>] [--tenant montitrentini]
Exit: 0 published · 1 bad input/credentials · 2 publish rejected
"""
import json
import os
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def get_arg(flag, default=None):
    argv = sys.argv[1:]
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def main():
    tenant = get_arg("--tenant", "montitrentini")
    path = get_arg("--in", os.path.join(HERE, "..", "src", "data", tenant, "market-news.json"))
    path = os.path.abspath(path)

    url = os.environ.get("MARKETNEWS_PUBLISH_URL")
    secret = os.environ.get("MARKETNEWS_PUBLISH_SECRET")
    if not url or not secret:
        cfg_path = os.path.join(HERE, ".market-news-publish.json")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as fh:
                    cfg = json.load(fh)
                url = url or cfg.get("url")
                secret = secret or cfg.get("secret")
            except Exception:
                pass
    if not url or not secret:
        print("x No publish credentials. Set MARKETNEWS_PUBLISH_URL + MARKETNEWS_PUBLISH_SECRET,", file=sys.stderr)
        print('  or create scripts/.market-news-publish.json with {"url": ..., "secret": ...} (gitignored).', file=sys.stderr)
        return 1

    if not os.path.exists(path):
        print("x market-news file not found: %s" % path, file=sys.stderr)
        return 1

    with open(path, "r", encoding="utf-8") as fh:
        news = json.load(fh)
    if not isinstance(news, list) or not news:
        print("x refusing to publish: file is not a non-empty JSON array of news items", file=sys.stderr)
        return 1

    body = json.dumps({"tenant": tenant, "news": news}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "x-publish-secret": secret},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            payload = res.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        print("x publish failed %s: %s" % (err.code, err.read().decode("utf-8", "replace")), file=sys.stderr)
        return 2
    except Exception as err:
        print("x publish failed: %s" % err, file=sys.stderr)
        return 2

    print("+ published %s market news (%d items) -> live store. %s" % (tenant, len(news), payload))
    return 0


if __name__ == "__main__":
    sys.exit(main())
