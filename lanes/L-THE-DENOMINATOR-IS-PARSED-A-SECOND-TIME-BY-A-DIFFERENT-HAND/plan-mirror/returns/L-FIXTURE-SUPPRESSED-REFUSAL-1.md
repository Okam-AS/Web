```
RETURN: L-FIXTURE-SUPPRESSED-REFUSAL
brief: f3362460
verdict: built
evidence: lanes/L-FIXTURE-SUPPRESSED-REFUSAL/run.md
spec_gap: none — the brief matched reality; the refusal was unmodelled and undeclared exactly as stated
reason: nothing stopped; exit criteria met
log:
TAUGHT, not exempted; nothing was exempted. The exemption was the fast close and fails its own test:
nothing else covers the path — no ERROR_KEYS entry and no translation key for the code exist anywhere.
GREEN at 8e2b57de: "12 anchored routes refuse exactly what that checkout refuses", exit 0, npm script.
One shape added to an EXISTING anchor; anchor count UNCHANGED at 12 of 642 — scope caveat unmoved.
S1, the comparator break: blinding compare() to fixture-behind makes --prove FAIL on `removed`, exit 1,
while the live run stays green — and diff reports it byte-IDENTICAL to the honest green.
So my green output alone carries zero information; only --prove separates "level" from "nobody looking".
S2 restatus 409->422: RED status-mismatch naming my line. S3 delete: RED, the sibling's finding exactly.
All controls reverted; git status and git diff HEAD both empty; all 4 baselines re-measured afterwards.
Session was killed mid-lane: EVERY measurement re-run from scratch, nothing rests on a pre-kill result.
Rule verified behaviourally, not only by shape: 6/6 driving route() as a function — no server, no port.
Two of those six are cases the PRODUCT SERVES (neighbour store-scoped, GB4-liftable). Not divergences,
never were, invisible to a shape check — a "refuse on any row" fix would go green and refuse wrongly.
FINDING: growth.test_address_suppressed is thrown by the backend today and is absent from the entire
frontend, so the operator meets the generic sentence. Pre-existing; an exemption would have hidden it.
END RETURN
```
