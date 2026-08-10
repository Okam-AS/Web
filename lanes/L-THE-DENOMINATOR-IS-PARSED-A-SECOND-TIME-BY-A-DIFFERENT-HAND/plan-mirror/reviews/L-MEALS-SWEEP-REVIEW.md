# Fable review — L-MEALS-SWEEP-GUARD (2026-08-02)

Read-only review of `lane/meals-sweep-guard` @ `4bddfc7d` (fix `e828bcdf`). No file edited, no suite run.

## Verdict — sound-with-conditions

**The fix is real, correctly placed and correctly reasoned.** Every code-level claim verified against the
actual tree; **both committed trx exist, are dated today, and say exactly what the lane says they say.**
The lane's self-stated tier limit is honest and accurate.

**Two receipt defects keep this from a clean sound**, and both are in the *receipt*, not the code:

A merged-pin count **cannot be true as written** — the six named classes total **49** in the committed
merge trx, and the sixth class is SQL-Server-traited with two tests appearing in **neither** trx. **The
only arithmetic that reaches the claimed figure includes two tests the same document swears never ran.**

And a verification command quoted as returning nothing **returns one line** — a doc comment. The substance
holds; **the sentence overstates.**

**Neither changes the engineering verdict. Both are exactly the estate's known failure signature and must
be corrected before this evidence is cited downstream.**

## Claim by claim

**The discriminating mutant — verified by reading.** All four pins first assert the failure count, which
still passes under a whole-loop catch; **the loser is the first strand reached**, so hoisting containment
to the foreach abandons the two behind it. Each pin fails at a named line, the first reading **expected 2,
actual 0**, exactly as claimed. The fourth fails because a catch outside the foreach **cannot name the
reservation**, so no warning carries the loser's id.

**Detach-removal — verified mechanism, and it is worse than "untidy" for a specific reason.** The
un-detached loser stays modified on the shared context and is **re-included in every later save**, its
poisoned original matching nothing — so the later strands fail too, and **their own catches roll their
transactions back, so nothing is released at all.** Wholesale degradation, as claimed.

**The honest negative — confirmed.** Disposal of an uncommitted transaction rolls it back, so **no pin can
red on the deleted explicit rollback.** The commit-instead mutant is the right semantic pin, and its
arithmetic checks out to the value the pin expects. **Refusing to claim that as a fifth reddened line was
correct.**

**Masking both ways — partially artifact-backed.** Zero file overlap verified against the real sibling
commit. The merged tier is artifact-true. **The two mutant-on-merged runs left no artifact** — process
assertions, consistent with the code but unproven.

**The arithmetic — this lane is right: 4357.** Both committed artifacts independently imply that base.
**The sibling's implied 4358 is the odd one out**, and the merged total must be computed from 4357.

**The tally discard — verified, and the call is right.** It predates the lane. Paying the visibility with
the worker's own warning line, pinned including a one-line-per-conflict rule, rather than adding a fourth
unread number, is sound — and the residue is declared rather than hidden.

**C4 verified:** the catch writes nothing, because both the guard decrement and the batched save sit inside
the transaction that is rolled back. **No new release site, no actor constructed.** The three-site gap is
untouched and unobscured. **C2 verified:** the migrations directory and snapshot are byte-identical to base.

**Order-independence is genuinely achieved, not hidden** — equal caps make the arithmetic loser-invariant,
the latch makes identity irrelevant, and the candidate scan really has no ordering clause. One caveat:
**the loser is always the first strand**, which is maximal blast radius; a last-strand loss is never
exercised, and is strictly weaker.

## Assertions that could pass against broken code

**All four pins, at the fast tier, against code whose defect is that the check is never lost for real.**
Every pin's premise is injected: they prove containment *given* a lost check and **can say nothing about
whether production ever loses one.** That is the lane's own stated limit, stated accurately.

Within the tier none is vacuous — **the strand really does lose, at the framework level, and every pin
asserts that first.** Two are tautological but harmless.

## What the SQL tier would have to show

**That a genuine interleaving raises the concurrency exception at all** — the pins **forge** the stale
original; no run has ever produced one honestly. That the rollback reverses the already-executed raw
decrement under a real transaction with savepoint behaviour. **The retrying-strategy interaction** — a real
race can present as a deadlock and be retried wholesale rather than surfacing cleanly, and **the lambda's
re-entrancy is entirely unexercised** because the cheap provider never retries. That the exception really
carries no provider inner, so catch order is immaterial — structurally certain, tier-unconfirmed. And the
two SQL-traited concurrency tests plus the module's trigger bands at this commit.

One worry **dismissed on evidence**: the guard's version column is application-managed, so the raw
increment is legal on the real provider.

## What could not be determined

Whether the mutant, masking and base runs executed as described — **no artifacts; verified by
code-reading.** The sibling's side of the base-total discrepancy, whose tree was not readable. Whether
three is the right count of unattributed release sites — **only that this lane adds no fourth and obscures
none.** And everything the SQL tier owns.

**The lane's account is, with the two receipt corrections, accurate — including its own limits.** The
frame-by-frame capture, the honest negative, the arithmetic correction against a sibling, and the stated
tier boundary **all held up under adversarial reading.**
