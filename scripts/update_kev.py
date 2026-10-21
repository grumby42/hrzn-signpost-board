#!/usr/bin/env python3
"""Refresh CISA KEV additions per calendar year.

Source: CISA's public JSON feed, falling back to CISA's own GitHub repo (cisagov/kev-data).
Writes data/live/kev-added.json, which the page, build.py and alerts.mjs merge into
the 'kev-added' series. Run weekly by .github/workflows/refresh.yml.
"""
import json
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

FEED = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
MIRROR = "https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json"
OUT = Path(__file__).resolve().parent.parent / "data" / "live" / "kev-added.json"

feed = None
for url in (FEED, MIRROR):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "hrzn-signpost-board (github actions)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            feed = json.load(r)
        src = url
        break
    except Exception as exc:  # noqa: BLE001
        print(f"fetch failed for {url}: {exc}")
if feed is None:
    raise SystemExit("Could not reach the KEV feed or its mirror")

vulns = feed["vulnerabilities"]
by_year = Counter(v["dateAdded"][:4] for v in vulns)
latest = max(v["dateAdded"] for v in vulns)  # data is current through the latest addition
OUT.write_text(json.dumps({
    "series": "kev-added",
    "asof": latest[:10],
    "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
    "source": src,
    "catalog_version": feed.get("catalogVersion"),
    "total": len(vulns),
    "partial_year": int(latest[:4]),
    "values": {y: by_year[y] for y in sorted(by_year)},
}, indent=2) + "\n", encoding="utf-8")
print(f"KEV total {len(vulns)} as of {latest}; by year {dict(sorted(by_year.items()))}")
