```
RETURN: L-ARTIFACT-PROVENANCE
brief: 67204496
verdict: built
evidence: lanes/L-ARTIFACT-PROVENANCE/evidence.md (commit 533aea4, 5 files, pathspec) + artifacts/journeys/runs/ledger.jsonl
log:
All three code defects verified before building. The brief's LIVE-STATE claim was stale: by 11:44Z other lanes had re-run all three live journeys, so their canonical paths held live passes, not the guard proof and fixture re-runs. The mechanisms were unaffected.
Store: canonical artifacts/journeys/<name>.playwright.json keeps its path and shape (probes join there), plus runs/<name>.<backendKey>.playwright.json per backend and an append-only runs/ledger.jsonl.
Rank live>fixture, then passed>failed>running, then names-its-build>unidentified. The slot is taken only by the same backend key or by a strictly higher rank; equal rank from a different backend does not displace.
Backend identity, first hit wins: E2E_API_BUILD, else OKAM_API_REPO HEAD, else whoever holds the port (lsof -> cwd -> git rev-parse), else the API's swagger route surface. Null when nothing can say, never guessed, and the runner prints the one-line fix.
A provisional "status":"running" record is written before the browser opens, and the /__fixture/stats fetch is guarded, so a killed run or a dead fixture can no longer leave its predecessor's pass reading as this run's result. Both wrong-world guards still write before they re-throw.
Screenshots and the two printed PDFs moved to <name>/<backendKey>/ - the same defect one level down, since a fixture re-run used to overwrite the pixels a live artifact referenced.
PROOF 1: fixture re-run of workforce-flag-lever against a standing live pass left it byte-identical (sha c21fe209). Protection mutated away, identical command re-run: canonical became the fixture record (c4b184a2). Displacement returned, then restored.
PROOF 2: a live-labelled run against my own stub answering only 200 "Healthy" passed the preflight exactly as the brief said any API would, was filed live-5093-fadc84a-dirty with the stub's checkout named, and the real live artifact was untouched.
Mutations A/B/C/D (canonical guard, provisional write, build identity, port-holder source) went red on 5/3/6/1 of 18 tests; restored 18/18. Jest 105 suites / 2388 tests green. eslint clean.
IN THE WILD: another lane's own live run at 11:49Z was identified unaided as wt-lwr-api@3579bbb via the port holder, and took the canonical slot from the unidentified record. Nobody had to change anything for that to work.
artifacts/ stays gitignored and I committed no artifact; the durable record is runs/ plus the ledger. Zero tracked-artifact churn after four browser runs; the two force-added modal files were left untouched and will now churn less.
grepInvert NOT changed. Excluding @live from fixture mode would drop three journeys other lanes count; the per-backend key makes the fixture re-run harmless instead.
NEEDS the live-world.sh owners (script not edited, two SQL lanes are in it): export E2E_API_BUILD="OkamAPI@$(git -C "$OKAM_API_REPO" rev-parse HEAD)" and carry it into the run command the script prints. That makes every live artifact self-identifying without lsof.
RESIDUAL: once two live worlds are both identified and both pass, the first keeps the slot; hand-over is to delete the canonical file and re-run. The swagger fallback 404s on this estate's API and is not what carries it.
Ports 3092/4092/5093, all mine. No container started or touched, no live world disturbed, no migration authored.
END RETURN
```
