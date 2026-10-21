# Verification record

**Board:** HRZN Signpost Board · **Verification date:** 2026-10-20 · **Standard:** every reported value traces to a named source; unverifiable values are left blank, never estimated.

## How this was verified

1. **Collection.** Three research passes gathered yearly values from primary sources where reachable. Where a primary file was large or blocked, values were counted directly from the raw data (NVD records, CISA KEV JSON, ICS Advisory Project CSV) rather than taken from summaries.
2. **Independent re-verification.** Four separate checkers that had not seen the collection work re-verified every value and every event date against primary or authoritative sources, and reported each item as verified, corrected, or unverifiable.
3. **Corrections applied.** Two values changed (below), several caveats were added, and two narrative claims were reworded to match what the sources actually say.
4. **Claims audit.** A final independent pass reviewed all page text for unsourced factual statements (results below).

## Series provenance

| Series | Source | Method | Verification result |
|---|---|---|---|
| CVEs published | NIST NVD (via fkie-cad/nvd-json-data-feeds mirror) | Counted by NVD published date, excluding Rejected | 2006–2025 match CVE.ICU exactly; Gamblin year-end reviews within 0.1% (2023–2025); 2026 YTD within 0.4% of CVE.ICU live |
| CISA KEV additions | CISA KEV catalog (cisagov/kev-data, catalog 2026.10.16) | Counted by `dateAdded` year | Recounted from raw JSON; auto-refreshed weekly |
| KEV additions vs CVEs | Derived | KEV added ÷ CVEs published, same year | Computed from verified series |
| ICS advisories | ICS Advisory Project master CSV | Rows grouped by `Year` column (ICSA + ICSMA) | Independent recount matched all 17 years; auto-refreshed weekly |
| Ransomware leak-site victims | ransomware.live yearly stats pages | As published, retrieved 2026-10-20 | Each year confirmed |
| US data compromises | ITRC 2025 Annual Data Breach Report, Appendix A | As published (revised series) | All 20 values confirmed; 2023–2025 also on ITRC's site |
| FBI IC3 reported losses | FBI IC3 annual reports; IC3 PSAs for 2006–2009 | As published | Confirmed against each report; 2010 not published by IC3 |
| FBI IC3 complaints | FBI IC3 annual reports | As published | All 20 values confirmed |
| IC3 loss per complaint | Derived | Losses ÷ complaints, same year | Computed from verified series |
| GPS signal loss in airline ops | IATA GNSS-RFI Safety Risk Assessment v6 (Feb 2026), Fig. 2 | Chart data labels matched to years by axis order | Labels confirmed; 2022 and 2024 also match IATA statements; 2025 provisional |
| Industrial robots installed | IFR World Robotics (newest figure per year) | As published, latest revision | Confirmed; **2016 and 2017 corrected** |
| Frontier AI training compute | Epoch AI (2010–2025 via Our World in Data chart; 2026 Epoch file) | Max per publication year | 2010–2025 confirmed; 2026 is an Epoch estimate |
| Cyber workforce gap | ISC2 Workforce Study | Rounded headline figures | 2019–2024 confirmed via ISC2; 2018 via trade press; no 2025 figure |
| Cyber workforce size | ISC2 Workforce Study | Rounded headline figures | 2020–2024 confirmed via ISC2; 2019 via trade press; no 2025 figure |

## Corrections made after independent verification

| Item | Before | After | Source |
|---|---|---|---|
| IFR installations 2016 | 294,000 | 303,847 | IFR World Robotics 2019, Table 2.1 (revision) |
| IFR installations 2017 | 381,000 | 399,640 | IFR World Robotics 2019, Table 2.1 (revision) |
| IFR 2013–2015, 2019, 2020 | rounded | exact IFR figures | IFR WR2019–WR2021 |
| ITRC analyst note | "2023 jump came largely from" MOVEit | MOVEit described in ITRC's own terms as a major contributor; ITRC does not say it accounts for most of the record | ITRC 2023 Annual Report |
| IC3 underreporting note | undated general claim | FBI's 2016 estimate that about 15% of fraud victims report | IC3 2016 Annual Report |
| Epoch growth rate | "4–5x per year" | "4–5x per year for 2010 to May 2024" | Epoch AI, 28 May 2024 |
| ICS advisories definition | "advisories per year" | "rows grouped by the dataset's Year column" with unique-advisory and release-date caveats | Recount of the CSV |

## Known limitations (stated on the page)

- **Unverifiable and left blank:** IC3 2010 losses (IC3 published no estimate), ISC2 2025 gap and size (not in the 2025 study).
- **Secondary sources only:** ISC2 2018 gap and 2019 workforce size (trade press quoting ISC2); the NVD analysis-delay notice date (2024-02-15), because NIST's page was unreachable.
- **Re-hosted documents:** the ITRC 2025 report table was read from a copy hosted by a news site; ITRC's own page confirms the 2023–2025 values. The 2025 IC3 report was confirmed against the ic3.gov PDF.
- **Chart-derived:** the IATA GPS loss rates are chart labels; year pairing follows the chart axis. IATA's December 2025 estimate for 2025 (59) differs from the provisional chart value (57.1); both are disclosed.
- **Estimates by the source:** most Epoch compute values, including all of 2025 and 2026, are Epoch's estimates, not disclosed figures.
- **Definition sensitivity:** ICS advisory counts change with counting method (rows vs unique IDs; Year column vs release date). The board uses one method consistently and states it.
- **Data hygiene note:** one Epoch data file contained embedded instruction text inside a data field. It was treated as data, not followed, and did not affect any value.

## Event annotations

17 reference events. 16 are verified against primary or authoritative sources (vendor or agency advisories, government releases, WHO, the organizations' own statements). One (NVD analysis-delay notice, 2024-02-15) relies on two agreeing secondary reports and is marked "secondary source" on the page. The 2016–2017 CVE Numbering Authority expansion has no single dated event and is shown as a period. Events are reference points; the board makes no causal claims about them.


## Final claims audit (all page text)

A separate auditor read every sentence on the board, in the data files and in the README, and flagged 27 items: overstatements, causal wording, unsourced facts, and internal inconsistencies. All 27 were resolved:

- **Wrong or unsupported, now fixed:**
  - "Complaints roughly flat" contradicted the board's own data and was replaced with the actual 2020–2025 change.
  - "Mostly jamming" (GNSS) is not stated by IATA and was removed.
  - The MOVEit figures were replaced with ITRC's Q3 2023 counts, cited.
  - The FAA/EASA signpost now reflects that EASA's aircraft-cybersecurity amendments (ED Decision 2020/006/R) already exist.
- **Causal language removed:** the CVE 2017 step change "coincides with," rather than "followed," CNA growth; IC3 notes no longer assert why losses per complaint rose; the analyst note on CVEs lists AI-assisted discovery as one hypothesis among several.
- **Definitions tightened:** KEV is described as CISA's list of CVEs with reliable evidence of exploitation (a subset of all exploited CVEs); ICS counts are labelled as dataset rows; robots are no longer called "programmable controllers."
- **Consistency:** the KEV÷CVE ratio now starts at 2023 (2022 is inflated by KEV's initial backfill); the partial 2021 IATA year is excluded from fits, as with other partial years; the horizon rule reads "last full year of data" everywhere.
- **Source disagreement disclosed:** Epoch's current estimate for AlphaGo Zero (6.49e20 FLOP) is far below what OpenAI's 2018 "AI and Compute" analysis implies (a 300,000-fold increase from AlexNet). The board uses Epoch consistently and says so under the chart.
- **Starter signposts** are all set to "watching"; their state is the owner's judgment to set.
- **README:** GitHub Pages visibility wording corrected; Action SHAs were read with `git ls-remote` on 2026-10-20.

## What is interpretation, not data

- **Forecasts** are statistical extrapolations (method on the Method tab). They are not predictions of fact.
- **Analyst notes** under each chart are labeled "interpretation, not sourced data."
- **Signpost states** (watching / moving / arrived) and **starter bets** are judgments for the owner to set; starter bets carry no probability until the owner adds one.
- **Alert thresholds** were tuned by replaying the rules over 2006–2025 history (replayed over 124 series-years: the untuned defaults produced 47 High alerts, 0.38 per series-year, measured before the two IFR corrections; the tuned rules produce 20, 0.16 per series-year, on the corrected data). The year-to-date pace rule cannot be backtested because historical year-to-date data is not available.
