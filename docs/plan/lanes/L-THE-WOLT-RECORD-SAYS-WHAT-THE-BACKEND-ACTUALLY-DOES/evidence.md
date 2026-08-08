# L-THE-WOLT-RECORD-SAYS-WHAT-THE-BACKEND-ACTUALLY-DOES — evidence

Trunk `d99f92d` → **`1525e74`**, tier **169 / 4069 / 0**. Nothing pushed.

## The three claims, re-measured against `WoltService.cs` at backend trunk `057c390ad`

The brief asked for these to be verified rather than accepted, because a record *about* the backend
that is itself unmeasured would be the same defect again. Each was read out of the backend tree.

| claim | measured | verdict |
|---|---|---|
| `statusesToSave` has **ten** members, incl. `DropoffCompleted` | 10 members; `DropoffCompleted` at `WoltService.cs:511` | **true** |
| `DropoffCompleted` added by `6454f3c71` | `git show 6454f3c71` adds that line, and is an ancestor of the trunk | **true** |
| **eleven** of fifteen reach the column, **four** wordless | enum declares 15; reachable set is 11 | **true** |

**The eleventh is `NotSet`**, seeded at `OrderService.cs:419`. Establishing that required checking
every writer of the column rather than only the webhook path, because any one of them could have
widened the set:

| writer | range | adds to the set? |
|---|---|---|
| `WoltService.cs:517` (webhook) | the ten-member allowlist | — the allowlist itself |
| `WoltService.cs:1115` (order-status mirror) | `OrderReceived`, `PickupStarted`, `PickupArrival`, `PickedUp` | no — all four already in it |
| `MapMarketplaceDeliveryStatus` (`:909` seed) | eight members, incl. a default of `OrderReceived` | no — all eight already in it |
| `WoltService.cs:1158` / `:1206` | `Delivered`, `OrderRejected` | no |
| `OrderService.cs:419` (row creation) | `NotSet` | **yes — the eleventh** |

So the reachable set is exactly *allowlist ∪ {NotSet}* = 11, and the unreachable four are
`PickupEtaUpdated` (3), `LocationUpdated` (12), `DropoffEtaUpdated` (13), `HandshakeDelivery` (14).

## Are the four wordless statuses still the right set?

**Yes — the same four, and the rule still selects exactly them.** The rule is *a word for a state the
API cannot send is a guess printed at an operator*. With membership at ten rather than nine, the only
member that changes side is `DropoffCompleted`, which moves from "cannot be sent" to "is sent" — and
it **already had a word**, so nothing is added or withheld. No label changes in any language.

Worth being precise about the "five", because it is not a list: the record never named five wordless
statuses. It named four at the old line 188 — the correct four — while separately asserting the column
holds "ten of fifteen", which *implies* five unreachable. The fifth existed only in that arithmetic.
So the defect was never a missing or invented label; it was a **wrong reason attached to a right
label**, plus a count that contradicted the record's own list.

## What "load-bearing" actually buys, stated exactly

`woltDeliveryStatusLabel` resolves an unknown member to `orderCard_woltWaiting` — a dictionary key,
through `$i`. That fallback is what makes it true that no raw enum can render and no invented German
can appear, and it holds for any input.

`DropoffCompleted`'s entry does something narrower and still load-bearing: it is a state the column
**really holds** (`WoltService.cs:559` maps it to `OrderStatus.Completed`), so without the entry an
operator watching a completed dropoff reads **"waiting"** — not a raw enum, not invented German, but a
well-formed word that is wrong. Complete coverage of the reachable set is what lets the fallback be a
single waiting key instead of a guess per state. The record's "carried courtesy" framing demoted the
entry to a compatibility gesture toward a retired switch; it is coverage of a live state.

## Where the record lived, and what changed

**No code change.** Verified mechanically: every changed line in `plugins/global-mixin.js` is a comment
line — `git diff -U0` filtered to non-comment changes returns empty. The label map's entries, the
resolver, the three dictionaries and `OrderCard.vue` are untouched.

1. **`plugins/global-mixin.js`** (the file the exit criterion names) — the header record and the
   inline note at the `DropoffCompleted` entry.
2. **`test/wolt-and-dinehome-status-labels.test.js`** — the same record as *executable claims*, which
   is the more dangerous copy. `DropoffCompleted` sat in a constant named `CARRIED_UNPERSISTED_WOLT`,
   literally asserting the backend cannot persist it. It moves into `PERSISTED_WOLT_STATUSES` and the
   constant is deleted.

   **This is the one judgement call that goes past comments, and it is flagged for reversal if you
   disagree.** Leaving it would have left the tree self-contradictory — a corrected comment beside a
   constant asserting the opposite, and a future reader would trust the executable one. The key-set
   assertion is unchanged, because the union it compared (`PERSISTED ∪ CARRIED`) is identical to the
   new `PERSISTED`. The move adds **two arms**: `DropoffCompleted` read in Norwegian and in German,
   exactly as every other persisted status already is. Revert with:
   `git checkout d99f92d -- test/wolt-and-dinehome-status-labels.test.js`

## Tier

`npx jest --ci`, exit 0, no `FAIL` line, `core` pinned to `9626a561`.

```
d99f92d  before   169 suites / 4067 / 0
1525e74  after    169 suites / 4069 / 0
```

**+2, fully accounted**: the two new arms above. The suite itself goes 56 → 58; no suite added.

## Exit-criterion grep

The named file's claims and the backend, side by side, both read at their trunks:

```
global-mixin.js: "hold ELEVEN of them"                backend: 15 enum members, reachable set 11
global-mixin.js: "WoltService.cs:502-513 — TEN"       backend: statusesToSave members = 10
global-mixin.js: "WoltService.cs:511 ... 6454f3c71"   backend: DropoffCompleted at line 511
global-mixin.js: "OrderService.cs:419 ... NotSet"     backend: Status = WoltStatus.NotSet at line 419
global-mixin.js: "FOUR, the only members no writer…"  backend: 15 − 11 = 4
```

## Left for the owner — a third copy I may not edit

`docs/plan/lanes/L-ELEVEN-WOLT-STATUSES-REACH-A-SWISS-SCREEN-IN-NORWEGIAN/premise-check.txt` carries
the same wrong record and is **outside this lane's write boundary** (`docs/plan/**`):

- line 25 — *"The switch had a case for DropoffCompleted -> carried. The other four get no invented
  word."* — the "carried" framing, now known to be coverage of a persisted state.
- lines 29–30 — *"All ten reachable Wolt values…"* — should be eleven.

It is a frozen record of what that lane measured, so it may be right to leave it and let this
correction supersede it; but it should be a decision rather than an oversight.

## Teardown

`Web-modules-wt/L-WOLT-RECORD` detached in place, then `rm -rf` plus `git worktree prune`. No worktree
holds `feature/restaurant-modules`. `web-livewalk` untouched, no container started, nothing pushed.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules d99f92d
```
