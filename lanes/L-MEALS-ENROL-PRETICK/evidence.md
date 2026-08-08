# L-MEALS-ENROL-PRETICK — evidence

**Verdict: built.**

The enrolment control on `/admin/meals-companies` now arrives with the memberships a programme
already enrols **already ticked**, read back from
`GET /v1/meals/programs/{programId}/members`, and the on-screen note claiming the module has no such
route is **deleted from all three locales**.

## Where this sits

| | |
|---|---|
| branch | `lane/meals-enrol-pretick` |
| parent | `802041a` — `lane/meals-enrol-ui`, "An employee who claimed an invitation can be enrolled, and is then eligible" |
| grandparent | `3cd2570` — the frontend integration tip, confirmed present at `Web-modules` HEAD when this lane opened |
| backend tested against | `lane/meals-members-read @ 086ac34f` (off `8e2b57de`), read at `/Users/svendaneel/okam/wt-mealsmembers` |
| worktree | `/Users/svendaneel/okam/wt-meals-enrol-pretick` |

**This commit is a DESCENDANT of `802041a`, not of `3cd2570`.** A merge that takes only the parent
integration tip drops the whole enrolment surface this builds on, and then drops this with it.

The brief's tip claim was checked rather than trusted: `Web-modules` HEAD is `3cd2570`,
`802041a`'s parent is `3cd2570`, and `git log --all -S ListProgramMembers -- utils/meals/admin-client.js`
finds nothing — so this was not already built, and the lane is not `fail-spec`.

## The compromise that is now gone

`L-MEALS-ENROL-UI` left every box unticked **on purpose**, and printed the reason on screen: no route
read the enrolled set back, so a preselection would have been a guess, and a wrong guess silently
un-enrols somebody who then finds out at a checkout. That was right with what existed.

`L-MEALS-MEMBERS-READ` closed the gap. The read answers **`Enrolled` rows only** — deliberately,
because a `Removed` row answered back re-ticks somebody an admin took out, which is the same mistake
in the other direction — and it **carries the programme revision**, because the write compare-and-swaps
on it.

So the note is a claim about the product that stopped being true the moment the read landed.
`meals_enrol_no_read_note` is **removed from `no.ts`, `en.ts` and `de.ts`** and a test asserts it is
`undefined` in all three, not merely unrendered: a key left behind is a sentence somebody can still
render.

## The two things the brief said not to lose

**The revision comes from THIS read.** `submitEnrol` sends `this.enrolledMembers.revision` — the
token that came back with the set on screen — and not `program.revision` from the programmes list.
Both name the same rowversion in a quiet world; they are answered at different moments and disagree
in a busy one. `revision-from-programmes-list` is a mutation arm, and `test/meals-enrolment-journey.test.js`
proves it over a world where the two differ and only the read's token survives the CAS.

**Nothing preticks from the write's own response.** The page no longer keeps it at all: the
`enrolled` data slot and the `enrolledMemberIds` computed are deleted, and `setProgramMembers`
re-reads. The discriminating test is
`after the write the ticks come from a fresh read, not from the write's own answer` — a second admin
enrols the colleague between the write and the re-read, so the write's answer and the truth differ
by exactly one person, and only a page that went back and asked shows both ticked.

## Honest states, kept apart

The read has three outcomes and they are three different sentences:

- **loaded, non-empty** — the boxes for those memberships arrive ticked; `meals_enrol_known_note`
  says so.
- **loaded, empty** — "this programme enrols nobody". The control is offered with nothing ticked.
  This is a positive claim, not a failure.
- **unknown** — the read did not answer. The control is **withheld** (no boxes, no button) behind
  `meals_enrol_unread_note` plus the scoped refusal copy. The write replaces the whole set, so a
  submission assembled without the current set is a command to un-enrol everybody; offering it
  unticked would be the original defect wearing a fresh excuse.

A body naming a **different programme** is treated as unknown, in `admin-view.js`, for the same
reason: those ticks would submit into the wrong set.

## Files touched

Product:

- `utils/meals/admin-client.js` — `ListProgramMembers(programId)`; route table gains #12R; the
  "AND NO ROUTE READS THAT SET BACK" paragraph on `SetProgramMembers` replaced with the true one.
- `utils/meals/admin-view.js` — `programMembersSection(...)` → `view.programMembers`
  `{ state, refusal, programId, revision, membershipIds }`.
- `pages/admin/meals-companies.vue` — `programMembers` / `programMembersRefusal` state,
  `selectProgramId` funnel + `loadProgramMembers`, `enrolled` slot deleted, `setProgramMembers`
  re-reads.
- `components/admin/meals/MealsProgramPanel.vue` — `enrolledMembers` prop replaces
  `enrolledMemberIds`; preselection from the read; withheld branch; revision from the read.
- `translations/no.ts`, `translations/en.ts`, `translations/de.ts` — **edited by hand, one key at a
  time, never by regex**: `meals_enrol_no_read_note` removed, `meals_enrol_unread_note` added,
  `meals_enrol_known_note` rewritten. Verified absent/present in all three.

Tests:

- `test/meals-enrolment-journey.test.js` — world gains `GET /programs/{id}/members`, a
  `programsListRevision` knob, a refusal knob and an `afterEnrolWrite` hook; new
  `the enrolment control arrives showing who is already enrolled` block (6 tests); the two existing
  tests whose premise the read changed rewritten rather than deleted.
- `test/meals-admin-components.test.js` — 4 panel-level claims about the preselection.
- `test/meals-companies-page.test.js` — 3 page-level claims about which read is issued and what a
  refusal or a mismatched programme id produces.
- `test/meals-admin-view.test.js` — 6 claims about the section, incl. the `Removed` filter and a null
  revision not being unknown.
- `test/meals-admin-client.test.js` — the route, the verb, no idempotency key, and the method-set
  assertion moved 12 → 13.

Lane files: `lanes/L-MEALS-ENROL-PRETICK/{evidence.md,mutation-proof.py,mutation-proof.txt}`.

Nothing else in the shared checkout was touched. No migration, no shared ref moved, no container
started, no push.

## Non-vacuity

**Every world here has some enrolled and some not.** A world where everybody is enrolled is satisfied
by a control that ticks every row; a world where nobody is is satisfied by the unticked panel this
replaced. `twoColleaguesOneEnrolled()` builds the discriminating world: two claimed colleagues, one
`Enrolled`, one whose `Removed` row is still present, plus the admin's own membership.

**Asserted by value, in both directions.** Which identities are ticked:

```
enrol-member-<EMPLOYEE> checked === true
enrol-member-<OTHER>    checked === false      (the Removed row is not re-ticked)
enrol-member-<ADMIN>    checked === false
```

**Driven through the page.** Every assertion runs against a mounted `pages/admin/meals-companies.vue`
with the REAL `MealsAdminService` over a stubbed transport, reached by clicking the company row and
then the programme row. No handler is called directly — which is what makes `page-handler-unbound`
and `panel-submit-unbound` able to red.

## Mutation proof — full log in `mutation-proof.txt`

`lanes/L-MEALS-ENROL-PRETICK/mutation-proof.py` runs, for every arm: mutate → run → restore → run,
and prints **both**. 12 arms, 25 runs, alternating red/green throughout. A green mutant would mean the
edit landed where nothing under test reads; a red restore would mean a stale build or a leftover edit.
Neither happened.

```
BASELINE                             green   108 passed
read-ignored-in-panel                OK      mutant red (7 failed) / restore green
page-drops-the-read                  OK      mutant red (10 failed) / restore green
page-never-issues-the-read           OK      mutant red (11 failed) / restore green
no-reread-after-write                OK      mutant red (2 failed) / restore green
revision-from-programmes-list        OK      mutant red (2 failed) / restore green
view-drops-programme-guard           OK      mutant red (2 failed) / restore green
page-handler-unbound                 OK      mutant red (8 failed) / restore green
panel-submit-unbound                 OK      mutant red (10 failed) / restore green
client-read-method-deleted           OK      mutant red (9 failed) / restore green
client-read-route-company-scoped     OK      mutant red (9 failed) / restore green
world-answers-removed-rows           OK      mutant red (3 failed) / restore green
world-enrols-everybody               OK      mutant red (7 failed) / restore green
```

The two the brief named:

- **`read-ignored-in-panel`** — `resetEnrolSelection` ticks nothing regardless of the read. **RED.**
  Restored: **GREEN.** This is "ignore the read entirely", and it is exactly the panel at `802041a`.
- **`page-handler-unbound`** — `@set-program-members` removed from the page template. **RED.**
  Restored: **GREEN.**

### The arm that caught a defect in my own test

`no-reread-after-write` came back **GREEN on the first run of this proof.** The assertion I had
written for "the surface reflects a read after the write" was vacuous: after the operator ticks a box
and submits, that box stays ticked whether or not the page learnt anything, because the operator
ticked it. The assertion could not fail.

Fixed in the assertion, not in the world: the journey test now asserts the last call at the members
path is a **GET**, and a new test puts a concurrent second admin between the write and the re-read so
the write's own answer and the truth differ by one person. The arm reds on the second run.

## Suite state

```
npx jest --coverage=false
Test Suites: 1 failed, 112 passed, 113 total
Tests:       2 failed, 2610 passed, 2612 total
```

The single failing suite is **`test/journey-artifact-store.test.js`**, 2 tests, and it is
**pre-existing and not reproducible outside a differently-named worktree** — the brief pre-declares
it. It asserts `/^Web-modules@/` against the checkout name and receives
`wt-meals-enrol-pretick@802041a…+dirty`. Reported, not chased.

The e2e journey suite was **not** run: one journey is known red at the tip, and this lane's claim is
a jest one.

## What is NOT proved here, and who owns it

**Acceptance is Sven walking the surface, never this count** (C5, standing law 2026-07-28). This lane
proves behaviour over a transcribed world; it does not prove a person can complete the journey. Doing
that needs the two unmerged branches deployed together:

- frontend `lane/meals-enrol-pretick` (this branch, a descendant of `802041a`)
- backend `lane/meals-members-read @ 086ac34f`

and `Features__Meals__Module=true`, since #12R takes the same module-wide gate as #9–#12 and is dark
without it. No container was started for this lane; several worlds are standing and none is mine.
