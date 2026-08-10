```
RETURN: L-JOURNEY-EVIDENCE-SWEEP
brief: f4f4eb37
verdict: built
evidence: lanes/L-JOURNEY-EVIDENCE-SWEEP/verification-map.md
log: 149 built-unverified, not 118: 143 Lane + 6 Feature. 15 verified, 0 accepted.
Read-only: the tool's own evidence_admissible() called in-process. No state written, no suite run.
NONE of the 149 verifies against its recorded evidence today. Refusal classes, counted:
33 exit-rewrite-only (evidence exists, passes guard 1, only 6.1 refuses); 36 prose-evidence
hiding a repo path; 37 artifact-only-outside-this-repo; 16 name no file anywhere;
22 no evidence at all; 5 fact-probe broken (1 suite-kind, 1 exists-extractor, 3 unconf).
Largest batch: 22 L-*-REVIEW lanes whose docs/plan/reviews/<ID>.md exists and is admissible,
one identical exit rewrite each; 11 more listed with the exact path their exit must name.
HOLE: 109 of 149 exits name no instrument at all, so nothing can verify them, mine included.
Of the 40 that do, 24 name only the DIRECTORY artifacts/journeys/, and I measured that
"plan verify FT-GROWTH --evidence artifacts" is ADMISSIBLE, as is a journey whose own status
reads failed: path evidence is never read. That exit is a rubber stamp, not a gate.
WRONG WORLD: OkamAPI-modules HEAD is lane/meals-grace-pins, 4 behind integration, so every
../OkamAPI-modules probe reads a foreign branch, fact:wf.journeys and fact:ev.journeys included,
the only two admissible today. Do not verify L-WF-SUPPLEMENTS or L-EV-VAT on them yet.
END RETURN
```
