```
RETURN: L-COLLAPSE-THE-TWO-HOOK-SWEEPS
brief: ef1b40dc
verdict: built
evidence: lanes/L-COLLAPSE-THE-TWO-HOOK-SWEEPS/collapse.md
log:
Sits on 8ac6f63 + cffede3 (they stack). lane/collapse-the-two-hook-sweeps @ 542ee15, own worktree, NOT pushed. Numbers from a CLEAN tree: 0 untracked, 301 SFCs, 114 suites, core 1bcab0b, no npm ci.
Removed the regex sweep from test/focus-trap-teardown.test.js. test/vue3-shape-guard.test.js is now the single answer; DENIED = [beforeUnmount, unmounted, emits], subtracted from the live runtime.
Its real defect was not duplication: no planted control of its own (a regex that had stopped matching still reports a clean estate), and no answer between "matched" and "could not read it".
Shown, not asserted - B2/B3 are files that DO declare top-level `unmounted` and that it reports CLEAN: a `//` inside a string eats the rest of the line; `/*` and `*/` in two strings swallow the block.
Collapse measured BEFORE the removal. First run found 2 cases it WOULD have cost: matching anywhere in a file also reached inline `directives:`/`components:` defs the survivor read only at top level.
Both closed position-aware, Vue 2's five directive hooks READ OUT of the runtime's own _update rather than listed. Second run: 0 lost, 7 gained, 2 over-rejections dropped (a method; a string).
Unparseable made loud at ESTATE level: an unreadable probe is written into real components/, scanned, removed, the guard reds. Tripwire: exactly one test file walks the tree AND names a denial.
04-mutation-proof.txt breaks all five added arms and watches each red (M4 swallows the parse failure = the removed sweep's exact defect; M5 puts the sweep back). Suite 113/114, 2605/2607.
The one red, journey-artifact-store, fails IDENTICALLY at unmodified cffede3 here: it pins the checkout DIRECTORY NAME /^Web-modules@/, so it reds in every worktree. Not this lane's; flag its owner.
END RETURN
```
