```
RETURN: L-CANDIDATE-JOURNEYS-ON-ARRIVAL
brief: 665c09b9
verdict: built
evidence: lanes/L-CANDIDATE-JOURNEYS-ON-ARRIVAL/triage.md
spec_gap: the brief's six journeys are zero real regressions and zero never-passed walks — all six pass on the candidate, so the class the exit criteria expected to populate is empty
reason: complete
log:
All six PASS on candidate/fe-compose-2026-08-05: 6/6 harness-shape, 0 regression, 0 never-passed.
Tier re-measured at BOTH endpoints, each run's fixture named by pid+cwd+self-reported port:
  tip e34977ac      22 journeys  21 passed  1 failed  (workforce-schedule-publish @live)
  candidate 9f7d8df 29 journeys  27 passed  2 failed  (+ meals-admin-setup, already bisected to 55b2dcd)
Mechanism: pid 73160 (cwd wt-jwf, up since Aug-4 16:03) holds 4010 and answers /__fixture/health 200;
reuseExistingServer:!CI with CI unset attached to it. That fixture has no kodeoversikt/code-register/
punch-correction/statements-drafts routes, so exactly the newly-arrived journeys 404 — the observed
split. Foreign pid never touched, never killed.
CORRECTION TO THE CORRECTED LIST: meals-statement-month is NOT "arrived broken" — its spec hardcodes
4010 (line 72, present at birth 9215d38) so its red survives isolating the run; with only that
expression fixed (byte-for-byte 4772c13, reverted after each run) it PASSES. Ninth instance of the class.
ALSO: compose's TIP row is poisoned too — account-email-confirm passes at the tip, so "the composition
fixed it" is void. Withdraw the C6 flag: the kodeoversikt walk downloads okam-kodeoversikt-42-2026-07-13.csv
and appends two actor-stamped issue rows. No origin-branch runs — a candidate PASS refutes both classes
and all six spec blobs are byte-identical origin-vs-candidate. Nothing committed, pushed, or containerised.
END RETURN
```
