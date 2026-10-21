/* HRZN Signpost Board — forecasting + alert engine.
   Pure JavaScript, no DOM: the page inlines it, and scripts/alerts.mjs runs the
   same file in Node on GitHub Actions, so both evaluate alerts identically. */
(function (root) {
"use strict";
const Z80 = 1.2816;

/* ---------- fitting ---------- */
function ols(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  const b = sxx ? sxy / sxx : 0, a = my - b * mx;
  let sse = 0; for (let i = 0; i < n; i++) sse += (ys[i] - (a + b * xs[i])) ** 2;
  return { a, b, mx, sxx, sse, n };
}
function aicc(sse, n, k) { if (n - k - 1 <= 0) return Infinity; const s = Math.max(sse, 1e-12); return n * Math.log(s / n) + 2 * k + (2 * k * (k + 1)) / (n - k - 1); }
function fitAll(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), n = xs.length, pos = ys.every(y => y > 0), out = {};
  if (n < 3) return out;
  const L = ols(xs, ys), sL = Math.sqrt(L.sse / Math.max(1, n - 2));
  out.linear = { k: 2, f: t => L.a + L.b * t, sd: t => sL * Math.sqrt(1 + 1 / n + (t - L.mx) ** 2 / L.sxx), space: "lin", b: L.b };
  if (pos) {
    let ls = 0; for (let i = 0; i < n; i++) { const yh = out.linear.f(xs[i]); ls += yh > 0 ? (Math.log(ys[i]) - Math.log(yh)) ** 2 : 50; }
    out.linear.aic = aicc(ls, n, 2);
    const E = ols(xs, ys.map(Math.log)), sE = Math.sqrt(E.sse / Math.max(1, n - 2));
    out.exp = { k: 2, f: t => Math.exp(E.a + E.b * t), lf: t => E.a + E.b * t, sd: t => sE * Math.sqrt(1 + 1 / n + (t - E.mx) ** 2 / E.sxx), space: "log", b: E.b, aic: aicc(E.sse, n, 2) };
    if (n >= 5) {
      const ymax = Math.max(...ys); let best = null;
      for (let i = 0; i < 80; i++) {
        const K = ymax * Math.pow(10, 0.004 + i * (1.3 / 79));
        const R = ols(xs, ys.map(y => Math.log(K / y - 1))); const r = -R.b; if (!(r > 0)) continue;
        const t0 = R.a / r, f = t => K / (1 + Math.exp(-r * (t - t0)));
        let sse = 0; for (let j = 0; j < n; j++) sse += (Math.log(ys[j]) - Math.log(f(xs[j]))) ** 2;
        if (!best || sse < best.sse) best = { K, r, t0, sse, f };
      }
      if (best) {
        const sG = Math.sqrt(best.sse / Math.max(1, n - 3)), mx = xs.reduce((a, b) => a + b, 0) / n, sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
        out.logistic = { k: 3, f: best.f, lf: t => Math.log(best.f(t)), sd: t => sG * Math.sqrt(1 + 1 / n + (t - mx) ** 2 / sxx), space: "log", K: best.K, r: best.r, aic: aicc(best.sse, n, 3) };
      }
    }
  } else out.linear.aic = aicc(L.sse, n, 2);
  return out;
}
function pickModel(fits, want) {
  if (want && want !== "auto" && fits[want]) return want;
  let bk = null;
  for (const k of ["linear", "exp", "logistic"]) if (fits[k] && isFinite(fits[k].aic) && (!bk || fits[k].aic < fits[bk].aic - 2)) bk = k;
  return bk || Object.keys(fits)[0];
}
function predict(m, t) {
  if (m.space === "log") { const c = m.lf(t), s = m.sd(t); return { p50: Math.exp(c), lo: Math.exp(c - Z80 * s), hi: Math.exp(c + Z80 * s) }; }
  const c = m.f(t), s = m.sd(t); return { p50: c, lo: c - Z80 * s, hi: c + Z80 * s };
}
function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function probAtLeast(m, t, thr) { const s = m.sd(t); if (m.space === "log") { if (thr <= 0) return 1; return 1 - phi((Math.log(thr) - m.lf(t)) / s); } return 1 - phi((thr - m.f(t)) / s); }

/* ---------- series helpers ---------- */
function years(s) { return Object.keys(s.values).filter(y => s.values[y] !== null && s.values[y] !== undefined).map(Number).sort((a, b) => a - b); }
function fullYears(s) { return years(s).filter(y => !(s.partial_year && y === s.partial_year)); }
function pts(s, from, exclude) { return fullYears(s).filter(y => y >= from && y !== exclude).map(y => [y, +s.values[y]]); }
function modelFor(s, st, exclude) {
  st = st || {}; const ys = years(s); const from = st.from || s.fit_from || ys[0];
  const P = pts(s, from, exclude); const fits = fitAll(P); const key = pickModel(fits, st.model || "auto"); const m = fits[key];
  const last = P.length ? P[P.length - 1][0] : null; const H = Math.min(5, Math.max(1, Math.floor(P.length / 3)));
  return { P, fits, key, m, last, H, from, st };
}
function cagr(s, y1, y0) { const a = s.values[y1], b = s.values[y0]; if (a == null || b == null || b <= 0 || a <= 0) return null; return Math.pow(a / b, 1 / (y1 - y0)) - 1; }

/* ---------- alerts ---------- */
const SEV = { high: 3, medium: 2, low: 1 };
function ruleParams(rules, id, seriesId) {
  const r = (rules.rules || []).find(x => x.id === id); if (!r || r.enabled === false) return null;
  const o = rules.overrides && rules.overrides[seriesId] && rules.overrides[seriesId][id];
  if (o && o.enabled === false) return null;
  return Object.assign({}, r.params, o || {});
}
function pctS(x) { return (x >= 0 ? "+" : "") + (x * 100).toFixed(Math.abs(x) >= 1 ? 0 : 1) + "%"; }
function dayDiff(a, b) { return Math.floor((a - b) / 86400000); }

function evaluate(opts) {
  const series = opts.series || [], bets = opts.bets || [], sps = opts.signposts || [], rules = opts.rules || { rules: [] };
  const now = opts.now ? new Date(opts.now) : new Date(); const settings = opts.settings || {};
  const out = [];
  const add = a => { a.fp = [a.rule, a.ref, a.key].join("|"); out.push(a); };
  const f = opts.fmt || (v => String(Math.round(v)));

  for (const s of series) {
    const fy = fullYears(s); if (!fy.length) continue;
    const L = fy[fy.length - 1], v = s.values[L], pv = s.values[L - 1];
    // Year-over-year swing (latest full year). Adaptive mode tunes the threshold to the
    // series' own history: fire only when this year's swing is unusual for THIS series.
    let p = ruleParams(rules, "yoy", s.id);
    if (p && pv != null && pv > 0) {
      const ch = v / pv - 1, a = Math.abs(ch);
      let med = p.medium, hi = p.high, how = "fixed";
      if (p.mode === "adaptive") {
        const hist = []; for (let i = 1; i < fy.length - 1; i++) { const y0 = s.values[fy[i - 1]], y1 = s.values[fy[i]]; if (y0 > 0 && fy[i] - fy[i - 1] === 1) hist.push(Math.abs(y1 / y0 - 1)); }
        if (hist.length >= (p.min_history || 6)) {
          hist.sort((x, y) => x - y); const q = f => hist[Math.min(hist.length - 1, Math.floor(f * hist.length))];
          med = Math.max(p.medium, q(p.pct_medium)); hi = Math.max(p.high, q(p.pct_high), med * 1.25); how = "tuned to this series";
        }
      }
      const sev = a >= hi ? "high" : a >= med ? "medium" : null;
      if (sev) add({ rule: "yoy", sev, ref: s.id, key: L + ":" + Math.round(ch * 1000), title: `${s.title}: ${pctS(ch)} in ${L}`,
        detail: `${f(pv, s)} in ${L - 1} → ${f(v, s)} in ${L}. Thresholds (${how}): ±${(med * 100).toFixed(0)}% medium / ±${(hi * 100).toFixed(0)}% high.` });
    }
    // Year-to-date pace vs last full year
    p = ruleParams(rules, "pace", s.id);
    if (p && s.partial_year && s.values[s.partial_year] != null && s.asof && s.values[s.partial_year - 1] != null) {
      const d = new Date(s.asof + "T00:00:00Z"), start = Date.UTC(s.partial_year, 0, 1), end = Date.UTC(s.partial_year + 1, 0, 1);
      const frac = (d - start) / (end - start);
      if (frac >= p.min_fraction && frac < 1) {
        const run = s.values[s.partial_year] / frac, prev = s.values[s.partial_year - 1], ch = run / prev - 1;
        const sev = ch >= p.high ? "high" : ch >= p.medium ? "medium" : ch <= -p.medium ? "low" : null;
        if (sev) add({ rule: "pace", sev, ref: s.id, key: s.partial_year + ":" + s.asof, title: `${s.title}: ${s.partial_year} on pace for ${f(run, s)} (${pctS(ch)})`,
          detail: `${f(s.values[s.partial_year], s)} year-to-date as of ${s.asof} (${Math.round(frac * 100)}% of the year) vs ${f(prev, s)} in ${s.partial_year - 1}. Straight-line run-rate; seasonal or bursty series can mislead.` });
      }
    }
    // Trend break: latest full year outside a wide band of a fit made without it.
    p = ruleParams(rules, "band_break", s.id);
    if (p) {
      const st = (settings.m && settings.m[s.id]) || {};
      const M = modelFor(s, st, L);
      if (M.m && M.P.length >= 5 && M.last === L - 1) {
        const c = M.m.space === "log" ? M.m.lf(L) : M.m.f(L), sd = M.m.sd(L);
        const z = M.m.space === "log" ? (Math.log(v) - c) / sd : (v - c) / sd, az = Math.abs(z);
        const sev = az >= (p.z_high || 2.326) ? (p.severity || "high") : az >= (p.z_medium || 1.645) ? (p.severity === "low" ? "low" : "medium") : null;
        const pr = predict(M.m, L);
        if (sev) add({ rule: "band_break", sev, ref: s.id, key: String(L), title: `${s.title}: ${L} broke the trend ${z > 0 ? "upward" : "downward"}`,
          detail: `Reported ${f(v, s)}; the ${({linear:"linear",exp:"exponential",logistic:"S-curve"})[M.key]} fit through ${L - 1} expected ${f(pr.p50, s)}. That's ${az.toFixed(1)} standard errors out (medium ≥ ${p.z_medium || 1.645}, high ≥ ${p.z_high || 2.326}). Possible regime change or reporting change: check the source.` });
      }
    }
    // Acceleration: short-window growth vs long-window growth
    p = ruleParams(rules, "accel", s.id);
    if (p) {
      const c1 = cagr(s, L, L - p.short_years), c2 = cagr(s, L, L - p.long_years);
      if (c1 != null && c2 != null) {
        const gap = c1 - c2;
        if (gap >= p.medium_pts) add({ rule: "accel", sev: "medium", ref: s.id, key: L + ":" + Math.round(gap * 100), title: `${s.title}: accelerating`, detail: `${p.short_years}-yr growth ${pctS(c1)}/yr vs ${p.long_years}-yr ${pctS(c2)}/yr.` });
        else if (gap <= -p.medium_pts) add({ rule: "accel", sev: "low", ref: s.id, key: L + ":" + Math.round(gap * 100), title: `${s.title}: slowing`, detail: `${p.short_years}-yr growth ${pctS(c1)}/yr vs ${p.long_years}-yr ${pctS(c2)}/yr.` });
      }
    }
    // Stale data
    p = ruleParams(rules, "stale", s.id);
    if (p && s.asof) {
      const age = dayDiff(now, new Date(s.asof + "T00:00:00Z"));
      if (age > p.max_age_days) add({ rule: "stale", sev: "low", ref: s.id, key: s.asof, title: `${s.title}: data is ${Math.round(age / 30)} months old`, detail: `Last updated ${s.asof}. Check ${s.source_name} for a newer release and update data/series.json.` });
    }
  }

  // Bets
  const today = now.toISOString().slice(0, 10);
  for (const b of bets) {
    if (b.outcome === true || b.outcome === false) continue;
    let p = ruleParams(rules, "bet_due", "_bets");
    const s = b.kind === "series" ? series.find(x => x.id === b.series) : null;
    const dataReady = s && s.values[b.year] != null && s.partial_year !== b.year;
    if (p && (b.due < today || dataReady)) add({ rule: "bet_due", sev: "medium", ref: b.id, key: b.due, title: `Resolve bet: ${b.claim}`, detail: dataReady ? `${b.year} data is in: ${f(s.values[b.year], s)} vs threshold ${f(b.threshold, s)}.` : `Resolve-by date ${b.due} has passed.` });
    p = ruleParams(rules, "bet_unset", "_bets");
    if (p && typeof b.p !== "number") add({ rule: "bet_unset", sev: "low", ref: b.id, key: "unset", title: `Set your probability: ${b.claim}`, detail: "A bet without a number can't be scored." });
    p = ruleParams(rules, "bet_gap", "_bets");
    if (p && s && typeof b.p === "number") {
      const st = (settings.m && settings.m[s.id]) || {}; const M = modelFor(s, st);
      if (M.m && b.year > M.last && b.year <= M.last + M.H) {
        const mp = probAtLeast(M.m, b.year, b.threshold) * 100, gap = b.p - mp;
        if (Math.abs(gap) >= p.pts) add({ rule: "bet_gap", sev: "low", ref: b.id, key: Math.round(mp / 5) + ":" + b.p, title: `You vs the trend: ${b.claim}`, detail: `You say ${b.p}%, the trend line says ${Math.round(mp)}%. Write down why you disagree; that note is the valuable part.` });
      }
    }
  }
  // Signposts
  for (const sp of sps) {
    let p = ruleParams(rules, "sp_arrived", "_signposts");
    if (p && sp.state === "arrived") add({ rule: "sp_arrived", sev: "high", ref: sp.id, key: sp.changed || "arrived", title: `Signpost arrived: ${sp.title}`, detail: "A roadmap assumption just became real. Run a signpost review now rather than waiting for the quarter." });
    p = ruleParams(rules, "sp_stale", "_signposts");
    if (p && sp.state !== "arrived") {
      const last = sp.changed || sp.reviewed; const age = last ? dayDiff(now, new Date(last + "T00:00:00Z")) : null;
      if (age === null || age > p.days) add({ rule: "sp_stale", sev: "low", ref: sp.id, key: last || "never", title: `Review signpost: ${sp.title}`, detail: last ? `No update in ${age} days.` : "Never reviewed. Record evidence or confirm its state." });
    }
  }
  out.sort((a, b) => SEV[b.sev] - SEV[a.sev] || a.title.localeCompare(b.title));
  return out;
}


/* ---------- derived series ---------- */
// A derived series is computed from two sourced series; it carries both sources.
function derive(series) {
  const byId = Object.fromEntries(series.map(s => [s.id, s]));
  for (const s of series) {
    if (!s.derived) continue;
    const a = byId[s.derived.num], b = byId[s.derived.den]; if (!a || !b) continue;
    const vals = {};
    for (const y of Object.keys(a.values)) {
      const yn = +y; if ((a.partial_year && a.partial_year === yn) || (b.partial_year && b.partial_year === yn)) continue;
      if (s.derived.from && yn < s.derived.from) continue;
      const x = a.values[y], d = b.values[y];
      vals[y] = (x != null && d != null && d !== 0) ? (x / d) * (s.derived.scale || 1) : null;
    }
    s.values = vals;
    s.asof = [a.asof, b.asof].filter(Boolean).sort()[0];
  }
  return series;
}

/* ---------- live data merge (files written by GitHub Actions) ---------- */
function mergeLive(series, live) {
  for (const L of live || []) {
    const s = series.find(x => x.id === L.series); if (!s || !L.values) continue;
    Object.assign(s.values, L.values); if (L.asof) s.asof = L.asof; s.partial_year = L.partial_year || null;
  }
  return series;
}

/* ---------- history replay: which data rules would have fired, year by year ---------- */
function historyAlerts(s, rules, opts) {
  opts = opts || {};
  const out = [], fy = fullYears(s), minYears = opts.minYears || 4;
  for (let i = minYears - 1; i < fy.length; i++) {
    const Y = fy[i];
    const t = Object.assign({}, s, { values: Object.fromEntries(Object.entries(s.values).filter(([y]) => +y <= Y)), partial_year: null, asof: Y + "-12-31" });
    const al = evaluate({ series: [t], rules, settings: opts.settings, now: new Date(Date.UTC(Y + 1, 2, 1)), fmt: opts.fmt })
      .filter(a => a.rule === "yoy" || a.rule === "band_break" || a.rule === "accel");
    for (const a of al) out.push({ year: Y, rule: a.rule, sev: a.sev, title: a.title, detail: a.detail });
  }
  return out;
}

root.HRZN = { Z80, ols, aicc, fitAll, pickModel, predict, phi, probAtLeast, years, fullYears, pts, modelFor, cagr, evaluate, SEV, derive, mergeLive, historyAlerts };
})(typeof globalThis !== "undefined" ? globalThis : this);
