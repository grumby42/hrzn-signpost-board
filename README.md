# HRZN Signpost Board

A single-page dashboard for tracking long-range signposts at the cyber-physical seam: vulnerability volume, exploited-in-the-wild counts, breaches, fraud losses, OT advisories, ransomware, workforce, AI compute, robotics and aviation GNSS interference — 2006 to now, with trend forecasts that stop at a defensible horizon, and a bets tracker that scores your own calibration.

It works offline (open `index.html`), on GitHub Pages, and on a phone.

## What's on it

| Tab | What it does |
|---|---|
| **Brief** | The executive view, and the landing page: computed top takeaways, nine status tiles, an indexed threat-vs-capacity chart, Now / Next / Watch actions (labelled as judgment), changes since your last review, and what's coming due. *Copy brief as text* produces an email-ready summary. |
| **Board** | One row per signpost series: latest value, 1-yr change, 5-yr CAGR, best-fit trend, safe horizon, sparkline. Pick a row for the full chart, an 80% prediction band and a TAF-style outlook. |
| **Timeline** | Hazard timeline: every series × every year, marking where a data rule would have fired (current rules, replayed on the data available at the time), plus verified reference events. |
| **Alerts** | SIEM-style rules over the data, your bets and your signposts: year-over-year swings, year-to-date pace, trend breaks, acceleration, stale data, bets ready to resolve, you-vs-model gaps, signposts arrived. Severity, acknowledge / re-open, and an editable rules table. |
| **Bets** | Probabilities you commit to before the answer is known. Series-threshold bets show the model's own probability beside yours and can be resolved from data. Resolved bets get a Brier score. |
| **Signposts** | Qualitative developments to watch (regulation, capability, job market), each with a state: watching / moving / arrived / fading. Plus the quarterly review questions and notes. |
| **Method** | The equations, the band, and the horizon rule, in plain language. Save / load your local state. |

## Forecast method (short version)

- Linear, exponential and logistic fits over the years you choose; the best is picked by AICc on log-scale residuals.
- 80% prediction band from the fit's residuals, widened with distance from the data.
- **Safe horizon:** `min(5, floor(n/3))` years past the last full year of data. Nothing is drawn beyond it.
- Year-to-date values are shown (hollow point) but never fitted.

The band only knows how noisy the past was. It doesn't know about rule changes, reporting changes or black swans. That's what the Signposts tab and the quarterly review are for.

## Alerts and rules

Rules live in `data/rules.json` (thresholds, on/off, per-series overrides). The page and the GitHub job run the **same** engine (`src/engine.js`), so they always agree.

- **On the page:** Alerts → Rules. Changes apply in your browser immediately.
- **On GitHub:** press *Copy rules JSON* and paste it over `data/rules.json`. The weekly job then uses your thresholds, and every **new High** data alert opens a GitHub Issue (labelled `hrzn-alert`) so you get an email. Close the issue with your call after running the debrief questions.
- Bets and signposts are private to your browser, so their alerts show on the page only.

Rules don't change themselves. Tuning them is part of the quarterly signpost review, the same way you'd tune a SIEM.

## Supply-chain hygiene

- GitHub Actions are pinned to full commit SHAs (tag noted beside each; SHAs read from each repository's tags with `git ls-remote` on 2026-10-20), so a moved tag can't change what runs.
- Dependabot opens a monthly PR when a pinned Action has an update.
- The page loads no third-party scripts. Its only external request is Google Fonts, with system-font fallbacks.
- The workflow's token is limited to `contents: write` and `issues: write`.

## Set up on GitHub (5 minutes)

1. Create a new repository (e.g. `hrzn-signpost-board`) and upload everything in this folder, keeping the folder structure (`.github/`, `data/`, `scripts/`, `src/`).
2. **Settings → Pages →** Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`. Save. The site appears at `https://<you>.github.io/hrzn-signpost-board/` within a minute or two.
3. **Settings → Actions → General →** Workflow permissions: *Read and write*. This lets the weekly refresh commit and open alert Issues.
4. **Actions → Refresh live data and alerts → Run workflow** once to test it. After that it runs every Monday and updates the CISA KEV and ICS advisory counts automatically.

GitHub Pages sites are publicly viewable, and publishing Pages from a private repository requires a paid plan. Your bets, signpost states and review notes are **not** in the repo: they live in your browser. Use *Method → Copy JSON* to back them up or move them between phone and laptop.

## Updating data

Edit `data/series.json`, then run `python3 build.py`. That re-embeds the data and stamps a new build ID (`HRZN-YYYYMMDD-HHMMZ`). On GitHub Pages the page also reads `data/series.json` live, so a commit is enough even without rebuilding.

Each series has: `id, title, domain, unit, source_name, source_url, definition, values{year: number|null}, notes, asof`, and optionally `partial_year` (a year-to-date value that is shown but not fitted), `scale` (`log` for multi-order-of-magnitude series), `fit_from`, `why`.

**Rule:** values come from a cited source or stay `null`. No interpolation.

## Files

```
index.html                 the page (built; open directly or serve via Pages)
src/template.html          page source with data placeholders
data/series.json           the signpost series (sourced yearly values)
data/bets.json             starter bets
data/signposts.json        starter qualitative signposts
data/live/                 written by the weekly refresh (KEV, ICS advisories)
data/events.json           verified reference events (date, description, source)
scripts/update_ics.py      recounts ICS advisories from the ICS Advisory Project dataset
VERIFICATION.md            provenance and independent-verification record for every series
scripts/update_kev.py      pulls the CISA KEV feed (falls back to cisagov/kev-data)
scripts/alerts.mjs         evaluates alerts with src/engine.js; opens Issues for new Highs
src/engine.js              forecasting + alert engine shared by page and Actions
data/rules.json            alert rules and thresholds
data/alerts.json           last alert run (written by the weekly job)
build.py                   embeds data + stamps build ID
.github/workflows/refresh.yml   weekly refresh + alerts + rebuild
.github/dependabot.yml     monthly Action update PRs
dist/artifact.html         body-only copy for hosting as a Claude artifact
```

## License

MIT.
