# L-NAV-GROUPS-BY-MODULE — the 22-link `Moduler` wall becomes six module groups

**Branch:** `lane/focustrap-teardown` (this checkout is not the shipped tip).
**Owner's ask:** *"there is a massive amount of new things — can you actually separate them and group
them based on the different functionality and module they are part of? keep the NYHET as it lets me
know that it's new"*

---

## What the file looked like before this lane touched it

`components/organisms/AdminPageHeader.vue` had **73 uncommitted lines already in the working tree**
from sibling lanes, none of them mine: six new icons (`workforceRoles`, `workforceDelivery`,
`workforcePublications`, `workforceTimesheets`, `trainingEvidence`, `mealsStatements`) and the six
matching nav items with their per-item comments. That work is preserved unchanged — every one of
those six links, and every one of those comments, moved into its module's group intact.

Counting the working tree rather than the commit is what makes the arithmetic come out: the single
`nav_group_modules` group held **exactly 22 items**, which is the number in the brief. Against
`HEAD` it would have been 16.

## The mapping, verified against `path` and not against the screenshot

Every label was checked against the `path` in the component and the string in `translations/no.ts`.
The brief's reading of the screen was correct in all 22 rows; nothing was re-mapped. One label is
slightly longer than the screenshot showed, because the sidebar truncates it: `nav_meals_statements`
is **`Månedsoppgjør bedrift`**, rendered as `Månedsoppgjør …`. Same page, same module, no change.

| Group (in sidebar order) | n | Paths |
|---|---|---|
| `nav_group_module_margin` | 4 | `margin-recipes`, `margin-suppliers`, `margin-price-imports`, `margin-statements` |
| `nav_group_module_workforce` | 9 | `workforce-schedule`, `workforce-requests`, `workforce-roster`, `workforce-roles`, `workforce-rates`, `workforce-personnel-list`, `workforce-delivery`, `workforce-publications`, `workforce-timesheets` |
| `nav_group_module_training` | 2 | `training-courses`, `training-evidence` |
| `nav_group_module_events` | 1 | `events-pipeline` |
| `nav_group_module_growth` | 2 | `growth-newsletter`, `growth-privacy` |
| `nav_group_module_meals` | 3 | `meals-agreements`, `meals-companies`, `meals-statements` |
| — (Operations, last row) | 1 | `feature-flags` |

21 module links + 1 switchboard = **22**.

Order is the brief's: finished-first — Margin, Workforce, Training, Events, Growth, Meals — with
Meals last as the module that cannot be walked end to end. The six sit contiguously, immediately
after Operations, which is where the single group sat.

## Where Modulbrytere went, and why

**Last item of the Operations group (`Drift`)**, immediately above all six module groups.

- It is not a module. It governs all six, so filing it *inside* any one of them would make it read as
  that module's own setting.
- A seventh group would have a heading and a single row saying the same word. A heading that repeats
  its only row earns nothing.
- Operations is where it belongs on its own merits: each module gates its writes on deny-closed
  per-store flags, and this is the row of switches somebody reaches for during an incident — next to
  the four screens they are already watching.
- Placed **last** in Operations so the "it governs everything beside it" reading survives the move:
  it was last in the modules group because it governed every link *above* it; it is last in
  Operations because it governs every group *below* it.
- It keeps `isNew: true` like every module link.

## Six top-level groups, not a nested level

The template (`:131`) renders a group as `title` + a flat `items` list and has no concept of a
sub-heading. Adding one meant a new template branch and new CSS for a shape nothing else in this
sidebar uses. **Six groups is the same rendering with more data**, so the entire change to the
component is data inside `navGroups` — the template and the stylesheet are untouched.

## Translation keys added (no, en, de)

No existing module-name keys were found to reuse: the only module-ish key in the dictionaries is
`ff_module_unknown`, and `pages/admin/feature-flags.vue` prints the module name straight from the
service response (`group.module`). So six new keys, under the existing `nav_group_*` convention.

| Key | no | en | de |
|---|---|---|---|
| `nav_group_module_margin` | Margin & råvarer | Margin & cost | Marge & Wareneinsatz |
| `nav_group_module_workforce` | Bemanning & lønn | Workforce & pay | Personal & Lohn |
| `nav_group_module_training` | Opplæring & kompetanse | Training & competence | Schulung & Kompetenz |
| `nav_group_module_events` | Selskap & arrangement | Events & functions | Events & Feiern |
| `nav_group_module_growth` | Vekst & personvern | Growth & privacy | Wachstum & Datenschutz |
| `nav_group_module_meals` | Bedriftsmat | Corporate meals | Firmenverpflegung |

Constraint applied and asserted per locale: **no heading is identical to a link label inside its own
group**, in any of the three languages. That is a live hazard here — `Opplæring`, `Selskap`,
`Personvern`, `Bedriftsmat`, `Events`, `Company meals`, `Firmenessen` and `Schulung` are each both a
module name and a page name. `$i()` carries no raw Norwegian anywhere.

`nav_group_modules` ('Moduler' / 'Modules' / 'Module') is **kept, not deleted**, with a comment in
each dictionary recording what it was and what replaced it. It is a shared file with ~394
uncommitted paths from other lanes in this checkout; removing a key another lane may still reference
is the riskier move, and the key is the name of a decision that still partly stands.

## The record of the earlier decision

Preserved and extended, not overwritten, in three places:

- `AdminPageHeader.vue` — the comment above the module block now states **both rulings**: (1) the six
  modules were pulled out of Menu / Sales / Administration into one group by the owner's instruction,
  because filing by subject matter was correct and useless for finding anything; (2) that single
  group was split once it reached 22 links, in the owner's own words, quoted. Ruling 1 is explicitly
  **not** undone — nothing went back to Menu or Sales, and the six groups stay contiguous.
- `test/admin-nav-access.test.js` — the header above `STORE_ADMIN_PATHS` carries the same two rulings.
- The `featureFlags` icon comment, which asserted "sits last in the modules group", now says where it
  sits and why it moved.

Every per-item comment moved with its item: the requests inbox, the roles catalogue, the delivery
report, the publication receipts, the payroll batch, the training record, the two margin price
surfaces, the meals company account, the meals month statement, and the growth privacy queue.

## Visibility: nothing changed about who is admitted

Three independent checks, all mechanical:

1. **The set of links in the file is byte-identical.** Extracting every `path: '…'` from the
   component before and after gives **59 = 59, `diff` empty**. (Before = `HEAD` plus the six links the
   sibling lanes had added uncommitted.) No link entered the sidebar and none left it.
2. **All 22 are still inside the same branch.** They sit between `if (this.showsStoreAdminNav) {`
   and its closing brace, well before the `isKeyAccountManager || isPowerUser` branch. Not one link
   crossed that boundary.
3. **Asserted, not just inspected** — new tests in `test/admin-nav-access.test.js`:
   - a worker is offered none of the 22, and still sees exactly `['nav_group_me']`;
   - an unresolved user's link list is still identical to a store admin's (the no-flicker property);
   - none of the 22 appears in a `role`-gated group for a PowerUser+KAM account;
   - the pinned ordered `STORE_ADMIN_PATHS` still `toEqual`s what the component renders, and a
     separate **set** comparison pins membership so a future reorder cannot drop a path while
     looking like a reorder.

`isNew: true` count: **19 in HEAD + 6 sibling links = 25 before, 25 after.** The badge did not move
to any heading — a test asserts each module group object carries no `isNew` of its own.

## Suites

Measured on this machine, on this checkout, before and after.

| Run | Suites | Tests | Failed |
|---|---|---|---|
| Baseline — the four suites that touch this component (`admin-nav-access`, `account-email-page`, `margin-recipe-revise`, `feature-flags-page`) | 4 passed / 4 | **119 passed** | 0 |
| After — same four | 4 passed / 4 | **129 passed** (+10 new) | 0 |
| After — whole jest suite | **136 passed / 136** | **3116 passed** | 0 |

Zero failures after, so the whole-suite number needs no baseline to interpret: there is nothing to
excuse. `npx eslint` on all changed files: **0 errors**, 3 warnings — all three are the pre-existing
6-space indent on the `nav_group_modules` line in each dictionary, untouched by this lane.

## The visual, which is the real proof

`nav-grouped.png` — the actual component, mounted with the real `no` dictionary, its own stylesheet,
screenshotted in Chromium. Generated by a throwaway jest renderer (`test/zz-nav-render-capture.tmp.test.js`,
**deleted after the capture**) that wrote `nav.rendered.html` + `nav.css`; `nav.preview.html` wraps
them for the browser. Served on **127.0.0.1:4917** — my own port, released afterwards.

The owner's dev server on **:3971** was never touched: same pid 758, still listening, uptime
unbroken. It runs from this same checkout, so the change is live in his browser already.

No commit, no push, no container, no `npm install`, no `git stash`, no `git add`.
