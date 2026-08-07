# Mutation log — L-THE-GUEST-EXIT-IS-FINISHED

Four changes were made on top of the inherited work, each raised by an independent adversarial review of the
draft. Every one was made to red under a mutation **actually applied and then restored**, and three of them
additionally carry a *discriminator* run: the mutation applied with the new assertion **removed**, showing the
suite goes green. A guard is only worth adding if the estate can see the difference it makes.

**Restores use `cp` plus `touch`, never `mv`.** `mv` preserves mtime, MSBuild then calls the assembly
up-to-date, and the following `--no-build` run silently measures the binary that still contains the mutant.
This repo's CLAUDE.md records that trap costing a lane an hour on 2026-07-31. Every restore below was
followed by a build whose output assembly mtime had moved.

---

## A — the landing redirect refuses a non-https base

**Change** `Services/Growth/GrowthUnsubscribePageLink.cs` — `BuildRedirectTarget` gains the `https://` refusal
that `BuildUri` already had.
**Why it is not symmetry for its own sake:** `BuildUri` runs while a message is being *composed*, so a bad
base refuses the send and re-issuing the setting fixes the next one. `BuildRedirectTarget` runs when a token
**already sitting in a mailbox** comes back — every link dispatched under an older value keeps arriving for as
long as those tokens live. A base that later became non-https would 302 a **live unsubscribe credential, in
the fragment**, at that origin. The fragment is chosen precisely because it is the carrier that stays private
(C7); sending it over http publishes it.

**New test** `GrowthUnsubscribeExitReachabilityTests.The_landing_redirect_refuses_a_base_that_is_not_https_rather_than_sending_the_credential_there`
— a `[Theory]` over three real misconfigurations (`http://…`, a scheme-less base, a protocol-relative `//…`),
driven **through the controller action a browser reaches**, not through the internal builder. It carries its
own positive control: the configured https base still answers 302 with the credential in the fragment.

| | |
| --- | --- |
| mutation | the new `https://` refusal deleted from `BuildRedirectTarget` |
| result | **RED, all three rows** — `Assert.Throws() Failure / Expected: typeof(System.InvalidOperationException) / Actual: (No exception was thrown)` |
| restored | `3 passed` |

The four constructor arguments the helper passes as `null` are deliberate, not lazy: if a future
`UnsubscribeLanding` acquired a token spend or a suppression write, it would `NullReferenceException` here
rather than pass. The whole safety case for answering a GET at all is that this action reads configuration
and touches nothing else.

---

## B — three reachability tests could go vacuous, and did

**Change** `GrowthUnsubscribeExitReachabilityTests` — `Assert.Equal(2, provider.Submissions.Count)` added
ahead of the `foreach (var submission in provider.Submissions)` in the three tests that had no such guard.
A `foreach` over an empty collection asserts nothing and reports green.

**Mutation** `GrowthDispatchService.ProcessClaimedDeliveriesAsync` — `if (true) { continue; }` before
`ProcessClaimedDeliveryAsync`, so the dispatch claims its batch and reaches **nobody**. This is not a
contrived state: it is what a refusal moved one step earlier, or a differently-seeded world, would produce.

| | |
| --- | --- |
| mutation applied, guards present | **5 failed / 3 passed** — every dispatch-dependent test red |
| **discriminator: mutation applied, my three guards removed** | **2 failed / 6 passed** — the three go **GREEN** |
| mutation restored, guards present | `27 passed` |

The two that stay red in the discriminator are the control: `Every_dispatched_message_…` already had
`Assert.NotEmpty` and `A_recipient_who_spends_…` already pinned the count. That contrast is the whole finding
— the guard was present on two arms and absent on three, and nothing would have said so.

---

## C — the C7 log sweep had no positive control

**Change** `GrowthOneClickUnsubscribeWireTests.The_GET_landing_never_writes_the_token_to_a_log_sink` — a
`Assert.Contains(_wire.Logs.Entries, e => e.Message.Contains(token))` added ahead of the
`Assert.Empty(appEntriesCarryingTheToken)`.

"No `WebApi.*` category logged the token" is a sentence equally true of a recorder that captured nothing, a
request that never reached the host, and a log level that filtered the pipeline away. Three states that look
identical to an empty list and mean nothing like a clean sweep.

**Mutation** the swept value replaced with `token + "-never-logged"` — a value the recorder demonstrably never
saw, i.e. the empty-haystack state itself.

| | |
| --- | --- |
| mutation applied, control present | **RED** — `Assert.Contains() Failure` |
| **discriminator: mutation applied, control removed** | **`Passed! 1`** — the C7 sweep passes against a haystack it cannot see into |
| mutation restored | `27 passed` |

---

## D — the harness C7 sweep is blind to Playwright trace zips

**Change** `playwright.growth-guest-exit.config.js` — `trace: 'retain-on-failure'` → `trace: 'off'`.

The journey navigates to a URL whose **fragment is a live unsubscribe token**, and a Playwright trace records
every navigation with its full URL. The harness sweep is `grep -rlF "$TOKEN" "$WEB_REPO/artifacts"`
(`growth-guest-exit-world.sh:204`) — a grep, and a grep cannot read a zip. So a *failing* run, which is
exactly when `retain-on-failure` writes one and exactly when the artifact is most likely to be attached to a
report, would put the credential where the one check built to catch it cannot look — and the harness would
then print `no artifact carries the token`.

**Demonstrated rather than argued** (`mutation-D-trace-zip.txt`): two files planted under `artifacts/`
carrying the same value, one plain and one zipped.

```
$ grep -rlF "$FAKE" artifacts/_c7probe        -> artifacts/_c7probe/plain.txt        (finds the plain one)
$ unzip -p artifacts/_c7probe/trace.zip | grep -cF "$FAKE"  -> 1                     (the zip DOES carry it)
```

The sweep finds one and misses the other. A sweep that cannot fail is worse than no sweep, because its
all-clear is read as a result. Both probe files were removed afterwards; `artifacts/` is gitignored either way.

Screenshots are **kept** (`screenshot: 'only-on-failure'`): the page strips the token from the address bar in
`mounted()` before anything is painted, so a failure picture is a picture of a rendered card.

---

## Not fixed, and why

`test/e2e/support/journey.js` files a live run's screenshots under `…-unidentified` while the artifact's own
key names the build — `backendKeyFor` destructures `build` where `meta` carries `backendBuild`. Reproduced
exactly on this lane's own run. **Left alone**: it is a shared instrument that several lanes are editing, and
the citation is still sound (both sides derive from `pictureBase`, so the record points at files that exist).
Only the directory name is wrong.
