RETURN: L-THE-LANDING-ORDER-IS-COMPUTED-AND-PROVEN
brief: bdd1a241
verdict: built
evidence: docs/plan/artifacts/landing-order.md
log: Thirteen 08-07 branches collapse to eight landable units, composed end-to-end on a throwaway detached HEAD; every git merge clean, every red semantic; trunk untouched at d4c308e.
Premises verified: aff616d not on trunk; 8d4d1b0 contains it; 6d43520 contains 6670619. Corrections: the artifacts/ rule is .gitignore:111 not :119; core a6ae241 fast-forwards from 9626a561.
Subsumption proven: 6670619 contains fddb06c patch-exactly; 40ab62d contains 52a93c5 and c65b19c. Those four inner tips must never land separately — same-file collisions otherwise.
Step tiers: 4007, 4020, 4024, 4080, 4195, 4301, 4313, 4409, 4433 — each delta matches its lane's report; 2ce83f6's old-base tier was unreconcilable and re-measured composed: +12, 0 new red.
SEAM 1 measured: c65b19c's no-git-restore guard reds on the meals mutate.js that 5ed9664 commits — 1 red, order-independent; the in-flight runner-fix lane must ride the same tranche.
SEAM 2 refuted by measurement: 2ce83f6 composes clean with the workforce chain despite the shared timesheets page — merge clean, no new red.
SEAM 3 measured: 40ab62d reds nine named arms of the meals offer suite — all five THE DEFECT pins plus four behaviour arms; a nine-arm rewrite ships with T5 per D-HOW-A-KNOWN-DEFECT-IS-PINNED.
Two-repo unit: core a6ae241 exists ONLY as the bundle on 6670619 — main store and ~50 worktree stores swept, zero hits; the bundle restore recipe proven by step 8's green tier; core pushes first.
Preservation warning: core 4f31003 and 1bcab0b are also absent from the main store and live only in worktree-local stores — bundle them before any worktree cleanup destroys them.
Total order: T1 c65b19c, 1c607fd, 32518da, 6026d35; T2 5ed9664 plus runner fix; T3 8d4d1b0 then 2ce83f6; T4 core bundle then 6d43520; T5 40ab62d plus pin rewrite. End state 183/4433/0.
Arity sweep on the composed tree: zero unresolved imports across the six changed modules; 177 call sites; all 26 raw flags adjudicated false — homonyms plus my counter's nested-paren bug, named.
Measured in composition: 8d4d1b0 fixes aff616d's deliberate red; growth's three DEFECT arms turn green inside chain A.
Out of scope, recorded: the four older 08-06 heads with unlanded-commit counts; 2ce83f6's return names an OkamAPI backend half this repo cannot see — the landing lane must pair or knowingly lead it.
Artifact committed fdd2f17 by pathspec commit (the clerk's dirty plan files untouched), force-added past the ignore rule, verified with git ls-files --error-unmatch.
Worktree Web-modules-wt/L-LANDING-ORDER removed and pruned; all thirteen tips and every trunk exactly where found; nothing pushed, no container, no port, no install.
END RETURN
