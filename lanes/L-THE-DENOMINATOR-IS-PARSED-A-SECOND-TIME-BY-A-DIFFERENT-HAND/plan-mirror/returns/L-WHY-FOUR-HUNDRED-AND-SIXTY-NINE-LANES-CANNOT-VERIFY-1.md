RETURN: L-WHY-FOUR-HUNDRED-AND-SIXTY-NINE-LANES-CANNOT-VERIFY
brief: 4015e3e5
verdict: built
evidence: docs/plan/artifacts/why-verification-is-refused.md
log:
Ran plan verify against all 469 built-unverified lanes using each lane OWN recorded evidence. No override, no plan accept, nothing predicted from a path. Committed 900b9ae.
88 VERIFIED — their evidence was admissible all along and nobody had run the verb. Durable in plan.md at HEAD: verified 57 -> 145, built-unverified 469 -> 381. A fifth of the backlog.
THE MOST USEFUL FACT: 357 of the 381 refusals have an exit criterion needing NO browser. Only 24 do. D-RESTART-THE-WALK-WORLD-API gates 6 percent of what is left, not the bulk.
Classes as the tool stated them: exit-not-met 221, path-gone 153, undeclared-fact 3, suite-kind 1, unconfirmed-fact 1, no-evidence-recorded 1, one malformed string. Sum 381.
206 of the 221 exit-not-met are "the exit does not name the evidence" — and the artifact is on disk for ALL 206. The proof exists; the exit never mentions the file that discharges it.
That is a wording defect, not missing work, and it is the single cheapest class: half the remaining backlog, one line per lane, no browser and no decision.
PATH-GONE IS TWO PROBLEMS, as the brief suspected. 60 of the 153 have their named artifact ON DISK RIGHT NOW; 7 are recoverable from a git ref; 86 are genuinely destroyed.
The mechanism behind the 60: the evidence field holds a PROSE SENTENCE and the tool takes the whole string as a path, so it reports the sentence as a missing path.
So "the proof evaporated while the code stayed" is true for 86 lanes, not 153. Re-recording a field is a different job from redoing the work, and 60 lanes are on the cheap side of that line.
Cheapest-first: 206 name-the-artifact, 60 re-record prose evidence, 15 name an entry not a directory, 7 recover from refs, 6 one-offs. 288 lanes, no browser, no decision, no suite run.
With the 88 verified, 376 of 469 are reachable without redoing work or the walk world. Only the 86 destroyed and 24 browser-bound cost what the backlog appears to cost.
CORRECTION TO MY OWN FIRST READING: grep counted 489 built-unverified because it matched every entity kind. Restricted to LANES it is exactly 469, as the brief said.
I did not fix any lane and produced no evidence. The only state change is the 88 the tool itself accepted, which the brief asked be reported and not undone.
Artifact force-added past the bare artifacts rule at .gitignore:111 and verified with git ls-files --error-unmatch. Raw per-lane verdicts committed under lanes/L-WHY-469/.
Read-only otherwise: no worktree created, no suite run, no push, web-livewalk untouched, load gated on uptime throughout.
END RETURN
