# L-GR-NEWSLETTER-CROSS -- verification of an existing remedy

Verdict: fail-spec. The remedy exists, is complete, and is load-bearing. The
sole unmet clause of the exit criteria is the merge, which this lane may not
perform (local commits only, never push; merges serialise).

## What already exists

Repo: /Users/svendaneel/okam/OkamAPI-modules (bare-shared; branch checked out
at /Users/svendaneel/okam/wt-gr-nlwire).

  commit 87600a1c  "A venue admin cannot reach another venue's newsletter
                    through its route"  (Sat Aug 1 18:42 +0200)
  branch lane/growth-newsletter-wire
  1 file, +439 lines, test-only:
    WebApi.Tests/Wire/GrowthNewsletterAuthoringWireTests.cs

Delta to the integration tip is exactly ONE commit and ONE new file. Nothing
else on that branch is unlanded.

## There is no live production defect

At the tip, all four authoring actions call the guard AND honour the answer:

  Controllers/GrowthNewslettersController.cs
    Create  (l.78)  Detail (l.95)  Edit (l.112)  Approve (l.149)
    each:  if (!await AuthorizeStoreAsync(storeId))
                  return GrowthError(GrowthApiException.NotFound());

The blocker was a PROOF gap, not a behaviour gap. The "discard the answer"
shape is the injected mutation used to demonstrate the gap, not shipped code.

## The proof meets every clause of the exit criteria

- At the wire. WireHostFixture / WireHost = real WebApplicationFactory, real
  routing, real model binder, real JWT bearer handler, in-memory SQLite. No
  container. Container-free tier.
- Intruder at a store genuinely somebody else's. AdminB is a real StoreAdmin
  of StoreB (WireHostFixture l.418) and is sent at StoreA's routes. This is
  precisely the request the brief said the old tests never made.
- Equal to an absent resource. Status AND body: foreign store is pinned equal
  to NonExistentStore on StatusCode and on the parsed error.code
  ("growth.not_found"), plus Assert.DoesNotContain on the concealed subject.
  Second axis too: a foreign newsletter id inside a store the caller holds.
- Not the auth challenge. The anonymous 401 is asserted as its own separate
  case; every intruder case asserts 404 with a module-specific error code
  parsed out of the JSON body, so it demonstrably reaches the module.
- Non-vacuous. Every refusal is paired with the legitimate owner succeeding
  on the SAME template in the SAME run, one variable changed. Writes are also
  proven in the table (row count, version-chain length, approval rows).
- C4 actor. CreatedByUserId, ApproverUserId, InvalidatedByUserId all asserted
  to be the caller the live token carried.

## Measured at the tip (not merely read)

Worktree: /Users/svendaneel/okam/wt-gr-nlcross
Base:     3579bbbc (feature/restaurant-modules), checkout asserted CLEAN
Branch:   lane/gr-newsletter-cross-verify  (my own; integration ref untouched)
Merge:    b521bdb5, merge of lane/growth-newsletter-wire -- ZERO conflicts
          (git merge-tree also clean, exit 0)

  build            0 errors  (the proof still compiles against the newer tip)
  6/6 PASS         GrowthNewsletterAuthoringWireTests

Mutation -- the exact defect shape, guard called and answer discarded, on the
four authoring actions only (List/TestSend/Dispatch untouched):

  WebApi.dll        18:56:20 -> 18:57:26   (moved)
  WebApi.Tests.dll  18:56:28 -> 18:56:28   (did NOT move)

  ... confirming the watched assembly is the one edited: a production edit
  does not move the test dll's mtime.

  4/6 FAIL, each "Expected: NotFound / Actual: OK" -- create, detail, edit
  and approval all serve the intruder another venue's newsletter.

  AND, in the same mutated build:
  GrowthTenantIsolationTests  15/15 PASS

  ... which reproduces the root finding exactly: the pre-existing cross-tenant
  suite stays fully green while a venue admin can read, edit and APPROVE
  another venue's newsletter.

Restored, rebuilt (0 errors), re-ran: 6/6 PASS. Checkout clean afterwards;
the wire suites I ran did not dirty artifacts/journeys/ev-dietary.

## What remains

Land 87600a1c on feature/restaurant-modules. It is a clean, conflict-free,
test-only, one-file addition, already validated green against the current tip
and already mutation-proven there. b521bdb5 in wt-gr-nlcross is exactly that
merge if the orchestrator wants a pre-validated one.

Files touched by this lane: NONE outside my own worktree and this directory.
No push. No migration. No container started.
