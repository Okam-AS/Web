```
RETURN: L-TESTS-THAT-WRITE-ARTIFACTS
brief: 34fa627b
verdict: built
evidence: lanes/L-TESTS-THAT-WRITE-ARTIFACTS/census.md
log: LIVE NOW: the FE tree is dirty from a test run, not a lane - M workforce-invitation-onboarding.playwright.json + 3 of its 7 tracked PNGs (51+/46-, fields the committed copy predates).
BE EventsDietaryRunSheetWireTests:110 WriteCapture is UNGATED, rewrites tracked artifacts/journeys/ev-dietary/run-sheet.{md,json}; capturedAtUtc=UtcNow so the diff is never empty.
FE has the same defect and nobody had looked: artifact-store writeRun/beginRun, reached by ALL 37 e2e specs. canTakeCanonical:394 is true on sameLineage, so a re-run ALWAYS takes the slot.
10 of 16 tracked FE artifacts get overwritten (3 canonical JSON + the 7 workforce PNGs under fixture/), TWICE per run - begin() files status:"running" over the committed record first.
The other 6 (modal-*) PNGs sit at the pre-backend-key path: not overwritten but ORPHANED - the rewritten JSON points at ignored files, the dangling ref .gitignore:108 forbids. No diff shows it.
ASSERTED vs INCIDENTAL: none of the 4 deliberate regenerators checks the bytes it wrote. The only writes-then-checks instruments are 6 env-gated tests writing docs/api/fixtures - not artifacts/.
Pile B = 8 FE writers (runs/ledger, .core-borrowed, world stamps, PDFs, playwright out): all ignored, 0 committed files. Cleared: jest + 4 proof scripts use mkdtemp; artifacts/tests/*.trx is curated.
Two facts a remedy needs: the BACKEND has no artifacts/ ignore rule at all (Scripts/worldstamp leaves a permanent ??), and .gitignore:105 names 5 force-added journeys when only 3 are.
END RETURN
```
