# L-ARTIFACT-FIELDS-VS-HARNESS — artifacts carrying fields the tree that holds them cannot produce

**Worktree** `/Users/svendaneel/okam/web-fieldsvsharness`, detached at `e34977a`, `git status --porcelain`
= 0 before and after. Every measurement is a `git cat-file` / `ls-tree` object read; **no file was written
into the tree being measured**, all scratch went to the session scratchpad and only the finished evidence
was copied here. Nothing moved, rewritten or deleted. No container, no port bound, **4010 never bound and
pid 73160 never signalled**. Read-only throughout.

**Not re-derived:** the ancestry method, the 41-receipt enumeration and the five known mismatches come from
`lanes/L-JOURNEY-ARTIFACTS-UNWITNESSED/witnessed.md` and `lanes/L-ARM-RECEIPTS-RECAPTURE/recaptured.md §3.2`.
This lane asks the different question those two did not: **could this artifact have come from the tree it
sits in?**

---

## 0. The answer up front

**19 of 65 committed journey receipts carry at least one field the tree that holds them cannot name.**
Not six. The five known are five of the nineteen, and the other fourteen split into **two key families with
two different producers**, one of which nobody in this plan has named before.

| family | keys | artifacts | sole producer |
|---|---|---|---|
| **A** | `proxiedSubjectServed`, `proxiedSubjectSample` | 15 | `9d4399a` (+ its dangling twin `097c3c9e`) |
| **B** | `backendBuild`, `canonicalHeldBy`, `provisional` | 4 | `533aea4` |

46 receipts are clean. **The check is one-way**: only keys the artifact *has* and the tree *cannot name*
count. A harness field the artifact lacks is never a finding — `servingFixture` is absent from every one of
these and is correctly absent, because it resolves only for fixture backends.

---

## 1. Scope — which "committed" this is, stated because it is not obvious here

`.gitignore:111` (working tree) carries `artifacts/`, and **16 files are force-added past it**
(`git ls-files artifacts/` = 16) against **78 entries on disk under `artifacts/journeys`**. So the on-disk
majority is invisible to git and outside any census of *committed* artifacts.

**The set taken here is: every blob reachable from any ref whose JSON parses to a journey record** — an
object with `journey`, `steps` and `status`. **Shape, not filename.** That matters:

```
137 refs measured        (refs/heads 111, refs/lanes 9, refs/remotes 8, refs/salvage 8, refs/stash 1)
 65 committed journey receipts (path,blob)   —  58 distinct paths
 55 named *.playwright.json
 10 journey-shaped .json NOT so named        <-- invisible to a filename census
2112 (rev, artifact) placements checked
```

**Two scope corrections to the prior census, both of which changed the answer.**

1. `witnessed.md` scanned `refs/heads` + `refs/remotes` = 115/116 refs. **`refs/lanes/` and `refs/salvage/`
   exist** — 17 more refs. `refs/lanes/L-WORLD-STAMP-WINDOWS` is the *only* ref that still points at
   `997936a`, so a heads-only scan can no longer see the five known mismatches where they were filed.
2. **Ten receipts are not named `*.playwright.json`** (`lanes/L-LIVE-WORLD-RESTORE/chain-*.live.json` and
   siblings, `lanes/L-WF-KODEOVERSIKT-UI/journey-green.json`, `lanes/L-JOURNEY-EVENTS/mutant-run-artifact.json`).
   **Three of the nineteen findings are in that set** — a filename census cannot find them.

The ref set moved **three times while this lane ran** (134 → 136 → 137). The exact set measured is pinned in
`machine/refs-measured.txt`; every count above is against that snapshot.

---

## 2. The method, and why it is not a clock

For each artifact, its **recursive object-key set**. For the tree that holds it, the **identifier tokens
present in the harness code** — every `.js/.mjs/.cjs/.ts/.sh/.json` under `test/e2e/`, **excluding journey
receipts themselves so an artifact can never vouch for itself**. A key in the first and not the second is a
mismatch. Two universes, because "the branch it sits on" has two honest readings:

- **A — where it sits now.** Every (ref, artifact) pair over all 137 refs.
- **B — the tree it was committed into.** Every commit that introduced that exact blob at that path
  (added *or* modified; no parent carries the same blob there). **This is how the five known were pinned**,
  and it is the sharper question.

**No timestamp decides anything.** Producer-vs-holder is settled by `git merge-base --is-ancestor`, and the
verifier re-checks every single finding: **0 ancestry violations** (`machine/verify-final.txt`). Committer
times appear below only as narration, always with `+02:00`.

### Instrument controls — run before any negative was believed

| control | result |
|---|---|
| **positive** — the five known arms at `997936a` | `proxiedSubjectServed`/`Sample` absent from harness → **fires** ✅ |
| **negative** — the same artifact's other 28 top-level keys at the same rev | all present → **silent** ✅ |
| **loop-alive** — `backendServed` at `997936a` | present ✅ (a false zero would have failed here) |
| **one-way** — `servingFixture` at `997936a` | absent from harness, absent from artifact → **not reported** ✅ |
| **dynamic keys** — spread / `Object.assign` / computed keys in the writer at every finding rev | only `Object.assign({}, record, {…})`, which copies literal-named keys and invents none → token check is sound |
| **producer widened to the whole tree**, not just `test/e2e/` | same producers; see §4 caveat on `provisional` |

---

## 3. Family A — `proxiedSubjectServed` + `proxiedSubjectSample` (15 artifacts)

**Sole producer: `9d4399ac94ddd04a6a19163a07c6740fa310554b`**
*"A subject fetched through the same-origin proxy stops reading as zero"*, 2026-08-04T16:12:25+02:00,
adding both fields to `test/e2e/support/journey.js`. It has a **dangling twin**,
`097c3c9ec82356c292f5f90f5caebfb4ac284f09` (16:06:31+02:00) — same parent `e34977a`, **byte-identical
`journey.js`**, reachable only from `refs/salvage/dangling-097c3c9e`. Both are named; neither is an
ancestor of any rev below.

**Only 5 of 137 refs can name these fields** — `lane/L-JOURNEY-PROXY-BLINDSPOT`, three descendants of it,
and the salvage ref.

| # | artifact (blob) | cannot-emit rev(s) | universe |
|---|---|---|---|
| 1 | `artifacts/journeys/growth-guest-lifecycle.playwright.json` `10d5f376` | `lane/L-JOURNEY-GROWTH` **(tip)** = `ef2d6be` | A+B |
| 2 | `artifacts/journeys/growth-guest-lifecycle.playwright.json` `f2d5f373` | `refs/salvage/dangling-1890c9a3` = `1890c9a` | A+B |
| 3 | `artifacts/journeys/growth-testsend-refusal.playwright.json` `4b8751af` | `lane/L-JOURNEY-GROWTH` **(tip)** = `ef2d6be` | A+B |
| 4 | `artifacts/journeys/growth-testsend-refusal.playwright.json` `9ffabf89` | `refs/salvage/dangling-1890c9a3` = `1890c9a` | A+B |
| 5 | `artifacts/journeys/workforce-timesheet-export.playwright.json` `16f6fe0c` | `lane/wf-timesheet-ui` **(tip)** = `618efc8` | A+B |
| 6 | `lanes/L-JOURNEY-MEALS/capture-meals-admin-setup.playwright.json` `1f378555` | `lane/fe-journey-meals`, `refs/lanes/plan-snapshot`; introduced at `8a77326` + `5197056` | A+B |
| 7 | `lanes/L-JOURNEY-MEALS/capture-meals-guest-claim.playwright.json` `54739741` | same as 6 | A+B |
| 8 | `lanes/L-JOURNEY-PORT-HARDCODED/artifact-backup/meals-statement-month.playwright.json` `9696ab28` | `lane/L-JOURNEY-PORT-HARDCODED` **(tip)** = `4772c13`, `plan-snapshot` | A+B |
| 9 | `…/artifact-backup/runs/meals-statement-month.fixture.playwright.json` `9696ab28` | same blob, second path | A+B |
| 10 | `lanes/L-WF-PUNCH-UI/evidence/workforce-pos-punch.playwright.json` `f4d5d876` | `refs/lanes/plan-snapshot` = `5197056` | A+B |
| 11-15 | `lanes/L-WORLD-STAMP-WINDOWS/provenance-arms/arm-{1..5}.provenance-probe.playwright.json` | `refs/lanes/L-WORLD-STAMP-WINDOWS` = `997936a`, `plan-snapshot` | A+B |

**Rows 11-15 are the five already known**, reproduced independently here, and they are the positive control
that proves the checker fires.

### Three things this family says that the five alone did not

**The lane that produced the harness also spread its output.** `8a77326` (rows 6-7, 16:01:51+02:00),
`1890c9a`/`ef2d6be` (rows 1-4, 16:06:30 / 16:08:59) and `4772c13` (rows 8-9, 16:21:35) all sit in the same
20-minute band as `097c3c9e`/`9d4399a` (16:06:31 / 16:12:25). Four separate lanes filed receipts written by
a `journey.js` that only one branch ever carried. This was **not one operator's slip**; it is what a shared
dirty checkout does to every lane running out of it.

**`618efc8` (row 5) is seven hours later** — 23:12:57+02:00, on `lane/wf-timesheet-ui`. The proxy `journey.js`
was still in someone's working tree at the end of the day.

**Composition has already fixed five of them, silently.** The arms in rows 11-15 sit on five refs; on
`candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions` and `lane/duplicate-key-guard` they are
**not** mismatches, because those refs contain `9d4399a`. The remedy for a field-mismatch is landing the
producing harness on the branch — and for these five it happened as a side-effect of the compose, not as a
decision. **The same remedy has not reached rows 1-10**, four of which are on live branch tips.

---

## 4. Family B — `backendBuild` + `canonicalHeldBy` + `provisional` (4 artifacts) — **new**

**Sole producer: `533aea4c1da7d3d79160d4598d4a6a4732eadee1`**
*"An artifact says which world and which build answered it"*, 2026-08-02T13:56:55+02:00. It is **the commit
that created `test/e2e/support/artifact-store.js`** (+392 lines, file did not previously exist) together
with the `journey.js` changes that emit `backendBuild`. Not an ancestor of either rev below.

| # | artifact (blob) | introduced by | keys |
|---|---|---|---|
| 16 | `lanes/L-LIVE-SEED-VIA-PRODUCT/workforce-flag-lever.live.playwright.json` `de773948` | `fadc84a` 2026-08-02T13:46:56+02:00 | all three |
| 17 | `lanes/L-LIVE-WORLD-RESTORE/chain-events-deposit-precondition.live.json` `7e176a48` | `337f9bf2` 2026-08-02T13:50:51+02:00 | all three |
| 18 | `lanes/L-LIVE-WORLD-RESTORE/chain-workforce-flag-lever.live.json` `5f10b01b` | `337f9bf2` | all three |
| 19 | `lanes/L-LIVE-WORLD-RESTORE/chain-workforce-schedule-publish.live.json` `fedbc64c` | `337f9bf2` | all three |

**`git cat-file -t fadc84a:test/e2e/support/artifact-store.js` → `fatal: … exists on disk, but not in
'fadc84a'`.** These four receipts carry the output of an artifact store that the tree holding them does not
contain.

### The discrimination is *within the commit*, which is as sharp as this instrument gets

`fadc84a` committed **three** journey receipts from one run — all three record the same
`commit: ddc27fa181e6…`. Only one mismatches:

```
clean     events-deposit-precondition.live   23 top-level keys, no `artifact` key at all
MISMATCH  workforce-flag-lever.live          25 keys: + backendBuild, + artifact{key,file,canonical,canonicalHeldBy,provisional}
clean     workforce-schedule-publish.live    23 top-level keys, no `artifact` key at all
```

`337f9bf2` committed **eight**, and splits 5 clean / 3 mismatched — the three mismatched are exactly the
`chain-*` files, i.e. the *last* run of that lane's sequence:

```
clean     01-workforce-flag-lever.live   03-journeyB-without-reset   05-workforce-schedule-publish.live
clean     06-journeyA-without-reset      08-workforce-flag-lever.live
MISMATCH  chain-events-deposit-precondition   chain-workforce-flag-lever   chain-workforce-schedule-publish
```

**Siblings from the same commit, written minutes apart, by two different harness generations.** Nothing
about a filename, a timestamp or an exit code separates them; only the field set does. Family B is
**four days older than family A** — 2026-08-02, not 08-04 — so this is not a one-night phenomenon.

**One honest caveat on the fingerprint.** Widened to the whole tree, `provisional` alone is not unique: it
also appears in `components/admin/pos/XReportView.vue` since `17eefc02` (2026-07-14), unrelated product
text. The finding therefore rests on **`backendBuild` and `canonicalHeldBy`, which have exactly one
producer anywhere in the repository**, with `provisional` recorded as the third key of the same
`artifact{}` block that `533aea4` created.

---

## 5. What was checked and found clean

**46 of 65 receipts are clean at every rev that holds them and at every rev that introduced them** —
including the whole `L-LIVE-WORLD-STAFF` family, `modal-scroll-lock`, `modal-estate-scroll-lock`,
`red-probe-before-fix`, `workforce-invitation-onboarding`, the ten `L-LIVE-BUILD-EXPORT` /
`L-LIVE-WORLD-DISCOVER` arm receipts, and seven of the ten non-`.playwright.json` receipts. **A clean
result here is a real result:** the field set of those 46 is fully accounted for by the harness on the
branch that carries them.

**`lanes/L-JOURNEY-PORT-HARDCODED/…/meals-statement-month.fixture.superseded.playwright.json` (`401eec7a`)
is clean while the two receipts beside it are not** — the same directory, the same commit, opposite verdicts.

---

## 6. What this does not claim

- **Not that any artifact is wrong.** A field with no local producer says the capture came from a tree other
  than the one holding it. What the run observed may be perfectly true. What is not true is that a reader of
  that branch can account for the file.
- **Nothing was moved, rewritten or replaced.** Replacing a committed original is a decision, not a capture;
  a sibling made that distinction and it is kept here. The remedy for every row in §3 and §4 is to land the
  producing commit on the branch — a merge, not this lane's act.
- **Untracked artifacts are out of scope**, and they are the majority: 78 on disk under `artifacts/journeys`
  against 16 tracked.
- **Absence of a harness field is never reported.** Only artifact-has / tree-cannot-name.

---

## 7. Reproducing every number

```sh
git -C /Users/svendaneel/okam/Web-modules worktree add --detach /Users/svendaneel/okam/web-fieldsvsharness e34977a
python3 lanes/L-ARTIFACT-FIELDS-VS-HARNESS/machine/check3.py        # census   -> census-final.json
python3 lanes/L-ARTIFACT-FIELDS-VS-HARNESS/machine/verify_final.py  # ancestry -> 0 violations
python3 lanes/L-ARTIFACT-FIELDS-VS-HARNESS/machine/producer.py proxiedSubjectServed backendBuild canonicalHeldBy

# the two producers, by hand — note "${r}:path" braces, zsh eats $r:t
for r in refs/lanes/L-WORLD-STAMP-WINDOWS fadc84a 337f9bf2; do
  echo "$r $(git grep -l proxiedSubjectServed "${r}" -- test/e2e/ | wc -l)"; done      # all 0
git cat-file -t fadc84a:test/e2e/support/artifact-store.js                             # fatal: not in 'fadc84a'
git merge-base --is-ancestor 533aea4 fadc84a  ; echo $?                                # 1 = not an ancestor
git merge-base --is-ancestor 9d4399a refs/lanes/L-WORLD-STAMP-WINDOWS ; echo $?         # 1 = not an ancestor
```

Machine-readable census, the exact 137-ref snapshot, and both run logs are in
`lanes/L-ARTIFACT-FIELDS-VS-HARNESS/machine/`.
