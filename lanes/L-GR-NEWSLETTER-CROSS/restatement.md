# F-GR-NEWSLETTER-CROSS — the restatement half of the `both` ruling

Ruled `both` 2026-08-05: restate the flag AND land the commit. The landing is
deferrable by a merge freeze; **this half is not**, because until it happens the
board keeps reporting a tenancy hole in shipped code that does not exist, and a
red side of the board that cannot be trusted mis-prices every priority taken
from it.

I may not edit `docs/plan/**` except my RETURN, so the replacement prose is
below, drop-in, for whoever owns the flag block. It changes what the flag
*says*, not what it *clears on*: `clears_when` is already correct and is left
untouched, and the flag still clears only when the proof is at the tip.

---

## Replacement title

    ### Flag F-GR-NEWSLETTER-CROSS — the newsletter store guard is load-bearing and unproven

(from: *an admin of one venue could approve another venue's newsletter* — which
states a live defect this estate never shipped.)

## Replacement body

    **There was never a live defect here. This is a proof gap.** At the integration
    tip `8e2b57de` all four newsletter authoring actions — Create, Detail, Edit,
    Approve — call the store guard **and honour its answer**, each returning
    `GrowthError(GrowthApiException.NotFound())` when it refuses
    (`Controllers/GrowthNewslettersController.cs`, guard at l.81/101/121/164 read
    with `git show 8e2b57de:`). No admin of one venue can reach another venue's
    newsletter on shipped code, and none could when this flag was raised.

    The *call the guard and discard its answer* shape this flag described is **the
    injected mutation that exposed the gap, not shipped code.** What was true —
    and is still true at the tip — is that the guard is protected by nothing: with
    its effect removed the entire fast tier stays green, because every pre-existing
    cross-tenant fact passes the intruder's *own* store as the route store, where
    the service conceals on its own. `GrowthTenantIsolationTests` is **15/15 green
    against the mutated build**, measured at this tip today. The guard is
    load-bearing for a request nothing in the suite ever made, so the next
    refactor can delete it silently.

    The proof of that request exists: `87600a1c` on `lane/growth-newsletter-wire`,
    one commit, one file, test-only, +439 — **not an ancestor of the tip**. The
    flag closes when it is on the branch.

---

## What is being corrected, precisely

| the flag said | what is true |
|---|---|
| an admin of one venue **could approve** another venue's newsletter | never on shipped code; only under the injected mutation |
| the four actions **call the guard and discard its answer** | that is the mutation's text, not the controller's |
| **In that state** a non-power-user admin can read, edit and approve | true only *in that state*, and that state was never shipped |
| the fast tier stays green with the guard's effect removed | **still true, re-measured at `8e2b57de` today** — 15/15 |

Severity is left at `blocker` and not argued down: an unprotected guard on a
cross-tenant path is worth a blocker on its own, and the remedy is one
conflict-free test-only commit. The correction is to the *kind* of blocker, not
its weight.
