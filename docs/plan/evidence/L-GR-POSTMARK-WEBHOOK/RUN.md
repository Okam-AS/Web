# L-GR-POSTMARK-WEBHOOK — the instrument, run and written down

Reason-shape hit: **(1) missing write-up — the run happened and nobody wrote it down.** The census
(`docs/plan/artifacts/instrumentless-exits.md`, Batch 1) measured it as *"no instrument at all. The evidence
line is four suite names and four counts — no path, no trx.
`GrowthPostmarkWebhookWireTests.cs` exists only at `/Users/svendaneel/okam/wt-gr-postmark/WebApi.Tests/Wire/`."*

So the suites were re-run today with `--logger trx`, a mutation was applied to the thing the exit's sentence
is about, the red was captured by name, the source was restored and the green re-captured. All three `.trx`
and a copy of the wire test source are beside this file.

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line with the single path it is given:

```
evidence: lane/gr-postmark-webhook 5b895dc4 (worktree ../wt-gr-postmark) — Wire/GrowthPostmarkWebhookWireTests 8/8, Growth/GrowthPostmarkEventReaderTests 38/38, Growth non-SQL 544/0, Wire+Modules 377/0
```

Two facts about it, measured today rather than assumed. **`5b895dc4` is NOT an ancestor of the backend trunk
`6d5328004`** — this work has not landed, and this artifact does not claim it has. And the counts in that
line are exactly right: today's clean run is `8 + 38 = 46` executed, 46 passed, from the same worktree at the
same commit.

## Where this run was made

`/Users/svendaneel/okam/wt-gr-postmark` at `5b895dc4f` ("A genuine Postmark event can now move a delivery;
what authenticates it cannot"), the lane's own worktree — because the code exists nowhere else. The worktree
was left byte-clean (`git status --short` empty) and at the same commit. Nothing was pushed; no trunk moved.

## The clean run

| file | `<Counters>` | `<Times>` finish |
| --- | --- | --- |
| `postmark-clean.trx` | `total="46" executed="46" passed="46" failed="0"` | `2026-08-09T17:42:17.10+02:00` |

The eight wire tests, by name from the trx — the two the exit's sentence names are marked:

- **`A_genuine_postmark_delivery_payload_moves_the_delivery_to_delivered_and_counts_it_once`** ← the delivery half
- **`A_genuine_postmark_hard_bounce_fails_the_delivery_and_suppresses_the_guest_channel_globally`** ← the bounce half
- `A_postmark_soft_bounce_defers_the_delivery_and_silences_nobody`
- `A_genuine_postmark_spam_complaint_marks_the_delivery_complained_and_suppresses_channel_globally`
- `An_auto_responder_bounce_is_acknowledged_and_moves_nothing`
- `Only_a_subscription_change_the_recipient_originated_suppresses_anyone`
- `A_genuine_postmark_payload_without_a_credential_is_refused_and_writes_nothing`
- `The_postmark_shape_is_read_only_for_a_postmark_account`

The route the payloads are replayed against is visible in the run's own log tail:
`POST http://localhost/v1/growth/providers/postmark/events - 202`, executed endpoint
`WebApi.Controllers.GrowthWebhooksController.Ingest`.

## The mutation

`Services/Growth/GrowthPostmarkEventReader.cs`, the `RecordType` switch — the two record types the exit names,
and only those two, redirected to `Ignored`:

```diff
-                    case "delivery": return ReadDelivery(root);
-                    case "bounce": return ReadBounce(root);
+                    case "delivery": return GrowthProviderEventRead.Ignored;
+                    case "bounce": return GrowthProviderEventRead.Ignored;
```

`Ignored` is the *authentic-but-unmeasured* branch — the same answer a `Click` or an `Inbound` gets. So the
mutant is not a crash and not a refusal: the webhook still answers, the payload is still accepted, and the
delivery simply never moves. That is precisely the failure the exit's sentence exists to exclude, and it is
the one a green suite cannot see.

## Which assertions went red, and what the messages said

| test | message |
| --- | --- |
| `A_genuine_postmark_delivery_payload_moves_the_delivery_to_delivered_and_counts_it_once` | `Assert.Equal() Failure` / `Expected: Delivered` / `Actual: ProviderAccepted` |
| `A_genuine_postmark_hard_bounce_fails_the_delivery_and_suppresses_the_guest_channel_globally` | `Assert.Equal() Failure` / `Expected: Bounced` / `Actual: ProviderAccepted` |
| `A_postmark_soft_bounce_defers_the_delivery_and_silences_nobody` | `Assert.Equal() Failure` / `Expected: Deferred` / `Actual: ProviderAccepted` |
| `A_genuine_postmark_payload_without_a_credential_is_refused_and_writes_nothing` | `Assert.Equal() Failure` / `Expected: 1` / `Actual: 0` |

`Actual: ProviderAccepted` is the sentence stated as a measurement: the delivery stayed where the send left
it. 21 of 46 reddened in all — the 4 wire arms above plus 17 reader arms, which is the expected blast radius
of a change to the reader's own switch.

## The counts, which are what disprove a void run

| run | `<Counters>` | `<Times>` finish | `WebApi.dll` mtime after |
| --- | --- | --- | --- |
| `postmark-clean.trx` | `total="46" executed="46" passed="46" failed="0"` | `17:42:17.10+02:00` | `2026-08-09 17:41:48` |
| `postmark-mutant.trx` | `total="46" executed="46" passed="25" failed="21"` | `17:43:27.38+02:00` | `2026-08-09 17:43:21` |
| `postmark-restored.trx` | `total="46" executed="46" passed="46" failed="0"` | `17:44:06.69+02:00` | `2026-08-09 17:44:00` |

`executed="46"` is identical across all three, so the kill is a kill and not the void-run signature.
`WebApi.dll`'s mtime **moves before every run** — 17:41:48 → 17:43:21 → 17:44:00 — so neither the mutated nor
the restored measurement was taken against a stale assembly. The tree was clean after the restore.

## What this artifact does not claim, carried forward from the lane's own LIMIT

**The credential is a stand-in.** The RETURN's own limit says the genuine payloads are credentialled "with
today's HMAC through the one `AuthenticatedAs` seam", because what really authenticates a Postmark webhook is
still an open ruling (`D-GROWTH-EVENTS`). The commit title says the same thing out loud: *"A genuine Postmark
event can now move a delivery; **what authenticates it cannot**."* So the route is genuinely exercised with
genuine payload shapes, and the authentication is not what these arms measure. That is unchanged by this run
and stays open.

**Not landed, and not C5.** `5b895dc4` is not on the trunk, and no operator has walked anything here.
