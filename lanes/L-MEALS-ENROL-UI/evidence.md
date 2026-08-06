# L-MEALS-ENROL-UI — evidence

Brief: `de47bfd2` · verdict: **built**

**Exit criterion.** *An invitation claimed at the join page can be enrolled from the admin surface and
the eligibility read answers eligible, driven by a page test through the admin client.*

**Instrument.** `test/meals-enrolment-journey.test.js` — 6 tests, all green.
Command: `npx jest test/meals-enrolment-journey.test.js --coverage=false`

---

## 1. Tip state as actually observed (the brief said to verify, not to trust)

| claim in brief | observed | verdict |
| --- | --- | --- |
| frontend integration `3cd2570` | `3cd25709ec6af4806e4683e666f44814ff8e441a` on `feature/restaurant-modules` | **correct** |
| backend `8e2b57de` | `/Users/svendaneel/okam/wt-mealsdocsync` at `8e2b57de` (detached) | **correct** |
| the join page is fully built and wired | `pages/meals/join.vue` + `utils/meals/claim-client.js`, landed at `a3f6100` (`lane/fe-meals-claim`, merged) | **correct** |
| enrolment route deliberately unbound on a dead premise | `utils/meals/admin-client.js:48-51` at HEAD carried exactly that note | **correct** |
| the program panel renders a count and offers no control | `MealsProgramPanel.vue:59` rendered `row.enrolledMemberCount`; no control anywhere | **correct** |

Not `fail-spec`: the capability did not exist at HEAD, nor on any branch.

### Unmerged Meals branches checked (the brief asked)

`git merge-base --is-ancestor <branch> HEAD` plus a diff of each:

| branch | tip | merged into HEAD | touches enrolment |
| --- | --- | --- | --- |
| `lane/fe-meals-claim` | `a3f6100` | YES | no |
| `lane/fe-meals-write` | `8bc4155` | YES | no |
| `lane/fe-meals-claim-receipt` | `d833d19` | **no** (1 ahead) | no — adds `utils/meals/statement-reference.js` |
| `lane/meals-reachable-web` | `f65595d` | **no** (1 ahead, stale base) | no — `pages/admin/feature-flags.vue` only |

A `git grep -il enrol` across **all 57 local branches** found the string only in the same seven files
that carry it at HEAD (doc comments, the `meals_col_enrolled` label, `enrolledMemberCount`). **No
branch in the repo binds endpoint 12.**

---

## 2. Backend truth this was built against (`8e2b57de`)

- `Controllers/Meals/MealsProgramController.cs:114` — `POST v1/meals/programs/{programId:guid}/members`
- `Models/Meals/MealsProgramMemberModels.cs:13` — `SetMealsProgramMembersRequest { ExpectedVersion, MembershipIds }`;
  request is the **DESIRED** set, absent memberships become `Removed`.
- `Models/Meals/MealsProgramMemberModels.cs:23` — `MealsProgramMembersModel { ProgramId, Revision, Members[] }`;
  **the only wire in the module that names which memberships a programme enrols.**
- `Models/Meals/MealsProgramModels.cs` — `MealsProgramModel.EnrolledMemberCount` is an `int`. **No read
  returns the identities.** This asymmetry is why the UI pre-ticks nothing (see §4).
- `Services/Meals/MealsProgramService.cs:319` — `SetProgramMembersAsync`; company resolved from the
  programme, revoked membership ⇒ `meals.membership-revoked`, unknown/cross-company ⇒ opaque 404,
  revision mismatch ⇒ `meals.stale-revision` 409.
- `Services/Meals/MealsQuoteService.cs:426` — `GetContextAsync` (`GET /v1/meals/me/context?companyId=`):

```
var eligible = membership.State == Active && enrolled && withinWindow;
string reason = null;
if (membership.State == Revoked)      reason = MEALS_MEMBERSHIP_REVOKED;
else if (enrolled && !withinWindow)   reason = MEALS_INELIGIBLE_TIME_WINDOW;
```

**The finding that shapes the assertions:** a member who claimed but is enrolled nowhere gets
`eligible: false` with `ineligibleReasonCode: **null**` — no reason code at all. That is the state the
employee was stuck in, and it is asserted by value below.

---

## 3. C3 — all three limbs, and which one already existed

| limb | status | where |
| --- | --- | --- |
| client method | **added** | `MealsAdminService.SetProgramMembers` in `utils/meals/admin-client.js` |
| surface / control | **added** | enrolment section in `components/admin/meals/MealsProgramPanel.vue`, wired in `pages/admin/meals-companies.vue` |
| navigation entry | **ALREADY PRESENT — not rebuilt** | `components/organisms/AdminPageHeader.vue:379` links `/admin/meals-companies` in the `Moduler` group; pinned in `test/admin-nav-access.test.js` `STORE_ADMIN_PATHS` |

The nav limb is asserted rather than assumed — `test/meals-enrolment-journey.test.js` reads
`AdminPageHeader.vue` and the `nav-entry-removed` mutation arm reds.

---

## 4. What the instrument actually does

One in-memory Meals world served over a stubbed `global.fetch`. **The client modules are NOT mocked** —
the real `MealsClaimService` and real `MealsAdminService` run, so paths, verbs, bodies and the
`Idempotency-Key` precondition are all under test. This is deliberately unlike
`test/meals-companies-page.test.js`, which mocks `~/utils/meals/admin-client` wholesale.

The world is a transcription of the backend above, cited line by line in the file header, including
the `Idempotency-Key` 400, the revision CAS, the revoked-membership refusal and the set-replace
semantics.

**The journey, in one world:**

1. `pages/meals/join.vue` mounted as the employee → type the token into `[data-test="code-input"]` →
   submit → click `[data-test="claim-button"]`. Membership `Active`, invitation `Claimed`.
2. `GET /v1/meals/me/context` as the employee → **`status 200`**, `eligible: false`,
   `ineligibleReasonCode: null`, `allowanceMinor: 12000`.
3. `pages/admin/meals-companies.vue` mounted as the company admin → click the company row → click the
   programme row → tick `[data-test="enrol-member-<id>"]` → submit `[data-test="enrol-submit"]`.
   Observed request: `POST /v1/meals/programs/<PROGRAM>/members`, status 200,
   `Idempotency-Key` present, `expectedVersion: 'r-prog-1'` (the **programme's** revision, from the
   read), `membershipIds: [<EMPLOYEE_MEMBERSHIP>]`.
4. The **same** route, **same** world, as the **same** employee → **`status 200`**, `eligible: **true**`,
   `ineligibleReasonCode: null`, `programId` = the programme, `remainingAllowanceMinor: 12000`.

**Non-vacuity, as the brief required:**

- *The opposite in the same world.* Test 2 enrols one colleague and leaves another out of the same
  submission; the left-out colleague reads `eligible: false` from the same route.
- *By value, not non-emptiness.* Every assertion is an exact value (`true`/`false`, `null`, `12000`,
  `'r-prog-1'`, the id array), never `toBeTruthy` or a length check.
- *Out of the response body, never a status code.* Every eligibility assertion reads
  `response.text()` → `JSON.parse` → the field. Step 2 and step 4 are **both 200**; the status alone
  cannot tell them apart, which is the point.
- *A read hard-wired to say yes cannot produce the sequence* — proved by the
  `world-eligible-for-everybody` mutation arm below.

Two further tests pin the two behaviours a reviewer would ask about: a submission that omits an
already-enrolled member **un-enrols** them (the set-replace hazard, which is why nothing is pre-ticked),
and a revoked membership is rendered-but-disabled and never sent.

### A defect this instrument caught in itself

The first run failed 1/6. `readEligibility(userId)` took the user id as decoration and read as
whichever actor the last page left behind, so a `not eligible` assertion passed while answering about
the **admin** — who is enrolled in nothing either. Fixed: the helper now sets the actor. This is
recorded because it is the exact failure shape the lane exists to prevent, appearing inside the test.

---

## 5. Mutation proof — `lanes/L-MEALS-ENROL-UI/mutation-proof.py`

Full output: `lanes/L-MEALS-ENROL-UI/mutation-proof.txt`. Script exits 0 only when every arm matches.

```
baseline                       expected=green observed=green OK
page-handler-unbound           expected=red   observed=red   OK
panel-submit-unbound           expected=red   observed=red   OK
client-method-deleted          expected=red   observed=red   OK
client-route-company-scoped    expected=red   observed=red   OK
nav-entry-removed              expected=red   observed=red   OK
world-eligible-for-everybody   expected=red   observed=red   OK
world-enrolment-is-a-noop      expected=red   observed=red   OK
```

The two that carry the weight:

- **`page-handler-unbound`** — deletes `@set-program-members="setProgramMembers"` from
  `pages/admin/meals-companies.vue`. **Reds 4 tests.** The sibling failure the brief warned about
  (unbinding a handler reds nothing because the page test calls the handler directly) does not apply:
  this test never calls `setProgramMembers`; it clicks the button.
- **`world-eligible-for-everybody`** — replaces the eligibility formula with `const eligible = true`.
  **Reds 3 tests.** A read that answers eligible for everybody does not satisfy this instrument.

`panel-submit-unbound` (removing `@submit.prevent="submitEnrol"` from the control) also reds 4,
which separates *the page is wired to the panel* from *the panel is wired to its own button*.

---

## 6. Suites run

| suite | result |
| --- | --- |
| `test/meals-enrolment-journey.test.js` | **6/6 pass** |
| `meals-admin-client`, `meals-admin-components`, `meals-companies-page`, `meals-claim-page`, `meals-admin-view`, `admin-nav-access` | **174/174 pass** |
| full jest suite (`npx jest --coverage=false`) | **112/113 suites, 2588/2590 tests** |
| eslint on every changed `.js`/`.vue` | clean |

**The one red, captured by name as instructed:** `test/journey-artifact-store.test.js`, 2 tests —
`names the checkout the world script recorded, not the one holding the port` and its sibling. Both
assert `/^Web-modules@/` against the checkout name and observe
`wt-meals-enrol-ui@3cd25709...+dirty`. This is the **pre-existing differently-named-worktree failure
the brief named**; not chased, not touched.

Three eslint `indent` warnings in `translations/{no,en,de}.ts` are pre-existing — they sit at
`nav_group_modules` (no.ts:715), ~3,000 lines from this lane's insertions at no.ts:3800.

**The browser journey suite was NOT run** (hard constraint), **no container was started**, no shared
ref was moved, nothing was pushed.

---

## 7. Files touched (the brief asked to name them)

Built in an **isolated worktree** `/Users/svendaneel/okam/wt-meals-enrol-ui` on branch
`lane/meals-enrol-ui` off `3cd2570`, because a sibling (`L-MEALS-DOCSYNC`) began editing
`utils/meals/admin-client.js` in the shared checkout mid-lane. One line of mine briefly landed there
and was backed out; the shared checkout is as this lane found it.

| file | change |
| --- | --- |
| `utils/meals/admin-client.js` | + `SetProgramMembers`; route table gains #12; the dead "no candidates" premise removed from the not-bound list |
| `components/admin/meals/MealsProgramPanel.vue` | + enrolment section, `members` / `enrolledMemberIds` / `enrolFailure*` props, `enrolSelection` state, `submitEnrol`, styles |
| `pages/admin/meals-companies.vue` | + `setProgramMembers` handler, `enrolled` state, `enrolledMemberIds` computed, panel wiring, failure slot |
| `translations/no.ts`, `en.ts`, `de.ts` | + 8 keys each, **hand-edited**, no regex; all 24 asserted defined and non-empty by the instrument |
| `test/meals-enrolment-journey.test.js` | **new** — the instrument |
| `test/meals-admin-client.test.js` | method-set pin 11 → 12; `SetProgramMembers` moved from the absence assertion to a route test |
| `test/meals-admin-components.test.js` | `mountPanel` supplies the new required `members` prop |

**Sibling overlap:** `MealsMembershipService.cs` and `MealsCommandReceiptService.cs` (the idempotency
work) are **backend** files — not touched, not in this repo. `L-MEALS-AGREEMENT-PIN-INVERTS` is
backend tests — no overlap. `L-MEALS-DOCSYNC` is text-only in `utils/meals/admin-client.js`; **this
lane rewrites the same paragraph**, so those two will conflict there and this is the flag for it.

**Shared rule reused, not duplicated:** the enrolment rows render `row.statementRef`, computed once in
`utils/meals/admin-view.js` (`memberRow`) from the rule `MealsStatementService` bills by. No second
copy of that rule was written.

---

## 8. Money path and actors (C4)

This lane adds **one write**: `POST /v1/meals/programs/{id}/members`. It is not itself a money-path
write — it moves no kroner, creates no deposit, capture, refund, statement line or funded order. It is
the **precondition** for one: an enrolled membership is what makes a later quote fundable.

The actor is never client-supplied. `SetProgramMembersAsync` resolves it as
`RequireCompanyAdminAsync(userId, program.CompanyId).MembershipId` — the caller's own company
membership, from the bearer token. **The request model has no actor field and must never gain one.**
The client sends `{ expectedVersion, membershipIds }` and nothing else, which the client test asserts
by exact object equality.

C1: no append-only table is written. C2: no migration authored. C6: no statutory claim added.
C7: nothing logged.

---

## 9. Left open (not this lane's to close)

- **No read of the enrolled set exists.** The UI cannot show who is enrolled on a fresh load — only a
  count, plus whatever this visit's own write returned. The panel states this on screen
  (`meals_enrol_no_read_note`) rather than guessing, and pre-ticks nothing, because a wrong guess
  un-enrols somebody silently. **A `GET /programs/{id}/members` is the real fix and is backend work.**
- **C5 is not met by this file.** Acceptance is Sven walking the surface; a green suite is evidence the
  code behaves, never that the capability is accepted. The page to open is
  `/admin/meals-companies` → pick a company → pick a programme → the *Påmelding til ordningen* section.
