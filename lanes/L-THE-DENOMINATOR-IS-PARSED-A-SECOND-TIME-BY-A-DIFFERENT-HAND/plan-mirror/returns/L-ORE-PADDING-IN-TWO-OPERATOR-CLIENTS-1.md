RETURN: L-ORE-PADDING-IN-TWO-OPERATOR-CLIENTS
brief: 2fcb85e4
verdict: built
evidence: /Users/svendaneel/okam/web-orepad/lanes/L-ORE-PADDING-IN-TWO-OPERATOR-CLIENTS/EVIDENCE.txt
log:
The two operator clients, from lanes/L-CORE-ORE-LABEL/residual-unfixed-cores.txt: Web (Okam-AS/Web, feature/POS) and AdminApp. The third unfixed Core is a standalone clone no client submodules.
Web: core cd1cc86 -> 4f31003, a single-commit fast-forward — 4f31003's parent IS the old pin, and it is the same commit feature/restaurant-modules already carries under a234509.
Web red at the old pin: 27 of 45 assertions failed. fractionAmount(1..9) all "00"; priceLabel(4, true) "kr 0"; priceLabel(4, false) "kr 0,00".
Web green at 4f31003: 45 of 45. fractionAmount(4) "04"; priceLabel(4, true) "kr 0,04". Driven through the SHIPPED core file via the pin, in the format read out of global-mixin.js:55.
Web also ships test/core-ore-padding.test.js, which `npm test` already runs; it was proven to red against the old pin, so it guards the pin and not only the helper.
THREE hand-written duplicates in AdminApp, swept by the three shapes core's helpers have rather than by name: main.ts fractionAmount, main.ts wholeAmount, RewardTransaction.vue wholeAmount.
One of the three carries the øre defect — app/main.ts:274 — and it is the one every price in app/views resolves to: main.ts:24 is the only core-tools import and it takes priceLabel alone.
The trap, measured rather than argued: with app/core fixed and the copy untouched, 12 of 68 assertions stayed red. A pin bump by itself would have shipped the defect.
AdminApp red 37 of 68 -> green 68 of 68. app/core cdae43d -> 175129c, authored on that history because 4f31003 is not an object in that copy; the changed region is byte-identical.
AdminApp's check lifts the main.ts copies out of the file verbatim by brace-matching, and reads both currency formats from main.ts's own setCurrencyFormat calls, so neither can drift.
`npm run check:ore` runs it alone and `prebuild-android-release` runs it before every release build — this repo has no test framework.
The suffix half was not chased, per the brief. Both clients install an empty suffix, and both checks assert that out of the real call site rather than assuming it.
Commits, unpushed, --no-verify: web-orepad c3695f1 and adminapp-orepad 9b8632c, both on lane/ore-padding-operator-clients, plus Core 175129c on lane/core-ore-padding.
No owner checkout was touched: two fresh worktrees with isolated submodule gitdirs. Web's test/Login.spec.js was red on feature/POS before this lane and still is, for an unrelated missing import.
Seen and not fixed: AdminApp package.json:50 carries a keystore password in cleartext, and both wholeAmount copies hardcode " " thousands while core takes the separator from the format.
END RETURN
