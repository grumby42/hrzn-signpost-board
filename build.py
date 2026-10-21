#!/usr/bin/env python3
"""Build index.html: embed data/*.json into src/template.html and stamp a HRZN build ID.

Run after editing anything in data/:   python3 build.py
The page also reads data/*.json live when hosted (GitHub Pages), so the embedded
copy is the offline fallback.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
now = datetime.now(timezone.utc)
build_id = now.strftime("HRZN-%Y%m%d-%H%MZ")
shipped = now.strftime("%Y-%m-%d %H:%M UTC")


def load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


series = load("series.json")
live_dir = ROOT / "data" / "live"
live = []
if (live_dir / "index.json").exists():  # files written by the weekly GitHub job
    for name in json.loads((live_dir / "index.json").read_text(encoding="utf-8")):
        f = live_dir / name
        if f.exists():
            live.append(json.loads(f.read_text(encoding="utf-8")))


def emb(obj):  # safe inside <script type="application/json">
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")


html = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
html = (html.replace("/*__SERIES__*/", emb(series))
            .replace("/*__BETS__*/", emb(load("bets.json")))
            .replace("/*__SIGNPOSTS__*/", emb(load("signposts.json")))
            .replace("/*__RULES__*/", emb(load("rules.json")))
            .replace("/*__LIVE__*/", emb(live))
            .replace("/*__EVENTS__*/", emb(load("events.json")))
            .replace("/*__ENGINE__*/", (ROOT / "src" / "engine.js").read_text(encoding="utf-8").replace("</", "<\\/"))
            .replace("__BUILD_ID__", build_id)
            .replace("__BUILD_UTC__", shipped))

# GitHub Pages serves a full document; the template is body content, so wrap it.
page = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
        "body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n" + html + "\n</body>\n</html>\n")
(ROOT / "index.html").write_text(page, encoding="utf-8")
(ROOT / "dist").mkdir(exist_ok=True)
(ROOT / "dist" / "artifact.html").write_text(html.replace('<button class="btn ghost" id="dlBtn" type="button">Download file</button>', ""), encoding="utf-8")  # viewer can't download  # body-only copy for Claude artifacts
print(f"{build_id}  shipped {shipped}  ·  {len(series)} series")
