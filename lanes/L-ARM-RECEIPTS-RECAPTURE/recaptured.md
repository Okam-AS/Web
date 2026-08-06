# L-ARM-RECEIPTS-RECAPTURE — the ten arm-N receipts, re-taken at `7030c00`

**Worktree** `/Users/svendaneel/okam/web-armrecapture`, detached at
`7030c00122e026f077bdb1bfecee1c916ca72d67`, basename is not `Web-modules`, `node_modules` symlinked to
the shared tree, `core` submodule initialised at `1bcab0b6`. Nothing pushed, nothing committed to any
branch, no container started. **Port 4010 was never bound and pid 73160 was never signalled** — 73160
was *observed* holding 4010 and left alone. Every port this lane used was an ephemeral `listen(0)`
port chosen by the kernel. `CI=1` on every invocation.

---

## 0. The verdict up front

Three of the four exit clauses are met. **One is not, and it is not met because it cannot be met at
this ref.** The details are §4; the short form is that all ten of these receipts are `backend: "live"`,
and `journey.js:657` at `7030c00` deliberately declines to resolve `servingFixture` for live backends.
Reported as `fail-spec` rather than worked around, because working around it means editing the
`journey.js` whose sha is the thing both provers testify to.

**Ruled `respec-per-backend`, 2026-08-05.** The clause is to be rewritten, not satisfied. **§7 states
the contract that replaces it** — measured, not asserted — and gives the exact replacement sentence.
The ten receipts of §2 are unchanged and were re-verified byte-for-byte before §7 was written.

---

## 1. Clean tree, re-measured myself, both provers green together

Not taken on the repair lane's report. Run from this lane's own worktree, from a clean tree, with **all
output written outside the worktree** so the run could not dirty the thing it was measuring.

```
PRE  porcelain=0  HEAD=7030c00122e026f077bdb1bfecee1c916ca72d67
CI=1 node test/e2e/scripts/guard-proof.js              All 10 arms held.  EXIT=0
POST porcelain=0
CI=1 node test/e2e/scripts/build-provenance-proof.js   All 5 arms held.   EXIT=0
POST porcelain=0
```

- `runs/guard-proof-at-7030c00-clean.txt` — arms `1,2,3,4,5,S1,S2,M1,M2,M3` all `ok`, EXIT=0.
- `runs/capture-A-rows-16-20.txt`, `runs/capture-B-rows-37-41.txt` — arms `1..5` all `ok`, EXIT=0.

**Both runs testify to the ref, not to their configuration.** Both print

```
journey.js  6dd043e1f34648c3fc5f322c0a777247b35c1d591766991b8ff0621c51e631c2
```

which equals `git show 7030c00:test/e2e/support/journey.js | shasum -a 256` — verified in this lane.

**And the build id carries no `+dirty`:**

```
the port would say     web-armrecapture@7030c00122e026f077bdb1bfecee1c916ca72d67
```

### The first attempt printed `+dirty`, and that is worth recording

My first pass wrote its run logs to `lanes/L-ARM-RECEIPTS-RECAPTURE/runs/` **inside the worktree**.
Two untracked `.txt` files were enough to make `git status --porcelain` non-empty, and the prover
correctly stamped every arm-3 artifact
`web-armrecapture@7030c00122e026f077bdb1bfecee1c916ca72d67+dirty`
(`runs/build-provenance-at-7030c00-MINE.txt`). That capture was discarded and everything was moved
outside the worktree before the real one. **The instrument caught its own operator**, which is the
only reason this section can be written truthfully — and it is a live hazard for any lane that files
evidence into the checkout it is measuring.

---

## 2. The ten, re-captured

Two independent capture events, one per original set, matching the two original capture events.
`PROVENANCE_PROOF_OUT` pointed outside the worktree in both.

| census row | original path | re-captured to |
|---|---|---|
| 16-20 | `lanes/L-LIVE-BUILD-EXPORT/journey-artifacts/arm-{1..5}.provenance-probe.playwright.json` | `recaptured/L-LIVE-BUILD-EXPORT/` |
| 37-41 | `lanes/L-WORLD-STAMP-WINDOWS/provenance-arms/arm-{1..5}.provenance-probe.playwright.json` | `recaptured/L-WORLD-STAMP-WINDOWS/` |

```
af201f3f…  L-LIVE-BUILD-EXPORT/arm-1     a0cc47ce…  L-WORLD-STAMP-WINDOWS/arm-1
153d6fa7…  L-LIVE-BUILD-EXPORT/arm-2     6d8dfe1a…  L-WORLD-STAMP-WINDOWS/arm-2
5408f57f…  L-LIVE-BUILD-EXPORT/arm-3     f5cfcdc5…  L-WORLD-STAMP-WINDOWS/arm-3
cbacf37f…  L-LIVE-BUILD-EXPORT/arm-4     990e4079…  L-WORLD-STAMP-WINDOWS/arm-4
e800ac66…  L-LIVE-BUILD-EXPORT/arm-5     a32c6b06…  L-WORLD-STAMP-WINDOWS/arm-5
```

The originals were read from where they actually live, not from a convenient ref: rows 16-20 from
`7030c00` (they are in its tree), rows 37-41 from `997936a`, **which is not an ancestor of `7030c00`**
and whose files are therefore absent from it. Reading them from the tip would have compared nothing.

**The probe reproduced exactly.** Field-for-field, every pair is identical on `journey`, `title`,
`status`, `surface`, `backend`, `capabilities`, `commit`, `underTest`, `backendProbe.status`,
`backendProbe.body`, `backendServed`, `backendSubjectServed`, `foreignSubjectServed`,
`foreignSubjectSample`, `findings`, `error`, `consoleErrors`, `failedRequests`, `screenshots`,
`artifact.canonical`, `artifact.provisional`, `artifact.supersedes`. Everything that moved is
provenance, and that is the point.

---

## 3. What changed — the two findings

**Nothing here re-captured byte-identical.** Ten of ten differ, and two differences are substantive
rather than clock-and-port.

### 3.1 Both arm-3 receipts named a build nobody can check out

Arm 3 is the arm whose whole job is to record the *port's* answer once the stamp is refused. Both
originals recorded a dirty tree:

| row | original `backendBuild.id` | re-captured |
|---|---|---|
| 18 | `Web-modules@22f21082e7248862ebf6606f1966f50da2fc9531+dirty` | `web-armrecapture@7030c00122e026f077bdb1bfecee1c916ca72d67` |
| 39 | `Web-modules@e34977acebd59b223584158c33451b6f1ffd82c1+dirty` | `web-armrecapture@7030c00122e026f077bdb1bfecee1c916ca72d67` |

Two things follow, and both are measured rather than argued. First, the `+dirty` suffix means the id
names a tree that no longer exists and cannot be reconstructed — **the receipt records a build nobody
can check out**, which is exactly the property these ten were re-taken for. Second, the prefix is the
basename of the cwd of the process that held the port, so both captures ran out of
`/Users/svendaneel/okam/Web-modules` — **the shared main checkout**, not a dedicated worktree. That is
also how they came to be dirty.

### 3.2 Rows 37-41 record two fields their own committed harness cannot produce

The originals at `997936a` carry `proxiedSubjectServed: 0` and `proxiedSubjectSample: []`.
Those two fields **do not exist** in `test/e2e/support/journey.js` at `7030c00`, at `e34977a`, at
`997936a` itself, or at `94fa256` — measured as 0 files under `test/e2e/support/` at each of the four.
They are produced by exactly one `journey.js`, added by `9d4399a`
(*"A subject fetched through the same-origin proxy stops reading as zero"*, 2026-08-04T16:12:25+02:00)
on `lane/L-JOURNEY-PROXY-BLINDSPOT`, which descends from `e34977a` and **is not an ancestor of
`7030c00`**.

Put beside §3.1 the timeline closes: the capture ran in `Web-modules` at `e34977a` with a dirty tree,
that dirty tree held `9d4399a`'s `journey.js`, and the resulting receipts were committed 7 h 19 min
later into `997936a` — a tree whose own harness cannot emit the fields the receipts contain.

**This is the first direct evidence in this plan of what the dead guard was letting through.** Not a
weaker claim than recorded; a receipt filed against a harness that never produced it. A reader
diffing `997936a`'s `journey.js` against those receipts would find two fields with no source. The
guard that would have refused a harness it could not account for had been dead for 13 h 18 min.

### 3.3 Everything else that moved

Ephemeral ports (`62617/62618` and `59871/…` → `52532/52533` and `52945/…`), the throwaway
alpha/beta checkout shas (fresh `git init` per run, so they must differ — and arms 1/2 differing from
each other **within** a run is the discrimination arm 2 exists to show), timestamps, `durationMs`,
`artifact.key`/`file`/`canonicalHeldBy` (derived from port + build short), and `backendBuild.detail`
(carries the stamping timestamp and pid).

### 3.4 Both sets gained `servingFixture` and `nodeCalls`

All ten originals have neither key. All ten re-captures have both — `nodeCalls: []` on every arm,
correctly, since the probe spec drives only the browser. `servingFixture` is §4.

---

## 4. The exit clause that cannot be met at this ref

> *"each carrying `servingFixture` resolved to this run's own fixture"*

**Measured on all ten:**

```json
"servingFixture": { "origin": "http://127.0.0.1:52532", "identitySource": "none",
  "unresolved": "live backend — which build answered is recorded in `backendBuild`, and a live
                 API's working directory is not this checkout by design" }
```

`identitySource` is `none` on every one of the ten, and it is not a defect. `journey.js:657` at
`7030c00` reads:

```js
if (meta.backend === 'fixture') {
  meta.servingFixture = await provenance.resolveServingFixture(meta.apiBaseUrl, NATIVE_FETCH);
} else { … identitySource: 'none' … }
```

with a ten-line comment giving the reason: the question *"is this process running out of THIS
checkout?"* has a right answer for the throwaway fixture and **no right answer for a live API**, whose
working directory is a backend checkout or a container by design. Identity for live worlds is
`backendBuild`'s job.

**Every one of these ten receipts is `backend: "live"`.** `build-provenance-proof.js` asserts
`result.artifact.backend === 'live'` as an arm condition, and its stand-in API 404s
`/__fixture/health` on purpose so that `journey.js`'s live-mode preflight does not refuse it as a
fixture. So `health` structurally cannot answer for this family, and the `fixture` branch is
structurally not taken.

**Where the clause came from.** `L-JOURNEY-ARTIFACTS-UNWITNESSED` §4 re-ran five *fixture-backed*
journeys and got `identitySource: "health+lsof"` on all five — correctly, they are `backend:
"fixture"`. The brief generalised that to these ten. The generalisation does not survive contact with
the receipt family: **`servingFixture` is a fixture-mode instrument and these are live-mode
receipts.**

**What stands in its place, and it is not nothing.** These ten do resolve who answered — through the
channel the repair designates for live worlds. Arm 3 is the proof it discriminates: with the stamp
invalidated it falls back to the port and names `web-armrecapture@7030c00…`, this run's own process,
this run's own cwd, no `+dirty`. Arms 1/2 name two different stamped checkouts on the same port, so
the value is shown to change rather than merely to exist.

**Not improvised around.** Making the clause literally true would mean editing `journey.js` to resolve
`servingFixture` for live backends — changing the file whose sha256 is the very thing both provers
print to testify to this ref, and overturning a documented design decision from a lane that is not
this one. Ruled a spec gap and returned.

---

## 5. What was skipped, and why

- **The other 31 census receipts** (15 PRE-PROOF, 16 DEAD outside rows 16-20/37-41) are out of scope;
  their reasons stand as `witnessed.md` §6 recorded them.
- **`meals-statement-month` (rows 27-29)** — declined a third time. Its first API call is a mutating
  `POST …/statements/drafts` followed by an irreversible `/finalize`. Two lanes have declined it; this
  one does not reverse that.
- **The six `*.live.playwright.json` captures (rows 7, 10-14)** — need a SQL container, the migration
  chain and a real WebApi. **This brief grants no container slot.** Not attempted.
- **The twelve whose specs live only on lane branches** — carrying the repair there is a merge, not a
  copy, and not this lane's act.
- **Nothing was written to the original census paths.** The re-captures live under this lane's
  directory. Replacing the committed originals is a decision, not a capture, and the diff in §3 is
  more useful with both sides intact.

---

## 6. Reproducing every number here

```sh
git -C /Users/svendaneel/okam/Web-modules worktree add --detach \
    /Users/svendaneel/okam/web-armrecapture 7030c00
cd /Users/svendaneel/okam/web-armrecapture
ln -s /Users/svendaneel/okam/Web-modules/node_modules node_modules
git -c protocol.file.allow=always submodule update --init core

L=/Users/svendaneel/okam/Web-modules/lanes/L-ARM-RECEIPTS-RECAPTURE   # OUTSIDE the worktree

git status --porcelain | wc -l                                 # must be 0, or every id gets +dirty
CI=1 node test/e2e/scripts/guard-proof.js              > "$L/runs/g.txt"   # 10/10, exit 0
CI=1 PROVENANCE_PROOF_OUT="$L/recaptured/L-LIVE-BUILD-EXPORT" \
     node test/e2e/scripts/build-provenance-proof.js   > "$L/runs/a.txt"   #  5/5, exit 0
CI=1 PROVENANCE_PROOF_OUT="$L/recaptured/L-WORLD-STAMP-WINDOWS" \
     node test/e2e/scripts/build-provenance-proof.js   > "$L/runs/b.txt"   #  5/5, exit 0

# §3.2 — the field with no source, note ${r} braces, zsh eats $r:t
for r in 7030c00 e34977a 997936a 94fa256; do
  echo "$r $(git grep -l proxiedSubjectServed "${r}" -- test/e2e/support/ | wc -l)"; done   # all 0
git grep -l proxiedSubjectServed $(git for-each-ref --format='%(refname)' refs/heads) -- test/ \
  | grep -v playwright.json     # -> lane/L-JOURNEY-PROXY-BLINDSPOT + two descendants only
```

---

## 7. The two-family contract — what replaces the unmeetable clause

**Ruled `respec-per-backend` on 2026-08-05.** §4 established that the clause cannot be met. This
section states what is *actually* true of a receipt's identity fields, so the exit can be closed
against something true instead of against a sentence that gates nothing.

**Provenance of every number in this section.** The instrument runs are from
`/Users/svendaneel/okam/web-armrecapture`, detached at `7030c00`, **`porcelain` 0 before and after
each**. The estate-wide census is a *filesystem* scan of `/Users/svendaneel/okam/Web-modules` at
`8ac6f63` on `lane/focustrap-teardown`, **`porcelain` 341** — dirty by design, because the census must
see untracked lane evidence that no tree contains. 182 `*.playwright.json`, 0 unparsable.

### 7.1 The contract

A receipt answers **"who answered the port?"** through exactly one channel, and **which channel is
decided by `backend`, not by the capture.** The two are not alternatives a capture may choose between.

| | **fixture-backed receipt** | **live-backed receipt** |
|---|---|---|
| identity field | `servingFixture` | `backendBuild` |
| resolved by | `fixture-provenance.resolveServingFixture` — the fixture's own `/__fixture/health` testimony **and** `lsof` on the port, recorded separately | `artifact-store.resolveBackendBuild` — world stamp → `E2E_API_BUILD` → `OKAM_API_REPO` HEAD → port holder → Swagger route fingerprint → `null` |
| `identitySource` | `health+lsof` (or `health`/`lsof` alone) | **`none`, by design** — with the reason written into `unresolved` |
| carries | `origin`, `askedPort`, `reportedPort`, `reportedPid`, `reportedCwd`, `holderPid`, `holderCwd`, `holderCommand` | `id`, `source`, `short`, `detail` |
| the question it answers | *is this process running out of THIS checkout?* | *which build is on the other end?* |
| its prover | `test/e2e/scripts/serving-fixture-proof.js` | `test/e2e/scripts/build-provenance-proof.js` |

**Why the asymmetry is correct and not a gap.** `playwright.config.js` starts the throwaway fixture
from the config's own root, so its cwd *is* this worktree and anything else is another lane's server —
the question has a right answer. A live API's working directory is a backend checkout or a container
**by design**, so the same question has no right answer for it; `journey.js` writes down that it
declined rather than guessing. `fixture-provenance.js:44` states the principle the whole design turns
on: *"nothing is guessed: a question nobody could answer is written down as unresolved, with the
reason."*

### 7.2 The contract is exhaustive — 182 receipts, zero counterexamples

Every `*.playwright.json` in the estate, classified by `backend` × `servingFixture.identitySource`:

```
fixture (138)   field ABSENT 114    health+lsof 24    none  0
live     (44)   field ABSENT  29    health+lsof  0    none 15
```

- **No live receipt anywhere carries a resolved `servingFixture`. Not one, in 44.**
- **No fixture receipt anywhere carries `identitySource: "none"`. Not one, in 138.**
- The `ABSENT` column is the census's PRE-PROOF class: captured by a `journey.js` older than the field.

So the split is not a tendency in the data; it is total. The clause asked ten `backend: "live"`
receipts for a value that **no receipt of their family has ever held**, and the harness is the reason.

### 7.3 Both instruments are alive at the ref — re-measured today, not inherited

The brief's own hazard: *the guard prover was found dead twice, printing its table while every arm
died in module load.* So it was re-run rather than cited:

```
CI=1 node test/e2e/scripts/guard-proof.js             All 10 arms held.  EXIT=0   runs/guard-proof-recheck-2.txt
CI=1 node test/e2e/scripts/serving-fixture-proof.js   All 10 arms held.  EXIT=0   runs/serving-fixture-proof-at-7030c00.txt
CI=1 node test/e2e/scripts/build-provenance-proof.js  All  5 arms held.  EXIT=0   runs/capture-A-rows-16-20.txt, capture-B-rows-37-41.txt
```

**Each is load-proved by its own mutant arms**, which is the property a dead loader cannot fake: a
prover whose modules failed to load cannot make three deletions flip three arms from red to green.
`guard-proof` M1/M2/M3 and `serving-fixture-proof` M1/M2/M3 all flip as specified.

**Both sides of the contract therefore have a live instrument at one ref**: `serving-fixture-proof`
holds the fixture half (arms F1/F2 red a run whose granted port was held by another checkout's
fixture, F2 with a fixture too old to report pid and cwd — `lsof` alone), `build-provenance-proof`
holds the live half.

### 7.4 The replacement sentence

Current, at `docs/plan/plan.md:11902`:

> the arm-N receipts the artifacts census classified dead are re-captured at 7030c00 with both provers
> green, **each carrying servingFixture resolved to this run's own fixture**, recorded in
> lanes/L-ARM-RECEIPTS-RECAPTURE/recaptured.md

Proposed:

> the arm-N receipts the artifacts census classified dead are re-captured at 7030c00 with both provers
> green, **each carrying the identity its own backend family admits — for a live-backed receipt a
> `backendBuild` resolved to a named build, from a named source, whose id carries no `+dirty`; for a
> fixture-backed receipt a `servingFixture` whose `identitySource` is not `none`** — recorded in
> lanes/L-ARM-RECEIPTS-RECAPTURE/recaptured.md

`+dirty` is in the clause on purpose: it is the defect §3.1 found in **both** arm-3 originals, and
without it the clause would readmit the receipts this lane exists to replace.

### 7.5 The replacement gates something — applied mechanically to the estate

A rewrite that admits everything is the failure mode being corrected, so the proposed clause was run
as a predicate over all 182:

| | admitted | **refused** |
|---|---|---|
| live (44) | 27 | **17** = 7 with no `backendBuild` key at all + 7 with `backendBuild: null` + 3 whose id carries `+dirty` |
| fixture (138) | 24 | **114** — the pre-field harness class |
| **the ten of §2** | **10** | **0** |

**Two of the three `+dirty` refusals are census rows 18 and 39** — the arm-3 originals this lane
re-captured. The clause refuses, by its own terms, exactly the receipts §3.1 found defective, and
admits exactly the ten that replaced them. A third is a pre-existing live artifact carrying the same
defect — naming it here is not a claim on it and it is outside this lane's scope:

```
artifacts/journeys/runs/events-deposit-precondition.live-5093-fadc84a-dirty.playwright.json
```

### 7.6 What the replacement deliberately does not say

- It does not say a live receipt must resolve `servingFixture`. That is the clause being retired.
- It does not require `backendBuild` from any *particular* rung. The ten span three — `stamp` (6),
  `process` (2), `env` (2) — and arm 3's fall back to `process` **is** the discrimination that arm
  exists to demonstrate, so pinning the rung would break the proof it is quoting.
- It does not touch `journey.js`. Making the old clause literally true meant editing the file whose
  sha256 `6dd043e1…` is what both provers print to testify to this ref — which would invalidate all
  ten receipts and every green measured against it.
