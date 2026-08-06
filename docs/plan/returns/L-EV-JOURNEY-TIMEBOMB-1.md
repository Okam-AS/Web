```
RETURN: L-EV-JOURNEY-TIMEBOMB
brief: 2515a1db
verdict: built
evidence: lanes/L-EV-JOURNEY-TIMEBOMB/ at lane/ev-journey-timebomb b7a9f389 (parent 4b5c5c2; feature/restaurant-modules NOT moved, still 4b5c5c2)
log:
RESUMED at 4b5c5c2, this lane's own commit: the two brief faults were already closed by
reading the file. Kept it whole, redid nothing, added what RUNNING it twice found.
THIRD FAULT CONFIRMED AND CLOSED: the walk ended with Events.Core + Events.Settlement ON,
so run 2 met a lit venue at the step that asserts darkness and timed out 60s on
.ev-pipeline__notice. BOTH arms died there, so the per-run name could not be reached to
matter. Transcript kept as consecutive-arm-A-run2-BEFORE-lever-restore.txt. Fixed by a
final step that CLEARS both levers (cleared, not off: store 42 holds no override row).
PROVEN IN A BROWSER on this lane's own fixture+dev server, reset suppressed so run 2
inherits run 1's world: ARM A pass/PASS; ARM B (constant name) pass/FAIL, toHaveCount
expected 1 received 2 at spec:304 - the coin flip reproduced, not argued.
PROXY NOT LIVE: no live re-run claimed, no container started, none touched.
PIN: 33 -> 42 tests; lever rule keyed to call SHAPE + a Norwegian/English/*_DISABLED
vocabulary. 15 mutations all red BY NAME, 42/42 restored. Mutation K's written
prediction was WRONG (English test title still found the spec); corrected in place.
NOT FIXED: restore is a step not a teardown; 10 other journeys leave a flag up. Both listed.
END RETURN
```

## Detail

### What was found already done, and kept

`4b5c5c2` on `feature/restaurant-modules` is this lane's own prior commit and it already
closed the two faults the brief names: `expiryDay: '2026-11-30'` derived from the run's
clock, `Nina Nordmann` given a per-run tag spelled exactly as `events-guest-proposal.spec.js`
spells it, and `test/journey-rerunnability.test.js` pinning both by shape rather than by
literal. All of it kept. The killed run's dirty `test/e2e/support/journey.js`
(`E2E_NO_RESET`) was read before being touched and is now committed with prose.

### The third fault, which is the reason this run was not a formality

`consecutive-run-proof.py` was written by the killed run and its first result was that
BOTH arms failed at run 2, in the same place. That is not a subject-name fault - it is a
walk that asserts the venue is dark and then ends with `Events.Core` and
`Events.Settlement` switched on. The per-run name never got a chance to matter, because
step 4 dies first. The transcript is preserved as
`consecutive-arm-A-run2-BEFORE-lever-restore.txt`.

### Evidence

| what | where |
| --- | --- |
| consecutive-run proof (both arms, 4 browser runs) | `lanes/L-EV-JOURNEY-TIMEBOMB/consecutive-run-proof.txt` |
| the pre-fix run-2 transcript | `lanes/L-EV-JOURNEY-TIMEBOMB/consecutive-arm-A-run2-BEFORE-lever-restore.txt` |
| 15 mutations, red by name, restored green | `lanes/L-EV-JOURNEY-TIMEBOMB/mutation-proof.txt` |
| the commit | `lane/ev-journey-timebomb` b7a9f389bd8fe3c4867b19de03e71e7c1d3a1c6d |

Readable now at `/Users/svendaneel/okam/wt-evtb/lanes/L-EV-JOURNEY-TIMEBOMB/` and
mirrored into `/Users/svendaneel/okam/Web-modules/lanes/L-EV-JOURNEY-TIMEBOMB/`.
`mutation-proof.py` and `mutation-proof.txt` read as modified in the primary checkout
because the commit carrying them lives on the lane branch, not on
`feature/restaurant-modules`. Two files of this lane's own from the killed run were
removed there: `consecutive-run-proof-sibling.py` (written to demonstrate the coin flip
on the sibling BECAUSE this journey could not reach its row step twice - superseded, the
journey now can, and arm B demonstrates it directly) and `fixture-run-1.txt` (server
boot noise). Nothing belonging to another lane was touched, cleaned or re-run.

### Where the branch went

Committed on `lane/ev-journey-timebomb` rather than onto `feature/restaurant-modules`,
because the instruction not to move that branch was explicit. It is exactly one commit
ahead of the tip with nothing in between, so a fast-forward lands it. This lane's PRIOR
commit `4b5c5c2` is already on `feature/restaurant-modules` - made before that
instruction was in force - so the lane's work is currently split across two refs, and
landing `b7a9f389` reunites it.

### Residual, stated rather than fixed

- The lever restore is a **step, not a teardown**. A run that dies halfway still leaves
  both flags up, and the run after it fails at step 4 for that reason and not its own.
  Named in the spec header and in the guard's CANNOT list.
- **Ten unregistered journeys** in this tree also end with a module flag on (Margin,
  Training, Growth, Meals, Workforce). Each is correct alone because it arranges the
  state it walks on; none survives a live world where another journey needs that flag
  down. Today only the fixture's per-test reset hides it. Not this lane's files.
- The journey still pins the fixture's store 42 and still carries `@fixture`, so it is
  still filtered out of live mode. Unchanged, and named in its own header.
