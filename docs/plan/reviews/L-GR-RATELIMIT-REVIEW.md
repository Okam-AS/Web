# Fable review — L-GR-TESTSEND-RATELIMIT (2026-08-02)

Read-only review of `lane/gr-testsend-ratelimit` @ `c96cd21e`. Nothing edited, nothing run.

## 1. Verdict — sound-with-conditions

**The three limits are real, correctly keyed, wired through the genuine composition root, and pinned by
tests that drive past the cap and prove a fresh key is still served.** The two load-bearing thresholds
genuinely inherit estate rulings. **The cache fix is correct and unconditionally placed.**

Conditions: the composition-root check must exist before the flag closes; **a sibling limiter's
registration is the same defect class, still unfixed**; and **the finding's characterisation is wrong about
what the pre-fix failure looked like** — repeated in a committed comment, and repeated by the clerk.

## 2. The limits

**Send a code to a request-named address** — keyed on a digest of the address, **held across all accounts
and sources**, five per quarter-hour. **Analogy holds**: the same act on the SMS channel carries the same
number, twice over. The secondary per-account and per-IP backstops are **new numbers**, reasoned in code,
not precedent.

**Guess the code** — keyed on the actor, **in a separate key space from the send**, ten then a cool-off.
**Analogy holds doubly**, including **an even closer precedent the lane did not cite**: the SMS verify path
already caps guess *attempts* at ten per recipient per quarter-hour, attempts-based exactly like this.

**Test-send** — keyed on the actor. **The keying analogy holds and is verified**: the guard requires the
request address to equal the account's confirmed address and composes the submission from the account, so
**rotating the requested address gets a refusal and rotating the account address routes through the
now-limited confirm flow.** But **the number is chosen, not inherited** — justified in code as an
authoring-loop size. Defensible, since it is mail to your own confirmed mailbox; **the "refused to invent
numbers" claim is overstated for this one act.**

**Every mechanism claim verified**, including the starvation test, the victim bucket **charged first so a
caller's own budget cannot mask it**, retire-on-refusal proven **at the wire with the code null in the
database after the refusal**, the crypto code over the full range — and that **sign-in requires a confirmed
phone, never a confirmed email**, so nobody loses account access.

## 3. The cache — the fix holds; the story about it does not

**The fix holds.** The registration now sits in a path invoked unconditionally, outside any try, and is
idempotent.

**But the advertised failure mode is wrong.** Pre-fix, a configuration failure would **not** have silently
deleted the limiters while the API stayed up. With the cache absent, **a globally registered filter fails
construction on every request** — an application-wide 500 storm, and in development a startup crash.
**Loud and fail-closed, not silent and fail-open.** The fix is still exactly right — it is what makes the
catch's own promise of staying online actually true — **but the record should say outage-prevention, not
silent control loss.** The lane's committed comment carries the same error.

**What actually depended on it:** the Growth public limiter, the new email limiter, the Events enquiry
limiter, the SMS code caps, the reservation caps, and a metadata service. **The clerk's claim that the
operator PIN cool-off depended on it is false** — that is database and Redis backed and would have survived
untouched.

**Residual, same class:** two limiter registrations are still inside the try. One is unreachable because
its surface is disabled anyway; **the reservation one is not** — a non-MCP surface still dies with an
unrelated configuration failure. **One line fixes it.**

**The check the open flag needs**, specified: build the real registration path with settings that
deterministically throw *before* the registration; assert the provider still builds and every limiter
resolves — **and that the global filter is constructible, since that is what turns a missing cache into an
estate-wide outage**; assert **enforcement, not existence**, by driving one limiter past its cap and then
showing a fresh key served, **so a null-object cannot satisfy it**; and assert an ordinary route answers
non-500, pinning the catch's own contract.

## 4. Defects, most severe first

1. **The reservation surface still dies with an unrelated config failure** — same class as this lane's
   headline finding, one line from fixed.
2. **A co-located third party can retire your outstanding code.** The controller invalidates on **any**
   refusal, including one caused by the shared per-IP bucket that other accounts behind the same egress
   filled. The in-code rationale is **only true for account-bucket refusals.** Griefing only, bounded — and
   the sharp fix is nameable: invalidate only when the **account** bucket refused.
3. The refusal's own remedy is fragile for the window: request a new code, try it too soon, and **the
   brand-new zero-guess code is retired.** Fail-safe direction, cost is user experience.
4. Two comment inaccuracies, including the counterfactual above.
5. A budget-straddle nuance — an attacker stopping exactly at the cap never draws a refusal, so retirement
   never fires. **Still twenty guesses of nine hundred thousand; the security argument survives.**
6. **C7 clean**: no logging in the new code, refusal bodies static and wire-asserted address-free, addresses
   digested before they become keys.

## 5. Assertions that could pass against broken code

- **A source pin forbids only the literal old constructor**, so a mutation to the shared non-crypto instance
  **reinstates non-crypto codes and passes this test and every behavioural test.** Name the other form.
- Two constants-only assertions that test no behaviour.
- **Four narrower key-derivation facts stop at the refusal with no fresh-key assertion** and would
  individually pass a refuse-everything limiter. **The lane's claim is true of every threshold anchor and
  all three wire tests — the third part does exist — but overstated as "every fact".** Suite-level, a
  blanket refuser cannot pass.
- The wire tier delivers its stated purpose: **deleting the controller call or the filter branch reds it
  while every unit test would still pass.**

## 6. What could not be determined

Whether the suites pass — receipts are committed and a child commit corroborates, not verified here.
Whether any screen special-cases the refusal by status rather than code. And the real deployed
configuration, correctly absent from the repository.

**Prompt-claim accuracy, stated plainly:** one clerk claim **false** — the PIN cool-off never depended on
that cache. One **mischaracterised** — the pre-fix failure was an outage, not vanishing limiters under a
serving API; **the defect and fix are real, the story is wrong.** One **overstated** — the
refused-to-invent-numbers claim holds for the two load-bearing thresholds and not for the rest.
**Everything else checked true, and where it is true it is impressively precisely true.**
