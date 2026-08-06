# L-JOURNEY-TEARDOWN — mutation log

Baseline read at `5ad0ca0` on `feature/restaurant-modules`, worked on
`lane/journey-teardown` at `a101103` (= `5ad0ca0` merged with the predecessor's unlanded
`b7a9f389`; see "Two corrections to the brief" below).

Everything here was produced by running the scripts in this directory. Nothing is asserted from
reading the source.

| script | what it answers | transcript |
| --- | --- | --- |
| `kill-proof.py` | does a run **SIGKILLed mid-walk** leave a flag lit? | `kill-proof.txt` |
| `teardown-proof.py` | does the **teardown alone** lower the lever, with the lease suppressed? | `teardown-proof.txt` |
| `mutation-proof.py` | is the pin a pin? 16 mutations, each predicted by name | `mutation-proof.txt` |

---

## 1. The negative, proven rather than asserted

The exit criterion — *a run killed mid-walk leaves no flag lit* — cannot be shown by a walk that
completes. `kill-proof.py` runs the real journey against a real browser, waits until the switchboard
has actually raised a lever, sends **SIGKILL to the process group**, and then asks the fixture what
the world looks like.

SIGKILL and not SIGTERM: a signal that can be caught would only prove something about an exit
handler. SIGKILL runs nothing at all, which is the claim under test.

| arm | mechanism | after the kill | verdict |
| --- | --- | --- | --- |
| **A** — as shipped | lease open | `42\|Events.Core` **LOWERED**; seeded `43\|Events.Core` survived | AS PREDICTED |
| **B** — control | lease line commented out | `42\|Events.Core` **STILL UP** | AS PREDICTED |

Arm B is the defect, reproduced in a browser. Without it, arm A is equally well explained by "the
flag was never on", which is the comfortable wrong answer.

Both arms also assert the **seeded** override survived. A cleanup that gives back more than it took
is its own bug, and `freshState()` seeds one.

## 2. The ordinary case, isolated from the lease

The kill proof only proves the killed case, and in that case the lease necessarily did the work.
`teardown-proof.py` suppresses the lease and kills nothing, so the only thing left that can lower a
lever is the `journey` fixture's teardown.

| arm | mechanism | after the walk | verdict |
| --- | --- | --- | --- |
| **C** | lease off, teardown release on | nothing left up | AS PREDICTED |
| **D** — control | lease off, release off | `42\|Events.Core`, `42\|Events.Settlement` **STILL UP** | AS PREDICTED |

Arm D is the state this tree was in: the walk **passed** and still left both Events levers up. That
is the original leak with the predecessor's final step removed, and it is what every failing run in
this tree was doing all along.

## 3. Fifteen mutations, each red BY NAME

Applied one at a time, jest run, failing test names collected, file restored byte-for-byte, suite
required green again before the next. Full transcript in `mutation-proof.txt`.

| # | mutation | test it red |
| --- | --- | --- |
| A | release moved above the walk | it does so AFTER the walk |
| B | release made conditional on a pass | it is UNCONDITIONAL |
| C | release moved out of the `finally` | lowers the levers it raised (+2) |
| D | a clearing step written back into a journey body | no spec ends its lever operations with a clear |
| E | lease route back to POST (the deadlock) | the lease route is a GET |
| F | reset stops emptying the lease | the reset empties what the lease is holding |
| G | lease no longer released on socket close | releases it on socket close |
| H | the clear is never actually issued | release() really issues the clears |
| I | levers lowered oldest-first | release() really issues the clears, newest lever first |
| J | an explicit OFF stops counting as an override | an explicit OFF is still a lever held |
| K | the bearer written to the on-disk ledger | no credential is written to the on-disk ledger |
| L | the reader stops seeing raw switchboard clicks | it sees both shapes this corpus uses |
| M | globalTeardown stops reporting held levers | globalTeardown really prints what was left up |
| N | the lease opened after the walk | the lease is opened before the walk |
| O | the teardown pin deleted outright | (rerunnability) the teardown pin exists |
| P | the stale lease handler unguarded again | a superseded lease dying later does NOT lower... |

**16/16 red the test they named. Both suites restored green afterwards.**

Mutation **D** is the one the exit criterion asks for: it writes a lever restore back into a
journey's body, and the rule reds.

---

## 3a. The condition an external review added, and the bug it found

A reviewer re-ran every proof in this directory under its own hand rather than reading them:
it reproduced arm D, re-executed `kill-proof.py`, and confirmed each of the fifteen mutations
red the test it names in **distinct 1-3 test sets** rather than reddening the suite wholesale.
It returned APPROVE-WITH-CONDITIONS, and the substantive condition was a defect in this lane's
own mechanism.

### The mechanism could reintroduce the defect class it exists to close

`api-server.js` kept a live `close`/`error` handler on **every lease request ever opened**, and
the supersede path neither destroyed nor unbound the old socket. So in exactly the scenario
supersession exists for -- a hung-but-alive run replaced by a fresh one -- the hung process's
eventual death fired the **stale** handler, which deleted the **fresh** run's raised overrides
mid-walk and set `leaseHeld` false, so its later raises went unobserved and a later kill cleaned
nothing.

The thing built to stop a dead run poisoning the next one had a way to poison it itself.

No static rule in the pin could see it: the route existed, the handler was bound, the reset
cleared the set, and all of those assertions were green. Closed by tracking the current lease
request, destroying the superseded socket, and guarding both handlers with
`if (req !== leaseSocket) return;`. Pinned by a **behavioural** test that spawns the real fixture,
opens two leases and closes the first -- watched red first (`raised` came back `[]`, the fresh
run's `Events.Settlement` deleted) and green after. Mutation **P**.

### The wire decision was undersold by one

The reviewer found a **third** helper bypass this lane had not counted:
`workforce-schedule-publish.spec.js` also raw-clicks the switchboard, alongside
`events-deposit-precondition.spec.js` and the locally redefined four-argument `flip` in
`workforce-flag-lever.spec.js`. Three of sixteen raisers -- a fifth of the corpus -- would have
been missed by a ledger keyed to `support/flags.js`. All three are now named individually in the
pin rather than covered by a count.

### The census in the pin's own header was wrong

It said "fourteen specs raise a switch ... eleven did not give it back at all". Recomputed here
and confirmed against the reviewer: **sixteen** raisers (the same at `5ad0ca0` and at this
commit), **fourteen** leakers at `5ad0ca0`; of those, 9 give nothing back in any form and 5 only
flip `off`, which leaves an override row and is not a restore. **"Eleven" reconciles with nothing
computable**; its provenance could not be reconstructed and it is recorded as a drafting error
rather than quietly deleted. The header now states both numbers and says they are not
interchangeable.

Two further prose corrections in the same pass: the movers assertion was
`toBeGreaterThanOrEqual(10)` -- a floor, not a census, which five specs could drop out of while
staying green -- and is now the sixteen names; and the consumer-journey note claimed four specs
mutate module state through `?mealsModule=0` when it is **one** (`meals-module-dark.spec.js`),
the other three passing `?allowanceMinor=`, which is an allowance and not module state.

### A comment that asserted the opposite of its code

`levers.js` claimed a PUT whose body could not be read was "recorded as a raise with an unknown
key rather than dropped". The `return` below it has never done that. In the estate's shared
cleanup file that is an RF-1313 in miniature, so the comment was corrected rather than softened:
it now states the drop, why dropping is right (a clear is `DELETE ?flagKey=`, so a keyless entry
names nothing that could ever be lowered), and what covers the gap -- in fixture mode the
server-side lease, which observes the raise where the body has already parsed; against a live
backend, nothing, which is the same residue as the SIGKILLed live run and not a new one.

Two things the reviewer marked **unobtained** rather than glossing, recorded here as unobtained:
the original hang transcripts for the `lease()` deadlock (accepted on mechanism plus the
`INCONCLUSIVE` branch at `kill-proof.py:106-108`), and the provenance of "eleven".

## 4. Three things this lane got wrong, kept rather than tidied away

### 4.1 The lease deadlocked every journey in the tree

The first version of `lease()` sent `POST` with a dangling `write()` and no `end()`.
`api-server.js` `await`s `readBody(req)` for **every** POST before it dispatches a route, and a
subscription's body never ends — so the request was never routed, no response ever came, and
`await recorder.levers.lease()` never settled. **Every journey hung on its first line until the
120 s test timeout.**

It was invisible to every static rule in the pin. It was caught only because arm A of the kill proof
reported *"the run ended before it raised anything"* twice in a row while arm B — whose only
difference is that this one call is commented out — walked the whole way. A one-line difference
between the arms is what made it findable at all.

Fixed by making the lease a `GET` that calls `end()`, with a 2 s ceiling on waiting for headers.
Pinned twice: mutation E, and a behavioural test against a stub with the fixture's POST-body shape.

**This is the argument for the brief's instruction.** A teardown asserted but never exercised is the
same defect as the step it replaces — and this lane would have shipped a mechanism that broke the
entire e2e suite while its own 25 static tests were green.

### 4.2 The unit tests polluted the operator's warning channel

The first kill-proof run opened with `globalTeardown` announcing three levers still up on ports
`59825`, `63270` and `1`. All three were written by the tests in `test/journey-teardown.test.js`
into the **real** on-disk ledger, because `LeverLedger` had no way to be told otherwise.

Nothing was broken by it, and that is exactly the problem: a warning channel carrying entries nobody
has to act on is a channel that gets skimmed, and the one entry that mattered would have been
skimmed with it. Fixed by making the ledger path an argument; pinned by
*"a ledger told to use another file leaves the real one alone"*.

### 4.3 A prediction that was wrong, corrected in place

Mutation M predicted that disabling the `globalTeardown` warning would red
*"globalTeardown says what was left up"*. **It red nothing.**

That rule was `expect(teardown).toContain('describeHeld')` — and `null && describeHeld()` still
contains the string. The prediction was right about what *should* happen; the **rule** was wrong. It
was a test of spelling wearing the clothes of a test of behaviour.

Replaced with a behavioural test that runs `globalTeardown`, captures stdout and requires the store,
the flag and the exact `DELETE` an operator can act on. The wrong prediction is left recorded in
`mutation-proof.py` next to its correction rather than deleted.

A fourth was found by reasoning rather than running, and is recorded because it would have been a
silent data-loss bug: `/__fixture/reset` re-seeds overrides, so a lease that kept its held-set across
a reset would, on a later kill, delete a **seeded** override the reset had just installed — a
cleanup removing state the run never created. Closed with `leaseRaised.clear()` on reset; mutation F.

---

## 5. Two corrections to the brief

1. **`b7a9f389` is no longer one fast-forward ahead of the integration tip.** The brief says it is.
   `feature/restaurant-modules` has since moved two commits to `5ad0ca0`, and
   `git merge-base --is-ancestor b7a9f389 5ad0ca0` is **false**. Landing it is a merge, not a
   fast-forward. The instruction to take `b7a9f389` and not stop at the tip still holds and matters
   more, not less.

2. **The predecessor's lever-restore step does not exist at the tip**, so "the step this lane was
   sent to convert into a teardown" was not in the baseline at all — nor was the guard it was to
   extend. Both live only on `b7a9f389`. This lane merged that ref into its own branch and built on
   the union, so its work stays compatible with landing the predecessor's.

3. **The leak is 14 journeys, not 10.** The brief's ten (Growth 3, Margin 4, Training 1, Workforce 2)
   are real; the four Events journeys leak too, because of correction 2. Independently confirmed by
   a survey of the tree. All fourteen are covered without editing fourteen files, because the ledger
   is fed from the **wire** (`PUT /stores/{id}/feature-flags`) rather than from the `flags.js`
   helper — which matters, because two of them move levers without calling that helper at all
   (a raw `[data-flag-on=]` click; a locally redefined four-argument `flip`).

## 6. What is NOT closed

- **A SIGKILLed LIVE run still leaves its levers up.** The lease is the fixture's; a live override is
  a row in SQL Server that no lease is held on. `globalTeardown` names the store, the flag and the
  exact `DELETE`, but it cannot issue it, because the on-disk ledger deliberately carries no
  credential (C7). Stated as a smaller claim on purpose, in `levers.js`, in the pin's CANNOT list,
  and here.
- **The consumer journeys are untouched.** `test/e2e/journeys/consumer/` drives another app through
  `playwright.consumer.config.js`, which has **no `globalTeardown` at all**, and four of its specs
  mutate module state through `POST /__fixture/reset?mealsModule=0` rather than a flag override.
  Same shape of defect, different mechanism.
- **The comment blanker is duplicated** (~25 lines) between `journey-rerunnability.test.js` and
  `journey-teardown.test.js`. The original is pinned by its own file's tests and lifting it into a
  module is a bigger change than this lane should make to another lane's guard. Recorded rather than
  left to be discovered.
- **No live run is claimed anywhere.** Both proofs run against `test/e2e/fixture/api-server.js`, not
  SQL Server. No artifact from them says `live`. No container was started and none was touched.
