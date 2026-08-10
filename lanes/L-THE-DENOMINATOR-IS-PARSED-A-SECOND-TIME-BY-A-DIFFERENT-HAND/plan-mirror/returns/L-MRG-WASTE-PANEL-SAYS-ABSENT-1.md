```
RETURN: L-MRG-WASTE-PANEL-SAYS-ABSENT
brief: 354e0b28
verdict: built
evidence: /Users/svendaneel/okam/web-wasteabsent/lanes/L-MRG-WASTE-PANEL-SAYS-ABSENT/evidence.md
log:
- EXIT: the routes DO NOT EXIST -> the panel says absent, not a softer error. Ref named 8e2b57de (=feature/restaurant-modules): git show of controller, service and entity all "path does not exist".
- UNLANDED, NOT LOST: the controller is on 5 refs (margin-waste, -500, acct-uidx, ef-index-shadow-sweep, integration/mig-stack-land 34 ahead/59 behind, tip NOT its ancestor). None is a deploy tip.
- WHY A VENUE MEETS IT: /margin/status at that tip still answers statements:true, the one thing that puts this panel on screen, so the router 404 lands on every week and printed "could not fetch".
- KEYED ON e.status === 404, NOT e.code: the routing 404 carries no problem+json and so no margin.* code; keying on the code sees the case that cannot happen yet and misses today's (M3 reds 4).
- Only the LIST read infers absence (DELETE 404s for an entry already gone). The panel guards ONCE, above all: no lede, no unknown note, no table, NO FORM to post a counted loss into a dead route.
- PROVEN BY A REAL 404: new margin-waste-absent.test.js drives the page through the REAL client over a stubbed fetch, asserting the request went out. The sibling page suite mocks it away and is blind.
- SIX MUTATIONS, all restored md5-identical, pristine 91/91 both sides: M1 swallow restored 5 red, M2 all-failures-absent 2, M3 keyed on code 4, M4 sticky 1, M5 panel silenced 5, M6 guard dropped 6.
- M4 WAS EQUIVALENT ON PASS 1: selectStatement clears the flag first, so nothing told `=` from `||=`. Added the no-reset re-read finalise/record/remove use; M4 then reds. Pass 1 would have shipped it.
- BEFORE f40fdf3 126/2959/0, AFTER 24ce6fb 127/2972/0, delta by SET DIFF OF NAMES: +13/-0. eslint clean. NOT PUSHED. FLAGGED: MarginCoveragePanel is the same wrong on the same screen. C5: unwalked.
END RETURN
```
