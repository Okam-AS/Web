# FINDING — the exit names a wire test, none exists, and the obstacle is the wire world's seed, not the tier

Produced by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shape: **the evidence proves less than the exit demands** — a controller-invocation test where the
exit names a wire test. This lane is **declined again**. The exit is **not** softened to "a test": that is
the edit this program exists to prevent.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    /Users/svendaneel/okam/wt-gr-testsend @ 5719fc96 · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs ·
    Growth 460/0/1 (SqlServer excluded, no slot held)

## What exists, and what it is

`GrowthTestSendBindingTests` is on the trunk (`5719fc96e` is an ancestor of `6d5328004`) and the guard is
real: `GrowthNewsletterService.TestSendAsync` calls `RequireOwnAccountAddressAsync(userId, request.TestAddress, …)`
at :240, which reads the acting administrator's own `Email` and otherwise raises
`growth.test_address_not_own` — *"A test-send may only be addressed to the signed-in administrator's own
account address."* (:488-489). The check sits **after** the ownership load, deliberately, so a cross-tenant
probe keeps answering the same 404.

But the test is a **controller invocation**, not a wire test:

    var refused = (ObjectResult)await owner.TestSend(StoreA, world.World.NewsletterId, new GrowthTestSendRequest { … });
    Assert.Equal(403, refused.StatusCode);

No HTTP, no middleware, no policy, no model binding. Its own docstring argues that this is *"the only way it
is real at the wire"*, and the RETURN states the position outright: *"A 401 wire pin is undriveable, so I
wrote none."* An argument for a lower tier is not the tier the exit named.

## The new measurement: WHY there is no wire test, measured rather than argued

The RETURN's reason is about a **401**. The exit does not ask for a 401 — it asks that *a test-send to an
arbitrary address is refused or attributed*, at the wire. So the real question is whether **that** is
driveable. A temporary wire probe was **applied, measured and removed** (tree clean afterwards;
`git status --porcelain` empty) driving the real route through `WireHostFixture`. Raw output in
`wire-probe.txt` beside this file:

    POST /v1/growth/stores/4101/newsletters/1/test-sends
    AdminA  testAddress="stranger@somewhere.test"   -> 404  {"code":"growth.not_found"}
    AdminA  testAddress=""                          -> 400  {"code":"growth.test_address_required"}
    AdminA  testAddress="wire-admin-a@example.test" -> 404  {"code":"growth.not_found"}
    AdminB (does not administer StoreA)              -> 404  {"code":"growth.not_found"}

**Two facts fall out of that, and neither was in the RETURN:**

1. **The address guard is not reachable at the wire in this world at all.** The wire seed carries **no
   newsletter row**, so the ownership load 404s before `RequireOwnAccountAddressAsync` is ever called
   (`grep GrowthNewsletter WebApi.Tests/Wire/{WireHostFixture,GrowthWireSeed}.cs` returns nothing). The
   binding test can reach the guard only because `GrowthIsolationWorld` seeds a newsletter that the wire
   world does not.
2. **The wire world's admins have no `Email`.** `WireHostFixture:407-410` seeds
   `new ApplicationUser(AdminA) { Id = AdminA, PhoneNumber = "+4740000001" }` and three siblings — all
   phone-signup users. The guard is deny-closed on that lookup, so even with a newsletter seeded, **every**
   wire test-send would refuse for the *wrong reason* ("you have no account address"), which is a
   confounded refusal and worse than no pin at all.

At the wire today the answer therefore does **not** depend on who asks — AdminA and AdminB both get the same
404 — which is precisely the property the binding test was written to demonstrate and the reason it was
written at the lower tier.

## What would close this exit, named exactly

A wire pin is writable — the harness, the route, the collection and the module-caller client all exist and
were exercised above. It needs **two changes to a shared fixture**, and that is the whole cost:

1. seed a Growth newsletter for `WireHostFixture.StoreA` (id `1`, matching the route the other Growth wire
   tests already call), and
2. give `AdminA` an `Email` in `WireHostFixture`, with a second admin left email-less so the deny-closed arm
   stays pinned too.

Then the wire test the exit names is roughly: `POST …/newsletters/1/test-sends` as AdminA with a stranger
address → **403 `growth.test_address_not_own`**; the same request with AdminA's own address → **200**; and
the mutation the exit demands — the controller passing anything other than `RequireUserId()` — reds the
second arm, because the answer to a byte-identical request would stop depending on who asks.

**This lane did not make those changes.** `WireHostFixture` is shared by every wire suite in the repo, and
adding rows to it is a change other lanes' worlds would see — a landing decision, not an evidence write-up.
Recorded here so whoever takes it does not have to re-derive the obstacle.

## Residue from the original RETURN that still stands

- **No persisted test-send record** — that needs a table.
- **The frontend swallows the code**: admin-web maps `growth.*` codes explicitly, so
  `growth.test_address_not_own` falls through to `growth_error_generic`
  (`pages/admin/growth-newsletter.vue:245`). A separate frontend lane.
- The guard is deny-closed on the lookup, so **a phone-signup admin with no `Email` cannot test-send at
  all** — correct, and the reason the wire world cannot currently distinguish the two refusals.
