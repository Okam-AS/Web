# L-GR-CONFIRMED-EMAIL — the red the exit turns on, produced today

Reason-shape hit: **(2) the artifact records a GREEN run where the exit demands a RED.** The census
(`docs/plan/artifacts/instrumentless-exits.md`, Batch 5) put it exactly:

> The exit's operative clause is *pinned by a test that reds if the confirmation requirement is removed*;
> the artifact records a green tier and relays the red from a commit message on an unpushed branch. The
> artifact is honest; it is honest about not being this.

A green tier is evidence of a tree, not of a pin. So the mutation was applied, the failing run captured, the
source restored, and the green re-captured — all three `.trx` are beside this file.

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line with the single path it is given:

```
evidence: /Users/svendaneel/okam/wt-gr-confirmed @ 801d36a3 (lane/gr-confirmed-email, off 5719fc96, local, unpushed) · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · artifacts/tests/a7697121-fast-tier.trx = fast tier 4376 run / 4364 passed / 0 failed / 12 skipped, from a clean detached checkout of a7697121
```

Two facts about that line are worth carrying forward rather than discarding. First, `801d36a3` **is an
ancestor of the backend trunk `6d5328004`** — measured today with `git merge-base --is-ancestor`, so the
work landed even though its red never did. Second, `artifacts/tests/a7697121-fast-tier.trx` is the green
tier the census refused, and it is refused here too: it is not the instrument this exit names.

## Where this run was made

A **detached worktree at the backend trunk `6d5328004`**, not the lane branch and not the shared checkout:
`/private/tmp/.../scratchpad/wt-confirmed`. That matters — it means the red is produced against the code as
it stands on the trunk today, not against an unpushed branch that may since have drifted. Neither trunk
checkout was touched and nothing was pushed.

## The mutation

`WebApi/Services/GrowthNewsletterService.cs`, `RequireOwnAccountAddressAsync` — one line deleted:

```diff
             if (account == null
-                || !account.EmailConfirmed
                 || string.IsNullOrWhiteSpace(account.Email)
                 || !string.Equals(account.Email.Trim(), requestedAddress.Trim(), StringComparison.OrdinalIgnoreCase))
```

That is *the confirmation requirement, and only it*. Address equality with the profile field survives the
mutation, which is the point: the guard the exit is about is not "the address matches" — `AspNetUsers.Email`
is self-asserted and `POST /user/send-email-confirmation-code` persists whatever address the body carries
while clearing `EmailConfirmed` in the same write — it is "the platform can prove the actor holds it".

## Which assertion went red, and what the message said

| test | clean | mutated | restored |
| --- | --- | --- | --- |
| `An_address_the_account_holds_but_has_never_confirmed_is_not_a_provable_own_address` | Passed | **Failed** | Passed |
| `A_test_send_to_an_address_that_is_not_the_admins_own_is_refused_and_composes_nothing` | Passed | Passed | Passed |
| `An_actor_with_no_account_address_on_file_cannot_test_send_at_all` | Passed | Passed | Passed |
| `A_test_send_that_cannot_name_its_actor_is_refused_before_anything_is_composed` (3 cases) | Passed | Passed | Passed |
| `The_bound_address_follows_the_acting_admin_and_not_the_store` | Passed | Passed | Passed |

The message, from `confirmed-mutant.trx` and the console:

```
WebApi.Tests.Growth.GrowthTestSendBindingTests.An_address_the_account_holds_but_has_never_confirmed_is_not_a_provable_own_address [FAIL]
  Assert.Equal() Failure
  Expected: 403
  Actual:   200
  at …/WebApi.Tests/Growth/GrowthTestSendBindingTests.cs:line 116
```

Line 116 is `Assert.Equal(403, refused.StatusCode)` on the seeded state that the confirmation-clearing write
leaves behind: `account.Email = "victim@example.test"; account.EmailConfirmed = false`. With the requirement
removed the route answers **200 and accepts** — marketing content into a mailbox the actor merely typed,
which is the § 15 shape the guard exists for. **Exactly one arm reds**, which is what a targeted pin should
do; the six that hold are the ones guarding other clauses, and they stayed green under the mutation, so this
is a pin on the confirmation requirement and not a pin on the whole method.

## The counts, which are what disprove a void run

| run | `<Counters>` | `<Times>` finish | `WebApi.dll` mtime after |
| --- | --- | --- | --- |
| `confirmed-clean.trx` | `total="7" executed="7" passed="7" failed="0"` | `17:39:25.77+02:00` | `2026-08-09 17:38:59` |
| `confirmed-mutant.trx` | `total="7" executed="7" passed="6" failed="1"` | `17:40:25.16+02:00` | `2026-08-09 17:40:19` |
| `confirmed-restored.trx` | `total="7" executed="7" passed="7" failed="0"` | `17:41:07.11+02:00` | `2026-08-09 17:40:59` |

`executed="7"` is identical across all three. A mutation that appears to red because the run executed nothing
would show a collapsed executed count; this does not. **`WebApi.dll`'s mtime moves on every run** — 17:38:59
→ 17:40:19 → 17:40:59 — so neither the mutated nor the restored measurement was taken against a stale
assembly. `git status --short` was empty after the restore, so the tree is byte-identical to `6d5328004`.

## What this artifact does not claim

Not C5. No operator walked this; `growth.test_address_not_own` still has no admin-web mapping (recorded by
the lane's own earlier RUN.md at `artifacts/tests/a769712113160fecdaedf21458de1cbb145d0b30/RUN.md`), so an
admin who hits this refusal in the product today sees the generic error. The pin is that the platform
refuses; the surfacing of that refusal is somebody else's lane.
