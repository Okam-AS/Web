# L-LIVE-WORLD-BANNER -- evidence

verdict: **built**. `live-world.sh`'s header and closing banner now describe the reset that exists and
print a restore instead of two rebuilds, pinned by `test/e2e/scripts/live-world-banner-check.js`, whose
11-arm mutation proof reds on the exact text that was on the branch and greens on the correction.

No container started. No container touched. No journey run. No shared ref moved. Nothing pushed.
`test/e2e/scripts/live-world-reset.sh` never edited. Committed by pathspec.

---

## 1. The brief's claims, each checked at the tip rather than believed

The brief said to treat its estate-state lines as claims. All of them held.

```
$ git rev-parse --short HEAD                                          4b5c5c2
$ git merge-base --is-ancestor 337f9bf HEAD                           -> 0   (ancestor)
$ git diff --stat 337f9bf HEAD -- test/e2e/scripts/live-world-reset.sh   (empty: unchanged)
$ git status --porcelain -- test/e2e/scripts/live-world-reset.sh         (empty: clean)
$ git status --porcelain -- test/e2e/scripts/live-world.sh               (empty: clean)
$ wc -l test/e2e/scripts/live-world-reset.sh                          385
```

The reset's nine references, none of them from `live-world.sh`, reproduced exactly as reported:
`playwright.config.js:64,71,73`, `workforce-flag-lever.spec.js:52`,
`workforce-schedule-publish.spec.js:50`, `journey-assertions.js:248,264`, plus the RESTORE lane's own
receipt. The two false passages were where the brief said, at `live-world.sh:111-113` (header) and
`:710-723` (closing banner, the last text on the terminal), the second printing
`test/e2e/scripts/live-world.sh` **twice** as the recipe.

## 2. Coordinating with the owner instead of editing around them

`docs/plan/returns/L-LIVE-SEED-VIA-PRODUCT-1.md` (owner, `built-unverified`, evidence **is** this file)
and `docs/plan/returns/L-LIVE-WORLD-RESTORE-1.md` both read in full before touching anything.

RESTORE's line 18 states the hand-off explicitly -- *"DID NOT TOUCH live-world.sh (the sibling lane
owns it) [...] that correction is the sibling's to make"* -- and `L-LIVE-WORLD-RESET`'s evidence
section 4 names the same deferral. This lane is that correction.

**What changed relative to what the owner built.** The owner's work was the *seed*: the store and its
admin moved off two direct `INSERT`s onto `POST /Stores/register` + `PUT /stores/{id}/market`, the
grants moved from 15 to 6, `Approved` was left false, and the header was rewritten to explain all of
it. **None of that is touched.** Two passages of the owner's prose are edited and nothing else: the
`USAGE` paragraph that told the reader to run one journey per world, and the banner paragraph that
said a live world has no reset. Every claim the owner made about the seed -- the registration path,
the unapproved store, the three remaining SQL rows, C4 on rates -- is left standing word for word.
The owner's file was clean in the tree when this lane started and no sibling had it open.

## 3. Text, and provably not behaviour

The brief said to stop and return `blocked` if the change would alter behaviour. It does not, and that
is checked rather than asserted -- `text-only-proof.txt`, which strips every `#` comment and every
heredoc **body** (the text the script prints) and diffs what is left:

```
executable lines at HEAD: 352   in the working tree: 352
IDENTICAL: not one executable line differs.
raw line changes across the whole file: 60
```

Also `bash -n test/e2e/scripts/live-world.sh` -> clean (parsed, never executed; the script builds a
world and this lane may not start one).

### What the two passages now say

The header keeps the `USAGE` recipe but makes it snapshot -> journey -> restore, names
`live-world-reset.sh` twice, and adds a short paragraph recording that the banner *used to* deny the
reset and why the correction belongs here rather than only in the new script's own header.

The banner replaces *"a live world has no such thing [...] they are incompatible, and each needs its
own world"* plus its two `live-world.sh` invocations with the snapshot and restore commands carrying
**this world's own values**, and corrects the causal story: RESTORE established that the collision
that reds is the **flag**, not the week, and that the week collision silently produces *weaker*
evidence (Revisjon 2 under an unchanged "Ingen plan" badge) rather than a failure. Rendered with
representative values, the printed recipe is byte-identical in form to the one
`live-world-reset.sh` prints from its own `snapshot` branch (its lines 321-322).

The env-var contract was verified before the recipe was written: both scripts read `SQL_CONTAINER`,
`SQL_PORT`, `SQL_SA_PASSWORD`, `DB_NAME`, `API_PORT`, `MANAGER_PHONE`, `MANAGER_CODE`, `STORE_NAME`,
`TZ_ID` with **identical defaults**, and the reset needs no `OKAM_API_REPO`. `$APPLIED` and
`$TRIGGERS` are in scope at banner time, and the reset's `trigger_count()` uses the same
`is_ms_shipped = 0` definition `live-world.sh` counts with, so "all 25 append-only triggers" means the
same set in both files. **C7: no credential is printed.** `SQL_SA_PASSWORD` is deliberately not named
in the recipe; the banner says instead that the reset reads the same names with the same defaults, so
anything overridden must be passed on.

### Two `die` messages deliberately left alone

`live-world.sh:346` and `:673` still say *"Rebuild from empty: $0"*. Both fire on a catalog **this
script has just dropped and recreated from empty** (step 2, line 243), so a restore there would
reinstate the very state being refused -- at `:346`, the store the message is complaining about.
Recommending the reset in those two places would be wrong advice, not better advice. They are outside
both regions the pin watches, on purpose, and the check's header says so.

## 4. The pin: `test/e2e/scripts/live-world-banner-check.js`

`npm run test:e2e:live-world-banner` (added to `package.json` next to the sibling proofs). **8/8 green**
against the corrected pair.

**It is a contradiction check between two files, not a spell checker for one.** Regions are found
*structurally* -- the header is the leading `#` block, the banner is the **last heredoc** -- so both
survive any rewording of their contents. The vocabulary it enforces is **parsed from the reset script
at run time, never frozen in the check**:

| rule | what it asserts |
|------|-----------------|
| R0 | both regions can be located; if the banner heredoc is gone it **fails closed** |
| R1 | while the reset exists, the header names it |
| R2 | while the reset exists, the **closing banner** names it |
| R3 | the banner contains no `live-world.sh` invocation and no bare `$0` -- the two-rebuild recommendation cannot be given without naming the script |
| R4 | every `live-world-reset.sh <verb>` uses a verb parsed out of the reset's own `case` statement |
| R5 | every `VAR=` on a continuation-joined line invoking the reset is a variable parsed out of the reset's own defaulting block |
| R6 | the banner *invokes* the reset with the between-journeys verb the reset **advertises in its own `snapshot` branch** (derived, not hardcoded; falls back to "any implemented verb" and says so) |
| R7 | **the other direction**: if the reset is absent, `live-world.sh` must not promise it |

### Why it is not the guard-that-can-never-match

The brief warned that a check greping for *"has no such thing"* is defeated by a rewording. This one is
not keyed to any sentence: R1/R2 demand the reset be **named**, and no paraphrase of "there is no
reset" can name the reset. **Arm 10 proves exactly that** -- the denial rewritten with none of the
original words still reds.

### What it cannot see, stated in the file itself

* It does not read. A denial phrased with no filename and no `$0` ("run this again for the next one")
  passes R3. What it cannot be defeated by is the mutation that actually happens: someone restoring
  the old prose.
* It proves nothing about the reset *working*. That needed a container and a journey;
  `L-LIVE-WORLD-RESTORE` proved it live and its evidence is the record.
* It does not check `playwright.config.js`, the two spec headers or `journey-assertions.js` -- they
  already name the reset and have their own owners.
* It does not watch `die` messages (section 3).
* It does not judge the causal story (flag vs. week). That is corrected in the text and pinned by
  nothing.

## 5. Mutation proof -- 11 arms, **failure sets matched exactly**

`mutation-proof.py` / `mutation-proof.txt` / `mutation-proof.json`, per-arm output under
`mutants/arm-*/check.out`. An arm that reds on *more* rules than named is counted unexpected too, so
no arm passes by collateral failure. Every arm runs on **copies in its own directory**; no repo file
is mutated, because sibling lanes have live worlds standing.

| arm | mutation | exit | red |
|-----|----------|------|-----|
| 0 | **`live-world.sh` exactly as it stood at HEAD `4b5c5c2`**, reset present | 1 | R1 R2 R3 R6 |
| 1 | the correction in the working tree | 0 | -- |
| 2 | header corrected, **banner** reverted to the denial | 1 | R2 R3 R6 |
| 3 | banner corrected, **header** reverted | 1 | R1 |
| 4 | verb renamed on **one** side (`revert` vs `restore`) | 1 | R4 R6 |
| 5 | recipe passes `SQL_HOST`, a name the reset never reads | 1 | R5 |
| 6 | **reset script deleted** while the banner still promises it | 1 | R7 |
| 7 | banner heredoc removed -- must fail **closed** | 1 | R0 |
| 8 | HEAD's text **and** no reset script -- genuinely consistent | 0 | -- |
| 9 | `restore` renamed to `revert` in **both** files -- a clean rename | 0 | -- |
| 10 | the denial **paraphrased**, sharing no wording with the original | 1 | R2 R6 |

`11 arms, 11 as expected, 0 unexpected.`

Arm 0 is the one that matters: **the check reds on the real text that was on the branch**, not on a
mutant invented to make it red. Arms 8 and 9 are the controls that stop it being a rule that
`live-world.sh` must always mention a particular filename -- 8 greens when both files honestly agree
there is no reset, 9 greens when a rename is done properly in both. Arm 10 is the anti-brittleness
control the brief asked for.

### One failure that did not reproduce, and its name

The **first** run of the mutation proof reported **6 unexpected arms** (2, 3, 4, 5, 6, 9 all reporting
`R1, R2, R6`). It was not the check. The proof was writing each mutant as `mutants/arm-N.sh` and
handing it to `--script`, and the check identifies both files by their **own basenames** -- so it was
asking whether a file called `arm-4.sh` mentions `reset-unchanged.sh`, which of course it does not.
Fixed by giving every arm a directory and keeping the canonical filenames; recorded in the proof's
docstring so the next reader does not rediscover it. The check was never changed in response.

## 6. Constraints

* **C1** -- nothing in this lane writes SQL. The banner's claim that a restore re-checks all 25
  append-only triggers is read off `live-world-reset.sh`'s `verify` branch (fingerprint over
  name/parent/disabled/body + `disabled_triggers = 0`), not invented.
* **C2** -- no migration authored or touched.
* **C4** -- no money-path code; the owner's rates-by-`PUT`-under-the-manager's-bearer paragraph is
  left exactly as written.
* **C5** -- **this lane claims no acceptance.** It ran no journey and stood up no world; the evidence
  is a text correction and a static check. The reset itself was walked by `L-LIVE-WORLD-RESTORE`.
* **C7** -- no credential added or printed; `SQL_SA_PASSWORD` deliberately absent from the recipe.

## 7. Hazards observed and not touched

* `L-EV-JOURNEY-TIMEBOMB` has uncommitted work in `lanes/L-EV-JOURNEY-TIMEBOMB/` and the branch tip
  carries only part of that lane's work -- left exactly as found, nothing landed.
* Uncommitted sibling work in `pages/preferences/communications.vue`,
  `test/e2e/journeys/admin-refusal-worker.spec.js`, `utils/growth/growth-guest-client.js` -- untouched.
* Feature levers left on by journey runs are `L-JOURNEY-TEARDOWN`'s; no second teardown built here.

## 8. Files

```
test/e2e/scripts/live-world.sh                 modified -- header + closing banner (text only)
test/e2e/scripts/live-world-banner-check.js    new      -- the pin
package.json                                   modified -- test:e2e:live-world-banner
lanes/L-LIVE-WORLD-BANNER/evidence.md          this file
lanes/L-LIVE-WORLD-BANNER/mutation-proof.py    the 11 arms
lanes/L-LIVE-WORLD-BANNER/mutation-proof.txt   their output
lanes/L-LIVE-WORLD-BANNER/mutation-proof.json  machine-readable
lanes/L-LIVE-WORLD-BANNER/text-only-proof.txt  352 executable lines, identical
lanes/L-LIVE-WORLD-BANNER/mutants/arm-*/check.out   per-arm check output
```

The mutant `.sh` copies are deleted after each run (11 x 50 KB of near-duplicate script); rerun
`python3 lanes/L-LIVE-WORLD-BANNER/mutation-proof.py` to regenerate them.
