```
RETURN: L-COERCION-WRITE-PATHS
brief: bb342200
verdict: built
evidence: lanes/L-COERCION-WRITE-PATHS/mutation-log.md
log:
Committed 4351f8f on lane/coercion-write-paths, worktree /Users/svendaneel/okam/web-coercwrite, parent 3cd2570. Nine paths by pathspec, no git add -A, nothing pushed, worktree clean.
The brief's distinction holds but the margin write paths already had the null-vs-zero axis RIGHT: every blank guard tests `=== ''`/`=== undefined`, never falsiness. The world that was missing is INVALID, and it collapsed into ABSENT.
The defect: `Number('abc')` is NaN and `JSON.stringify` writes NaN as `null` - inside the serializer, invisible at the call site. On waste quantity `null` is not neutral, it is the documented request to value the entry from the ingredient's price, so a typo was recorded as a deliberate "no quantity stated" against the week's food cost. Input is type="text" and canRecord only checked non-empty, so it is reachable by typing.
Fixed in both places: MarginWastePanel refuses with a new key; waste-client refuses at the door the way assertBusinessDate already does for wasteDate one field up - the file's own law, not a new one. A stated 0 still travels as 0, a blank still as null.
Mutation proof exit 0, four states each, five mutants. A/B/C/D die on their own NAMED test; C0 is asserted to SURVIVE.
C0 is a reported survivor and an EQUIVALENT mutant, verified not assumed: the panel guards a string, whose only falsy value is '' - '0' is truthy. Refinement recorded: the falsiness trap is a property of the value's TYPE, not the idiom. `!0` is true, `!'0'` is false. Applying "=== null, never falsiness" to a string field enforces nothing and invites a test that can never fail.
Census of the whole margin surface classifies every site render/write/selection, with the safe ones listed AND reasoned. Write-side: 2 fixed, 9 ruled safe with reasons, 2 hazards unreachable today, 1 sibling-owned.
NOT FIXED, reported: MarginIngredientPanel.vue:146 `number(conversion.factorToBase)` is the one unguarded shared-formatter call site - `format(null)` is "0", so a withheld factor renders as "1 pack = 0 grams". A new instance of F-COERCION-MAKES-A-ZERO; render-side is classification-only under this brief.
A THIRD class the brief did not name: cost-preview.js:257 and margin-statements.vue:393 rank records with `|| 0`. Neither renders nor writes - they choose which record is authoritative, so a coerced value MISROUTES a write rather than misreporting a figure. Both unreachable today; not fixed, since changing ranking is a product decision.
Two write-side hazards left deliberately: statement-client.js `minorOrNull` silently CLEARS a non-integer stock estimate (its own comment argues for refusing), and :194 amountMinor is a raw passthrough. Sole caller MarginSpendPanel validates first, so neither is reachable; hardening would be a behaviour change with no reachable defect behind it.
Suites: 21 margin suites 439/439 and mutation-proof exit 0, both re-run ON THE COMMITTED TREE, worktree clean after. eslint clean on all three changed source files. No container, no SQL, no migration, no journey suite.
Sibling-owned files classified but NOT touched: margin-recipes.vue (+415, carries the trim-loss finding the brief cites, plus the worst render-side truthiness hit at :1058-1060), recipe-client.js, statement-view.js, MarginCoveragePanel.vue. Nothing in the shared checkout was reverted, stashed, restored or cleaned; its 20 dirty sibling files are intact and I dirtied none of them.
Dictionaries: +1/-0 line each in no/en/de, hand-applied to pristine 3cd2570 copies in my own worktree. No bulk edit, no regex.
MERGE NOTE: branch tip moved 3cd2570 -> 5ad0ca0 while I worked; 5ad0ca0 touches none of my six source files. But test/margin-waste.test.js is modified by BOTH my branch and lane/mrg-coverage-unknown (2f4e389, still unmerged) - that file needs a real merge, not a pick.
END RETURN
```
