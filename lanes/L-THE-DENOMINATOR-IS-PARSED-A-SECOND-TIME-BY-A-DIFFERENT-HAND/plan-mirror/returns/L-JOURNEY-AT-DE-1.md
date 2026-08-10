RETURN: L-JOURNEY-AT-DE
brief: d6e6248e
verdict: built
evidence: lanes/L-JOURNEY-AT-DE/mutation-log.md
spec_gap: the brief says the receipt now carries the serving fixture's pid/cwd/port, but that recorder is not at e34977a — it is unlanded in web-whoanswered, so this lane recorded who answered from its own runner instead
log:
Parameterised margin-statement-week.spec.js; no new journey. Chosen by measuring all 22 journeys' locators: it addresses 0 elements by text and 76 by data-test, so language moves assertions and never selectors, and it is Margin's fiscal headline.
margin-supplier-to-plate rejected: ~41 Norwegian text locators incl. anchored card/label regexes and selectOption({label:'kilo'}).
Locale driven by the BUILD flag alone: OKAM_EDITION=ch -> nuxt env.EDITION -> config/edition.js -> store/index.js:18 adminLocale='de' -> plugins/i18n.js.
The spec seeds nothing and hands over no dictionary; it reads the flag only to pick which column of expected sentences to assert.
7 runs, private ports 3823/4823, CI=1, free-port precheck; 4010 never bound, pid 73160 never signalled.
A/B PASS at no (baseline + no-regression). C PASS at ch: 15 CH literals across 21 assertion sites on the fiscal surface.
D1 FALSIFICATION: de.ts 'Abgeschlossen'->'Abgeschlosen' (one letter, the MVA-samenstilling class) -> RED, with the DOM quoted in the failure.
D2 the no.ts value corrupted and run at ch PASS + D3 the same mutant at no RED: the pair proves the German render reads translations/de
rather than no-via-fallback, and that the mutated string is genuinely reachable on this surface. E PASS after revert.
All 7 who-answered receipts name this lane's own worktree with 7 distinct pids; none was served by the foreign fixture.
NEITHER calibration finding is covered, stated plainly in the log: the receipt one (ReceiptModal USt-IdNr over a Norwegian orgnr,
/admin/ongoing) and the supplier one (mrg_sup_org_number 'Handelsregisternummer', /admin/margin-suppliers) are both off this surface.
Floor = 1 of 7 Tier-1 surfaces. No copy was fixed; translations byte-clean. F1 the harness has no locale field and two editions collided
on one artifact name (closed for this journey only). F2 modal-estate-scroll-lock TypeErrors at de on /Kvittering|Receipt/i.
END RETURN
