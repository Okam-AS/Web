# L-ARTIFACT-NAMES-ITS-LOCALE — the receipt says which build it walked and which language it read

**Worktree** `/Users/svendaneel/okam/web-artloc`, branched `lane/artifact-names-its-locale` off
`7030c00` (`lane/guard-repair-lands`, the only ref where both provers are green together), committed
at **`adde936`**. `core/` at `1bcab0b6`, `node_modules` symlinked. Nothing pushed, no shared branch
touched, no container started. **Port 4010 was never bound and pid 73160 was never signalled.** Every
run used this lane's private pair **3841/4841** behind a free-port precheck, with `CI=1`.

Evidence is written **outside the tree it measures**: every run lands in
`lanes/L-ARTIFACT-NAMES-ITS-LOCALE/runs/`, and the runner lifts each run's artifacts out and restores
`artifacts/` to HEAD, so every arm started from the same committed tree — the two provers below both
print `web-artloc@adde936…` with **no `+dirty`**.

---

## 1. The exit criterion, in two files

**Two runs of one journey at two editions, in ONE tree, both green, both on disk, told apart by the
name AND by the content.** `lanes/L-ARTIFACT-NAMES-ITS-LOCALE/runs/C2-reverted-ch.artifacts/`:

```
runs/modal-scroll-lock.fixture.playwright.json          <- the file the Norwegian run wrote
  "artifact": { "key": "fixture",    "canonical": true,  "canonicalHeldBy": "fixture" }
  "edition":  { "declared": "no", "declaredSource": "env:OKAM_EDITION",
                "market": "no", "locale": "no", "i18nLocale": "no", "documentLang": "no",
                "identitySource": "app:vuex+app:i18n+dom:html-lang", "unresolved": null }
  "screenshots": ["modal-scroll-lock/fixture/01-login-modal-body-locked.png", …]

runs/modal-scroll-lock.fixture-ch.playwright.json       <- the file the Swiss run wrote
  "artifact": { "key": "fixture-ch", "canonical": false, "canonicalHeldBy": "fixture" }
  "edition":  { "declared": "ch", "declaredSource": "env:OKAM_EDITION",
                "market": "ch", "locale": "de", "i18nLocale": "de", "documentLang": "de-CH",
                "identitySource": "app:vuex+app:i18n+dom:html-lang", "unresolved": null }
  "screenshots": ["modal-scroll-lock/fixture-ch/01-login-modal-body-locked.png", …]
```

Before this change **both of those runs wrote `artifacts/journeys/modal-scroll-lock.playwright.json`
and one file survived, carrying nothing that named either build.** Now: two filenames, two screenshot
folders, and the Swiss run declines the canonical slot and says who holds it. The ledger — the record
no later run can touch — carries both columns, so the four lines can be told apart without opening a
file:

```
05:41:41 fixture    edition=no locale=None running canonical=True
05:42:05 fixture    edition=no locale=no   passed  canonical=True
05:42:21 fixture-ch edition=ch locale=None running canonical=False
05:42:30 fixture-ch edition=ch locale=de   passed  canonical=False
```

**The walk is `test/e2e/journeys/modal-scroll-lock.spec.js`, UNCHANGED — no spec in this repo was
touched.** It was chosen because it is the one journey of the twenty-two that asserts **no copy at
all**: zero `getByText`/`getByRole`-by-name/`toHaveText` sites, so it passes at either edition without
a parameterised expectation table, and what it demonstrates is therefore the HARNESS rather than one
spec's cleverness. That it really drove the Swiss bundle is legible in its own step details, which are
read off the DOM and not declared: *`body class "okam-ch noscroll"`* — the class `layouts/default.vue`
contributes only when the market is Swiss.

## 2. Name, content, or both — and the argument

**Both, and they say different things.** Rejected, with reasons:

| option | why not on its own |
|---|---|
| content only | the two runs still collide on one filename and one screenshot folder; the survivor is honest about itself and the other run is **gone**. That is the evidence destruction `artifact-store.js`'s own header was written about. |
| name only | invisible to every reader and probe that opens the JSON — and it is the JSON the plan log and the census join on. A reader who has the file open still cannot answer "which build?". |
| suffix the JOURNEY ID (what `L-JOURNEY-AT-DE` did for one walk) | it works, and it moves the **join key**: `margin-statement-week-de` is a different journey to every probe, so the Swiss evidence stops counting toward the Norwegian journey's coverage and the two can never be compared as one journey at two editions. Right for one walk under time pressure, wrong as the general rule. |

So the edition went into `artifact-store.js`'s **backend key** — the segment that already exists to
keep two worlds from overwriting each other — and the resolved locale into the **content**.

**The name carries the DECLARED edition; the content carries what the app RESOLVED.** That asymmetry
is forced, not stylistic: `beginRun` files a provisional `"status": "running"` record **before the
browser opens**, and the finished record has to land on top of it. A key derived from what the app
resolved is unknowable at that moment, and a key that changed between the two writes would strand a
`running` file under the old name forever — which is defect 2 in `artifact-store.js`'s header wearing
a different hat. Pinned by
`test/journey-artifact-store.test.js`: *"keys on the DECLARED edition, so the provisional record and
the final one land on each other."*

**What stops the name from being a lie is §3.**

## 3. Record what the run RESOLVED, not what it was asked for

`OKAM_EDITION` is read out of this process's own environment. An artifact that echoed it would be
reporting its own configuration and would agree with itself by construction — exactly what
`apiBaseUrl` did before `servingFixture` existed. So `edition` has one half that is an input and
three that are read **out of the running page**:

```
declared      env:OKAM_EDITION            the INPUT, labelled as one
market        Vuex state.market           the EDITION constant as it reached the BUNDLE
locale        Vuex state.adminLocale      what every $i(...) rendered against — THE LANGUAGE
i18nLocale    nuxt-i18n's active locale   the same build flag down a path that never touches Vuex
documentLang  <html lang>                 the DOM's rendered consequence — recorded, NOT a second opinion
```

`judgeEdition` compares **`market` against `declared`** and nothing else. It deliberately does **not**
check the locale against a table of `edition -> language`: that table exists once, in
`config/edition.js`, and a copy of it in the harness is the same "second statement of a fact, going
stale in the direction nobody looks" that killed both harness copiers. A build where the flag arrived
and the language did not is a **product** defect, and the instrument for it is a spec asserting the
sentences an operator reads — which is what `L-JOURNEY-AT-DE` built.

**Fail-closed on contradiction, open on silence**, the same asymmetry as `fixture-provenance.js`: a
page with no Vue root (the consumer checkout, and both proof harnesses' fifteen-line stand-in app)
records `identitySource: "none"` with an `unresolved` sentence and reds nothing.

## 4. Falsification — the declared edition and the served one pulled apart

A field that is always populated proves nothing, and a field that merely echoes `process.env` would
have looked identical in §1. So the two were made to **disagree**, in the exact shape the guard names:
`test/e2e/scripts/dev-server.js` mutated to pin the child's `OKAM_EDITION`/`EDITION` to `no` — the
`reuseExistingServer` case reproduced honestly, where the whole app under test is compiled at `no`
while the runner says `ch` from first line to last.

| arm | world | result | what it establishes |
|---|---|---|---|
| **A1 / C1** | `OKAM_EDITION=no`, unmutated | **PASS**, key `fixture`, `market no / locale no` | the default edition's key is byte-identical to what it has always been |
| **A2 / C2** | `OKAM_EDITION=ch`, unmutated | **PASS**, key `fixture-ch`, `market ch / locale de / html de-CH` | §1 |
| **B1** | declared `ch`, **served `no`** | **FAIL**, rc=1 — and **all eight steps passed** | ← THE FALSIFICATION |
| **B2** | the same world, `judgeEdition` disabled | **PASS**, rc=0 — and the artifact **still records `declared ch / market no`** | the red was the guard, and the record does not depend on it |

**B1 is the case no other guard in this harness can see.** The fixture was this checkout's, the
granted port served everything, the spec bypassed nothing, and the journey itself was entirely happy:
`1 failed` with eight green steps and this on the record —

```
"edition": { "declared": "ch", "market": "no", "locale": "no",
             "i18nLocale": "no", "documentLang": "no",
             "identitySource": "app:vuex+app:i18n+dom:html-lang" }
"error":   "This run was launched at edition `ch` (env:OKAM_EDITION), and the app that answered
            resolved market `no` and rendered in `no`. …"
```

Every assertion that does not name a translated string passed against the wrong bundle, and the old
receipt would have written `ch` because that is the number this process was handed.

**B2 is what makes B1 mean something.** With one expression neutered (`judgeEdition` → `null`, the
recording untouched) the same world goes **green again** and the artifact **still says
`declared ch / market no`** — so the red came from the guard, and the recorded facts are read from the
page independently of it. Each mutation was asserted landed before its result was trusted
(`grep -c FALSIFICATION-B` → 1, `grep -c "judgeEdition({ edition"` → 0) and reverted with
`git checkout --` in this lane's own worktree; `git status --porcelain --untracked-files=all` → 0
after each, and `HEAD` is still `adde936`.

## 5. Both provers, re-measured at `adde936` from a clean tree

Not taken on report, and not inherited from the pre-commit run.

```
CI=1 node test/e2e/scripts/guard-proof.js               All 10 arms held.  EXIT=0
CI=1 node test/e2e/scripts/build-provenance-proof.js    All 5 arms held.   EXIT=0
```

`runs/guard-proof-at-adde936.txt`, `runs/build-provenance-proof-at-adde936.txt`. Both name the ref
they measured: `build-provenance-proof.js` prints
`web-artloc@adde9364eee47a71a9feb97c1b807896e9af40cb` with **no `+dirty`**.

**And its table of copied support files now lists SIX, `edition.js` among them.** That is the
`7030c00` repair doing its job in the exact way it was built for: this change adds a `require` to
`journey.js`, which is precisely the edit that killed the last prover — and neither prover was touched
here, neither has a list to update, and both stayed green.

`test/journey-artifact-store.test.js`: **39 passed, 2 failed** against **36 passed, 2 failed** at
baseline (measured by stashing this lane's diff and re-running). The two failures are pre-existing and
unrelated — `expect(build.id).toMatch(/^Web-modules@…/)` hard-codes a worktree basename and reds in any
worktree not called `Web-modules`, which is `L-WORKTREE-BASENAME-PIN`'s subject. `eslint` on the three
changed support files reports the same two errors as the baseline, in the same two places, and no
others.

## 6. Nothing is renamed, and what a later lane would have to do

**No committed artifact changes name or content because of this lane.** `keyOfRecord` reads a missing
`edition` as the default edition, and the default gets **no** segment — so a legacy record still keys
`fixture` / `live-<where>-<build>` and is still displaceable by its own re-run. Verified three ways:
the unit test *"leaves the default edition unsuffixed, so no committed artifact is renamed"*, the A1
and C1 runs writing `fixture` exactly as before, and the tracked
`artifacts/journeys/modal-scroll-lock.playwright.json` being restored byte-clean after every arm.

**Counted rather than assumed.** The brief says sixty-five committed receipts. On the refs reachable
from this worktree I measure **18 committed `*.playwright.json` on `feature/restaurant-modules`, 29 on
`candidate/fe-compose-2026-08-05`, and 41 distinct paths across all local branches** — so the 65 is
either estate-wide beyond these refs or counts something this worktree cannot see. **Whatever the
figure, none of them carries an `edition` field**, checked by reading every one out of every local
branch. The ruling is unaffected either way; the number is flagged because a lane that plans a rename
will need the right denominator.

A later lane that wants every artifact to name its edition has two moves, and they are not equal:

1. **Backfill the field.** Cheap, and it must **not** write `"declared": "no"`. Nobody witnessed those
   runs' editions; the honest backfill is `{ declared: null, unresolved: "written before this field
   existed" }`, which is what the `unresolved` slot is for. Writing `no` would be the nineteen-artifacts
   problem again — a field a branch cannot produce, asserted anyway.
2. **Suffix the default edition too**, so the name is uniform. That renames every canonical file and
   every screenshot folder on every ref at once, breaks every count that globs
   `artifacts/journeys/*.playwright.json`, and orphans every probe and plan-log row joined on the old
   names. It is a migration with its own review, and it is not worth it merely for symmetry.

## 7. Stated limits

- **The locale is recorded, not judged.** A build where `OKAM_EDITION=ch` arrived and the language did
  not would pass this guard; catching it needs a spec that asserts German sentences, which is
  `L-JOURNEY-AT-DE`'s floor and covers one fiscal surface.
- **`documentLang` is not an independent oracle.** `layouts/default.vue` derives it from
  `$store.getters.marketIsCh`, i.e. from the same Vuex market. It is recorded because a layout that
  stopped following the market would show up here and nowhere else, and it is labelled in the source
  so no reader takes it for a second opinion. `i18nLocale` **is** independent of the store — nuxt-i18n
  is configured from the build flag in `nuxt.config.js` — and it moved with the edition in every arm.
- **One journey, not twenty-two.** The change is in the harness, so every journey gets the field for
  free; but only `modal-scroll-lock` has been **walked** at both editions here. Any other journey
  driven at `de` will still need its own copy expectations, which is a spec's job and not this one's.
- **The canonical slot is contested, not shared.** Two editions of equal rank mean the first to run
  keeps `artifacts/journeys/<name>.playwright.json` and the second files under `runs/` saying who
  holds it. The holder's own file does **not** name the other edition; the ledger and the loser's file
  do. A reader who opens only the canonical file learns which edition it is, not that another exists.
- **`artifacts/` is gitignored wholesale** (`.gitignore:98`), with 16 paths force-added. So
  `git clean -fd -- artifacts` does not remove `runs/`, and the ledger accumulated across arms until it
  was cleared by hand before B1 and C1. Recorded because a reader comparing ledger line counts between
  arms would otherwise reach a wrong conclusion.

## 8. Constraints

No migration, no SQL, no container, no money-path write, no statutory string, no feature flag, no log
or telemetry call added. C3 is the one this lane touches and it is closed in the same commit:
`edition.js` is required by `journey.js`, `journey.js` calls both of its entry points, `artifact-store.js`
consumes the field, and the two provers resolve and copy it without being edited.

## 9. How to re-run

```
lanes/L-ARTIFACT-NAMES-ITS-LOCALE/run-journey.sh <label> no      # the Norwegian walk
lanes/L-ARTIFACT-NAMES-ITS-LOCALE/run-journey.sh <label> ch      # the Swiss one
LANE_KEEP_TREE=1 …                                               # leave artifacts/ for the next arm
```

The runner aborts if 3841 or 4841 is busy, if `core/` is empty, or if `node_modules` is missing, and
classifies the outcome as `PASS` / `FAIL-ASSERT` / `HARNESS` so a walk that never started can never be
read as an edition verdict.
