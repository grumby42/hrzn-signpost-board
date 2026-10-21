#!/usr/bin/env python3
"""Refresh CISA ICS advisories (ICSA + ICSMA) per year from the ICS Advisory Project.

Source: github.com/icsadvprj/ICS-Advisory-Project, CISA_ICS_ADV_Master.csv, counted by
its 'Year' column (the same method used for the baseline series).
Writes data/live/ics-advisories.json. Run weekly by .github/workflows/refresh.yml.
"""
import csv
import io
import json
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

URL = "https://raw.githubusercontent.com/icsadvprj/ICS-Advisory-Project/main/ICS-CERT_ADV/CISA_ICS_ADV_Master.csv"
OUT = Path(__file__).resolve().parent.parent / "data" / "live" / "ics-advisories.json"

req = urllib.request.Request(URL, headers={"User-Agent": "hrzn-signpost-board (github actions)"})
with urllib.request.urlopen(req, timeout=120) as r:
    text = r.read().decode("utf-8", errors="replace")
rows = list(csv.DictReader(io.StringIO(text)))
if not rows or "Year" not in rows[0]:
    raise SystemExit("Unexpected CSV format: no 'Year' column")
by_year = Counter(r["Year"].strip() for r in rows if r["Year"].strip().isdigit())
def parse(d):  # dataset uses M/D/YYYY
    try:
        return datetime.strptime(d.strip(), "%m/%d/%Y").date()
    except ValueError:
        return None
latest = max(filter(None, (parse(r.get("Original_Release_Date", "")) for r in rows)))
latest_year = max(int(y) for y in by_year)
OUT.write_text(json.dumps({
    "series": "ics-advisories",
    "asof": latest.isoformat(),  # current through the latest advisory release date
    "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
    "source": URL,
    "rows": len(rows),
    "partial_year": latest_year,
    "values": {y: by_year[y] for y in sorted(by_year)},
}, indent=2) + "\n", encoding="utf-8")
print(f"ICS advisories rows {len(rows)}; by year {dict(sorted(by_year.items()))}")
