```
RETURN: L-MRG-COVERAGE-UNKNOWN
brief: 17019a53
verdict: built
evidence: lanes/L-MRG-COVERAGE-UNKNOWN/evidence.md
log:
Brief verified first: HEAD is 3cd2570 as claimed; defect real at statement-view.js:318 (block -> {} then longOrNull(x) || 0) and MarginCoveragePanel.vue:132 (!entryCount -> "nothing recorded"). An existing test ASSERTED the defect; rewritten, not deleted.
Fix: readWasteSummary returns null for an absent or non-object block and drops every || 0; panel has three branches plus a new coverage-waste-unknown hook; one key hand-added to no/en/de.
Three worlds driven THROUGH THE PAGE (mount, coverage panel unstubbed, response via the page's own GetCoverage), asserted as rendered Norwegian sentences from the real dictionary: value / recorded-as-none / no-block-at-all, plus a pin that the three strings are distinct.
Middle world is the non-vacuity control: an always-unknown surface fails WORLD 2.
Mutation: read model collapsed -> RED 5; restore -> GREEN; panel collapsed -> RED 3; restore -> GREEN. Rerun: python3 lanes/L-MRG-COVERAGE-UNKNOWN/mutation-proof.py (exit 0).
Second Number(null) shape found and closed: Intl.NumberFormat().format(null) is "0", so a per-reason count the server withheld printed as a counted zero. Now guarded === null. null, undefined and '' pinned separately; a real 0 still reads as 0.
Suites: all 21 margin jest suites, 443/443. eslint 0 errors (3 indent warnings pre-existing at HEAD, outside my hunks). No container, no journey suite, no ref moved, no migration.
Touched: utils/margin/statement-view.js, components/admin/margin/MarginCoveragePanel.vue, test/margin-waste.test.js, test/margin-statements-page.test.js, lanes/L-MRG-COVERAGE-UNKNOWN/*, and +1 hand-edited line each in translations/no|en|de.ts (already dirty from a sibling; nothing else in them read or changed).
Avoided a hook collision: MarginWastePanel already owns waste-unknown and both panels render on this page, so the new hook is coverage-waste-unknown.
FLAG, not fixed: data-test="waste-row" is ALREADY shared by MarginWastePanel and MarginCoveragePanel, ambiguous on the live page. Pre-existing, out of scope, in files siblings may hold.
END RETURN
```
