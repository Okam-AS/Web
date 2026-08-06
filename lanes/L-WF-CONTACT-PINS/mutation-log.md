# L-WF-CONTACT-PINS — mutation log

Every pin below was **watched**: mutation applied, suite run, red observed, mutation restored, suite
run, green observed. A pin whose failure I did not see is not recorded as a pin.

Branches (local, not pushed):

- backend `lane/wf-contact-imported` — `833fd2f1` → **`0b28f601`** (worktree `OkamAPI-wfcontact`)
- frontend `lane/fe-wf-contact-imported` — `61b053b` → **`3583b9f`** (worktree `web-wf-contact`)

Stale-assembly rule observed throughout: every mutation and every restore was followed by a real
`dotnet build` (non-trivial elapsed time) before any `--no-build` run, and the built
`WebApi.dll` / `WebApi.Tests.dll` mtimes were checked. No container was started; no foreign container
was touched. No migration authored. Tier used: `--filter "Database!=SqlServer"` only.

---

## M-T1 — the tenancy line (item 1). **The important one.**

**Subject.** `Services/Workforce/WorkforceStaffService.cs:405`, the staff lookup inside
`UpdatePersonContactAsync`:

```csharp
.FirstOrDefaultAsync(s => s.StoreId == storeId && s.StaffMemberId == staffMemberId, ct);
```

That predicate is the entire tenancy boundary of a route that writes a **chain-wide**
`WorkforcePerson`. The engagement is only the caller's proof of access; the row written is shared by
every venue that person works in.

**Mutation.** `s.StoreId == storeId &&` deleted, leaving `s => s.StaffMemberId == staffMemberId`.

### Step 1 — the counterfactual, run first

The mutation applied, with the lane's tests **exactly as they were at `833fd2f1`** (both test files
reverted with `git checkout --`, the mutation left in place, full rebuild):

| Tier | Result with the tenancy boundary DELETED |
| --- | --- |
| wire (`FullyQualifiedName~WebApi.Tests.Wire`) | `Failed: 0, Passed: 205, Skipped: 2` — **green** |
| whole container-free tier (`Database!=SqlServer`) | `Failed: 0, Passed: 4376, Skipped: 12` — **green** |

**4376 tests could not see the tenancy boundary of a chain-wide write disappear.** The reviewer's
claim is confirmed empirically, and it is wider than the reviewer stated: not only every wire test,
every test in the tier.

Why nothing saw it: the positive tests all target store A, and the one negative test uses `AdminB`,
who holds **no engagement anywhere** and therefore dies at the capability gate in
`RequireWriteCapabilityAsync` — several lines before any lookup runs. A gate refusal and a lookup
refusal are different lines. Only a caller who *passes* the gate can observe the second.

### Step 2 — the world the pin needed

`WebApi.Tests/Wire/WireHostFixture.cs` gains `ManagerB`: a new login (`wire-manager-b`), an
`ApplicationUser` row, a `Claimed` `WorkforcePerson`, and an active engagement in **StoreB** with the
same grant set as StoreA's (`Self | Scheduler | Manager`), so a cross-store refusal can never be the
caller simply holding less.

Three deliberate choices, each recorded in the fixture:

- **A new login, not `AdminB`.** `WorkforceWireTests` and `WorkforceContactWireTests` both assert
  that `AdminB` holds no engagement anywhere; `WorkforceWireTests` asserts `AdminA` is refused at
  StoreB. Reusing either would have made an existing pin's stated reason false.
- **Not a `StoreAdmin` of StoreB.** Workforce resolves capability from the engagement and from
  nothing else; adding the platform row would suggest it contributes.
- **StoreB's `workforce.module` gate now opens** via the grandfather probe (`has an engagement`).
  That is intended and changes no existing answer: every existing StoreB assertion is made by a
  caller who fails the capability check first, which runs *before* the module gate.

### Step 3 — the pin

`WorkforceContactWireTests.A_manager_of_another_store_cannot_reach_this_stores_person_through_their_own_route`.
Store A's manager writes a contact; store B's manager then PATCHes
`/workforce/stores/{StoreB}/staff/{storeA-staffId}/person/contact`. Asserted:

1. `404` **and** `application/problem+json` **and** `code == "workforce.not-found"` read out of the
   **body**. Status alone is not enough — a 401 challenge and an unregistered route answer
   identically and never reach the module. The body's module code also discriminates the refusal from
   the 403 `workforce.forbidden` a caller who failed the gate would collect, which is what proves
   this caller got *past* the gate.
2. Store A's stored contact is **untouched**, re-read through store A's own route.
3. A positive control on the same caller: `GET /workforce/stores/{StoreB}/staff/{ManagerBStaffMemberId}`
   answers `200`, so the 404 above is not a ManagerB who can reach nothing anywhere.

### Step 4 — red / restore / green

| Run | Result |
| --- | --- |
| mutation applied, wire tier | **2 failed** / 206 |
| — `A_manager_of_another_store_cannot_reach_this_stores_person_through_their_own_route` | `Assert.Equal() Failure — Expected: NotFound, Actual: OK` |
| — `The_ledger_names_the_manager_who_changed_the_contact_and_never_the_contact_itself` | `Assert.All() Failure: 1 out of 4 items` — the cross-store write landed an audit row whose actor is `…005` (ManagerB) where `…001` (AdminA) was expected |
| mutation restored (`cp` of the pre-mutation copy), rebuilt, wire tier | `Failed: 0, Passed: 206, Skipped: 2` |
| mutation restored, whole container-free tier | `Failed: 0, Passed: 4377, Skipped: 12` |

The second red is a bonus the fixture row bought: with a second store's manager in the world, the
ledger test's `Assert.All` over *every* `person.contact.update` row becomes a second, independent
witness of the same boundary.

`4377` vs the baseline `4376` is the one new test.

---

## M-T3 — the audit value, pinned by shape not by two characters (item 3)

**Subject.** `WebApi.Tests/Wire/WorkforceContactWireTests.cs`, inside
`The_ledger_names_the_manager…`'s `Assert.All`. Before:

```csharp
Assert.Contains("contactChannels", written.SemanticDeltaJson, StringComparison.Ordinal);
Assert.DoesNotContain("@", written.SemanticDeltaJson, StringComparison.Ordinal);
Assert.DoesNotContain("+", written.SemanticDeltaJson, StringComparison.Ordinal);
```

After — the value parsed out of the delta JSON and pinned by shape:

```csharp
using var delta = JsonDocument.Parse(written.SemanticDeltaJson);
var channels = delta.RootElement.GetProperty("contactChannels").GetString();
Assert.Matches(@"^email:(set|cleared|unchanged),phone:(set|cleared|unchanged)$", channels);
```

`GetProperty` throwing on an absent key subsumes the old `Assert.Contains`, so nothing is lost.

**Mutation.** The delta made to carry the phone value with its `+` stripped — a number written the
way a great many people write one:

```csharp
+ ",phone:" + (phone == null ? "cleared" : phone.Replace("+", "")),
```

| Run | Result |
| --- | --- |
| mutation applied, **new** shape assertion, wire tier | **1 failed** — `Assert.Matches() Failure / Regex: ^email:(set\|cleared\|unchanged),phone:(set\|cleared\|unchanged)$ / Value: email:set,phone:4740000777` |
| mutation applied, **old** two-character assertion restored in its place | `Failed: 0, Passed: 8` — **the pre-lane assertion is green while a live phone number sits in the immutable ledger** |
| both restored, wire tier | `Failed: 0, Passed: 206` |

That middle row is the whole item: `DoesNotContain("@")` + `DoesNotContain("+")` reads like a privacy
assertion and permits exactly the leak it names.

---

## M-F2 — the refill watcher (item 2)

**Subject.** `components/admin/workforce/WorkforceEngagementPanel.vue`, the `detail` watcher.

**Mutation.** The two draft-contact refill lines deleted, leaving only the payroll number:

```js
detail (value) {
  this.draftPayrollNumber = value ? (value.payrollNumber || '') : '';
  // this.draftContactEmail = ...   DELETED
  // this.draftContactPhone = ...   DELETED
}
```

**Why nothing saw it.** Every panel test mounts with `detail` already present, so `data()`'s
initialisers cover the boxes and the watcher is never the thing that fills them. Nothing drove the
**null → loaded** transition the page actually performs: the page mounts the panel the instant a row
is selected and the detail read answers afterwards.

**What the regression is.** With the refill gone the boxes sit blank over a stored address, the save
reads as "clear both channels", and one click withdraws a person's contact details **chain-wide** —
which is what the watcher's own comment warns of.

**The pin.** `fills the boxes when the detail read answers after the panel is already open` — mounts
with `detail: null`, `await panel.setProps({ detail: detailOf({ contactEmail: 'x@y.no', contactPhone:
'+4740000123' }) })`, then asserts both input values **and** that `save-contact` is **disabled**. The
disabled assertion is what makes this a data-loss pin rather than a cosmetic one: a blank box over a
stored value reads as a pending clear.

| Run | Result |
| --- | --- |
| mutation applied, contact test file | 1 failed / 14 — `Expected: "x@y.no", Received: ""` at the email input |
| mutation applied, **whole** jest suite | `Tests: 2 failed, 2493 passed, 2495 total` — the 2 are **this new pin** and the pre-existing `journey-artifact-store.test.js`. Nothing else in 111 suites saw it. |
| mutation restored, contact test file | `Tests: 14 passed, 14 total` |

---

## M-F4 — the three-dictionary claim (item 4)

**The overstatement.** `lanes/L-WF-CONTACT-IMPORTED/DETAIL.md` line 122-123 claims all seven new keys
were "asserted defined and non-empty in `no`/`en`/`de`". Measured: the keys **do** exist in all three
files and are non-empty, but **nothing asserted it** — every assertion in the lane's tests reads
`translations.no`, and no `wfr_` parity block existed anywhere in `test/`. The claim was ahead of its
coverage.

**Chosen remedy: build the coverage, not soften the claim.** A `wfr_` parity block added to
`test/workforce-contact-imported.test.js`, shaped after the `ev_` block in
`test/events-surface.test.js` and widened from the seven keys to the **whole 148-key `wfr_` family**
(a per-lane key list is the thing that stops covering the next lane's keys):

- the family is the size the surface needs (`> 100`);
- every `wfr_` key is a **non-empty string** in `no`, `en` and `de` — non-empty as well as present,
  because a key shipped as `''` renders as a label-less input rather than a visible gap;
- neither `en` nor `de` carries a `wfr_` key `no` lacks;
- the **seven** keys this lane added are named explicitly, so the family assertions above cannot pass
  over their absence.

Measured before adding: 148 `wfr_` keys in `no`, 0 missing from `en`, 0 missing from `de`, 0 extra.
The block was green on arrival, which is why it had to be watched fail.

| Run | Result |
| --- | --- |
| `translations/de.ts` → `wfr_contact_email: ''` (single hand edit, one line, no regex, no bulk edit) | **1 failed** / 18 — `no key is missing from en or de, and none is blank or a non-string` |
| restored with `git checkout -- translations/de.ts`, byte-exact | `Tests: 18 passed, 18 total` |

I did **not** edit `lanes/L-WF-CONTACT-IMPORTED/DETAIL.md`; it is another lane's directory and the
brief offered building the coverage as the alternative to striking the claim. The claim is now true
as written. Recorded here so the fact that it was written *before* it was true is not lost.

---

## Final state

| Tier | Result |
| --- | --- |
| backend, container-free (`Database!=SqlServer`) | **4377 passed / 0 failed / 12 skipped** (baseline 4376 + 1 new wire test) |
| backend, wire only | 206 passed / 0 failed / 2 skipped |
| frontend, whole jest suite | **2498 passed / 1 failed / 111 suites** (baseline 2493 + 5 new tests) |

The one frontend failure is `test/journey-artifact-store.test.js`, which pins the checkout basename
(`expect(build.id).toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/)`, received
`web-wf-contact@61b053b…+dirty`). It reds in **any** differently-named worktree, is pre-existing, and
the brief instructs reporting it rather than chasing it.

## Housekeeping

- The wire tier dirtied `artifacts/journeys/ev-dietary/run-sheet.{json,md}` on every run, as the
  brief warned. Restored with `git checkout --` after each; never committed. Both checkouts end with
  only their committed changes.
- `node_modules` (symlink) and `core` (copy) were borrowed into `web-wf-contact` to run jest and
  removed afterwards — `core` is a submodule path and rejects a symlink (`error: expected submodule
  path 'core' not to be a symbolic link`), so it must be copied, not linked.
- Local commits by pathspec only. Nothing pushed. No `plan accept` / `plan decide` run. No file under
  `docs/plan/**` written except this lane's RETURN.
