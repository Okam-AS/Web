```
RETURN: L-JOURNEY-PORT-HARDCODED
brief: 785b0ae6
verdict: built
evidence: lanes/L-JOURNEY-PORT-HARDCODED/evidence.md
log:
spec:72 hardcoded 127.0.0.1:4010 and ignored E2E_FIXTURE_PORT; now the sibling expression.
Baseline e34977ac. Precise sibling count: 3 specs + support/journey.js:524, not 4 specs.
RED, real run on 4318: OLD base answered HTTP 200 by a FOREIGN fixture reporting port 4010;
NEW base answered by this run's own 4318 fixture. Not a refusal - a stranger's world.
The unfixed walk was NOT run: its first api call is a mutating draft + irreversible
finalize, and 4010 was a LIVE fixture of lane wt-jwf (pid 73160). Read-only proof instead.
GREEN: full journey 12/12 on TWO non-default pairs, 4318/3318 and 4319/3319, exit 0,
foreignSubjectServed 0, artifact apiBaseUrl equals the port the run was given.
Artifact hazard: the fixture backend key is the constant "fixture" whatever the port, so
any port writes the same slot. Backed up all 4 slots first; store said supersedes:null so
pre-existing superseded 07ce60d2 is untouched; displaced 7e932a11 kept whole in the lane.
Sibling fixture on 4010 healthy afterwards; no listener left on either port I used.
NOTE: the spec is UNTRACKED on this branch - it belongs to an unmerged sibling lane, so the
fix rides in the working tree. If that lane rewrites the file wholesale the fix is lost.
Lane commit 4772c131 is DANGLING: no ref moved, shared index verified byte-identical.
END RETURN
```
