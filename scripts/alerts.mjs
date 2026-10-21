// Evaluate data alerts with the same engine the page uses, write data/alerts.json,
// and (on GitHub Actions) open one Issue per new HIGH alert.
// Bets and signposts live in your browser, so only data rules run here.
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const read = p => JSON.parse(fs.readFileSync(p, "utf8"));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("src/engine.js", "utf8"), ctx);
const HRZN = ctx.HRZN;

const series = read("data/series.json");
const live = fs.existsSync("data/live/index.json") ? read("data/live/index.json").filter(n => fs.existsSync("data/live/" + n)).map(n => read("data/live/" + n)) : [];
HRZN.mergeLive(series, live); HRZN.derive(series);
const rules = read("data/rules.json");
const fmt = (v, s) => {
  const a = Math.abs(v), pre = s && s.unit === "USD" ? "$" : "";
  if (s && s.unit === "pct") return v.toFixed(2) + "%";
  if (s && s.unit === "FLOP") { const e = Math.floor(Math.log10(a)); return (v / 10 ** e).toFixed(1) + "e" + e; }
  if (a >= 1e9) return pre + (v / 1e9).toFixed(2) + "B"; if (a >= 1e6) return pre + (v / 1e6).toFixed(2) + "M";
  if (a >= 1e4) return pre + (v / 1e3).toFixed(1) + "K"; return pre + Math.round(v).toLocaleString("en-US");
};
const alerts = HRZN.evaluate({ series, rules, now: new Date(), fmt });
fs.writeFileSync("data/alerts.json", JSON.stringify({ generated: new Date().toISOString(), alerts }, null, 2) + "\n");
console.log(`${alerts.length} alerts:`); for (const a of alerts) console.log(`  [${a.sev}] ${a.title}`);

if (process.env.GITHUB_ACTIONS && process.env.HRZN_OPEN_ISSUES !== "false") {
  const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });
  try { gh("label", "create", "hrzn-alert", "--color", "B0306F", "--description", "Signpost Board alert", "--force"); } catch { /* label exists */ }
  for (const a of alerts.filter(x => x.sev === "high")) {
    const fp = `fp:${a.fp}`;
    const found = JSON.parse(gh("issue", "list", "--label", "hrzn-alert", "--state", "all", "--search", `"${fp}" in:body`, "--json", "number"));
    if (found.length) continue;
    gh("issue", "create", "--label", "hrzn-alert", "--title", `[HRZN HIGH] ${a.title}`,
       "--body", `${a.detail}\n\nRule: \`${a.rule}\` · Series: \`${a.ref}\`\n\nRun the 7-question debrief on it, then close this issue with your call.\n\n<sub>${fp}</sub>`);
    console.log(`  opened issue for ${a.fp}`);
  }
}
