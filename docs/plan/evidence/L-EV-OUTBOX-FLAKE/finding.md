# L-EV-OUTBOX-FLAKE — the exit is false of the class it names, and the estate has the weakest of three fixes

Reason shape hit: **(4) the exit names something that is not in the estate.** Per the brief: **do not
build toward this exit.** Recorded for an owner ruling, with one fact the prior census did not have.

## The evidence line as it stands

```
evidence: OkamAPI lane/ev-outbox-flake 59a1d607 (base 5df07afa, worktree /Users/svendaneel/okam/OkamAPI-evoutboxflake)
```

Untouched. The exit line is untouched. Nothing was built.

## The exit, and what the trunk actually holds

> the guest-data assertion **in `EventsOutboxDeliveryTests`** cannot alias onto a random token, pinned by
> a **seeded token** that reproduces the historical failure when the guard is removed

`59a1d607` is **not an ancestor** of the backend trunk `6d5328004`. Read at the trunk,
`WebApi.Tests/Events/EventsOutboxDeliveryTests.cs` lines 403–420:

```csharp
var link = GuestBaseUrl + "/events/proposal/" + row.PublicToken.ToString("D");
Assert.Contains(link, body);                                    // positive control
var beyondTheLink = body.Replace(link, string.Empty, StringComparison.Ordinal);
…
Assert.DoesNotContain("250", beyondTheLink);
Assert.DoesNotContain("2000", beyondTheLink);
```

with the token still drawn as `PublicToken = Guid.NewGuid()` (line 452). Re-measured this pass:
`git grep "AliasingToken\|PinPublicTokenAsync" -- '*.cs'` at the trunk returns **nothing**. So of the
exit's two clauses:

- *cannot alias onto a random token* — **true at the trunk, by a different mechanism**: the link (and
  therefore the token) is excised from the haystack before the needles run.
- *pinned by a seeded token that reproduces the historical failure* — **false at the trunk.** There is no
  seeded token, no digit inventory, and nothing that reproduces the historical failure on demand.

An exit cannot be closed on a class whose contents contradict it, and rewriting it to describe the
trunk's mechanism would be the edit this program exists to prevent.

## The fact the earlier census did not have: three fixes, and the estate shipped the weakest

Two lanes independently fixed this defect and **neither landed**; what is on the trunk is a **third**
variant that both of them are stronger than.

| | mechanism | where |
|---|---|---|
| `L-EV-OUTBOX-FLAKE` | token pinned to `2502000a-2500-2000-2500-250020002500` — a token that *contains* both needles, so the historical failure reproduces on demand — plus a **digit inventory** of the body beyond the link (`["8"]`, from `UTF-8`) replacing the two bare needles | `lane/ev-outbox-flake` `59a1d607`, unlanded |
| `L-EV-OUTBOX-GUID-SUBSTRING` | the expected token **masked by exact value** with the checks run over the remainder — *"the whole link is deliberately not cut out"* — plus a stray-identifier guard, a negative-control theory, a 6-case token theory, and amounts derived from the seeded proposal instead of spelled as literals | `lane/ev-outbox-guid-substring` `79f9dd7d`, unlanded |
| **the trunk** | `body.Replace(link, "")` — the **whole link removed** — with a random token and the two bare needles kept | `6d5328004` |

Three consequences an owner should weigh, each read off the code rather than inferred:

1. **The trunk's haystack excludes the whole URL.** An amount that leaked *inside* the link — a query
   parameter, a path segment — is now invisible to the assertion. `L-EV-OUTBOX-GUID-SUBSTRING` names this
   as the reason it masked the token by value rather than cutting the link, and its RETURN says so in
   those words. The trunk chose the option that lane rejected.
2. **The needles are still bare.** `DoesNotContain("2000", …)` does not match `2 000,00`, which is how a
   Norwegian money leak actually renders, and covers neither the room fee, the line unit price, the guest
   count nor the event date. Both unlanded lanes replaced the needles; the trunk kept them.
3. **The trunk's own comment carries a measured-wrong number.** It reads *"its hex happens to contain
   '250' about once in every **130** runs"*. `L-EV-OUTBOX-GUID-SUBSTRING` probed **200,000** real composed
   bodies and measured **1,012 hits = 1 in 197.6**, and states explicitly that the briefed rate was an
   overstatement. The estate is carrying the corrected-away figure in a code comment.

## What an owner has to decide

1. **Which fix the estate keeps.** The two unlanded lanes are not variants of each other — masking by
   value and inventorying the digits are complementary, and the guid-substring lane additionally measured
   the rate and swept for the same shape elsewhere (five other bare-digit sites, all shown incapable of
   matching inside a random identifier; *"this was the only one"*).
2. **Whether this exit is re-ruled or retired.** Its sentence names `EventsOutboxDeliveryTests`, which is
   a trunk class that does not have the property. Landing `59a1d607` would make the exit true — but the
   file **has diverged where the merge would land**, so that is a landing lane with a conflict, not a
   citation fix.
3. **The comment.** Whoever lands either fix should take the "1 in 130" sentence out with it.

## Constraint note

C1 is not engaged by either lane: `EventsNotificationOutbox` and `EventsProposalVersion` are in neither
`GuardAppendOnly` nor the trigger set (the three guarded Events tables are `AcceptanceReceipts`,
`StateTransitions`, `PaymentReceipts`), and the guid-substring lane's seeded tokens are set on detached
entities that are never attached or saved.
