```
RETURN: L-ARTIFACT-FIELDS-VS-HARNESS
brief: 97b35286
verdict: built
evidence: lanes/L-ARTIFACT-FIELDS-VS-HARNESS/mismatches.md
spec_gap: Brief assumed one producer per field and a filename-defined artifact set; family A has two producers (9d4399a + dangling twin 097c3c9e) and 3 of 19 findings are in .json receipts not named *.playwright.json.
log:
19 of 65 committed journey receipts carry a field the tree holding them cannot name. Not six.
Two families, two producers. A: proxiedSubjectServed/Sample, 15 artifacts, sole producer 9d4399a
(+ byte-identical dangling twin 097c3c9e), on 5 of 137 refs only. B is NEW: backendBuild +
canonicalHeldBy + provisional, 4 artifacts, sole producer 533aea4 -- the commit that CREATED
test/e2e/support/artifact-store.js. `git cat-file -t fadc84a:test/e2e/support/artifact-store.js`
-> "exists on disk, but not in fadc84a". Family B is 2026-08-02, two days older than family A.
Discrimination is WITHIN a commit: fadc84a filed 3 receipts from one run, 1 mismatches; 337f9bf2
filed 8, exactly the 3 chain-* mismatch. Same run id, two harness generations, only fields differ.
Four findings sit on live branch tips: lane/L-JOURNEY-GROWTH, lane/wf-timesheet-ui,
lane/L-JOURNEY-PORT-HARDCODED, lane/fe-journey-meals. The 5 known are rows 11-15 and reproduce.
Scope corrections that changed the answer: refs/lanes + refs/salvage exist (137 refs, not 115) and
refs/lanes/L-WORLD-STAMP-WINDOWS is now the ONLY ref at 997936a; and 10 receipts are journey-shaped
but not named *.playwright.json. Census is shape-based, 2112 placements, two universes (sits-on and
committed-into), 0 ancestry violations, no clock used to decide. Controls: known positive fires,
28 sibling keys silent, servingFixture correctly NOT reported. 46 clean. Read-only; nothing moved.
END RETURN
```
