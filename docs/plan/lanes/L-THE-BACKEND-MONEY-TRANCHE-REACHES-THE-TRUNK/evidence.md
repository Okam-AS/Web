# L-THE-BACKEND-MONEY-TRANCHE-REACHES-THE-TRUNK — evidence

Backend trunk **`057c390ad` → `7d0450a4b`**, tier **4974 / 0 failed / 11 skipped**. Three branches, one
tranche, zero conflicts. Nothing pushed.

## The arc, reproduced step by step — the acceptance criterion

Each step is a real `dotnet test` run from `WebApi.Tests/` with `--filter "Database!=SqlServer"`, each
preceded by a build whose `WebApi.dll` mtime was asserted to move, and each log grepped above the
summary for an abort line. None had one.

| step | commit | tier | failing tests |
|---|---|---|---|
| trunk `057c390ad` | — | 4949 / 0 / 11 (as recorded) | — |
| `+ pos-coverage-opened` | `8f817cbd9` | **4967 / 2 FAILED / 11** | both, named below |
| `+ giftcard-transfer-one-wallet` | `97d2bd99b` | **4971 / 1 FAILED / 11** | invoice only |
| `+ an-invoice-lists-each-order-once` | `7d0450a4b` | **4974 / 0 / 11** | none |

**2 → 1 → 0 exactly as the census measured**, and the two reds at step 1 are the two the brief named:

```
Failed WebApi.Tests.InvoiceDocumentTests.Every_order_is_listed_once_on_an_invoice_that_spans_more_than_a_year
Failed WebApi.Tests.GiftcardBalanceTests.Passing_a_gift_card_on_moves_the_money_instead_of_copying_it
```

Each went green as its own lane landed — the gift-card red at step 2, the invoice red at step 3. The
skip count held at 11 throughout, so nothing was quietly skipped into green.

**The census's central claim is therefore confirmed by measurement: `lane/pos-coverage-opened` cannot
land alone.** Landing it singly leaves the backend trunk red across two commits, on two money paths.

## The chain shape, confirmed rather than assumed

The three branches do not collide, and the reason is structural rather than lucky:

| branch | merge-base with trunk | carries `b368d930e`? | own commits on top of it |
|---|---|---|---|
| `b368d930e` pos | `81d06c10a` | — | — |
| `71ac73af1` giftcard | `81d06c10a` | **yes** | 1 |
| `a9d408bfb` invoice | `81d06c10a` | **yes** | 1 |
| `69e6ca8af` mail-revocation | `81d06c10a` | no | independent |
| `8357c8a33` module-off backend | `9fb057d00` | no | different fork point |

Both fixes carry pos-coverage's whole commit as an unlanded tail and add exactly one commit each. Their
contributions are **disjoint**: giftcard touches `Services/GiftcardService.cs` and
`WebApi.Tests/GiftcardBalanceTests.cs`; invoice touches `Services/InvoiceService.cs`,
`WebApi.Tests/InvoiceDocumentTests.cs` and its own lane directory. No shared file. That is the
stacked-chain shape, not a conflict — and it is why all three merges were clean.

## The decision check, which is the thing that was missed last time

**I checked every branch in reach against the open decisions before merging, and I state what I found.**
The instrument is each decision's `blocks:` field, extracted from `plan.md`; my first attempt used a
naive `awk` that reported the same decision for every branch, which is an artifact rather than a
finding, and I discarded it.

Fifteen decisions are open. The ones that bear on anything in reach:

- **`D-SPEC-L-A-MODULE-OFF-NAMES-THE-MODULE` — `blocks: L-A-MODULE-OFF-NAMES-THE-MODULE`.** That is the
  lane whose backend half is `8357c8a33`. **Gated, and NOT landed** — asserted after the last merge:
  `merge-base --is-ancestor 8357c8a33 HEAD` is false. Its frontend half is already on the frontend
  trunk by a clerk error; landing this half would have compounded that breach, not repaired it.
- **`D-REVOCATION-POSTURE-IN-PRODUCTION` — `blocks: F-EVERY-MAIL-DIES-AT-A-REVOCATION-CHECK…`.** It
  blocks a *flag*, not a lane, so `lane/mail-revocation-lever` is not strictly gated. See the ruling
  below.
- **None of the three tranche branches is named in any open decision's `blocks:` field.** They were
  free to land.

**`lane/mail-revocation-lever` @ `69e6ca8af` was NOT taken, and that was a choice.** The brief permits
it before, after or inside the tranche but does not require it — the exit criteria names only the three.
Its subject is exactly what `D-REVOCATION-POSTURE-IN-PRODUCTION` is still deciding: *who is allowed to
accept a certificate that may have been withdrawn*. Landing an optional branch whose posture is under an
unruled decision, in the same pass that exists partly to avoid a second such breach, buys nothing and
risks the same shape of mistake. It is untouched at `69e6ca8af`.

## ⚠ This tranche lands with a known open hole

**`TransferGiftcard` moves value with no resolved caller identity.** Verified in the tree rather than
relayed:

```
Controllers/GiftcardController.cs:232  [HttpPost("transfer/{giftcardId}/{newReceiverPhoneNumber}")]
Controllers/GiftcardController.cs:233  public async Task<IActionResult> TransferGiftcard(
                                           Guid giftcardId, string newReceiverPhoneNumber)
Controllers/GiftcardController.cs:237  await _giftcardService.TransferGiftcard(giftcardId, newReceiverPhoneNumber);
```

The controller resolves no caller and passes none to the service. The class carries `[Authorize]` at
line 13, and three other routes on it carry `[Authorize(Roles = PowerUserRole)]` — this one does not.
So **any authenticated user who knows a card's id can transfer that card**, whether or not it is theirs.
That is a C4 violation on a money path.

**Landing does not make it worse and does not close it.** The unguarded controller is already on the
trunk; this tranche changes what `TransferGiftcard` does internally (money moves instead of being
copied) without touching who may call it. **The branch that closes it is being built on top of
`71ac73af1`**, which this tranche has now landed — so that work's base is on the trunk and it can land
as a normal follow-on.

## Arity sweep

The load-bearing question for a C# tranche is whether either changed service moved a signature under its
callers. **Neither did:**

| file | member | at trunk | at the tip |
|---|---|---|---|
| `Services/GiftcardService.cs` | `TransferGiftcard` | 1 public declaration | 1, unchanged |
| `Services/InvoiceService.cs` | `GetInvoiceModel` | 1 public declaration | 1, unchanged |

Both fixes are internal to the method body, so no call site can have been left behind: the controller
call at `GiftcardController.cs:237` and every `GetInvoiceModel` call site still match. Corroborated by
the compiler — every build in the arc reported `0 Error(s)`, which for C# is a stronger arity check than
any grep.

## Hygiene

- **The non-SQL tier rewrites tracked artifacts**, and it rewrote **two**, not one:
  `artifacts/journeys/ev-dietary/run-sheet.json` *and* `run-sheet.md`. The `.md` was still dirty when
  step 2 was committed, so I checked both landing commits for it rather than assuming — **neither
  carries a `run-sheet` file** (`git show --stat | grep -c run-sheet` = 0 for both). Restored before
  every subsequent step; `git add -A` never used.
- Worktree detached in place, then `rm -rf` plus `git worktree prune`. **No worktree holds the trunk.**
- Nothing pushed; the backend trunk is on no remote branch.

## Revert

```
git -C /Users/svendaneel/okam/OkamAPI-modules branch -f feature/restaurant-modules 057c390ad
```
