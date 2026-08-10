RETURN: L-THE-SAFE-BENCHMARK-ROWS-ARE-BUILT-WORKFORCE-AND-TRAINING
brief: e73e9548
verdict: fail-spec
spec_gap: Four of the six assigned rows have already moved at 6d5328004 — TR-B1 and TR-B3's verified defects are both fixed by e8f06833f (grading derived server-side, cert expiry timezone-aware), WB4's opaque-404 pin is present 4/4 in ScheduleTenantIsolationTests, and WB5's endpoints 39-42 are live at WorkforceMeController.cs:293-361 — so "red-pin the verified defects" and "build the missing endpoints" contradicts the tip.
evidence: docs/plan/artifacts/safe-rows-workforce-training.md
log: Verified every row's premise at the tip before touching anything, as the brief demanded; four moved, matching its "four have tonight" warning. Edited no production source.
TR-B1 fail-spec: TrainingCompletionService.cs:202 now derives Passed = TrainingGrading.IsPass(ScorePercent, PassThresholdPercent). The client-asserted-pass defect is gone; a red pin of it cannot red.
TR-B3 fail-spec: TrainingCertificateService routes expiry through the zone resolver (ExpiryHorizonDate + MidnightUtcOf). The bare-UTC defect the controlled-clock pin targets no longer exists.
Both TR fixes are one commit — e8f06833f "the verdict is the server's, and an expiry is a date" — which also adds TrainingGrading.cs and TrainingDerivedVerdictTests.cs. Fixed AND pinned green.
WB4 fail-spec: the triage itself corrected the premise to ScheduleTenantIsolationTests, 4/4, incl. the opaque-404 pin this row asks for (another store's revision reads as an absent one).
WB5 fail-spec (build part): WorkforceMeController now has 14 routes, incl. open-assignments (:293), its requests (:312), exchanges (:333), exchange decisions (:361) — endpoints 39-42, already live.
Two rows are genuinely open: WB3 (11:00-exact/10:59 boundary, across-midnight, 23h-DST cases on the green DailyRest rule) and TR-B4 (read-only evidence-pack endpoint + golden). Both absent, verified.
I did NOT build the two open rows and refuse to claim them: the host was at load ~66 (tiers cannot run below the 13 gate) and shipping an unrun assertion would break the rule I held all night.
The artifact names each open row's build and redding mutation (WB3: >= to > at RuleEvaluator.cs:152 reds the 11h-exact arm; TR-B4: mutate the chain verifier, the tamper pin reds), a direct next pass.
Did NOT build TR-B5 (human-gated) and did not touch the :5091 demo API. No migration, no money-path write, no production source edited; C1-C7 not in play for a read-only verification.
Artifact force-added past the artifacts/ ignore rule, verified with git ls-files --error-unmatch; build worktree removed and pruned; trunk untouched at 6d5328004; nothing pushed.
Coverage stated plainly: this lane read all six premises and settled four as moved with hard evidence; it did not build the two open rows, which need a run the load did not allow.
END RETURN
