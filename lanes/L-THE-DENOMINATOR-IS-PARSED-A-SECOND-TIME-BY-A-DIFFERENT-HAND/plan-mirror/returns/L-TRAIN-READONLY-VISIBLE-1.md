```
RETURN: L-TRAIN-READONLY-VISIBLE
brief: 9fbc2477
verdict: built
evidence: lane/train-readonly-visible @ abef9aac · lanes/L-TRAIN-READONLY-VISIBLE/shots/{before,after}-setup-row.png · mutation-proof.txt
log:
Verified the gate at my own baseline e34977ac rather than inheriting it. The brief understates it.
TrainingModuleGate: 8 read paths call EnsureVisibleAsync and consult NO flag; writes call
EnsureWritableAsync(flag) -> 409 training.flag-disabled-read-only when off on a VISIBLE store.
Visible = training.setup on OR any Training row exists. The claim holds, with a condition it
omits: a store that never recorded anything DOES go dark, on 404. The copy says so.
Both rows now carry their own sentence, above their own switch, standing whichever way set;
they differ because their gates differ - only training.setup is part of the visibility test.
FINDING, acted on: ff_page_intro made that promise for ALL SIX modules. False for Events -
EventsModuleGate 404s EVENTS_DISABLED, reads included (read in source). Intro stops generalising.
FINDING, left alone: whether Events SHOULD dark its reads is its owner's call, not this lane's.
Browser proof, not jsdom: jest stubs $i, so every page assertion is a KEY. shots/ holds the same
3 surfaces before and after, nuxt dev at locale no, ports 3151/4151. No container, no journey rerun.
9 mutations each red alone, tree restored byte-for-byte; 14 suites/484 green; eslint 0 errors.
Committed via temp GIT_INDEX_FILE: translations carry 5 OTHER lanes' hunks, only my 2 per file are
in abef9aac. HEAD untouched at e34977ac, 188 dirty files unchanged. C5: no operator has read it yet.
END RETURN
```
