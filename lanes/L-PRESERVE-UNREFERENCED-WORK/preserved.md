# Preserved, not adopted

L-PRESERVE-UNREFERENCED-WORK. **Three commits**, on one ref, in this repository only.
No push, no merge, no branch moved, no file in the working tree added, moved, removed or edited,
no container started, no test suite run.

## The ref

    refs/lanes/preservation-snapshot-unreferenced-work   054e14069440ed144650c2b062aefe755612f3f7
      pass 3  054e140   the two modules the fixture cannot load without   2 paths
      pass 2  dcb79b9   the wires that make pass 1 runnable               5 paths
      pass 1  e79348e3   the feature and the money-path guard            23 paths
      parent  e34977ac   = feature/restaurant-modules, unmoved

**30 paths beyond the tip**, every one byte-identical to the working copy (verified path by path
after the third commit: 30 identical, 0 mismatched).

**It is not a branch.** It lives under `refs/lanes`, not `refs/heads`, for the same reason
`refs/lanes/plan-snapshot` (`51970563`) does: it must be findable by the four-namespace enumeration
that found the problem, and it must not appear in `git branch` where somebody would check it out or
land it. Its name says preservation-snapshot. Its message says, in its second paragraph, that
nothing in it is reviewed, verified or claimed to work.

**Nothing here is evidence of anything.** Two of the lanes whose work this carries report a passing
browser journey and green unit tests. Those claims were not re-run, not reviewed and are not
inherited by this commit. Committing a file does not verify it (C5).

## As-of

| quantity | value | moment |
|---|---|---|
| refs enumerated, before pass 1 | **141** = heads 116 + lanes 9 + salvage 8 + remotes 8 | 07:05Z |
| refs enumerated, after pass 1 | **143** = heads 117 + lanes 10 + salvage 8 + remotes 8 | 07:12Z |
| refs enumerated, pass 2 (before and after) | **143** = heads 117 + lanes 10 + salvage 8 + remotes 8 | 07:2xZ |
| refs enumerated, pass 3 (before staging) | **143**; **144** by the closure measurement (heads 118) | 07:3xZ |
| FE tip `feature/restaurant-modules` | `e34977ac`, unmoved across all three passes | 07:05Z–07:3xZ |
| paths staged, pass 1 | **23** — 17 untracked, 6 tracked-and-modified | 07:10Z |
| paths staged, pass 2 | **5** — 0 untracked, 5 tracked-and-modified | 07:2xZ |
| paths staged, pass 3 | **2** — both untracked here, both on one lane ref | 07:3xZ |
| paths in the snapshot | **30** beyond the tip | after `054e140` |

`refs/heads` moved 116 → 117 underneath pass 1: another lane created a branch while this one ran. It
is not this lane's, and the denominator every statement is written against is stated with the
statement rather than assumed stable. The ref set was re-enumerated and the positive control re-run
at the start of pass 2; it had not moved again (143, all resolving, `package.json` 143/143).

## Instrument

Containment is keyed on **(path, blob)**, never on path: `git hash-object` the working file, then
compare against `git rev-parse "${REF}:${PATH}"` across **all four namespaces**, quoted throughout.

Controls run before any negative was believed:

- **Positive control.** `package.json` resolves on **141 of 141** refs on the same instrument.
- **Every ref asserted to resolve.** All 141 checked with `rev-parse --verify "$REF^{commit}"`;
  0 unresolvable. This matters because `rev-parse --verify --quiet` answers a *bogus ref* and an
  *absent path in a real ref* identically (rc=1, empty), so a mangled ref would otherwise read as a
  clean negative.
- **Empty-file guard.** The empty-string md5 `d41d8cd9…` was recorded up front; no candidate hashed
  to it.
- **`-uall` throughout, and it was load-bearing.** `git status --porcelain` collapses a
  wholly-untracked directory to its topmost ancestor. `scripts/` holds no tracked file at all, so
  the default `-u` reports it as the single entry `scripts/` — hiding **both** `scripts/worldstamp`
  and `scripts/drift-demo/demo.sh`, two of the 23. Measured: the default `-u` lists 239 untracked
  entries where `-uall` lists 1,356.
- **Gitignore checked per path.** None of the 23 is ignored, so `git clean -fd` — which does not
  remove ignored files — genuinely reaches the 17 untracked ones.

**One probe form produced a wrong negative during this pass and was caught only by cross-instrument
disagreement.** An ad-hoc `for R in $(git for-each-ref …); do … done | head -5` search reported that
`test/e2e/journeys/growth-guest-lifecycle.spec.js` was on no ref. The controlled instrument, and a
direct single-ref `git rev-parse`, both show it on two. The ad-hoc form was not re-used and its
answer is retracted here rather than left in the record. The mechanism was not isolated, so it is
reported as a wrong answer from a probe form, not as a diagnosis.

## What was preserved, and who authored it

All 23 measured **blob on 0 of 141 refs** immediately before staging, and **blob on 1 of 143** after.
Staged by explicit pathspec — never a wildcard — because the shared checkout holds **1,339 other
untracked entries** beside them (1,356 under `-uall` at 07:14Z, minus the 17 staged here). The count
moved twice during this pass; the checkout is live.

### L-WF-FAILURES-SURFACE — the whole delivery-failures feature, 7 paths (all untracked)

    pages/admin/workforce-delivery.vue
    components/admin/workforce/WorkforceDeliveryPanel.vue
    components/admin/workforce/WorkforceDeliveryGroup.vue
    utils/workforce/delivery-failures.js
    test/workforce-delivery-failures.test.js
    test/e2e/fixture/workforce-delivery.js
    test/e2e/journeys/workforce-delivery-failures.spec.js

Its return says "Nothing committed, nothing pushed" and reports a passing three-tier browser journey
and 40 green jest tests. Both statements were true at once: the code a clone could obtain was none.

### L-WF-PUNCH-UI — the register's clock, 9 paths

    utils/workforce/pos-clock-state.js            untracked   THE MONEY-PATH GUARD
    test/workforce-pos-clock.test.js              untracked
    test/pos-clock-reserved-key.test.js           untracked
    test/e2e/fixture/workforce-punch.js           untracked
    test/e2e/journeys/workforce-pos-punch.spec.js untracked
    components/admin/pos/ClockScreen.vue          untracked   path on 4 refs at a DIFFERENT blob
    utils/workforce/pos-clock-client.js           untracked   path on 4 refs at a DIFFERENT blob
    components/admin/pos/PosShell.vue             tracked, modified; working content on no ref
    components/admin/pos/PosTopBar.vue            tracked, modified; working content on no ref

`pos-clock-state.js` is the module that refuses to bind the register's button to the response's
`sessionState` field. The backend derives that field from `closedUtc` alone, so a clock-out with
nothing open answers `200 { clockSessionId: null, sessionState: "Open", closedUtc: null,
accepted: true }` — and a till bound to it flips to *clocked in* at the moment somebody presses
*Stemple ut*. The worker walks away; the personnel register carries no end time; the payroll-bearing
hour is the one that goes missing. That guard was on zero refs.

C4 note, recorded rather than certified: the punch body carries no store, operator or staff
identity. The actor is resolved server-side from a device JWT plus `X-Operator-Session` through a
manager-reviewed staff link, and an unlinked operator is a 403. Nothing in the preserved client can
construct an ambient or hard-coded actor. This is an observation from reading the code, not a
verification of the running system.

### L-GUARD-DEMO — 1 path (untracked)

    scripts/drift-demo/demo.sh

`docs/plan/plan.md` describes it as "finished, committed work" (line 18738 as of this commit; the
line moves). It was committed nowhere. **Correction to the census:** it is a POSIX shell script, not
a compiled binary.

### L-GUARD-W0 — 2 paths (untracked)

    world.config
    scripts/worldstamp

Derived world state and a shell collector, so the class differs: what a clean costs here is not lost
authorship but a drift guard that degrades to `"unknown"`. Preserved because the census measured
them on 0 refs like the rest. **Correction to the census:** `scripts/worldstamp` is a 137-line POSIX
shell script, not a compiled binary. Its backend siblings were not touched — see *Out of scope*.

### Shared, many-lane files — 4 paths (all tracked, modified)

    components/organisms/AdminPageHeader.vue      (the census named it as AdminPageHeader.vue;
                                                   its real path is under components/organisms/)
    translations/no.ts   translations/en.ts   translations/de.ts

These carry the two lanes' nav entry and locale keys **and every other lane's uncommitted edits to
the same files**. They are preserved as the working copy holds them. Do not read their content as
this snapshot's authorship, and do not read their inclusion as a judgement that the working copy is
the version that should survive.

## Preserved and still contested — the till component

`components/admin/pos/ClockScreen.vue` has two disjoint implementations and this commit resolves
nothing. Measured on `translations/no.ts`:

| tree | `posclk_` keys | `wfclock_` keys |
|---|---|---|
| working copy (shared checkout) | **25** | 0 |
| `lane/fe-pos-clock` | 0 | **47** |
| `candidate/fe-compose-2026-08-05` | 0 | 0 |

Two vocabularies for one screen, and the composition candidate carries neither. Preserving the
working copy is right because it is the only copy a `git clean -fd` would have destroyed —
`lane/fe-pos-clock`'s rival survives a clean on its own ref. **It is not right because it is the
better implementation, and this lane makes no claim that it is.** Whoever composes these two owes a
decision that has not been made.

## refs/salvage/dangling-8550f5e0 — a judgement, not a commit

    commit  8550f5e0f77aab6f0862ca65db0cace21d79fbc4
    parent  5ad0ca0043b63363e1407c1c59f82e966de06673
    author  Sven Daneel, Tue Aug 4 15:36:53 2026 +0200

**It is empty.** `git diff-tree -r 5ad0ca00 8550f5e0` returns **zero paths**. It is reachable from
its own salvage ref and from nothing else in any of the four namespaces; its parent is on 60 refs.
Its message claims two journeys — a consent lifecycle walked join → supersede → confirm → replay →
withdraw → replay, and a test-send refusal made falsifiable — plus two new fixture routes and a
mutation proof.

**There is nothing in it to preserve, and nothing was.** But the brief's premise that *no artifact
backs it* is wrong in a way worth stating precisely, because it changes what should be done next:

    test/e2e/journeys/growth-guest-lifecycle.spec.js   blob f1281746  on lane/L-JOURNEY-GROWTH
                                                                      and salvage/dangling-1890c9a3
    test/e2e/journeys/growth-testsend-refusal.spec.js  blob 668b7589  same two refs
    test/e2e/fixture/growth.js                         blob 40dd32c7  on lane/L-JOURNEY-GROWTH

All three are byte-identical to the shared checkout's working copy, and
`docs/plan/returns/L-JOURNEY-GROWTH-1.md` reports them. So the artifacts exist and are already safe
on refs. What `8550f5e0` holds is nothing — it is a commit shaped like a landed journey whose
content landed elsewhere, not a lost one. **Nothing to rescue; the correct action is to stop reading
it as evidence of unpreserved work.** Whether it should be deleted is not this lane's call.

## Pass 2 — the wires, `dcb79b9`

Pass 1 preserved the feature and left it **unrunnable**: the pages, modules, fixtures and journeys,
and none of the wires between them. The coordinator ruled that half a rescue and named four paths.
**Five were committed.** All re-measured against **143** refs immediately before staging.

**Four are on 0 of 143 refs — and all four are TRACKED and MODIFIED, so the blade is different.**
`git clean -fd` does not touch them. `git checkout -- .`, `git reset --hard` or a fresh clone do:
each yields the committed version and silently drops the working content.

    test/e2e/fixture/api-server.js       0/143   the only file that mounts the two new fixtures
    test/e2e/fixture/world.js            0/143   the fifth path — see below
    pages/admin/workforce-schedule.vue   0/143   holds wf-delivery-link, the anchor the journey CLICKS
    test/admin-nav-access.test.js        0/143   the /admin/workforce-delivery STORE_ADMIN_PATHS pin

**One is not on 0 refs, and is here for the other reason.** `utils/workforce/schedule-client.js` is
on `refs/heads/lane/wf-pubhist` and nothing else (1 of 143). It carries `GetNotificationFailures`,
the delivery page's only read. It survives a clean, a checkout and a reset — its lane holds it. What
it does not survive is a composition that never names that lane, and `lane/wf-pubhist` is an ancestor
of **neither** `candidate/fe-compose-2026-08-05` **nor** `feature/restaurant-modules`, checked
directly. A reader who takes all five as equally at risk has four of them and this one wrong.

### The fifth path, found by measurement rather than by the list

`test/e2e/fixture/world.js` was not among the four. It is in because **api-server.js cannot load
without it**: the working api-server.js calls `world.staffFor`, `world.seededRoleCatalogue`,
`world.ROLE_WRITE_FLAG` and `world.TIMESHEET_WRITE_FLAG`, and HEAD's world.js exports **none of the
four** — measured 0 occurrences each on `HEAD:test/e2e/fixture/world.js` against 2–3 each in the
working copy. Preserving api-server.js alone would have preserved a file that throws on `require`,
which is the same half-rescue this pass exists to end. Its content is on 0 of 143 like the other three.

### All five are many-lane files

Not one belongs to the delivery lane alone. `admin-nav-access.test.js` pins **six** new admin paths
(`workforce-roles`, `-delivery`, `-publications`, `-timesheets`, `training-evidence`,
`meals-statements`); `schedule-client.js` adds `GetRecipients` (#22) beside the delivery read;
api-server.js's 390 added lines carry the role catalogue (#8/#9), the timesheet batch (#27–#29),
publication history and recipients (#21/#22), a POS startup path, two `/__fixture` control routes, a
CORS header and a capability change; `world.js` adds a second seeded venue and two stage flags.
Preserved as the working copy holds them, with no attempt to separate one lane's edits from another's.

## Pass 3 — the seam closed, `054e140`

Pass 2 left `api-server.js` in the snapshot requiring four workforce fixture modules while the tree
held only two, so `require` threw `MODULE_NOT_FOUND` before a route was served. **The coordinator
amended the rule and ruled the seam closed in this lane's direction.** Both modules added:

    test/e2e/fixture/workforce-publications.js   L-WF-PUBHIST       (#21, #22)
    test/e2e/fixture/workforce-timesheets.js     L-WF-TIMESHEET-UI  (#27, #28, #29)

### The amended rule

> The snapshot holds what would otherwise be lost, **plus whatever the preserved work needs in order
> to load, where that dependency sits on a lane ref no composition names.** The purpose is not that
> bytes survive — it is that somebody can run what was preserved.

The rule as first given ("only what would otherwise be lost") could not stand beside an instruction
that included `schedule-client.js`, which is on a ref and would not be lost. That was named rather
than resolved unilaterally, and the coordinator resolved it.

## The three classes of risk

Not interchangeable, and the snapshot is only legible if they are kept apart.

| class | what it is | count | what takes it |
|---|---|---|---|
| **1** | untracked here, content on no ref | **17** (pass 1) | `git clean -fd` — and the bytes exist nowhere else |
| **2** | tracked + modified, working content on no ref | **10** (6 pass 1, 4 pass 2) | `git checkout -- .`, `reset --hard`, a fresh clone |
| **3** | on exactly one lane ref no composition names | **3** (1 pass 2, 2 pass 3) | only a merge that never names that lane |

Class 3, in full — `utils/workforce/schedule-client.js` and
`test/e2e/fixture/workforce-publications.js` on `lane/wf-pubhist`,
`test/e2e/fixture/workforce-timesheets.js` on `lane/wf-timesheet-ui`. Re-checked this pass: **neither
lane is an ancestor of `candidate/fe-compose-2026-08-05` or of `feature/restaurant-modules`.**

**A trap in reading class 3.** Both files added in pass 3 show as `??` in `git status`, because they
are untracked *in this checkout*. That looks like class 1 and is not: their bytes are on a lane ref,
so a clean costs the working copy and loses nothing. Nobody should read the `??` as the risk.

**What this does not settle:** whether those two lanes should be composed at all. The snapshot carries
copies of three of their files so the preserved journeys can load. It does not merge them, vouch for
them, or argue they belong on the integration branch.

## Can the preserved journeys load? — measured, and the answer is yes

Transitive `require()` closure computed from three roots — `test/e2e/fixture/api-server.js` and both
preserved journey specs — resolved against the **snapshot tree itself** (`git cat-file -e <snap>:path`),
not against the working directory.

    modules in the closure                     20
    missing from the snapshot tree              0
    require() specifiers resolving to no file   0

**`MODULE_NOT_FOUND` is gone. The fixture server and both preserved journey specs load from this
tree.** The harness contract holds too: the snapshot carries HEAD's `test/e2e/support/journey.js`,
whose `journeyDetails({ journey, capabilities, surface, tag, underTest })` and
`module.exports = { test, expect, journeyDetails, ARTIFACT_DIR }` are exactly what the two specs call.

**Seven of the 20 are carried at HEAD's version rather than the working copy** — `fixture/growth.js`,
`fixture/meals.js`, `fixture/training.js`, `support/artifact-store.js`, `support/journey-assertions.js`,
`support/journey.js`, `support/world-stamp.js`. Nothing is lost by that: each of those working copies
is itself on 1–7 refs. The snapshot simply carries a coherent committed version of each.

**Loading is not passing, and this lane proved only the first.** No suite was run and no journey
driven (C5).

### The one module the browser-side closure still lacks — named, and not chased

The `~/` import closure from the ten preserved surfaces is **76 modules, 75 present, one absent**:

    utils/cross-currency.js    reached via pages/admin/workforce-schedule.vue
                               -> components/admin/workforce/WorkforceWeekGrid.vue

**It is not missing from the estate — it is missing from the tip.** It resolves on **6 refs,
including `candidate/fe-compose-2026-08-05`**, and is absent here only because this snapshot is
parented on `feature/restaurant-modules`, which does not carry it. By the amended rule it does not
belong in the snapshot: it would not otherwise be lost, and it does not sit on a lane ref no
composition names — it sits on the composition. **Any composition that lands the preserved work
carries it.** Named and stopped there, as instructed; two more passes of closure-chasing would be
worse than a documented gap.

**Out of scope entirely, named so nobody reads their absence as a measurement:**

- The **backend repository** (`OkamAPI-modules` and its worktrees) and its own `world.config`,
  `Scripts/worldstamp` and `artifacts/world/WORLD.json`. This lane wrote only in `Web-modules`.
- The backend State-3 worktree findings — `lane/growth-sql-catch-typed`, `lane/train-demo-seed`,
  `lane/adminaudit`, `OkamAPI-utc`, `feature/swiss` — all of which are in other checkouts.
- The four State-2 lane refs the candidate does not contain (`wf-timesheet-ui`, `wf-pubhist`,
  `fe-pos-clock`, `vat-keys-monolingual`). They are on refs already; they survive a clean. What they
  do not survive is a merge that never names them, and that is a composition decision, not a
  preservation one.

## C7 — every file was read before it was committed

**Pass 1's 23.** All 17 untracked files were read in full; the 6 shared files were read for their
delta and swept whole. Result: **no secret, credential, token, key, signature or password** in any of them, and
**not one log or telemetry call** in any of the 17 — no `console.*`, no logger, no telemetry sink.

The only credential-shaped literals are fixture values that reach no sink: operator PINs `1234` /
`4321` and demo sign-ins `99999999` / `AppSettings__DemoVerificationCode__REDACTED` and `90000003` / `AppSettings__DemoVerificationCode__REDACTED` in the journey specs, and a
`bearerToken: 'device-jwt'` string inside a jest header assertion. The delivery module and its
component are explicit in the opposite direction — they carry the backend's *redacted* reason code
and a presence label (`[redacted]` / `[none]`), never an address, and the journey asserts that
`kari@example.test` and `+4790000009` do **not** appear on screen.

`scripts/drift-demo/demo.sh` embeds an absolute scratchpad path as its default bench and refuses to
run if that bench resolves inside a git repository. A local path, not a secret.

**Pass 2's five.** Read before committing: the complete 498-line delta of the four non-fixture files,
the complete 132-line delta of `world.js`, plus a scripted scan over **every byte** of all five blobs
for long base64/hex literals, URLs carrying userinfo, PEM blocks, connection strings, vendor key
formats (AWS/GitHub/Slack/Stripe) and secret-named assignments. Zero hits that were not identifiers,
route strings or fixture GUIDs. The only sink in any of the five is api-server.js's own
`process.stderr.write` fixture trace, which writes an HTTP method, a pathname and a stack — no
header, no body, no token. Stated precisely rather than as "read in full": for these five the base is
already on 110–131 refs and the never-committed material is the delta, which is what was read.

## Verification of reachability

    $ for c in 054e140 dcb79b9 e79348e3; do
        git for-each-ref --contains $c --format='%(refname)' \
          refs/heads refs/lanes refs/salvage refs/remotes
      done
    refs/lanes/preservation-snapshot-unreferenced-work        # all three, and nothing else

    $ git fsck --unreachable | grep -E '054e140|dcb79b9|e79348e3'   ->  no match

One ref, in an enumerated namespace; none of the three commits unreachable. All four namespaces were queried; a
heads-only `--contains` would have reported both as dangling, which is the published wrong answer a
sibling lane produced by enumerating one namespace of four.

Re-measured after each commit. Pass 1: all 23 went from **0 of 141** to **1 of 143**. Pass 2: the
four 0-ref paths went from **0 of 143** to **1 of 143**, and `schedule-client.js` from **1 to 2** (its
own lane, plus the snapshot). Pass 3: both new modules went from **1 of 144 to 2 of 144** — their lane,
plus the snapshot — which is the class-3 signature, not a rescue from deletion. Verified path by path
across the whole snapshot afterwards: **30 of 30 identical to the working copy, 0 mismatched.**

## What was not done

- Nothing pushed. Nothing merged. `feature/restaurant-modules` and
  `candidate/fe-compose-2026-08-05` untouched. Pass 2 moved the snapshot ref with a
  compare-and-swap on its old value, and pass 3 the same, so a concurrent writer could not have been
  clobbered.
- The working tree is byte-for-byte as it was found: still **19 untracked and 11 modified** among the
  30. All three commits were built through a temporary index (`GIT_INDEX_FILE` + `read-tree` + `add` +
  `write-tree` + `commit-tree` + `update-ref`), so the repository's real index was never written and
  no checkout occurred.
- No file was reviewed. No suite was run. No claim in any preserved return was re-tested. Making a
  feature runnable is not the same as showing that it runs, and this lane did neither the second nor
  claim it.
- No container started.
