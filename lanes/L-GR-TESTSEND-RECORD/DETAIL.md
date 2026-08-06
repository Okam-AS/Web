# L-GR-TESTSEND-RECORD — blocked, with the table specified

Verdict: **blocked**. A test-send record needs schema, and this branch may not author it.
Nothing was built, nothing committed, no container started, no migration authored.

---

## 1. The brief's premise is false: there is no `GrowthAuditEvent`

The brief says Growth "already has an append-only audit event (`GrowthAuditEvent`) used by admin,
statement and reconciliation mutations, which stamps the actor and refuses a blank — an independent
review established that."

It does not exist, and never has:

- `git log --all -S "GrowthAuditEvent"` returns nothing.
- A per-branch `git grep` across every local branch (~400 refs) returns nothing.
- `Entities/Growth/` holds 19 entities; none is an audit event.
- `Helpers/ApplicationDbContext.cs` declares `WorkforceAuditEvents`, `MealsAuditEvents`,
  `TrainingAuditEvents` — and no Growth equivalent.

The sentence in the brief is a near-verbatim copy of `docs/plan/plan.md:2411`, which is the **Meals**
review finding (`docs/plan/reviews/L-MEALS-REVIEW.md:82`) about `MealsAuditEvent`. It was
misattributed to Growth when the brief was written. **Growth is the one module of the four with no
audit ledger at all.**

## 2. No existing Growth table can carry the record

Every actor-bearing column in the whole module (`grep` over all 19 entities):

| Column | Why it cannot host a test-send |
| --- | --- |
| `GrowthNewsletter.CreatedByUserId` | Set once at envelope create. Names the creator forever. |
| `GrowthNewsletterVersion.CreatedByUserId` | Author of an **immutable** version; overwriting it is a C1 violation. A test-send appends no version — and appending one would invalidate any approval (spec §3 invariant 8). |
| `GrowthNewsletterApproval.ApproverUserId` | Writing here creates a **LIVE approval**, which green-lights dispatch to the whole audience. Catastrophic. |
| `GrowthNewsletterApproval.InvalidatedByUserId` | Paired with `InvalidatedAt`; revokes an approval. |

The three append-only Growth ledgers, and why each is the wrong home:

- **`GrowthConsentCheckReceipt`** — one row per `IGrowthConsentGate` evaluation. Has no actor column
  and no newsletter column, so it cannot satisfy the exit criterion even if written to. Worse,
  producing one means running the consent gate on the administrator's own address, which resolves or
  creates a `GrowthContactPoint` for them — enrolling the admin as a marketing contact. The guard lane
  explicitly and correctly rejected consented-contact semantics for this route.
- **`GrowthProviderEventReceipt`** — the *inbound* signed-webhook inbox, deduped on
  `(ProviderAccountId, ProviderEventId)`. No actor, no newsletter, and an outbound submission has no
  provider event id at send time.
- **`GrowthConsentReceipt` / `GrowthConsentTextVersion`** — consent artifacts, contact-keyed.

`GrowthSendIntent` is decisive on its own: `DispatchRunId` is a non-nullable FK to `GrowthDispatchRun`,
whose `NewsletterVersionId` is **UNIQUE**. Fabricating a run for a test-send would permanently consume
that version's one and only dispatch run and block the real send. `ContactPointId` is non-nullable too.

`GrowthTimelineProjector` — the module's one audit read surface — is keyed on `ContactPointId`. A
test-send has no contact point, so it cannot appear there either.

**Conclusion: a new table. Proven by enumeration, not assumed.**

## 3. Why this branch may not author it — C2, verified against the refs

| Branch | SHA | Migration tail |
| --- | --- | --- |
| `feature/restaurant-modules` | `de1e5c5e` | `20260731220005_Workforce_IdentityCodeRegisterIssues` |
| `lane/gr-testsend-guard` (my base) | `5719fc96` | `20260731220005_Workforce_IdentityCodeRegisterIssues` |
| `lane/margin-waste` | `afcfddbc` | `20260801132512_Margin_WasteEntries` (MIG-23) |
| `lane/wf-w5-timesheet` | `9e82b286` | `20260801174639_Workforce_W5_Timesheets` (MIG-24) |

`git merge-base --is-ancestor feature/restaurant-modules lane/wf-w5-timesheet` → **NO**.

My base is **five migrations behind the true chain tip**
(`Margin_PeriodStatementFinalizedImmutable`, `Workforce_PublicationReceiptUniqueness`,
`Training_W3_ChecklistsAndDeviations`, `Margin_WasteEntries`, `Workforce_W5_Timesheets`).

A migration authored here gets a Designer parent of `20260731220005_…`, which is not the chain tip —
the literal text of C2's `violated_when`. This is also exactly what the plan's own open blocker flags
already say: **F-MIG-CHAIN-STACKED** ("a third author who lands a migration believing the chain tip is
the branch tip will produce two migrations sharing a parent") and **F-DETACHED-MIGRATIONS**.

THROW numbers, scanned across every branch's `Migrations/`: highest claimed is **50073**
(50060/50061 Margin, 50062 `MarginWasteEntries`, 50070–50073 Workforce W5). On my base only 50060 is
visible, so a naive author here picks 50061 and collides with Margin. Next genuinely free: **50074**.

Independently: the append-only trigger cannot be proven without a SQL container slot, which this lane
was not granted.

## 4. What the table needs — for whoever holds the migration slot

Proposed `GrowthNewsletterTestSend` (or the first event kind of a general `GrowthAuditEvent`, if the
module is finally given the ledger the other three have — see §5).

| Column | Type | Note |
| --- | --- | --- |
| `Id` | `bigint` identity, **or** `Guid` `ValueGeneratedNever` | Decides the trigger kind. Growth's own `GrowthProviderEventReceipt` uses `bigint` + an `INSTEAD OF UPDATE, DELETE` trigger; Workforce/Meals/Training use app-assigned `Guid` + an `AFTER` trigger precisely so inserts need no `OUTPUT` clause. Pick one deliberately. |
| `StoreId` | `int` | By value, no FK (isolation law). |
| `NewsletterVersionId` | `bigint` FK | The **version**, not the newsletter. A test-send sends the current version; naming only `NewsletterId` goes stale the moment an edit appends a new one, and the version is immutable so the record stays truthful. |
| `ActorUserId` | `nvarchar` NOT NULL | By value, no FK to `AspNetUsers` — the precedent of all three existing Growth actor columns. `RequireAttributed(userId)` already refuses a blank upstream. |
| `SentAt` | `DateTimeOffset` NOT NULL | Growth uses `DateTimeOffset` throughout. |
| `ProviderClientKey` | `nvarchar` NOT NULL, **NOT UNIQUE** | See the trap below. |

**No address column.** C7's live instruction plus spec §8 GRW-PII-001: the address is derivable from
the actor's account, and a copy here is a second place `GrowthPrivacyRequest` / `GrowthErasureShred`
must find and shred. Growth persists addresses only in the keyed `GrowthContactPoint` via
`GrowthAddressProtector`.

Indexes: `(StoreId, SentAt)` for the read, `(NewsletterVersionId)` for the join. Both need the
migration in the same diff (C2).

**The trap.** The client key is deterministic:
`"growth-test-" + ShortHash(version.Id + "|" + address.ToLowerInvariant())`. A UNIQUE index on it —
the obvious instinct, since it *is* the provider idempotency key — would silently drop the **second**
test-send of the same version by the same admin, and the exit criterion says *every* test-send is
recorded. One row per attempt; the key is correlation only.

**Write ordering.** Save the row **before** `_mailProvider.SubmitAsync`, for the same reason the guard
lane put `RequireAttributed` before the submission: mail is the irreversible act, so no mail may leave
without a row naming who caused it. A row written afterwards loses every attempt the provider rejected
— which is the half an inspector asks about.

**Consequence of append-only (C1).** The row therefore records the *attempt*, not the outcome: there
is no `Accepted`/`AcceptedAt` column, because filling one in after the submission returns is a mutation
of an append-only row. That is the correct trade and it should be written down, not discovered.

**Reachability (C3).** A row nobody can read is not an audit. The read surface lands in the same
change; the natural home is `GrowthNewsletterDetailResponse`, since `GrowthTimelineProjector` is
contact-keyed and unusable here.

### Test pins the exit criterion requires

1. A successful test-send writes exactly one row naming actor, version and time.
2. **Each refusal path writes none** — the brief's named live trap. There are five, in the order the
   code refuses them: unattributed actor (`RequireAttributed`), missing `TestAddress`, cross-tenant
   404 (`LoadOwnedNewsletterAsync`), not-own-address 403, and the phone-signup admin whose account
   holds no `Email` at all.
3. Two test-sends of the same version by the same admin write **two** rows (proves the deterministic
   client key was not made unique).
4. `GuardAppendOnly` reds on UPDATE and DELETE at layer 1; the trigger reds the same at the SQL tier
   (**needs the container slot**).

Non-vacuity mutations: delete the record write → pin 1 reds; move the write above `RequireAttributed`
→ pin 2 reds. Both must be run and shown, restored with `cp`/`touch` (the stale-build trap in
`CLAUDE.md`).

## 5. The decision worth an ID

Growth is the only one of the four modules with no append-only audit ledger. A narrow
`GrowthNewsletterTestSend` costs one migration now and a second one later, because the same
"somebody will be asked about this" shape is already open elsewhere in Growth — approval
invalidation, consent-text publication, provider-account binding, suppression lifts. A general
`GrowthAuditEvent` on the Workforce/Meals/Training pattern costs one migration total and one THROW
number.

That is a design ruling, not a lane's call: **`+D-GROWTH-AUDIT-LEDGER`**.

## 6. State left behind

- `lane/gr-testsend-guard` @ `5719fc96` — untouched, not weakened, nothing added.
- No commits, no migration, no container, no push.
