# L-ACK-RECEIPT-SURVIVES-A-RELOAD — what the worker-side read must carry, and what already carries it

## Provenance of every claim below

| | |
|---|---|
| backend ref | **`8e2b57de`** — the tip of local branch **`feature/restaurant-modules`** in `/Users/svendaneel/okam/OkamAPI-modules` (`git rev-parse feature/restaurant-modules` = `8e2b57de8442a389a9b5f8025312c9750614c85e`). |
| how it was read | **every** backend line below via `git show 8e2b57de:<path>`. The checkout's working tree sits on `lane/meals-grace-pins` with four untracked paths; **it was never read.** |
| frontend ref | `candidate/fe-compose-2026-08-05` in `/Users/svendaneel/okam/Web-modules`, read via `git show`. That repo's HEAD is `lane/focustrap-teardown`, which does not carry the worker surface; it was not read either. The predecessor lane's fix commit `8539b3f` sits on the unpushed `lane/wf-acknowledge-receipt-visible` and **changed no wire contract**, so the client shapes quoted here are the same before and after it. |
| class | analysis. **No fix, no suite, no container, no migration.** Nothing was written outside this lane directory. |

---

## 1. The short answer

**The acknowledgement is already durable — it is persisted twice, on every confirm, today.** What does not
exist is any *read* a worker can reach that returns it. The lost-on-reload receipt is not a missing write.
It is a projection that stops one column short.

**No existing endpoint carries it in a form the worker surface can use.** Three come close and each fails
for a different reason; §3 gives the trace.

---

## 2. What actually happens when a worker presses *Bekreft mottatt*

`WorkforceSelfService.AcknowledgePublicationAsync` (`Services/Workforce/WorkforceSelfService.cs:311`) writes
the acknowledgement to **two different tables with two different natures**:

| | store | statement | nature |
|---|---|---|---|
| **W1** | `WorkforceSchedulePublicationReceipts` | `.Add(new WorkforceSchedulePublicationReceipt{…})` — `:360` | **a new row.** `ReceiptType = "Acknowledged"`, `OccurredAtUtc`, `CreatedAtUtc`. |
| **W2** | `WorkforceSchedulePublicationRecipients.AcknowledgedAtUtc` | `recipient.AcknowledgedAtUtc = now` — `:375`, set-if-null | **an in-place UPDATE** of an existing row. The same block also sets `SeenAtUtc` if null (`:378`, *"acknowledging implies seen"*). |

W2's side effect is the precise mechanism the predecessor lane diagnosed: the confirm makes the row come
back `isRead: true`, which dropped it out of the unread feed and took the receipt line with it.

### The one-column gap

`GetInboxAsync` (`:187`) already loads the recipient row that holds the answer:

```
:216   : (await _context.WorkforceSchedulePublicationRecipients.AsNoTracking()
:217         .Where(r => pubIds.Contains(r.SchedulePublicationId) && staffIds.Contains(r.StaffMemberId))
:218         .Select(r => new { r.SchedulePublicationId, r.StaffMemberId, r.SeenAtUtc })
```

`AcknowledgedAtUtc` is a column **on the row line 218 is already reading**, in the query the inbox already
runs, keyed by the pair the inbox already keys on. It is projected away, and the model has nowhere to put it:
`WorkforceInboxItemModel` (`Models/Workforce/WorkforceSelfServiceModels.cs:73-85`) carries `IsRead` and
`ReadAtUtc` and no third state. `IsRead = seen.HasValue` at `:240`.

That is the whole defect at the wire: **one column selected, one field on a DTO.** The estate's warning to
look before concluding is earned here — nothing needs to be re-derived, stored, or migrated for the *value*
to exist. Only for it to be *read*.

---

## 3. Does any existing endpoint already carry it?

**No.** Every candidate, traced:

### 3a. `POST /workforce/me/publications/{publicationId}/acknowledgements` (#44) — carries the value, and must not be used as a read

`Controllers/WorkforceMeController.cs:193`. It **is** idempotent, and for a worker who already confirmed it
returns the *original* instant with `AlreadyAcknowledged = true` (`WorkforceSelfService.cs:338-356`). A page
could technically call it on load and get the receipt back.

**It would manufacture the evidence it claims to read.** For a worker who has *not* confirmed, the identical
call takes the other branch and **creates** the acknowledgement (`:360`). A reload would therefore confirm
the week on behalf of someone who only opened the page — and that row cannot be withdrawn, because the table
is append-only in `GuardAppendOnly` and the EF guard refuses the DELETE (§5). It also requires an
`Idempotency-Key` (`WorkforceMeController.cs:197`) and writes a `WorkforceIdempotencyRecord` per call.
**Disqualified — this is a write wearing a read's answer.**

### 3b. `GET /workforce/stores/{storeId}/schedules/publications/{publicationId}/recipients` (#22) — carries it, and the worker cannot have it

`Controllers/WorkforceSchedulesController.cs:219` → `WorkforceSchedulePublishService.GetRecipientsAsync:465`.
It is a true GET and `WorkforcePublicationRecipientModel` carries `AcknowledgedAtUtc`
(`Models/Workforce/WorkforcePublicationModels.cs:63`). Disqualified twice:

1. **Capability.** `:468` — `RequireCapabilityAsync(…, WorkforceCapability.WorkforceManager, …)`. A worker
   holds `WorkforceSelf`, not `WorkforceManager`.
2. **Disclosure.** It returns every recipient's `StaffDisplayName` and `ClaimedByApplicationUserId`
   (`:489-490`). Spec §5.2 says the worker shell "**Never** exposes coworker private facts"
   (`docs/plans/modules/10-workforce-spec.md:327`) and §13.4 repeats it (`:503`).

This is the exact asymmetry the product already admits to the worker on screen: `wfme_pub_lede` reads
*"Du har ikke åpnet denne ennå. **Lederen ser hvem som har lest.**"* The manager's read carries the
acknowledgement state; the worker's read of their own act does not.

### 3c. `GET /me/inbox` (#34) and `GET /me/schedule` (#33) — reachable, correctly scoped, carry nothing

#34 is §2 above. #33's `WorkforceMeScheduleItem` (`WorkforceSelfServiceModels.cs:42-63`) carries publication
provenance — `PublicationId`, `PublicationNumber`, `PublishedAtUtc` — and no receipt field.

### 3d. Nobody reads the receipts table at all

Swept: `git grep -n "WorkforceSchedulePublicationReceipts" 8e2b57de -- '*.cs'`, excluding `Migrations/` and
`WebApi.Tests/`, returns exactly three hits — the `DbSet` (`Helpers/ApplicationDbContext.cs:165`) and the two
statements inside the write itself (`WorkforceSelfService.cs:338` the idempotency re-check, `:360` the
insert). **The append-only acknowledgement receipt is written by one code path and read back by no endpoint
on any surface, worker or manager.** The manager's #22 does not read it either — it reads the mutable
recipient column.

A parallel sweep for `AcknowledgedAtUtc` across non-test, non-migration `.cs` confirms there is no fourth
carrier anywhere in Workforce.

---

## 4. What the read would have to return

Fixed by what the surface actually consumes —
`components/admin/workforce-me/WorkforcePublicationNotice.vue:75-79`:

```
receiptLabel (receipt) {
  const time = this.formatInstant(receipt.occurredAtUtc)
  return receipt.alreadyAcknowledged ? $i('wfme_pub_receipt_already', {time}) : $i('wfme_pub_receipt_new', {time})
}
```

and the `receipts` prop keyed by `schedulePublicationId` (`:17`, `:67`).

**Required — the whole of it:**

1. **A nullable acknowledgement instant, per publication.** UTC, rendered local. Null means *not
   acknowledged*, and must be distinguishable from *not loaded* — the surface's existing `inbox-filter.js`
   already treats `null` as "not loaded" for the item list, so the field must be absent-vs-null-clean.
2. **Correlated by `schedulePublicationId`** — which the inbox row already carries
   (`WorkforceInboxItemModel.SchedulePublicationId`, nullable). **No new correlation key is needed.**

**Explicitly not required:**

3. **`alreadyAcknowledged` does not survive the move to a GET.** On the POST it means *this call was not the
   one that created the row*. On a read every row returned is by construction "already", so the flag is
   degenerate. The surface today picks between `wfme_pub_receipt_already` and `wfme_pub_receipt_new` on it;
   after a reload there is no "new". That is one **string decision for the surface** — it is not a field the
   read should invent.
4. **No `receiptId`, no `receiptType`, no actor.** The worker is the actor; §13.4 forbids more.

**Minimum viable shape:** one nullable `DateTime?` on `WorkforceInboxItemModel`. Everything else the render
needs, it already has.

There is **no wire fixture** for the inbox or the acknowledgement — `docs/api/fixtures/workforce/manifest.json`
has no entry matching `inbox|acknowledg|publication` — so no fixture blocks a new field and none would need
regenerating.

---

## 5. The three contracts, costed — and the C1 verdict on each

### C1 first, because it decides what is legal at all

**None of the three contracts writes anything.** The acknowledgement write already happens today, inside #44,
unchanged by any of them. All three are read-side only, so **C1 rules none of them out** — no contract here
contains an UPDATE or a DELETE against a guarded table, and none mutates a guarded entity outside its
documented append path.

What C1 *does* decide is **which of the two stores a read is entitled to present as evidence**, and the two
are not equal:

| store | guarded? | evidence |
|---|---|---|
| `WorkforceSchedulePublicationReceipts` | **Append-only, layer 1.** `GuardAppendOnly` throws on Modified/Deleted — `Helpers/ApplicationDbContext.cs:1422-1429`. Each confirm is a **new row**. | ⚠️ **Layer 2 does not exist.** The guard's own comment (`:1419-1421`) says the AFTER UPDATE/DELETE trigger is owed as **MIG-14**, spec'd at `docs/plans/PENDING-MIGRATIONS-LEDGER.md:270-285` (`TR_WorkforceSchedulePublicationReceipts_AppendOnly`, THROW 50019). **"today a DBA session can still rewrite these rows."** |
| `WorkforceSchedulePublicationRecipients.AcknowledgedAtUtc` | **Deliberately not guarded.** `ApplicationDbContext.cs:1400`: *"The recipients hanging off a publication are deliberately NOT here: they run a delivery/seen/acknowledged state machine."* Each confirm is an **in-place UPDATE** (`WorkforceSelfService.cs:375`). | No guard, no trigger. It is a state machine's current value, not a record of an act. |

So: an inspector asking *"prove this worker confirmed"* is answered by the **receipt row**. A read that
projects the recipient column shows the worker a *derived copy* of the evidence, not the evidence.

### The table

| | contract | reads | write | cost | C1 |
|---|---|---|---|---|---|
| **A** | `acknowledgedAtUtc` on the existing inbox row | the recipient column — on the row `WorkforceSelfService.cs:218` **already loads** | none | **Cheapest by a wide margin.** One column added to an existing `.Select`, one nullable field on `WorkforceInboxItemModel`, one field on the client's inbox mapping. **Zero** new routes, zero DI, zero controller, zero migration, zero fixture. **C3-free** — it rides an endpoint already wired end to end, so there is no reachability gap to close. | Legal. Reads the **mutable** copy. |
| **B** | a GET sibling to #44 | the receipts table, by natural key | none | New action on `WorkforceMeController` + new `IWorkforceSelfService` method + a spec endpoint number (§5.2's table **ends at 44**; 45 is already the POS clock endpoint, `10-workforce-spec.md:280-300`). **C3 applies**: route + service + a caller on the worker surface must land together. One round trip per publication unless it is defined to take the set. | Legal. Reads the **append-only** copy. |
| **C** | a separate `/me/receipts` collection | the receipts table, all `ReceiptType`s | none | Most expensive — new route, new model, new client method, new spec entry, and a pagination/window decision. **Only contract that can also surface `ReceiptType = "Seen"`**, and the only one whose lifetime is independent of the inbox row (a superseded publication's receipt survives an inbox row that goes away). C3 as B. | Legal. Reads the **append-only** copy. |

### The inversion that decides the cost, and is easy to miss

**B and C carry a dependency A does not: MIG-21.**

`WorkforceSchedulePublicationReceipts` has **no unique index on its natural key.** The initial migration
(`Migrations/20260727221455_RestaurantModules_Initial.cs:3868-3876`) creates only two **non-unique** indexes,
`(StoreId, SchedulePublicationId)` and `(StoreId, StaffMemberId)`. Two acknowledgements in flight with
*different* idempotency keys both pass the `(Scope, Key)` unique index, both read "no receipt" at `:338`, and
both insert. `WebApi.Tests/Workforce/PublicationAcknowledgementRaceSqlServerTests.cs` is written for exactly
this race and carries `[Trait("PendingMigration", "MIG-21")]` — **expected-red until the filtered unique index
lands**. Its own summary: *"a reader counting acknowledgements counts two people where there is one."*
A read over the receipts table must therefore tolerate duplicates or wait for MIG-21.

The recipient column **cannot** duplicate: `IX_WorkforceSchedulePublicationRecipients_SchedulePublicationId_StaffMemberId`
is created `unique: true` in the same migration (`:3878-3882`).

> **The cheap contract reads the mutable store that is correctly indexed. The evidence-grade contracts read
> the append-only store that is not.** That is the trade, stated plainly, and it is the opposite of the
> ordering one would guess.

---

## 6. The question the choice actually turns on — not taken here

> **Is the worker-side receipt a UI state, or is it the worker's own copy of evidence?**

- **UI state** — the worker needs to see that the button they pressed took effect, and the manager's #22
  remains the record. → **A.** Nearly free, no migration, no new surface, ships inside the existing endpoint.
- **Evidence** — the worker is entitled to re-read the record an inspector would be shown. → **B or C**, and
  then **MIG-21 comes first** (or the read must de-duplicate), and **MIG-14 should come with it**, because a
  worker-facing read of a table a DBA can silently rewrite is the RF-1313 shape again: a surface asserting a
  control the database does not enforce.

Both migrations are already specified and owed to the migration author. **Neither is authored here (C2).**

---

## 7. Scoping correction, so a later lane does not inherit an obligation this row does not have

The brief frames this as *"a personalliste surface"*. **The publication acknowledgement is not a personalliste
record.** The bokføringsforskriften § 8-5-6 artifact is produced from `WorkforcePersonnelListEntry`,
`WorkforcePersonnelListParticipant` and `WorkforcePersonnelPresenceEvent` — three separate tables that each
declare `GuardAppendOnly` in their own entity docs. `WorkforceSchedulePublicationReceipt` is spec §3.3
evidence, described in the spec and in its own entity doc as *"informational … **never** legal acceptance"*
(`Entities/Workforce/WorkforceSchedulePublicationReceipt.cs:5-10`).

This is a scoping note, **not a contradiction of the brief** — the brief's point (a worker surface that cannot
re-read its own confirmation is weak evidence) stands. But **C6 bites the moment a UI string calls this row
personalliste evidence**, because the § 8-5-6 artifact is produced from a different table. The worker surface
carries no § reference today (`translations/no.ts:2647-2657`); its only legal-adjacent string is the correct
disclaimer, `wfme_pub_disclaimer` — *"Bekreftelsen er en kvittering på at du har sett planen. Den er ikke en
godkjenning av vaktene."* Whichever contract is chosen must preserve that string, unchanged.

---

## 8. Constraints

- **C1** — §5. No contract described writes anything; all three are read-side. The distinction that matters is
  *which store is read*: `…Receipts` = **new row per confirm**, append-only (layer 1 only, MIG-14 owed);
  `…Recipients.AcknowledgedAtUtc` = **UPDATE of an existing row**, deliberately unguarded. Stated per contract
  in the table.
- **C2** — no migration authored, no snapshot touched. MIG-14 and MIG-21 are **named as owed**, with their
  ledger locations, for the single migration author.
- **C3** — A needs no new wire (this is why it is cheap). **B and C do**: service method + controller action +
  DI is already satisfied via `IWorkforceSelfService`, but the frontend caller must land in the same change or
  the endpoint is another unreachable capability.
- **C4** — not a money path. The existing ack write already names its actor: `engagement.StaffMemberId` is the
  idempotency scope's actor (`WorkforceSelfService.cs:329`) and is the receipt's `StaffMemberId`.
- **C5** — **this is analysis, not acceptance.** No suite was run, no browser was opened. Nothing here is
  evidence that a capability exists; it is a trace of what the code does.
- **C6** — §7. No statutory claim added, and the existing disclaimer must survive.
- **C7** — no logging proposed, no secret read or written.
