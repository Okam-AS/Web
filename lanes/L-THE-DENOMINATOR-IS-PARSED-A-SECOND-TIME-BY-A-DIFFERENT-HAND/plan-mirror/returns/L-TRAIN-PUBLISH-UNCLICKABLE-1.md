```
RETURN: L-TRAIN-PUBLISH-UNCLICKABLE
brief: dcccbda8
verdict: built
evidence: commit 28548f96 on refs/heads/lane/train-publish-unclickable (base e34977ac, NOT pushed) - lanes/L-TRAIN-PUBLISH-UNCLICKABLE/{probe-before.txt,probe-after.txt,mutation-proof.txt,probe.spec.js,shot-1280-after-publish.png}
log:
Baseline e34977ac; ports 3098/4098, no container, nothing pushed; jest 6/196 + journey green; HEAD untouched.
REPRODUCED FIRST at 1280 in a browser: an ordinary .click() on version-publish TIMED OUT, and it is COVERED -
not off-viewport, zero-size or pointer-events. The versions table's min-content (607px; 635px once a row carries
a real hash+stamp) exceeds its ~488px auto-fit track and never shrinks below it, so it escapes its column and the
RIGHT-hand column, painted later, wins the hit test.
WHY IT SHIPPED IS THE INSTRUMENT: step 9's `blocked = !!covering && ..` scored a NULL elementFromPoint - what an
off-viewport control returns - as CLEAR, so it said "not blocked" while all of that was true.
FIX .trn-table-scroll{overflow-x:auto} + wrapper on all 7 Training tables. PROVED THE SAME WAY: A/B in ONE run
(my fix neutralised at runtime), 5 widths x 2 table states - 8 of 10 cells flip FAILS->LANDS and the 2 already
landing still land, so nothing moved to 1024 or 1440; real clicks, no force or dispatch, published v1+v2 @1280.
MUTATION-PROVED: overflow-x back to visible reds step 9 on "<div class=trn-page__column> subtree intercepts
pointer events". Step 10 dispatchEvent -> real .click(); outcome IS shown (row -> Publisert + hash + stamp,
control GONE). SIBLING assignment-revoke: same overflow, uncovered, but it forced a PAGE scrollbar 1024-1440;
fixed. RESIDUE: at 1024/1280 reachable only after scrolling the table sideways; from 1366 up in plain view.
RESTATE plan.md:525 (docs/plan/** not mine); TrainingEvidenceDocument.vue (other lane) has an unwrapped table.
END RETURN
```
