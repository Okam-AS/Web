brief: 4bec364d

```
RETURN: L-OFFERS-PAGE-HUNDREDFOLD
verdict: built
evidence: lanes/L-OFFERS-PAGE-HUNDREDFOLD/evidence.md
log:
Baseline e34977ac; built on 35e5cdd (has 8c6e91fa): the recorded reason --
OfferDocument totals correctly and absence-honestly -- holds only there;
offers.vue is byte-identical at both bases.
Premise re-proven, not inherited: every hit across every ref is a definition
line; no branch anywhere calls these. Checked template, computeds, this[...],
$options.methods, importers, git -S (dead since Initial commit).
All four DELETED: repair would have made a second answer to "what does this
offer total", and OfferDocument (rendered here at 336) is the correct one.
statedSum unused -- after deletion nothing renders a total on this page.
Magnitude executed, not read: helper kr 4,99 vs document kr 499,00 (49900
ore); Value helpers 499 vs 49900. Absence kr 0,00, stated-zero == absent.
Commit 021d19c3 on lane/offers-page-hundredfold, update-ref'd + reachable;
parse OK, 24 methods, 0 calculateTotal*, 1 hunk. Suite skipped (load 59.8).
NOTE: worktree lacks 35e5cdd -- its OfferDocument is pre-fix; left as found.
END RETURN
```
