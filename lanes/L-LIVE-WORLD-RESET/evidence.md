# L-LIVE-WORLD-RESET -- evidence

verdict: **fail-spec**. The exit is already met on this branch, by a landed sibling, with a control.
The brief's stated finding is false against the tree it was generated from.

No container was started. No container was touched. No shared ref was moved. Nothing was committed.
No file outside this directory was edited. **This lane ran no journey and claims no run, live or proxy.**

---

## 1. The brief's premise, checked against HEAD

The brief says, as the fact the whole lane rests on:

> Each creates *and publishes* the current week, each begins by needing it unplanned, and **live mode
> has no reset.** So it is one journey per world, rebuilt between, at about seventy seconds each.

That sentence was true when the staff lane wrote it on 2026-08-02. It is not true now.

`test/e2e/scripts/live-world-reset.sh` is 385 lines and is **on this branch**:

```
$ git merge-base --is-ancestor 337f9bf HEAD    ->  0   (337f9bf is an ancestor of 4b5c5c2)
$ git diff --stat 337f9bf HEAD -- test/e2e/scripts/live-world-reset.sh
                                               ->  (empty: unchanged since it landed)
$ git status --porcelain -- test/e2e/scripts/live-world-reset.sh
                                               ->  (empty: clean in the working tree)
```

Commit `337f9bf` -- *"A live world resets in nine seconds instead of forty-two, and the reset can be
shown to fail"* -- added the script plus 18 evidence files and corrected both workforce spec headers.

Its four verbs: `snapshot` (image a freshly-seeded world), `restore` (put it back, ~9s, **no migration
replay**), `verify` (assert the state a journey needs, in SQL and over the wire), `forget`.

## 2. The exit is already met, and by a control rather than by assertion

Plan line 4831, `### Lane L-LIVE-WORLD-RESTORE`, `state: built-unverified`, `class: sql`, `pts: 2`:

> exit: two live journeys run in sequence against one world, each getting the state it needs, without
> replaying migrations between them

That is my own exit sentence. Mine, plan line 4689, `class: node`, `pts: 1`:

> exit: two live journeys run in sequence against one world, each getting the state it needs without a
> rebuild

**These are the same exit.** RESTORE walked it with three journeys, not two
(`lanes/L-LIVE-WORLD-RESTORE/09-chain-three-journeys.txt`), one world `OkamLiveRestore` on
`okam-lwr-sql:15435`, API `:5961`, a restore before each:

| order | journey                        | result | backendServed | migrations after |
|-------|--------------------------------|--------|---------------|------------------|
| 1     | events-deposit-precondition    | passed | 12            | 127              |
| 2     | workforce-schedule-publish     | passed | 48            | 127              |
| 3     | workforce-flag-lever           | passed | 80            | 127              |

`migrations replayed during this chain: 0 -- __EFMigrationsHistory still 127`.

### I audited the artifacts rather than trusting the return

Every JSON archived under `lanes/L-LIVE-WORLD-RESTORE/` parsed, and each reads `"backend": "live"`
with `"apiBaseUrl": "http://127.0.0.1:5961"` -- the lane's own world -- including
`chain-workforce-flag-lever.live.json`. **One discrepancy found and it is cosmetic, not a
falsification:** the inline JSON snippet for the third journey inside `09-chain-three-journeys.txt`
quotes `:5956`, because at that moment the *canonical* file had been overwritten by another lane's
live run on `:5956` (the `L-ARTIFACT-PROVENANCE` defect, which RESTORE reported hitting live). The
per-run artifact the lane actually copied is `:5961`. The chain log's third line quotes the wrong
file; the archived artifact is right.

### The control is real and it reds by name

This is the part that makes it evidence rather than "three journeys ran":

- `06-journeyA-without-reset.txt` -- `workforce-flag-lever` run straight after `schedule-publish`
  with **no** reset: playwright `1) ... x`, and the failure is by name --
  `Expected: "Av" / Received: "Pa"` at `workforce-flag-lever.spec.js:104`, on the
  `workforce.publication` flag badge. `06-journeyA-without-reset.json` -> `"status": "failed"`,
  `backendServed: 9`.
- `08-journeyA-after-reset.txt` -- restore, then the same journey: `1 passed (10.9s)`.
- `02-verify-on-dirty-world.txt` -- `verify` against the used world reds on
  `the world carries 1 schedule revision(s)`, while greening on the restored one.

Disable the reset -> run 2 fails; restore it -> run 2 passes. Both recorded. That is the non-vacuity
my brief asked for, and it was already on disk before I was dispatched.

## 3. The brief is false a second way, and RESTORE already said so

The brief (and my plan entry) assert the two workforce journeys collide **on the week**. RESTORE
established that is partly false and corrected both spec headers:

> A -> B with no reset PASSES: once the previous revision is published the draft view resolves none,
> so the badge still reads "Ingen plan" and B quietly creates *Revisjon 2*. It does not red - it
> produces weaker evidence than its own header claims. **The collision that reds is the FLAG, not the
> week.**

So the brief's causal story is wrong even where its conclusion was once right.

## 4. The residual defect this lane genuinely adds

The reset is reachable from the test corpus -- 9 references outside its own file:

```
playwright.config.js:64,71,73
test/e2e/journeys/workforce-flag-lever.spec.js:52
test/e2e/journeys/workforce-schedule-publish.spec.js:50
test/e2e/support/journey-assertions.js:248,264
lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt:42,57
```

**It is not reachable from the one surface an operator reads at the moment of decision.**
`test/e2e/scripts/live-world.sh` is the script you run to stand a world up, and it still teaches the
rule the reset repealed -- in its header (lines 111-113) and in its **closing banner**, the last text
on the terminal, lines 710-720:

> ONE, and the file path is not a convenience. In fixture mode every journey gets a fresh backend from
> `POST /__fixture/reset`; **a live world has no such thing**, so the journeys share one database in
> the order Playwright runs them. [...] They are not flaky together; they are **incompatible, and each
> needs its own world:**
>
>     test/e2e/scripts/live-world.sh  &&  ... workforce-flag-lever.spec.js
>     test/e2e/scripts/live-world.sh  &&  ... workforce-schedule-publish.spec.js

That printed recipe is **two full rebuilds** -- the ~42s-warm/60s-cold replay, twice -- for a pair a
9s restore now separates. It also still blames the week rather than the flag, the error in section 3.

This was left knowingly, not missed. RESTORE's return, line 18:

> DID NOT TOUCH live-world.sh (the sibling lane owns it) [...] So live-world.sh's closing banner still
> prints one-world-per-journey; **that correction is the sibling's to make**, and the new script's
> header carries the truth meanwhile.

The owning lane is `L-LIVE-SEED-VIA-PRODUCT` (plan 4888), whose recorded evidence *is*
`test/e2e/scripts/live-world.sh`, and it is `built-unverified` -- so ownership is live and I must not
edit it. The file is clean in the working tree, so the correction is a small, safe, uncollided edit
for whoever holds it.

**This stale banner is the proximate cause of my own dispatch.** My brief's premise paragraph is a
paraphrase of it, and it will keep costing a rebuild per journey and keep generating lanes like this
one until it is corrected.

## 5. Why I did not meet the exit myself

Two live journeys in sequence need a live world, which on this host is a SQL container. My brief is
`class: node, pts: 1` and grants no slot; five worlds are standing and none is mine; three are held
for a pending acceptance walk that asserts zero flag overrides, so borrowing one would redden another
lane's evidence. The duplicate was sized `node` while the lane that actually did it is `sql/2` --
that mis-sizing is itself the tell.

I also did not build a fixture proxy. The mechanism proxy already exists
(`lanes/L-EV-JOURNEY-TIMEBOMB/consecutive-run-proof.py`, arm A passes twice / arm B control reds at
run 2), and the *live* half is not proxyable and is already done. A third demonstration would add no
fact.

## 6. Not mine, and not duplicated

`L-JOURNEY-TEARDOWN` (plan 7947) owns the two gaps the timebomb lane named and I did not touch them:
the restore is a **step, not a teardown**, so a run that dies halfway still leaves levers up; and ten
unregistered journeys end with a module flag on. Nothing here builds a second mechanism for either.
