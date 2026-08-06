# L-GUARD-REPAIR-LANDS — both provers green from one committed ref

**Ref** `7030c00122e026f077bdb1bfecee1c916ca72d67` on `lane/guard-repair-lands`, parent
`e34977acebd59b223584158c33451b6f1ffd82c1`. **Worktree** `/Users/svendaneel/okam/web-guardland`
(basename is not `Web-modules`; `node_modules` symlinked to the shared tree; `core` submodule
initialised at `1bcab0b6`). Nothing pushed, no shared branch touched, no container started, port 4010
never bound, pid 73160 never signalled. `/Users/svendaneel/okam/web-whoanswered` was read and never
written — its `git status` is the same eight paths before and after.

---

## 1. The mechanism, in my own words

**A harness that enumerates its dependencies by hand is not a list that goes stale when somebody edits
it. It goes stale when somebody edits a file it has never heard of** — in a different commit, for a
different reason, with no diff that touches the prover. Nobody reviewing that commit is looking at the
prover, and the prover does not complain: it copies exactly what it was told, builds a tree that is
missing one module, and the child dies in module load. `playwright` then reports `No tests found`,
which reads like an empty test directory rather than a broken import.

That is not a theory. `94fa256` added `require('./world-stamp')` at `artifact-store.js:138` and killed
`guard-proof.js` twelve hours later without touching it — 9 of 10 arms dead, arm 3 the lone survivor
because "exit 1 / no artifact" is what it expects anyway, so **a module-load death has the same
signature as one of the arms passing.**

**Both provers in this tree copied by hand, and both lists have now gone stale by something unrelated
being fixed.** The individual omission is not the defect. The list is.

- `guard-proof.js` — list went stale on `require('./world-stamp')`.
- `build-provenance-proof.js:185` — list went stale on `require('./fixture-provenance')`, added by the
  repair itself. Its four names were complete only by coincidence of the require graph on the day they
  were written.

**A third was searched for and there is none.** `grep -rn 'copyFileSync\|cpSync' test/e2e/scripts/
scripts/` returns exactly two sites at this ref, both inside `harness-copy.js`'s callers.
`global-teardown.js` and `live-world.sh` mention `test/e2e/support/` but neither copies it.

---

## 2. What landed

Nine files, staged by explicit pathspec, committed into this lane's own worktree.

| file | what |
|---|---|
| `test/e2e/scripts/harness-copy.js` | **new** — `copySupportClosure`, closure from Node's own loader |
| `test/e2e/scripts/guard-proof.js` | uses the copier instead of two `copyFileSync` lines; `/__fixture/health` stand-in answers port/pid/cwd |
| `test/e2e/scripts/build-provenance-proof.js` | **this lane's change** — uses the copier instead of its four-name list |
| `test/e2e/support/journey.js` | records `servingFixture` and `nodeCalls`; `NATIVE_FETCH` so the harness never logs its own traffic |
| `test/e2e/support/fixture-provenance.js` | **new** — `resolveServingFixture`, `NodeCallLog` |
| `test/e2e/scripts/serving-fixture-proof.js` | **new** — already a `harness-copy.js` caller |
| `test/e2e/fixture/api-server.js` | `/__fixture/health` answers `pid` and `cwd` beside the port it bound |
| `test/e2e/fixture/consumer-api-server.js` | the same route, which previously answered no port at all |
| `package.json` | `test:e2e:serving-fixture-proof` script |

The eight overlay files were copied out of `web-whoanswered` and verified **byte-identical by sha256**
before commit. The ninth change — `build-provenance-proof.js` — is this lane's, and it is the only edit
made to the repair as it stood.

**Why the loader and not a regex.** `harness-copy.js`'s own header records that a scan was written
first and produced a plausible wrong answer within one run: a support header contains the glob
`artifacts/journeys/*.playwright.json` inside a `//` comment, whose `/*` opens a block comment that
swallows the real `require('./world-stamp')`. The tool meant to prevent the failure reproduced it.
`module.children` cannot be fooled by a comment.

**Why it refuses rather than skips.** A dependency resolving outside `test/e2e/support/` throws with a
sentence. Skipping it would rebuild the exact quiet death.

---

## 3. Both provers, re-measured at that ref, by me

Tree clean and `HEAD == 7030c00` at both runs (`git status --porcelain | wc -l` → 0). Not taken on any
sibling's report.

```
CI=1 node test/e2e/scripts/guard-proof.js              All 10 arms held.  EXIT=0
CI=1 node test/e2e/scripts/build-provenance-proof.js   All 5 arms held.   EXIT=0
```

- `runs/guard-proof-at-7030c00.txt` — arms `1,2,3,4,5,S1,S2,M1,M2,M3` all `ok`.
- `runs/build-provenance-proof-at-7030c00.txt` — arms `1,2,3,4,5` all `ok`.

**The runs testify to the ref rather than to their configuration.** Both print
`journey.js  6dd043e1f34648c3fc5f322c0a777247b35c1d591766991b8ff0621c51e631c2`, which equals
`git show 7030c00:test/e2e/support/journey.js | shasum -a 256`. `build-provenance-proof.js` additionally
prints `web-guardland@7030c00122e026f077bdb1bfecee1c916ca72d67` — **no `+dirty` suffix**, so the run
itself records that the tree it measured was the committed one.

**Its sha table now lists five files, not four** — `artifact-store.js`, `fixture-provenance.js`,
`journey-assertions.js`, `journey.js`, `world-stamp.js`. That table is fed by the copier's return value,
so it now names every support file the harness is actually made of instead of four it was assumed to be.

**These two have never been green together before this ref.** `eslint` on all three scripts: exit 0.

---

## 4. Falsification — three deliberate breaks, all red

A prover that passes because it copied fewer files is the failure being fixed, so a green that was never
shown capable of going red is worth nothing.

| # | break | result | evidence |
|---|---|---|---|
| **F1** | `build-provenance-proof.js` put back to its four-name list, repair otherwise intact | **5 of 5 arms did not do what they must**, `EXIT=1`, `Cannot find module './fixture-provenance'` ×5, `at ../support/journey.js:150` | `runs/F1-build-provenance-with-stale-hand-list.txt` |
| **F2** | `guard-proof.js` put back to its two `copyFileSync` lines | **9 of 10 arms did not do what they must**, `EXIT=1` — and **arm 3 is the lone `ok`**, exactly the death signature the census recorded at `e34977a` | `runs/F2-guard-proof-with-stale-hand-list.txt` |
| **F3** | `world-stamp.js`'s `readStamp` blinded to return `null` | **5 of 5 arms did not do what they must**, `EXIT=1`, and **zero occurrences of `Cannot find module` or `No tests found`** — every arm reds on its own assertion (`expected okamapi-alpha@… from /^stamp:/`), not on a load death | `runs/F3-build-provenance-stamp-reader-blinded.txt` |

**F1 is the landing blocker, reproduced at this ref rather than inherited.** The census measured 5/5 pass
with the committed `journey.js` and 5/5 fail under the repair; F1 is the same fact stated from the other
side — the repair landed, the list restored, still 5/5 fail.

**F2 shows the class is not specific to one prover.** Same substitution, same death, in the other script.

**F3 is the one that makes the green mean something.** F1 and F2 both red by module-load death, which is
consistent with "nothing loaded". F3 breaks the *subject* while everything loads, and the arms still red
— so the 5/5 green is measuring `backendBuild` against a stamp, not merely reporting that a file was
found. `world-stamp.js`'s printed sha changes to `9e02b3ac…` in that run, and the port-would-say line
gains `+dirty`, both of which say the run knew what it was measuring.

**Every mutation was asserted landed before its result was trusted** — `grep -c "copySupportClosure({"`
→ 0 for F1/F2, `grep -n "FALSIFICATION"` → line 210 for F3 — because a `perl`/`python` substitution that
silently no-ops while the suite reports green is the fourteenth trap on the orchestrator's list. Each was
reverted with `git checkout --` in **this lane's own worktree**, and `git status --porcelain | wc -l`
returned 0 after each.

---

## 5. What this unblocks and what it does not

**Unblocked.** The ten `arm-N.provenance-probe` receipts (census rows 16-20, 37-41) were recorded as
*unwitnessed, re-runnable, blocked on one line*. That line is fixed and its prover is green at this ref,
so they are now re-establishable under the repaired guard. **This lane did not re-establish them** — that
is a capture act, not a landing act, and it was not in these exit criteria.

**Not addressed here.**

- The repair still does not exist on any *shared* ref. It is on `lane/guard-repair-lands` in this
  worktree, one branch, unpushed. It is no longer on zero refs and no longer one `git checkout --` from
  gone, which was the finding.
- Carrying it onto `candidate/fe-compose-2026-08-05` and the five lane branches is still a merge, not a
  copy: that candidate's `test/e2e/support/` has moved `journey.js +74`, `world-stamp.js +369`,
  `api-server.js +646` since `e34977a`, and overlaying would silently revert another lane's harness work.
- The 15 PRE-PROOF and 26 DEAD committed receipts are unchanged by this lane.

**Constraints.** No migration, no SQL, no container, no money-path write, no statutory string, no log
call added; the two fixture `/__fixture/health` routes newly answer `pid`, `cwd` and `port` — a process
id, a working directory and a port number, no token, key or secret (C7). C3 is the one this lane is
about: a prover copying a stale list is a capability nothing can reach, and the copier plus both callers
land in the same commit.
