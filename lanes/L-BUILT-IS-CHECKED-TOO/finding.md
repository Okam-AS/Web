# L-BUILT-IS-CHECKED-TOO — census: what the promoting command has never measured

**Class: analysis. Nothing was changed.** `cmd_built` was not touched, the checker was not touched,
no row was promoted or verified on the real board, no suite ran, no container started. Every CLI
proof ran against a throwaway copy of `docs/plan` under this lane directory via `--dir`;
`docs/plan/plan.md` is byte-identical before and after
(`acb4d8414821df860beeacbdb93183b3e46f688f3f7b2ec8d57f0178508764b5`, recorded at both ends of
`cli-proof.txt`).

Measured with the plan tool's own predicates, imported as a module with no verb invoked, so the
census counts what the instrument counts — then **checked against the real CLI**, which agreed on
9 of 9 rows spanning every repair class.

Reproduce: `python3 lanes/L-BUILT-IS-CHECKED-TOO/census.py`, then `repair-grid.py`, then
`zsh lanes/L-BUILT-IS-CHECKED-TOO/cli-proof.sh`.
Per-row output: `census.txt` (all 290, long form), `repair-grid.txt` (grouped by repair),
`census.json`, `repair-grid.json`, `by-reason.json`, `cli-proof.txt`.

---

## 0. The defect, through the real CLI

`cmd_built` (plan:8658-8678) calls `set_evidence` and nothing else. There is no
`evidence_admissible` call anywhere in it. Both halves of the same string, same board copy,
same run (`cli-proof.txt`):

```
plan built  L-BUILT-IS-CHECKED-TOO --evidence "I looked at it and it seemed fine; no file was written"
  L-BUILT-IS-CHECKED-TOO running -> built-unverified                                    rc=0

plan verify L-BUILT-IS-CHECKED-TOO --evidence "I looked at it and it seemed fine; no file was written"
  plan: evidence inadmissible — evidence path does not exist: I looked at it and…       rc=6
```

## 1. Population — the 284 are intact, and there are now 290

| | count |
|---|---|
| entities on the board | 755 |
| `built-unverified` | 318 |
| …carrying a path-shaped pointer — **never measured by anything** | **290** |
| …of those, the 284 the prior census counted | **284, all still present, none gone** |
| promoted since that census (2026-08-05 → 2026-08-06) | 6 |
| pointers resolving to **no path** under the repo root | **149 — exactly the prior count** |

The six added are `L-CANNOT-BE-REBUILT-CENSUS`, `L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID`,
`L-FINALIZE-INDEX-OR-A-REASON`, `L-FIXTURE-VALUES-ARE-ENUM-MEMBERS`, `L-PATH-EVIDENCE-IS-READ` and
`L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED` — the two prior lanes among them. **The defect is still
producing rows: six more went through unchecked while the first half was being repaired.**

## 2. Sorted by what the pointer IS

By the checker's own resolution rule (`_as_repo_path`: repo-relative joined to `repo_root`,
absolute taken as-is) — not by whether it passes.

| | count | |
|---|---|---|
| **1 · a named artifact that exists** | **141** | resolves to a file under the repo root |
| **2 · a named artifact that does not exist** | **20** | well-formed single-token path, file not there |
| **3 · a directory** | **0** | — |
| **4 · prose that was never a path** | **129** | a sentence; the whole string is offered as a path |
| | **290** | classes 2 + 4 = **149**, the prior census's figure to the row |

**Class 3 is empty.** The directory pointer — the shape that carried the one materially false
verified row — does not occur once in this half. The repaired checker's directory refusal, the
`os.path.isdir` arm and the container/broader messages, **fires on nothing here.**

**So is the status reader.** All 141 resolving artifacts are `.md` (137) or `.txt` (4). **Not one
JSON run record among the 290.** `_artifact_outcome_ok` returns on its first line
(`if not path.endswith(".json"): return True, ""`) for every single row. The carefully-reasoned
half of the landed repair — `OUTCOME_KEYS`, the closed vocabularies, the decision to refuse
`growth-doi-postmark-sandbox.json` — **has zero purchase on this half of the board.** It is
correct and it is inert here. Every refusal below is a *naming* refusal or a *resolution* refusal.

## 3. What the promoting command would refuse if it called the checker

Asked exactly as `cmd_verify` asks it, `evidence_admissible(p, ev, ent=e)`, for all 290:

| | count |
|---|---|
| **admit** | **77** |
| **refuse** | **213** |

| refusal | count |
|---|---|
| `evidence path does not exist: …` | **149** |
| `exit: “…” does not name <evidence>` | **64** |

Two sentences, and that is all of it. No outcome refusal, no directory refusal, no suite-artifact
refusal, no fact refusal.

### The refusal is on the EXIT side, not the pointer side

This is the finding that decides the scope, and it inverts the expectation the lane was opened with.

Of the 213 refusals, take every pointer that has a resolving artifact inside it and trim the
pointer to that artifact — the best case the record can be repaired to without producing anything
new:

| after trimming the pointer to the artifact it already contains | count |
|---|---|
| **admits** | **6** |
| still refused — **the `exit:` does not name it** | **114** |
| no resolving token in the string to trim to | 90 |
| still refused for a resolution or outcome reason | 3 |

And directly, on the exits themselves:

| the 290 pointers' `exit:` names | count |
|---|---|
| a path token | 119 |
| a `fact:` and a path | 2 |
| a `fact:` only | 4 |
| **neither a fact nor a path — no instrument at all** | **165** |

**165 of the 290 belong to an entity whose exit names nothing measurable.** `names_the_instrument`
reaches `_names_the_artifact` with an empty `paths` list and returns
`exit: “…” does not name <ev>` — **no evidence string of any kind can satisfy those exits.** Not a
better pointer, not a re-run, not a perfect artifact. All 165 are inside the 213 refusals, and they
are 77% of them. The remaining 48 refusals are pointer-side.

The same is being written into new work: **260 of the 289 `open` entities** have an exit naming
neither a fact nor a path. The population of unmeasurable rows grows with every entity opened.

## 4. Where the artifacts actually are

The census's second question, because "does not resolve" is not the same as "does not exist".

| | count |
|---|---|
| in this checkout, pointer resolves | 148 |
| in this checkout, pointer is a sentence around it | 48 |
| **in this repo but under `docs/plan/`** — written cwd-relative | **5** |
| in a worktree of this repo | 10 |
| in a sibling checkout (`OkamAPI-*`, `wt-*`) | 62 |
| absolute path outside the repo root | 21 |
| **no artifact anywhere — the pointer names only a commit** | **6** |

**Not one of the 20 class-2 pointers is a lost artifact.** Every one resolves somewhere: 5 under
`docs/plan/lanes/`, 5 in a worktree of this repo, 8 in a sibling checkout, 1 in this checkout
behind brace syntax, 1 one directory level up.

### 4.1 Five artifacts written one directory prefix off

`docs/plan/lanes/` holds `L-FRAGILE-NEEDLES/mutation-log.md`,
`L-MARGIN-VIOLATION-ANCHOR/mutation-log.md`, `L-MEALS-VIOLATION-EXACT/mutation-log.md`,
`L-XZ-CREDIT-FIELDS/evidence.md`, `L-XZ-PRINTED-DEFECTS/mutation-log.md` — plus
`L-WF-CORRECTION-PINS/mutation-log.md`, whose lane is not in this population. Each pointer reads
`lanes/L-X/…`; each artifact sits at `docs/plan/lanes/L-X/…`. The lanes wrote relative to the plan
directory rather than the repo root. **The fix is `mv`.**

I reported these five as existing nowhere twice before finding them, and both misses were the
search shape:

* `git status --porcelain` hides them — `docs/plan` is ignored; `-uall` is what surfaced the
  untracked directory.
* `find /Users/svendaneel/okam -maxdepth 4 -name L-XZ-CREDIT-FIELDS` cuts off exactly one level
  above `Web-modules/docs/plan/lanes/L-XZ-CREDIT-FIELDS`.
* the sibling-root sweep looked under `<root>/lanes` and `<root>/artifacts/lanes`, a naming
  convention I assumed and nobody agreed.

Nine more rows were reported lost by a fourth wrong shape: their pointers use shell brace syntax
(`lanes/L-X/{evidence.md,mutations.txt}`), which is not a path. Expanding braces moved all nine
from "nowhere" to "on disk". `repair-grid.py` now expands them.

### 4.2 The six with nothing to point at — and the work is not lost

`L-EV-INQUIRY-GATE`, `L-MEALS-POS-TENDER-WIRE`, `L-MEALS-REACHABLE`, `L-PRICE-BYPASS-FIVE`,
`L-WF-CLOCK-WIRE`, `L-WF-ADJUST-ADDRESS`. Each pointer is a provenance sentence naming a branch and
a commit and no file at all — e.g. `OkamAPI-wfadjust f3887f9a + web-wf-adjust e9ba89e`.

**Every commit named resolves** (`wt-wiretier`, `wt-feclient`). The code is there; the artifact was
never written. These six need an artifact produced, not a re-run.

## 5. The minimal repair for each of the 290

| | count |
|---|---|
| R0 nothing — already admissible | 77 |
| R1 trim the pointer to the artifact already inside it | 6 |
| R2 `exit:` names no artifact at all — name one, then the pointer stands | 55 |
| R3 `exit:` names a directory — narrow it | 1 |
| R4 `exit:`'s only path-shaped token is a branch or a route, not a file | 3 |
| R5 `exit:` names a different artifact than the evidence offers | 6 |
| R6 the artifact is real but not where the pointer says — move it, then point at it | 136 |
| R7 the pointer names a commit, never a file | 1 |
| R8 no artifact exists — one has to be written | 5 |

R4 is the tokeniser's own blindness, and it is worth naming because it will refuse correct records
forever: `exit_tokens` treats any whitespace-delimited word containing `/` as a path, so
`L-ESCPOS-LADDER-NAMES-THE-TENDER`'s exit offers `X/Z` (an X/Z report) as its only "path", and
`L-GROWTH-LAND`'s offers `feature/restaurant-modules` (a branch). The converse trap is recorded in
the prior census at §2.3: a bare filename with no `/` is invisible to the same tokeniser.

R5 is six rows where the exit names the artifact repo-relative and the evidence spells it as an
absolute path **inside a different worktree** — `web-consentvocab`, `web-fixdiv`, `web-fixrendered`,
`web-vocabsweep`. These are *not* the two-spellings-of-one-file class the prior lane repaired; a
worktree copy is a different file, and `L-MEALS-AGREEMENT-PIN-INVERTS` is a plain mismatch (exit
wants `mutation-log.md`, evidence offers `adoption-review.md`).

## 6. The brief's hypothesis, corrected

The brief predicted the fourth class — prose — would be *the largest group and the cheapest to fix*,
"most are probably a sentence where a path belongs". Measured:

* **Not the largest.** 129 prose against 141 that already name a real artifact. It is the largest of
  the three non-resolving classes, not of the four.
* **Not the cheapest.** Trimming the sentence to the path inside it fixes **6 of 129**. 58 of the
  129 do contain a resolving artifact, but 52 of those still refuse afterwards because the exit
  names no instrument. The other 71 contain no resolving token at all — most are provenance
  sentences naming a worktree, a branch and a commit.
* **The cheapest group is elsewhere**: the 5 misplaced under `docs/plan/` (an `mv`) and the 6 that
  trim clean.

This is a correction to the hypothesis, not to the objective, and not a `fail-spec`: the exit
criteria — resolve all of them, separate the 149, say what the checker would refuse — are met above.

## 7. What the count decides

**A re-measure of the board, and not the one the brief anticipated.**

Turning the check on at `built` would refuse **213 of 290** promoted rows and, on today's exits,
**about 90% of everything currently open** the moment it is promoted (260 of 289 open exits name no
instrument). That is not bookkeeping.

But the re-measure is **not of the evidence** — 284 of the 290 artifacts exist and are findable, and
the 6 that don't have their commits intact. It is **of the exits**. The pointers are mostly fine or
cheaply fixable; **165 exits were written with no instrument in them at all**, and a checker that
enforces §6.1 refuses those rows no matter what evidence is offered. Fixing pointers first would
move 6 rows.

So the order is: **the exit-writing rule before the check.** Whatever makes `exit:` name an artifact
— a `plan check` warning, a brief template, a refusal at `open` — has to land and drain the 260 open
entities before `cmd_built` starts calling `evidence_admissible`, or 213 rows red at once and the
board cannot tell a mis-recorded pointer from a missing artifact, which is precisely what this
census was ordered to prevent.

## 8. Deliberately NOT done

* **`cmd_built` was not changed.** The repair to the other half is landed and unreviewed; changing
  both before either is reviewed makes neither reviewable.
* **No pointer was corrected and nothing was moved**, including the five artifacts under
  `docs/plan/lanes/`. They are named here with their exact destination; moving them is a record job
  with an owner, and doing it silently would make this count unreproducible.
* **No row was verified or unverified on the real board.** The single `verify` that returned rc=0
  (`L-ABSENCE-AUDIT-CONDITIONS`) ran on the sandbox copy.
* **The 165 exits were not rewritten.** An exit is the entity's contract; rewriting one to fit the
  evidence already recorded against it is the failure this whole line of work exists to stop.
