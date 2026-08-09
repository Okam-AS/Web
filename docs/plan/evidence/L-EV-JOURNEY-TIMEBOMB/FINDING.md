# L-EV-JOURNEY-TIMEBOMB — the second clause is fully shown; the first is shown against a fixture, not live

**Not closed. This is a finding, not a failure.** Reason-shape hit: **(5) only one half of a two-part exit is
shown** — with the added twist that the unshown half is unshowable *by the spec's own construction*, which is
the part an owner needs to see before ruling.

The lane's artifacts were on disk in an untracked `lanes/` directory, one `git clean` from gone. They are
committed beside this file now: nine files, byte-copies, no re-run.

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line with the single path it is given:

```
evidence: lanes/L-EV-JOURNEY-TIMEBOMB/ at lane/ev-journey-timebomb b7a9f389 (parent 4b5c5c2; feature/restaurant-modules NOT moved, still 4b5c5c2)
```

## The exit, split

> the enquiry-to-settlement journey finds its own row **on a second consecutive live run** **and** carries no
> future date literal, **pinned by a test that reds if a hard-coded date or a constant subject name comes
> back**

### Clause 2 — fully shown, and shown well

`mutation-proof.txt` records **15 mutations, each applied, run, observed red *by name*, and restored**, with
a `BASELINE : jest exit 0 / 42 passed` at the top and a `FINAL : jest exit 0 / 42 passed` at the bottom. Both
halves of the clause are hit head-on:

| mutation | what it puts back | red, by name |
| --- | --- | --- |
| `A-date-literal-back` | the offer expiry written down again, exactly as it stood before the lane | `carries no written-down calendar date at all, in any tense` |
| `B-constant-subject-name` | the contact name back to a constant | `GUEST.name is different on a second run` |
| `C-row-found-by-a-bare-string` | the row located by a bare string | `every hasText: argument is either a per-run subject or recorded copy` |
| `D-run-token-made-constant` | the run token replaced by a constant — the subtlest revert, since every reference still reads | `declares a run token, and two invocations of its own naming path disagree` |
| `F-past-date-literal` | a date literal already in the past | `carries no written-down calendar date at all, in any tense` |

Eleven more cover the guard itself (its comment-blanker surviving a regex literal carrying a quote; the
ledger matching the corpus in both directions; a registered spec being unable to buy its own exemption). The
lane also recorded that **mutation K's written prediction was wrong** and corrected it in place, which is the
behaviour of a run that was actually performed.

### Clause 1 — the run recorded is not the run the exit demands

`consecutive-run-proof.txt` is four real browser runs and it reproduces the coin flip cleanly:

```
=== ARM A  per-run subject name, levers restored (what this lane ships) ===
    run 1 : exit 0  (1 passed, 0 failed)  expected pass, got pass
    run 2 : exit 0  (1 passed, 0 failed)  expected pass, got pass

=== ARM B  constant subject name (the control -- what it used to be) ===
    run 1 : exit 0  (1 passed, 0 failed)  expected pass, got pass
    run 2 : exit 1  (0 passed, 1 failed)  expected fail, got fail
            locator  : locator('.ev-pipeline__row').filter({ hasText: 'Nina Nordmann' })
            expected : 1
            received : 2
            at       : events-enquiry-to-settlement.spec.js:304
```

That is a genuine second-consecutive-run proof, with a control that fails in exactly the way the defect
predicts. **It is against this lane's own fixture and dev server, with the world reset suppressed so run 2
inherits run 1's world.** The RETURN says so without being asked: *"PROXY NOT LIVE: no live re-run claimed,
no container started, none touched."*

## Exactly which clause is unshown, and why it is not a matter of effort

**"on a second consecutive *live* run."** And the obstruction is structural: the spec still carries
`@fixture` and still pins the fixture's store 42, so **it is filtered out of live mode by construction**. The
lane names this in the spec's own header and in its RETURN's residual list. Running it live is therefore not
"run the same thing against a different server" — it is a change to what the journey is pinned to, which is
work outside this lane and outside this batch.

A second obstruction sits behind it, and it is the more interesting one:

> The lever restore is a **step, not a teardown**. A run that dies halfway still leaves both flags up, and the
> run after it fails at step 4 for that reason and not its own.

That is not hypothetical — it is what the lane hit. `consecutive-arm-A-run2-BEFORE-lever-restore.txt` is the
preserved transcript of **both** arms dying at the same place, 60 s on `.ev-pipeline__notice`, because the
walk ended with `Events.Core` and `Events.Settlement` still on and run 2 met a lit venue at the step that
asserts darkness. The per-run subject name never got a chance to matter. In a live world that failure mode is
the norm rather than the exception, because **ten other registered journeys in this tree also end with a
module flag up** (Margin, Training, Growth, Meals, Workforce) — each correct alone, none surviving a live
world where another journey needs that flag down. Today only the fixture's per-test reset hides it.

## What an owner is being asked

1. **The live clause needs a lane**, and that lane's first task is not this journey — it is the
   restore-as-teardown gap and the ten journeys that leave a flag up. Proving one journey live while the
   other ten still poison a shared world buys a green that will not survive its neighbours.
2. Until then this lane stays `built-unverified` **with clause 2 established**. That is the honest state, and
   it is more useful than a `verified` that quietly means "against a fixture".
