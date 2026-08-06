```
RETURN: L-XZ-RESIDUAL-SITES
brief: eb0c4fbe
verdict: built
evidence: lanes/L-XZ-RESIDUAL-SITES/mutation-log.md · commit 799f05d5 on refs/lanes/L-XZ-RESIDUAL-SITES
spec_gap: CheckPanel.vue:266 `g.discountAmount += line.discountAmount || 0` reads the WIRE field and IS the manufactured-sum shape 293 is not — flagged, not taken: a null group discount would fail the `> 0` guards and delete the row while finalAmount still carries the discount.
reason: nothing stopped; all three exit criteria met and mutation-proved.
log:
BASE b150668b (refs/lanes/L-XZ-NEGATED-ABSENCE). Own worktree web-xz-residual, committed by
pathspec (10 files, no core/node_modules), nothing pushed, no container, 8c6e91fa never read.
THE REVIEWER'S "UNREACHABLE" IS OFF BY FOUR SHAPES. `x > 0` is relational, isAmountStated is the
absence rule; ran both over 19 shapes instead of reasoning: Infinity, 'Infinity', true and a
numeric-valueOf object pass the guard and reach the label. Unported PosReceiptView rendered
"Personalrabatt −—" in real mounted DOM, guard untouched, no fixture bent. Still HARDENING and
written as such: a well-formed .NET long cannot reach Infinity. Formatter claim re-verified.
293 RULED KEEP, on neither offered ground: `g` is not a wire object — groups seeds it 0 and only
`+=` numbers, so the `||0` cannot be reached by an absence. The real coercion is 266 (spec_gap).
TRIPWIRE TRAP: porting `indexOf('</template>')` would have SILENTLY not scanned either site — 18
of 39 POS components close a `<template v-if>` early, CheckLine 28 vs 55, CheckPanel 90 vs 118.
lastIndexOf + a guard test M7 reds. No allowlist, possible only because the port came first.
106 tests (45 mounted, four worlds x three sites). 9/9 mutations red incl. M4 delete-the-literal.
Proof runs in a SCRATCH EXPORT, never the shared tree. Dead branch not shipped: a `close === -1`
throw no file reaches. Full suite 2727/2, both pre-existing basename assertions (stash-proved).
END RETURN
```
