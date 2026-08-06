RETURN: L-RECEIPT-JOURNEY-AT-DE
brief: b9787060
verdict: built
evidence: lanes/L-RECEIPT-JOURNEY-AT-DE/mutation-log.md
spec_gap: the brief's premise is false and arm F measures it — the old /Kvittering|Receipt/i locator RUNS at ch and passes, because Material Icons are ligatures so the button's textContent is "receipt Quittung" and the regex matched the ICON, not the label; the sibling's F2 TypeError was read from source, never run
log:
modal-estate-scroll-lock.spec.js parameterised by OKAM_EDITION; no new journey. Locator now [data-test="order-action-receipt"], not text.
9 runs, private ports 3847/4847, CI=1, free-port precheck; 4010 never bound, pid 73160 never signalled; 9 distinct pids, all my worktree.
A/B PASS at no (baseline + no-regression). C PASS at ch: 12 receipt labels asserted, 10 of them language-distinguishing.
D1 FALSIFICATION: de.ts 'Bestellnummer:'->'Bestelnummer:' (one letter, the MVA-samenstilling class) -> RED, DOM quoted in the failure.
D2 no.ts value corrupted, run at ch PASS + D3 the same bytes at no RED: the German receipt reads translations/de, not no-via-fallback.
D2/D3 are byte-identical trees differing only in the edition flag; every arm is pinned by spec+de+no shas in its run header. E/G PASS.
WOULD IT HAVE CAUGHT THE TWO GERMAN DEFECTS? NO, and structurally: a literal floor reds on DRIFT, not on a string wrong at birth --
'USt-IdNr.' and 'Handelsregister' are well-formed German a floor author would have copied verbatim. Both are RECORDED as defect findings
on the ch artifact with the DOM quoted, deliberately NOT asserted: pinning them would red on the correction landing elsewhere.
THIRD DEFECT FOUND, larger: plugins/global-mixin.js paymentTypeLabel:82 deliveryTypeLabel:97 orderStatusLabel:134 are switch statements
returning hardcoded Norwegian with no $i, so 3 of the Swiss receipt's 6 VALUES read Ukjent/Hent selv/Forespurt. Recorded, not pinned.
Fixture gained storeVAT (core/models/order/order.ts:50 declares it) or the statutory header does not render at all. translations/ byte-clean.
F1 the recorder still has no locale field, closed locally by naming the ch artifact -de -- now 2 journeys deep, fix it in the recorder.
F3 test/e2e/support/admin.js:33 signs in via /Send kode|Send|senden/i -- the same allowlist pattern, on the door every journey walks.
END RETURN
