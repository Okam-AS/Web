# L-PROVENANCE-EXCLUDES-LANE-EVIDENCE — a lane's receipts stop dirtying the build they attest

**Ref** `607f1385adeb430668d15e3259cc84bfc0d8fc5e` on `lane/provenance-excludes-lane-evidence`, parent
`7030c00122e026f077bdb1bfecee1c916ca72d67` (`lane/guard-repair-lands`). **Worktree**
`/Users/svendaneel/okam/web-provexcl` — basename is not `Web-modules`, `node_modules` symlinked to the
shared tree, `core` submodule at `1bcab0b6`. A second, pristine worktree at `7030c00` was stood up in
the session scratchpad for the BEFORE arms. Nothing pushed, no shared branch touched, no container
started, port 4010 never bound, pid 73160 never signalled.

**Where this lane's own evidence is, and why.** Inside the worktree it measures, at
`lanes/L-PROVENANCE-EXCLUDES-LANE-EVIDENCE/`. That is not carelessness and not a convenience — it is
the claim. Every build id below was taken with these files on disk. If the change is wrong, the ids in
this document are the first thing that goes `+dirty`.

---

## 0. The verdict, and the trade it was chosen against

**The exclusion was built. It is untracked-only, two named roots, one implementation, and it announces
itself on every artifact it touches.** The alternative — leave the check strict and write down that
evidence goes outside the tree — was the serious contender and lost on three measured points, not on
convenience.

**What the strict check would have cost.** A lane in its own worktree has exactly one source of dirt:
its own paperwork. So under the strict rule every receipt that lane produces is `+dirty`, and `+dirty`
stops separating *somebody edited the code* from *somebody wrote a log*. A marker that fires on every
run of the correct workflow is not a detection.

**What the convention would have cost, measured.** `L-ARM-RECEIPTS-RECAPTURE` followed it exactly and
its evidence went to `/Users/svendaneel/okam/Web-modules/lanes/L-ARM-RECEIPTS-RECAPTURE/` — outside
*its* tree, inside the **shared checkout**, which is the tree the two known-bad receipts were captured
from. "Outside the tree under measurement" means "inside somebody else's tree", and the estate's
bookkeeping is now **1,221 of the 1,356 dirty entries** in that shared checkout. The convention does
not remove the dirt; it moves it onto the checkout most likely to be measured next, and nothing warns
the lane that files it.

**What the exclusion costs, and the bound on it.** It widens the blind spot by exactly *new files
under two bookkeeping directories*. It is bounded from below by §3: the shared checkout still carries
**135 changed paths** under this rule and still reads `+dirty`, so the tree that produced the two
committed lies is not whitewashed by it — and for one of those two receipts that is provable rather
than argued.

**Where a fail-spec would have been right, and why it is not.** If the only honest answer had been
"change no code", the exit could not be met and saying so would have been the deliverable. It is not
the only honest answer, because the convention is unwritten, unenforced, and — measured above —
externalises the problem rather than solving it.

---

## 1. The rule, stated before the code

> **An untracked path under `lanes/` or `docs/plan/` is not a change to the build.**
> Everything else is.

Three properties do the work, and each was chosen against a broader version that would have been
easier:

**Untracked-only, not the directory.** `lanes/` is not scratch space. At `7030c00` it holds **125
tracked files** — 25 committed `.playwright.json` receipts and 13 executable proof scripts
(`.py`/`.js`/`.sh`) among them. A directory exclusion would let a run silently rewrite the corpus this
marker exists to protect and still call itself clean. Arm **A3** is that case, and it still reds.

**The trailing slash is load-bearing.** `lanes` and `docs/plan` as bare prefixes would take
`lanes-archive/` and `docs/plan-old/`, two directories the rule never named. Arm **A4** is that case,
and it still reds.

**`-uall`, and this was not reasoned about in advance.** `git status --porcelain` collapses a
wholly-untracked directory to its topmost untracked ancestor: a return filed at
`docs/plan/returns/L-X-1.md` in a tree where `docs/` is itself untracked reports as one line,
`?? docs/`, which a prefix rule cannot tell from a new source directory beside it. The first version
of this rule shipped without `-uall` and **the paired test caught it** on the arm that writes to both
roots at once — the one arm where the two roots differ in whether their parent is tracked. Expanded,
every entry is a file and the rule is decided per file. Cost on the worst tree on this machine (1,356
dirty entries): **0.066 s**.

---

## 2. Both arms, at both refs

`lanes/L-PROVENANCE-EXCLUDES-LANE-EVIDENCE/arms.txt` is the full transcript. The instrument lives
**outside every worktree** (session scratchpad) and reads both implementations plus raw `git status`,
so it cannot itself be the reason a tree looks clean.

| arm | tree | what was written | `git status` | **BUILD ID** |
|---|---|---|---|---|
| **B0** | pristine `7030c00` | nothing | 0 | `fixture@7030c00…` |
| **B1** | pristine `7030c00` | **one run log** under `lanes/<L>/runs/` | 1 | **`fixture@7030c00…+dirty`** ← the defect |
| **A0** | `607f138` | nothing | 0 | `fixture@607f138…` |
| **A1** | `607f138` | 3 evidence files, `lanes/` **and** `docs/plan/` | 2 | **`fixture@607f138…`** ← unchanged |
| **A2** | `607f138` | A1 **+ one source line** in `utils/price.js` | 3 | **`fixture@607f138…+dirty`** |
| **A3** | `607f138` | A1 + a **committed receipt under `lanes/`** rewritten | 3 | **`fixture@607f138…+dirty`** |
| **A4** | `607f138` | A1 + `lanes-archive/old.txt` | 3 | **`fixture@607f138…+dirty`** |
| **A5** | `607f138` | evidence only again | 2 | `fixture@607f138…` |

**A5 is why A2–A4 mean anything.** Returning to clean after each red shows the red was caused by the
write under test and not by residue. Every mutation was asserted landed before its result was trusted
(`grep -c` → 1 on the source edit) — a substitution that silently no-ops while the run stays green is
the recorded trap this program keeps paying for.

### The same pair through the real prover, not a helper

`build-provenance-proof.js` prints the id the port would answer with — the exact route that produced
the two committed `+dirty` receipts.

```
CI=1 node test/e2e/scripts/build-provenance-proof.js       # this lane's logs on disk in the tree
  the port would say  web-provexcl@607f1385adeb430668d15e3259cc84bfc0d8fc5e
  All 5 arms held.  EXIT=0

… one line appended to utils/price.js, occurrences asserted = 1 …
  the port would say  web-provexcl@607f1385adeb430668d15e3259cc84bfc0d8fc5e+dirty
  All 5 arms held.  EXIT=0
```

`runs/build-provenance-at-607f138.txt`, `runs/build-provenance-SOURCE-DIRTIED.txt`.

**And the artifact carries the blind spot with it**, which is the half of the exit that matters more
than the id. `artifacts/arm-3.provenance-probe.playwright.json`:

```json
"backendBuild": {
  "id": "web-provexcl@607f1385adeb430668d15e3259cc84bfc0d8fc5e",
  "short": "607f138",
  "detail": "branch lane/provenance-excludes-lane-evidence; 3 untracked paths under lanes/ or docs/plan/ ignored as lane evidence"
}
```

A reader an hour later cannot re-derive what a run declined to look at. Now they do not have to: a
clean id that was merely unexamined says so on its own face, with the count and the root names. The
note is absent when the exclusion did not fire, so it is never decoration.

### Both provers still green together at the new ref

```
CI=1 node test/e2e/scripts/guard-proof.js              All 10 arms held.  EXIT=0
CI=1 node test/e2e/scripts/build-provenance-proof.js   All  5 arms held.  EXIT=0
```

Run with this lane's evidence inside the tree. `journey.js` prints
`6dd043e1f34648c3fc5f322c0a777247b35c1d591766991b8ff0621c51e631c2` — **byte-identical to `7030c00`**,
which is the point: the file both provers testify to was not touched. `world-stamp.js` and
`artifact-store.js` shas moved, correctly, because they are what changed. The copier still resolves
**5** support files, so nothing fell out of the harness closure.

### Unit tests

Six added to `test/journey-artifact-store.test.js`, real temp checkouts throughout (a stubbed git
would only prove the stub was read), each exclusion arm paired with the write that must still red.

| | baseline `7030c00` | at `607f138` |
|---|---|---|
| passed | 36 | **42** (+6, exactly the six added) |
| failed | **2** | **2** — the same two |

The two failures are **pre-existing and reproduced at pristine `7030c00`** in the scratchpad worktree:
`asks whoever is holding the port…` and `names the checkout the world script recorded…` both pin the
literal string `Web-modules` as the checkout basename, so they fail in any worktree not named that.
That is the known worktree-basename tax, not a regression from this change. `eslint` on all three
changed JS files: exit 0. `bash -n` on `live-world.sh`: clean.

---

## 3. Proving the exclusion is narrow, against the two receipts that motivated it

**The corpus lies stay lies.** Applying the new rule to the shared checkout
`/Users/svendaneel/okam/Web-modules` **right now**: `ignored=1221, changed=135, dirty=true`. The tree
both bad receipts were captured from still reads `+dirty` under this rule, with 135 paths to spare.

**And for one of the two that is provable rather than current-state.** Row 39
(`Web-modules@e34977ac…+dirty`) — verified in this lane, not taken on `L-ARM-RECEIPTS-RECAPTURE`'s
report:

```
git show 997936a:lanes/L-WORLD-STAMP-WINDOWS/provenance-arms/arm-3.provenance-probe.playwright.json
  | grep -c proxiedSubjectServed                      -> 1
git grep -c proxiedSubjectServed e34977a -- test/e2e/support/journey.js   -> no match
git grep -l proxiedSubjectServed 9d4399a -- test/e2e/support/journey.js   -> 9d4399a:…/journey.js
```

The receipt contains a field only `9d4399a`'s `journey.js` emits, so at capture time
`test/e2e/support/journey.js` was modified in the working tree — a path under **neither** excluded
root. **That receipt would still have said `+dirty` under this rule.**

**Row 18 is undetermined and is not claimed.** `22f21082`'s arm-3 receipt carries no equivalent tell
(`grep -c proxiedSubjectServed` → 0), so nothing here says what was dirty at that capture. Stated as
unknown rather than generalised from row 39.

---

## 4. One rule, three callers — because the alternative prints drift as the guard working

At `7030c00` the "is this tree dirty" question had **three independent implementations** for the build
id, and they agreed only because they were byte-identical copies of one line:

| | before | now |
|---|---|---|
| `artifact-store.js:187` `buildFromCheckout` | own `git status --porcelain` | `worldStamp.dirtyOf` |
| `world-stamp.js:168` `writeStamp` | own `git status --porcelain` | `worldStamp.dirtyOf` |
| `live-world.sh:189` `E2E_API_BUILD` | own `git status --porcelain` in shell | `node world-stamp.js built <repo>` |

**This was not tidiness.** `resolveBackendBuild` reports a stamp-vs-declaration difference as
`this overrode E2E_API_BUILD="…", which names a different build and is checked against nothing`. Add
the exclusion to two of three and the third disagrees on any tree with lane evidence in it — and the
disagreement prints **as the guard working**. The rule now lives in one function; a caller cannot hold
a private opinion about what "dirty" means.

`built` prints the token on stdout and the ignored-evidence note on **stderr**, so `$(…)` captures the
token and cannot swallow the note; it exits 1 for a non-checkout rather than returning an empty string
that reads like a clean tree.

**A fourth site was found and deliberately left alone.** `test/e2e/scripts/fixture-divergence.js:75`
runs `git status --porcelain --untracked-files=no` — a *broader* rule (it ignores every untracked
path) for a human-readable "+ uncommitted changes" note. It keys nothing and reaches no artifact.
Naming it here so nobody reads §4 as "all four now agree".

---

## 5. What this does not do, and the merge that is coming

- **It is on one unpushed branch.** `lane/provenance-excludes-lane-evidence`, off `lane/guard-repair-lands`,
  which is itself on no shared ref. Not pushed, nothing merged.
- **`live-world.sh` is not proven end to end.** That script needs a SQL container, the migration chain
  and a real WebApi, and this brief grants no slot. What *is* proven is the substituted call:
  `node test/e2e/support/world-stamp.js built <repo>` → token, exit 0; on a non-checkout → refusal,
  exit 1; and `bash -n` on the whole script.
- **The two committed `+dirty` receipts are not re-captured.** That is a capture act. §3 establishes
  only that this rule does not make either of them read clean.
- **⚠ `world-stamp.js` has an in-flight rewrite in the shared checkout and it collides with this.**
  The uncommitted copy at `/Users/svendaneel/okam/Web-modules` is **572 lines to this ref's 307** — it
  adds W1 `builtFrom` / W2 socket-holder machinery and **its own `buildTokenOf` with the dirty test
  inlined**, and it has **no `dirtyOf` and no `EVIDENCE_ROOTS`**. Its `live-world.sh` already calls
  `world-stamp.js built` (at line 301, *after* the binary is built — a strictly better position than
  the line 187 used here). So the merge is: **take that lane's structure, keep only `dirtyOf` /
  `isEvidencePath` / `EVIDENCE_ROOTS` / `evidenceNote` and re-point its `buildTokenOf` at them**, and
  drop this lane's shell edit in favour of theirs. Overlaying this file wholesale would revert their
  W1/W2 work silently — the recorded parallel-lane hazard, live on this exact file.

## 6. Constraints

No migration, no SQL, no container, no money-path write, no statutory string (C1, C2, C4, C6 not
engaged). **C7**: one log call added — `world-stamp: <n> untracked paths under lanes/ or docs/plan/
ignored as lane evidence` to stderr — carrying a count and two directory names, no token, key,
signature or password. **C3** is the one this lane is about in miniature: an exclusion list nothing
surfaces is a flag with no lever, so `EVIDENCE_ROOTS`, `dirtyOf` and `evidenceNote` are exported, the
`built` subcommand and its usage line name it, and the note lands in `backendBuild.detail` on every
artifact whose build was resolved from a checkout. **C5**: nothing here is moved to verified — the
evidence is a build id a reader can reproduce, which is what makes somebody else's journey capture
checkable at all.

## 7. Reproducing every number

```sh
git -C /Users/svendaneel/okam/Web-modules worktree add -b lane/provenance-excludes-lane-evidence \
    /Users/svendaneel/okam/web-provexcl 7030c00        # then this lane's one commit, 607f138
cd /Users/svendaneel/okam/web-provexcl
ln -s /Users/svendaneel/okam/Web-modules/node_modules node_modules
git -c protocol.file.allow=always submodule update --init core

R=lanes/L-PROVENANCE-EXCLUDES-LANE-EVIDENCE/runs                  # INSIDE the tree, on purpose
CI=1 node test/e2e/scripts/guard-proof.js              > "$R/g.txt"   # 10/10, exit 0
CI=1 node test/e2e/scripts/build-provenance-proof.js   > "$R/a.txt"   #  5/5,  exit 0, no +dirty
printf '\n// a source edit\n' >> utils/price.js
grep -c '// a source edit' utils/price.js                             # ASSERT the mutation landed: 1
CI=1 node test/e2e/scripts/build-provenance-proof.js   > "$R/b.txt"   #  5/5,  exit 0, +dirty
git checkout -- utils/price.js

npx jest test/journey-artifact-store.test.js --coverage=false         # 42 pass / 2 pre-existing fail

# §3, the narrowness bound — read-only against the shared checkout
node -e "console.log(require('./test/e2e/support/world-stamp.js').dirtyOf('/Users/svendaneel/okam/Web-modules'))"
```
