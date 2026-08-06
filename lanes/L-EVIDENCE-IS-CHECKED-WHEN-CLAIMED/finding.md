# L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED — the repair, and it is shown refusing

The instrument was edited: `~/.local/bin/plan` → `~/.claude/skills/plan-hub/bin/plan`.
Backup of the exact build the census measured:
`lanes/L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED/plan.backup-20260805T155525Z`
(sha256 of the pre-edit file `a3779c6ecfb9f507280290a34b300d53625987c081b2dd16b7eaa9ffaea7a91f`).
Restore with `cp` over the skill path; nothing else in the estate was touched.

Nothing in `docs/plan/**` was written. Every CLI proof ran against a throwaway copy under this
lane directory via `--dir`. `plan tick` was run once against the real directory and is read-only
in this state — proven by hashing `plan.md`+`log.md`+`stamps.log` around a tick on a copy
(identical). The real `plan.md`/`log.md` mtimes of 17:58 are the clerk's own concurrent `@clerk`
entries at 15:58Z, not this lane's.

Reproduce: `python3 prove.py <plan-build> > x.json` (predicate level, mutates nothing) and
`zsh cli-proof.sh > cli-proof.txt` (real CLI, sandboxed). `before.json` was captured against the
backup build, `after.json` against the repaired one.

---

## 1. What was wrong, in the two places it was wrong

`names_the_instrument()` ended on a prefix match in **both** directions:

```python
for tok in paths:
    if ev.startswith(tok) or tok.startswith(ev):
        return True, ""
```

and `_evidence_kind_ok()` asked of a path only `os.path.exists()`. The status check lived on the
`fact:` branch alone. So a path was admitted for being a string that resolves.

Two separate failures wore one symptom, and they are repaired separately because they refuse for
different reasons and the author needs to read the right one:

* **the naming half** — `"artifacts/journeys/".startswith("artifacts")` is true, so the bare word
  satisfied six Feature exits by the reverse arm; and any one of the 78 files in that directory
  satisfied them by the forward arm. A pointer that every sibling would satisfy identically
  measures nothing about the artifact it names.
* **the status half** — the file was never opened, so an artifact reading `"status": "failed"` was
  admissible evidence that the exit it was run for had been met.

## 2. The repair

**`_as_repo_path()`** (new) — one comparable absolute path for a token or an evidence string:
repo-relative resolved, `.`/`..` collapsed, trailing separator dropped. Quotes and backticks only
are stripped; a trailing `)` is deliberately left alone so `x.txt (commit abc)` keeps failing to
resolve instead of being silently repaired into a pointer that does.

**`_names_the_artifact()`** (new, replaces the prefix arm) — the evidence must **be** an artifact
the exit named: the same file, not a shared prefix. A token that resolves to a **directory** names
a container, not an instrument, and admits neither itself nor its contents. Two distinct refusals,
each naming the fix:

* `exit: names the directory 'artifacts/journeys/', not an artifact — any of its 78 entries would
  satisfy it equally, so '<file>' demonstrates nothing. Name the artifact that shows the run in
  'exit:', then offer that file.`
* `evidence '<x>' is broader than the '<tok>' the exit named — that is the container, not the
  artifact.`

**`_evidence_kind_ok()`** — a directory is refused outright (`a directory records no run and cannot
be read`), and the function now ends in the outcome read instead of `return True`.

**`_artifact_outcome_ok()`** (new) — reads the artifact's own **declared field**, never its prose.
`OUTCOME_KEYS` = `status, result, outcome, verdict, conclusion`; `OUTCOME_PASSED` and
`OUTCOME_FAILED` are closed vocabularies, so a word in neither is refused rather than read as green.

## 3. The distinction the repair had to carry, and how it carries it

> whether the failure is the **subject** of the run or its **outcome**

A run's outcome is a field the runner wrote. The word `failed` in a narrative is the run's subject.
So the reader **only ever matches a declared JSON field** and never greps text:

* `lanes/L-LIVE-WORLD-STAFF/live-world-run.txt` — `status=failed` twice, correctly: §1 GUARD PROOF
  (expected RED, and red) and §3 MUTATION PROOF (expected RED, and red), while §2 and §4, the two
  runs that are the lane's subject, read `status=passed`. **Still admitted, before and after.**
* `lanes/L-JOURNEY-PROXY-BLINDSPOT/guard-proof.txt` — nine arms whose `artifact failed` **is** the
  proof. **Still admitted, before and after**, and re-verified end to end through the real CLI.

A prose artifact carries no field and is therefore admitted on naming alone. That half of §2.4 is
still open; it is a limit of what a checker can read, not a licence, and it is recorded in the
docstring so the next reader does not mistake it for a decision.

### One note on `L-LIVE-WORLD-STAFF` that is not this lane's to fix

Its recorded pointer is `lanes/L-LIVE-WORLD-STAFF/live-world-run.txt (commit 538abe6)` — the
parenthetical is part of the string, so the path does not resolve — and its `exit:` names no path
token at all. It is refused end to end for both reasons, **identically before and after this
change** (the old loop had an empty `paths` list and returned the same sentence). What this lane is
answerable for is the status half, and that half admits the file: `_evidence_kind_ok` returns
`ADMIT` for the bare resolving path on both builds. The record defect is the lane's own to correct.

## 4. The row with no status key — DECIDED: refuse

`artifacts/journeys/growth-doi-postmark-sandbox.json` (`L-GROWTH-MAIL`, verified) is hand-authored
and is the only artifact under `artifacts/journeys/` that is not a Playwright record. It has no
`status` key. **It is refused**, with:

    growth-doi-postmark-sandbox.json declares no outcome — none of `status`, `result`, `outcome`,
    `verdict`, `conclusion` is in it, so nothing in the file says whether the run it records
    passed.  A record that does not say is not read as green

Why refuse rather than admit:

1. **Defaulting it green is the defect being repaired.** "Admitted because it exists" is precisely
   the sentence this lane was opened to delete. An unknown that resolves to pass reintroduces it
   for every artifact that simply declines to say.
2. **Its truthy fields are domain facts, not an outcome.** `accepted: true` and
   `submissionStatus: "Accepted"` are Postmark's answer about one submission, not the record's
   statement about whether the run demonstrated its exit. Adding `accepted` to `OUTCOME_KEYS` would
   admit any artifact carrying a truthy `accepted` anything.
3. **The artifact itself declines to assert.** Its own `note` reads *"Accepted is submission-time
   truth only, never Delivered."* A checker that reads a stronger claim than the author wrote is
   the same failure in the other direction.
4. **Fail-closed is the posture the `fact:` branch already takes** (`if f.status != "ok"`). The two
   branches now agree instead of one being strict and the other admitting anything that exists.
5. **It is cheap and reversible.** The fix is one line in the artifact (`"status": "passed"`, or a
   named outcome field) and a re-verify. Admitting is not reversible: it teaches the board that a
   record need not say.

`L-GROWTH-MAIL` is refused on the directory ground as well (its exit names `artifacts/journeys/`),
so the status decision is not what moves that row — but it is what governs every future artifact of
that shape.

---

## 5. Proven both ways

### The six admissions the census listed — 36/36 → 0/36

Asked of all six Feature exits exactly as `cmd_verify` asks it. `rc=6` is `EX_EVIDENCE`.

| evidence offered | before | after | refused by |
|---|---|---|---|
| `artifacts` | 6/6 admitted | **0/6** | a directory records no run |
| `artifacts/` | 6/6 admitted | **0/6** | a directory records no run |
| `artifacts/journeys/` | 6/6 admitted | **0/6** | a directory records no run |
| `…/modal-scroll-lock.playwright.json` | 6/6 admitted | **0/6** | exit names the directory, not an artifact |
| `…/growth-newsletter-send-gate.playwright.json` | 6/6 admitted | **0/6** | `reads status: failed` |
| `…/training-course-to-evidence.playwright.json` | 6/6 admitted | **0/6** | `reads status: failed` |

Three distinct reasons, each true of the row it refuses. Through the real CLI: `cli-proof.txt`,
six `rc=6`, and the sandbox `plan.md` byte-identical afterwards — the refusals wrote nothing.

### A guard never shown to admit is a guard that matches nothing

Also in `cli-proof.txt`, real state transitions:

| | result |
|---|---|
| `verify L-LINT-RUNNABLE` — prose artifact its exit names, absolute spelling | `rc=0` built-unverified → verified |
| `verify L-JOURNEY-MARGIN` — JSON run record reading `status: passed` | `rc=0` round-tripped through `unverify` |
| `verify L-JOURNEY-PROXY-BLINDSPOT` — **the deliberate-red guard proof** | `rc=0` round-tripped |

And the one materially false row cannot be put back: `L-JOURNEY-COVERAGE-THREE` unverifies, then is
refused `rc=6` on the directory it was verified against, on the Training artifact its exit names,
**and** on `margin-recipe-to-margin` — the one of its three that passed — because the exit still
names only a container.

### Nothing else in the tool moved

Against one shared copy, backup build vs repaired build:

* `plan check` — byte-identical, `0 error(s), 87 warning(s)` on both.
* `plan headline` — byte-identical.
* `plan render --view` × `cockpit roadmap lanes decisions flags why history` — all seven identical.

## 6. Blast radius on the recorded board, measured not assumed

339 path-shaped pointers judged as recorded, before vs after.

**Six verified rows were admitted and now refuse** — exactly the six the census predicted:

| row | refused by |
|---|---|
| `L-JOURNEY-COVERAGE-THREE` | evidence is a directory (the materially false row) |
| `L-GROWTH-MAIL` | declares no outcome (§4) |
| `L-CONFIRM-ADMIN-SURFACE` | exit names the directory, not an artifact |
| `L-EV-RUNSHEET-PRINT` | exit names the directory, not an artifact |
| `L-MEALS-STALE-TOKEN` | exit names the directory, not an artifact |
| `L-MODAL-SCROLLLOCK` | exit names the directory, not an artifact |

The last four the census read by hand and found sound; they need **re-recording against a named
artifact and a narrowed `exit:`, not re-doing**. 48 of the 54 verified rows still admit.

**Nine rows were refused and now admit — this is a false-refusal repaired, not a widening.** All
nine record their evidence as an absolute path while the `exit:` names the same file relatively,
e.g. `L-ACK-RECEIPT-SURVIVES-A-RELOAD`: exit token `lanes/L-ACK-RECEIPT-SURVIVES-A-RELOAD/finding.md`,
evidence `/Users/svendaneel/okam/Web-modules/lanes/L-ACK-RECEIPT-SURVIVES-A-RELOAD/finding.md` — the
same file, two spellings. The old code compared strings; `_as_repo_path` compares paths. This is the
same class of defect as the prefix match (compare artifacts, not strings) and 60 entities record an
absolute evidence path, so it was worth repairing rather than leaving as a trap. The nine are all
`built-unverified`, so nothing on the board changed state.

## 7. Deliberately NOT done

* **The 284 built-unverified pointers were not re-checked and `cmd_built` was not touched.** It
  still calls `set_evidence` with no `evidence_admissible` call anywhere in it, so 284 entities —
  149 of them prose that resolves to nothing — remain promoted without the checker running. That is
  a second defect and a second lane; fixing both here would make neither reviewable.
* **No row was unverified or re-verified on the real board.** Six verified rows are now
  non-reproducible against the repaired instrument. Correcting them is a record job with an owner,
  not a side effect of an instrument change, and `unverify` is available for exactly that.
* **The prose half of §2.4 is still open**: a `.md` or `.txt` artifact is admitted on naming alone,
  because it carries no field to read and grepping it is the thing that would red the two
  deliberate proofs falsely.
