# Proposed C8 for `docs/plan/intent.md`

**Status: awaits the owner's hand.** No agent on this branch may edit `docs/plan/**` except its own
RETURN, so this file is the text rather than the edit. Paste the fenced block into the constraint list
in `docs/plan/intent.md`. Nothing else in this lane depends on it landing; everything else is committed.

**Why intent.md and nowhere else.** `plan`'s `brief_body()` copies the constraint block from
`docs/plan/intent.md` **verbatim into every generated brief**. It is the only prose in the estate that
every lane author is guaranteed to read at the moment they need it. A convention filed anywhere else — a
README, a standards doc, a log entry — is read by whoever went looking, which is precisely the population
that did not need telling.

That is not a prediction. The receipt convention has existed since 2026-07-31 in exactly that
filed-somewhere form, at `OkamAPI-modules/artifacts/tests/README.md`. It is a good document. In the five
days it sat there it produced seven mutually incompatible variants of itself, and the frontend repo could
not have followed it even deliberately, because `.gitignore` excluded `artifacts/` as a directory and no
negation can re-include anything under a directory git never descends into. **`forward-only-no-C8` is
that experiment, already run: the rule existed and reached nobody.**

C5 already forbids *accepting* an item on a suite result. C8 is the complement and does not weaken it:
C5 says a green suite is never acceptance; C8 says that if a number goes into circulation at all, it has
to be one somebody else can re-run. Both hold.

```
- C8: A tier number is a committed receipt at the commit it names, or it is not a number.
  holds_because: A count with no SHA beside it cannot be checked, re-run or contradicted - it can only be
    repeated. Two reviews on 2026-08-04 found the same gap from opposite ends: a frontend suite with no
    receipt at all, whose figure matched no reconstructable partition, and fast and SQL numbers plus five
    mutation runs that were process claims with no artifact. Both sets of numbers were plausible, which is
    exactly the problem, because plausible is what a fabricated number also looks like and this estate has
    already shipped a figure a model originated and attributed to a machine. The cost is measured, not
    feared: the first two receipts ever committed to Web-modules differ by 36 tests at identical source,
    because three suites could not load and the shortfall sat invisibly beside a healthy-looking total.
  violated_when: a commit made after this constraint landed states a suite count, a tier result or a
    mutation score - in its message, a return, a status update or a plan document - for a commit that
    carries no receipt under artifacts/tests/ naming that SHA; or a receipt is committed whose tree is not
    source-identical, outside artifacts/tests/, to the commit it names; or a run is recorded from a working
    tree with uncommitted changes to tracked files; or a receipt is recorded now against an older commit in
    order to satisfy this constraint retroactively, which manufactures the evidence it appears to supply.
```

## The forward-only clause, and why it is in the constraint rather than beside it

The last clause of `violated_when` **forbids** backfilling. That is deliberate and it is the ruling.

A receipt produced today and attached to an hours-old commit is a new run wearing an old run's clothes.
This lane's own two receipts refute the alternative: identical source as far as any test is concerned,
**36 tests apart**, purely because the harness differed between the runs. A retrofitted receipt would not
have recorded what the branch originally claimed; it would have recorded today, wearing that branch's SHA.

Putting the clause inside the constraint rather than in a note beside it matters for the same mechanical
reason the constraint goes in `intent.md` at all: only the constraint block is copied into every brief. A
future lane author who reads C8 and reasonably concludes "then I must go back and receipt my older
commits" would be doing the harm. The text has to stop them where they read it.

## The backlog, and one caveat on the checker

The backlog is a **dated note, not an obligation**. Measured 2026-08-06 by
`node scripts/tier-receipt/census.js`, at `feature/restaurant-modules` `e34977ac` (Web-modules) and
`8e2b57de` (OkamAPI-modules): **92 distinct commits estate-wide make a tier claim, 9 are backed, 83 are
not**, across 468 local branches holding 28 receipt files that name 25 commits. The full table, the two
figures from `L-TIER-ARTIFACTS-1` it corrects, and the census's blind spot — it reads commit messages, and
178 of 399 returns on disk also state a tier figure — are in `artifacts/tests/README.md` on
`lane/tier-artifacts`.

`verify.js`'s claim detection is a heuristic regex over commit messages and will miss phrasings
(`"the remaining 2547 tests went green"` does not match, and it was left that way rather than widened
until it caught prose). **The heuristic is a prompt, not a proof.** The rigorous half is the
source-identity check, which has no false positives: either the recording commit's tree matches the SHA
outside `artifacts/tests/` or it does not.
