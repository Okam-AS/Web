```
RETURN: L-THE-TILL-TESTS-ARE-RUN-AND-TRUE
brief: 851f28fe
verdict: built
evidence: docs/plan/lanes/L-THE-TILL-TESTS-ARE-RUN-AND-TRUE/mutation-log.md
log:
All six rescued suites pass unmodified, 149 tests, no repair needed and none deleted. They were true.
45 mutations applied to the shipped POS sources, one suite run per mutation, file restored after each: 44 killed.
Killed include the named defect classes: a blank payer line, a return priced off a listed price, a stale reason on a zero-difference Z, the last split payer's ore rounded away.
One survivor, M4.9: deleting SplitBillModal's seatBuckets .sort() changes nothing, because Object.keys orders integer-like keys ascending by language guarantee.
That test is not vacuous, a reversed comparator and a reversed key walk each red it plus two neighbours. Kept, with the redundancy named in the file rather than left reading as protection.
The suite's own claim that PaymentScreen's last-payer early return is redundant was tested and is CORRECT: equivalent mutant confirmed, M6.3 is what bites instead.
UNMOUNTABILITY REPRODUCES. ReturnBuilder and RefundModal both throw ReferenceError: crypto is not defined out of data(), before any assertion.
ROOT CAUSE re-derived: utils/guid.js:5 guards typeof crypto !== undefined, then utils/guid.js:9 dereferences crypto unguarded. The guard's only false case is the one line 9 crashes on.
Proved in three environments: crypto absent throws; crypto without randomUUID returns a well-formed v4; full webcrypto takes the fast path. The defect is the guard, not the UUID arithmetic.
Not a production defect (browsers define window.crypto, target static prerenders on Node 24). A live test-infrastructure one, and why the till's two money-OUT surfaces were never testable.
guid.js NOT changed: shared util, 8 call sites over POS/Workforce/Meals; the unblocking fix is a jest setupFiles entry touching a config shared by 159 suites while trunk moves. Left for a ruling.
Six of seven subjects were genuinely unexercised: no import, no readFileSync guard. Only PosReceiptView was partly counted, mounted by xz-residual-sites and template-pinned by xz-negated-absence.
Coverage over the seven, measured on the fixed instrument: statements 48/805 to 262/805, functions 8/190 to 105/190, branches 12/350 to 160/350.
TRUNK MOVED: 3ff7f07 to 780d405, the sibling instrument lane landed (+1 suite, +5 tests). Rebased clean; no POS source and no guid.js differ between them, so every mutation result holds.
Tier at branch tip 7aaee5b: 159 suites / 3743 tests / 0 failed. Accounts exactly as 153+6 and 3594+149. No push, no container, no npm install, no worktree created.
END RETURN
```
